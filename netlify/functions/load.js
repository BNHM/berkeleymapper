import { handleLoadRequest } from "../../server/api/loadHandler.js";

export async function handler(event) {
  return handleLoadRequest({
    method: event.httpMethod,
    body: event.body,
    query: event.queryStringParameters || {}
  });
}
