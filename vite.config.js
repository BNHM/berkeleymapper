import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleLoadRequest } from "./server/api/loadHandler.js";
import { handleHealthRequest } from "./server/api/healthHandler.js";

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      resolve(body);
    });

    request.on("error", reject);
  });
}

function netlifyParityApiPlugin() {
  return {
    name: "netlify-parity-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/api/")) {
          next();
          return;
        }

        const url = new URL(request.url, "http://localhost");
        const query = Object.fromEntries(url.searchParams.entries());
        let result;

        if (url.pathname === "/api/health") {
          result = await handleHealthRequest();
        } else if (url.pathname === "/api/load") {
          result = await handleLoadRequest({
            method: request.method || "GET",
            body: await readRequestBody(request),
            query
          });
        } else {
          next();
          return;
        }

        response.statusCode = result.statusCode;
        Object.entries(result.headers || {}).forEach(([key, value]) => {
          response.setHeader(key, value);
        });
        response.end(result.body);
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), netlifyParityApiPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
