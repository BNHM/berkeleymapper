import { extname } from "node:path";
import { buildDatasetPayload } from "../../shared/buildDatasetPayload.js";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function getRequestOrigin(request, fallbackHost = "localhost") {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string"
    ? forwardedProtocol.split(",")[0].trim()
    : "http";

  return `${protocol}://${request.headers.host || fallbackHost}`;
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

  return resolved.toString();
}

async function fetchRequiredText(url, label) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to load ${label}: ${response.status} ${response.statusText}`);
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

    const upstream = await fetch(sourceUrl, {
      headers: {
        Accept: "application/geo+json, application/json, application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz, application/xml, text/xml, */*"
      }
    });

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
