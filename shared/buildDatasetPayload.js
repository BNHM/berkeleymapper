import { parseLegacyConfig } from "../server/lib/parseLegacyConfig.js";
import { buildEmptyTabularData, parseTabularData } from "../server/lib/parseTabularData.js";

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `request-${Date.now()}`;
}

export function buildDatasetPayload({ requestId, tabfile, configfile, tabdata, configdata }) {
  const config = parseLegacyConfig(configdata);
  const hasTabularData = typeof tabdata === "string" ? tabdata.trim().length > 0 : Boolean(tabdata);
  const parsed = hasTabularData ? parseTabularData(tabdata, config) : buildEmptyTabularData(config);

  return {
    requestId: requestId || createRequestId(),
    source: {
      tabfile: tabfile || "",
      configfile: configfile || "",
      mode: tabfile || configfile ? "remote-url" : "inline-data",
      stateless: true
    },
    rawConfigText: configdata || "",
    metadata: config.metadata,
    colors: config.colors,
    colorConfig: config.colorConfig,
    colorConfigs: config.colorConfigs || [],
    logos: config.logos,
    layers: config.layers,
    join: config.join || null,
    ...parsed
  };
}
