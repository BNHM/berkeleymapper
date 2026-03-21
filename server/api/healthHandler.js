import { jsonResponse } from "./response.js";

export async function handleHealthRequest() {
  return jsonResponse(200, { ok: true });
}
