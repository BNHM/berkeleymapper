import { extname } from "node:path";
import { buildDatasetPayload } from "../../shared/buildDatasetPayload.js";
import { readCachedGadmGeoJson } from "./gadmBoundaries.js";
import { buildSpatialStatistics } from "./spatialStatistics.js";

const spatialStatisticsJobs = new Map();
const MAX_SPATIAL_STATISTICS_JOB_LINES = 60;
const MAX_SPATIAL_STATISTICS_JOBS = 20;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function createSpatialStatisticsRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimSpatialStatisticsJobs() {
  while (spatialStatisticsJobs.size > MAX_SPATIAL_STATISTICS_JOBS) {
    const oldestKey = spatialStatisticsJobs.keys().next().value;
    spatialStatisticsJobs.delete(oldestKey);
  }
}

function appendSpatialStatisticsJobLine(job, line) {
  if (!job || !line) {
    return;
  }

  job.lines.push(line);
  if (job.lines.length > MAX_SPATIAL_STATISTICS_JOB_LINES) {
    job.lines.splice(0, job.lines.length - MAX_SPATIAL_STATISTICS_JOB_LINES);
  }
  job.updatedAt = Date.now();
}

function getSpatialStatisticsJobPayload(job) {
  return {
    requestId: job.requestId,
    status: job.status,
    lines: [...job.lines],
    error: job.error || "",
    result: job.status === "complete" ? job.result : undefined
  };
}

async function readJsonBody(request, maxBytes = 1024 * 1024 * 8) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      throw new Error("Request body is too large.");
    }

    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf-8").trim();
  return body ? JSON.parse(body) : {};
}

function getRequestOrigin(request, fallbackHost = "localhost") {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string"
    ? forwardedProtocol.split(",")[0].trim()
    : "http";

  return `${protocol}://${request.headers.host || fallbackHost}`;
}

function extractGoogleDriveFileId(sourceUrl) {
  let parsed;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    return "";
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith("drive.google.com")) {
    return "";
  }

  const idFromQuery = parsed.searchParams.get("id");
  if (idFromQuery) {
    return idFromQuery;
  }

  const fileMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)/i);
  if (fileMatch?.[1]) {
    return fileMatch[1];
  }

  const ucMatch = parsed.pathname.match(/^\/uc$/i);
  if (ucMatch) {
    return parsed.searchParams.get("id") || "";
  }

  return "";
}

function normalizeExternalSourceUrl(sourceUrl) {
  const fileId = extractGoogleDriveFileId(sourceUrl);

  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  }

  return sourceUrl;
}

function resolveSourceUrl(rawValue, request, fallbackHost = "localhost") {
  const value = String(rawValue || "").trim();

  if (!value) {
    return "";
  }

  const resolved = new URL(value, getRequestOrigin(request, fallbackHost));

  if (!["http:", "https:"].includes(resolved.protocol)) {
    throw new Error("Only http and https source URLs are supported.");
  }

  if (resolved.username || resolved.password) {
    throw new Error("Source URLs with embedded credentials are not supported.");
  }

  return normalizeExternalSourceUrl(resolved.toString());
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function buildGoogleDriveConfirmUrl(html, responseUrl) {
  const actionMatch = html.match(/<form[^>]+id="download-form"[^>]+action="([^"]+)"/i);
  if (!actionMatch?.[1]) {
    return "";
  }

  let actionUrl;
  try {
    actionUrl = new URL(decodeHtmlEntities(actionMatch[1]), responseUrl);
  } catch {
    return "";
  }

  const hiddenInputs = [...html.matchAll(/<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"/gi)];
  hiddenInputs.forEach((match) => {
    actionUrl.searchParams.set(decodeHtmlEntities(match[1]), decodeHtmlEntities(match[2]));
  });

  return actionUrl.toString();
}

async function fetchGoogleDriveCompatibleResponse(url, init = {}) {
  const response = await fetch(url, init);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();

  if (!response.ok || !contentType.includes("text/html") || !response.url.includes("drive.google.com")) {
    return response;
  }

  const html = await response.text();
  const confirmUrl = buildGoogleDriveConfirmUrl(html, response.url);

  if (!confirmUrl) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  return fetch(confirmUrl, init);
}

async function fetchRequiredText(url, label) {
  let response;

  try {
    response = await fetchGoogleDriveCompatibleResponse(url, {
      headers: {
        Accept: "text/plain, text/tab-separated-values, text/csv, application/xml, text/xml, text/*, */*",
        "User-Agent": "BerkeleyMapper/2.0 (+https://berkeleymapper.berkeley.edu)"
      }
    });
  } catch (error) {
    throw new Error(`Unable to load ${label} from ${url}: ${error?.message || "request failed"}`);
  }

  if (!response.ok) {
    throw new Error(`Unable to load ${label}: ${response.status} ${response.statusText}`);
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html") && response.url.includes("drive.google.com")) {
    throw new Error(`Unable to load ${label}: Google Drive returned an HTML page instead of the shared file contents.`);
  }

  return response.text();
}

function inferLayerContentType(sourceUrl, upstreamContentType) {
  const upstreamType = String(upstreamContentType || "").trim();

  if (
    upstreamType &&
    upstreamType !== "application/octet-stream" &&
    upstreamType !== "binary/octet-stream"
  ) {
    return upstreamType;
  }

  const parsed = new URL(sourceUrl);
  const extension = extname(parsed.pathname).toLowerCase();
  const format = parsed.searchParams.get("format")?.toLowerCase() || "";

  if (extension === ".geojson" || format === "geojson") {
    return "application/geo+json; charset=utf-8";
  }

  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }

  if (extension === ".kmz" || format === "kmz") {
    return "application/vnd.google-earth.kmz";
  }

  if (extension === ".kml" || format === "kml") {
    return "application/vnd.google-earth.kml+xml; charset=utf-8";
  }

  if (extension === ".xml") {
    return "application/xml; charset=utf-8";
  }

  return "application/octet-stream";
}

export async function handleDatasetRequest(request, response, url, options = {}) {
  const fallbackHost = options.fallbackHost || "localhost";

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const tabfile = resolveSourceUrl(url.searchParams.get("tabfile"), request, fallbackHost);
    const configfile = resolveSourceUrl(url.searchParams.get("configfile"), request, fallbackHost);

    if (!tabfile && !configfile) {
      sendJson(response, 400, { error: "Missing required query parameter: tabfile or configfile" });
      return;
    }

    const [tabdata, configdata] = await Promise.all([
      tabfile ? fetchRequiredText(tabfile, "tab file") : Promise.resolve(""),
      configfile ? fetchRequiredText(configfile, "config file") : Promise.resolve("")
    ]);

    const payload = buildDatasetPayload({
      tabfile,
      configfile,
      tabdata,
      configdata
    });

    if (request.method === "HEAD") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8"
      });
      response.end();
      return;
    }

    sendJson(response, 200, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Dataset API error:", error);
    sendJson(response, 502, { error: message });
  }
}

export async function handleLayerRequest(request, response, url, options = {}) {
  const fallbackHost = options.fallbackHost || "localhost";

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const sourceUrl = resolveSourceUrl(url.searchParams.get("url"), request, fallbackHost);

    if (!sourceUrl) {
      sendJson(response, 400, { error: "Missing required query parameter: url" });
      return;
    }

    let upstream;

    try {
      upstream = await fetchGoogleDriveCompatibleResponse(sourceUrl, {
        headers: {
          Accept: "application/geo+json, application/json, application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz, application/xml, text/xml, */*",
          "User-Agent": "BerkeleyMapper/2.0 (+https://berkeleymapper.berkeley.edu)"
        }
      });
    } catch (error) {
      throw new Error(`Unable to load layer from ${sourceUrl}: ${error?.message || "request failed"}`);
    }

    if (!upstream.ok) {
      throw new Error(`Unable to load layer: ${upstream.status} ${upstream.statusText}`);
    }

    const contentType = inferLayerContentType(sourceUrl, upstream.headers.get("content-type"));
    const body = Buffer.from(await upstream.arrayBuffer());

    if (contentType.includes("text/html")) {
      const html = body.toString("utf-8");

      if (
        html.includes("cf-turnstile") ||
        html.includes("Please verify") ||
        html.includes("Quick check to make sure you are human")
      ) {
        throw new Error("Layer URL returned a human-verification page instead of KML, KMZ, or GeoJSON.");
      }
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "X-Berkeleymapper-Source-Url": sourceUrl
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Layer API error:", error);
    sendJson(response, 502, { error: message });
  }
}

export async function handleGadmBoundaryRequest(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const level = url.searchParams.get("level") || "";
    const countryName = url.searchParams.get("country") || "";
    const countryNames = (url.searchParams.get("countries") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const stateNames = (url.searchParams.get("states") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const body = await readCachedGadmGeoJson({
      level,
      countryName,
      countryNames,
      stateNames
    });

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/geo+json; charset=utf-8"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("GADM boundary API error:", error);
    sendJson(response, 502, { error: message });
  }
}

export async function handleSpatialStatisticsRequest(request, response) {
  if (request.method === "GET") {
    const requestUrl = new URL(request.url || "/api/spatial-statistics", getRequestOrigin(request));
    const requestId = String(requestUrl.searchParams.get("id") || "").trim();

    if (!requestId) {
      sendJson(response, 400, { error: "Missing required query parameter: id" });
      return;
    }

    const job = spatialStatisticsJobs.get(requestId);
    if (!job) {
      sendJson(response, 404, { error: "Spatial statistics job not found." });
      return;
    }

    sendJson(response, 200, getSpatialStatisticsJobPayload(job));
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const points = Array.isArray(body?.points) ? body.points : [];
    const requestId = createSpatialStatisticsRequestId();
    const job = {
      requestId,
      status: "pending",
      lines: [],
      error: "",
      result: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    spatialStatisticsJobs.set(requestId, job);
    trimSpatialStatisticsJobs();

    const receivedLine = `request received groupedPoints=${points.length}`;
    appendSpatialStatisticsJobLine(job, receivedLine);

    buildSpatialStatistics(points, {
      requestId,
      onStatus(message) {
        appendSpatialStatisticsJobLine(job, message);
      }
    })
      .then((statistics) => {
        job.status = "complete";
        job.result = statistics;
        const readyLine = `response ready countryRows=${statistics.country.length} stateRows=${statistics.state.length} countyRows=${statistics.county.length}`;
        appendSpatialStatisticsJobLine(job, readyLine);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Internal server error";
        job.status = "error";
        job.error = message;
        appendSpatialStatisticsJobLine(job, `error ${message}`);
      });

    sendJson(response, 202, {
      requestId,
      status: job.status,
      lines: [...job.lines]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Spatial statistics API error:", error);
    sendJson(response, 502, { error: message });
  }
}
