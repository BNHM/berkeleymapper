import { randomUUID } from "node:crypto";
import { fetchText } from "./fetchText.js";
import { parseLegacyConfig } from "./parseLegacyConfig.js";
import { parseTabularData } from "./parseTabularData.js";

function buildDatasetPayload({ requestId, tabfile, configfile, tabdata, configdata }) {
  const config = parseLegacyConfig(configdata);
  const parsed = parseTabularData(tabdata, config);

  return {
    requestId,
    source: {
      tabfile: tabfile || "",
      configfile: configfile || "",
      mode: tabfile ? "remote-url" : "inline-data",
      stateless: true
    },
    metadata: config.metadata,
    colors: config.colors,
    colorConfig: config.colorConfig,
    logos: config.logos,
    layers: config.layers,
    ...parsed
  };
}

export async function loadLegacyDataset({ tabfile, configfile, tabdata, configdata }) {
  if (!tabfile && !tabdata) {
    throw new Error("Provide a tabfile URL or tabdata payload.");
  }

  const nextTabdata = tabdata || (await fetchText(tabfile));
  const nextConfigdata = configdata || (configfile ? await fetchText(configfile) : "");

  return buildDatasetPayload({
    requestId: randomUUID(),
    tabfile,
    configfile,
    tabdata: nextTabdata,
    configdata: nextConfigdata
  });
}
