import { handleHealthRequest } from "../../server/api/healthHandler.js";

export async function handler() {
  return handleHealthRequest();
}
