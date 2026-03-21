import { loadLegacyDataset } from "../lib/loadLegacyDataset.js";
import { jsonResponse, parseJsonBody } from "./response.js";

export async function handleLoadRequest({ method, body, query = {} }) {
  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  const parsedBody = parseJsonBody(body);

  try {
    const dataset = await loadLegacyDataset({
      tabfile: parsedBody.tabfile || query.tabfile,
      configfile: parsedBody.configfile || query.configfile,
      tabdata: parsedBody.tabdata,
      configdata: parsedBody.configdata
    });

    return jsonResponse(200, dataset);
  } catch (error) {
    return jsonResponse(400, { error: error.message });
  }
}
