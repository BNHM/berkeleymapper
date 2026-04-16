import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleDatasetRequest, handleGadmBoundaryRequest, handleLayerRequest, handleSpatialStatisticsRequest } from "./server/lib/apiHandlers.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "berkeleymapper-api",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (!request.url) {
            next();
            return;
          }

          const url = new URL(request.url, "http://localhost");

          if (url.pathname === "/api/dataset") {
            await handleDatasetRequest(request, response, url, {
              fallbackHost: "localhost:5173"
            });
            return;
          }

          if (url.pathname === "/api/layer") {
            await handleLayerRequest(request, response, url, {
              fallbackHost: "localhost:5173"
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

          next();
        });
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
