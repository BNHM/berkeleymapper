import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleDatasetRequest, handleGadmBoundaryRequest, handleLayerRequest, handleSpatialStatisticsRequest } from "./lib/apiHandlers.js";
import { runtimeConfig } from "./lib/runtimeConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = resolve(__dirname, "..", "dist");
const { host, port } = runtimeConfig;
let requestSequence = 0;

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

function logServerEvent(message, details = "") {
  const timestamp = new Date().toISOString();
  const suffix = details ? ` ${details}` : "";
  console.log(`[${timestamp}] server ${message}${suffix}`);
}

function getRequestIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "(unknown)";
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

  const requestId = `req-${(++requestSequence).toString(36)}`;
  const startTime = Date.now();
  response.on("finish", () => {
    const durationMs = Date.now() - startTime;
    if (request.url?.startsWith("/api/")) {
      logServerEvent(
        "response",
        `requestId=${requestId} method=${request.method || "(unknown)"} url=${request.url} status=${response.statusCode} durationMs=${durationMs} ip=${getRequestIp(request)}`
      );
    }
  });

  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      logServerEvent(
        "request",
        `requestId=${requestId} method=${request.method || "(unknown)"} url=${request.url} ip=${getRequestIp(request)}`
      );
    }

    if (url.pathname === "/api/dataset") {
      await handleDatasetRequest(request, response, url, {
        fallbackHost: `${host}:${port}`
      });
      return;
    }

    if (url.pathname === "/api/layer") {
      await handleLayerRequest(request, response, url, {
        fallbackHost: `${host}:${port}`
      });
      return;
    }

    if (url.pathname === "/api/gadm41") {
      await handleGadmBoundaryRequest(request, response, url);
      return;
    }

    if (url.pathname === "/api/spatial-statistics") {
      await handleSpatialStatisticsRequest(request, response);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      logServerEvent(
        "unhandled api route",
        `requestId=${requestId} method=${request.method || "(unknown)"} url=${request.url}`
      );
      sendError(response, 404, "API route not found");
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
    console.error(`Static server error requestId=${requestId}:`, error instanceof Error ? error.stack || error.message : String(error));
    sendError(response, 500, "Internal server error");
  }
});

server.listen(port, host, () => {
  logServerEvent("listening", `dist=${distDir} url=http://${host}:${port}`);
  if (runtimeConfig.spatialDataDir || runtimeConfig.gadm41Dir) {
    logServerEvent("spatial data root", runtimeConfig.spatialDataDir || "(unset)");
    logServerEvent("GADM41 root", runtimeConfig.gadm41Dir || "(unset)");
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error instanceof Error ? error.stack || error.message : String(error));
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error instanceof Error ? error.stack || error.message : String(error));
});
