import { fetchText } from "./fetchText.js";
import { buildDatasetPayload } from "../../shared/buildDatasetPayload.js";

export async function loadLegacyDataset({ tabfile, configfile, tabdata, configdata }) {
  if (!tabfile && !tabdata) {
    throw new Error("Provide a tabfile URL or tabdata payload.");
  }

  const nextTabdata = tabdata || (await fetchText(tabfile));
  const nextConfigdata = configdata || (configfile ? await fetchText(configfile) : "");

  return buildDatasetPayload({
    tabfile,
    configfile,
    tabdata: nextTabdata,
    configdata: nextConfigdata
  });
}
