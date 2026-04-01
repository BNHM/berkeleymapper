import * as toGeoJSON from "@tmcw/togeojson";
import JSZip from "jszip";

export function getLayerSourceUrl(layer) {
  return String(layer?.location || layer?.url || "").trim();
}

function buildLayerProxyUrl(sourceUrl) {
  const params = new URLSearchParams();
  params.set("url", sourceUrl);
  return `/api/layer?${params.toString()}`;
}

function inferLayerFormat(sourceUrl, contentType) {
  const source = String(sourceUrl || "").toLowerCase();
  const type = String(contentType || "").toLowerCase();

  if (type.includes("geo+json") || type.includes("application/json")) {
    return "geojson";
  }

  if (type.includes("google-earth.kmz") || (type.includes("zip") && (source.endsWith(".kmz") || source.includes("format=kmz")))) {
    return "kmz";
  }

  if (type.includes("google-earth.kml") || type.includes("text/xml") || type.includes("application/xml")) {
    return "kml";
  }

  if (source.endsWith(".geojson") || source.endsWith(".json") || source.includes("format=geojson")) {
    return "geojson";
  }

  if (source.endsWith(".kmz") || source.includes("format=kmz")) {
    return "kmz";
  }

  if (source.endsWith(".kml") || source.includes("format=kml")) {
    return "kml";
  }

  return "";
}

function parseKmlText(kmlText, sourceUrl) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(kmlText, "application/xml");
  const parserError = xml.querySelector("parsererror");

  if (parserError) {
    throw new Error(`Unable to parse KML from ${sourceUrl}.`);
  }

  return toGeoJSON.kml(xml);
}

async function extractKmlFromKmz(buffer, sourceUrl) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  const preferredName = names.find((name) => name.toLowerCase() === "doc.kml");
  const kmlName = preferredName || names.find((name) => name.toLowerCase().endsWith(".kml"));

  if (!kmlName) {
    throw new Error(`No KML document found inside KMZ layer ${sourceUrl}.`);
  }

  return zip.files[kmlName].async("text");
}

export async function loadLayerGeoJson(layer) {
  const sourceUrl = getLayerSourceUrl(layer);

  if (!sourceUrl) {
    throw new Error("Layer is missing a source URL.");
  }

  const response = await fetch(buildLayerProxyUrl(sourceUrl));
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      throw new Error(payload?.error || `Unable to load layer: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    throw new Error(responseText || `Unable to load layer: ${response.status} ${response.statusText}`);
  }

  const format = inferLayerFormat(sourceUrl, contentType);

  if (format === "geojson") {
    return response.json();
  }

  if (format === "kmz") {
    const buffer = await response.arrayBuffer();
    const kmlText = await extractKmlFromKmz(buffer, sourceUrl);
    return parseKmlText(kmlText, sourceUrl);
  }

  if (format === "kml") {
    const kmlText = await response.text();
    return parseKmlText(kmlText, sourceUrl);
  }

  throw new Error(`Unsupported layer format for ${sourceUrl}.`);
}
