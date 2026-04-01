import { parseLegacyConfig } from "../server/lib/parseLegacyConfig.js";
import { parseTabularData } from "../server/lib/parseTabularData.js";

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `request-${Date.now()}`;
}

export function buildDatasetPayload({ requestId, tabfile, configfile, tabdata, configdata }) {
  const config = parseLegacyConfig(configdata);
  const parsed = parseTabularData(tabdata, config);

  return {
    requestId: requestId || createRequestId(),
    source: {
      tabfile: tabfile || "",
      configfile: configfile || "",
      mode: tabfile ? "remote-url" : "inline-data",
      stateless: true
    },
    rawConfigText: configdata || "",
    metadata: config.metadata,
    colors: config.colors,
    colorConfig: config.colorConfig,
    logos: config.logos,
    layers: config.layers,
    ...parsed
  };
}
