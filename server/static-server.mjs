import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDatasetPayload } from "../shared/buildDatasetPayload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = resolve(__dirname, "..", "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "4173", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

function sendError(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function getRequestOrigin(request) {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string"
    ? forwardedProtocol.split(",")[0].trim()
    : "http";

  return `${protocol}://${request.headers.host || `${host}:${port}`}`;
}

function resolveSourceUrl(rawValue, request) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return "";
  }

  const resolved = new URL(value, getRequestOrigin(request));

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

async function handleDatasetRequest(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const tabfile = resolveSourceUrl(url.searchParams.get("tabfile"), request);
    const configfile = resolveSourceUrl(url.searchParams.get("configfile"), request);

    if (!tabfile) {
      sendJson(response, 400, { error: "Missing required query parameter: tabfile" });
      return;
    }

    const [tabdata, configdata] = await Promise.all([
      fetchRequiredText(tabfile, "tab file"),
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

async function resolveRequestPath(urlPath) {
  const pathname = decodeURIComponent(urlPath);
  const requestedPath = pathname === "/" ? "index.html" : normalize(pathname).replace(/^\/+/, "");
  const absolutePath = resolve(distDir, requestedPath);

  if (absolutePath !== distDir && !absolutePath.startsWith(`${distDir}/`)) {
    return null;
  }

  try {
    const fileStats = await stat(absolutePath);
    if (fileStats.isFile()) {
      return absolutePath;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  if (!extname(requestedPath)) {
    const indexPath = join(distDir, "index.html");
    try {
      const fileStats = await stat(indexPath);
      if (fileStats.isFile()) {
        return indexPath;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendError(response, 400, "Bad request");
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/dataset") {
      await handleDatasetRequest(request, response, url);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendError(response, 405, "Method not allowed");
      return;
    }

    const filePath = await resolveRequestPath(url.pathname);

    if (!filePath) {
      sendError(response, 404, "Not found");
      return;
    }

    const extension = extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error("Static server error:", error);
    sendError(response, 500, "Internal server error");
  }
});

server.listen(port, host, () => {
  console.log(`Serving BerkeleyMapper dist from ${distDir} at http://${host}:${port}`);
});
