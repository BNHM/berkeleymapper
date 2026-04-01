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

function getElementLocalName(node) {
  return String(node?.localName || node?.nodeName || "")
    .split(":")
    .pop()
    .toLowerCase();
}

function getChildElements(node) {
  return Array.from(node?.childNodes || []).filter((child) => child?.nodeType === 1);
}

function findDescendantsByLocalName(node, name) {
  const target = String(name || "").toLowerCase();
  const matches = [];
  const stack = [...getChildElements(node)];

  while (stack.length) {
    const current = stack.shift();

    if (getElementLocalName(current) === target) {
      matches.push(current);
    }

    stack.unshift(...getChildElements(current));
  }

  return matches;
}

function findFirstDescendantByLocalName(node, name) {
  return findDescendantsByLocalName(node, name)[0] || null;
}

function getElementText(node) {
  return String(node?.textContent || "").trim();
}

function parseKmlCoordinates(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").slice(0, 2).map((value) => Number.parseFloat(value)))
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
}

function parseKmlPoint(pointElement) {
  const coordinatesElement = findFirstDescendantByLocalName(pointElement, "coordinates");
  const coordinates = parseKmlCoordinates(getElementText(coordinatesElement));

  if (!coordinates.length) {
    return null;
  }

  return {
    type: "Point",
    coordinates: coordinates[0]
  };
}

function parseKmlLineString(lineStringElement) {
  const coordinatesElement = findFirstDescendantByLocalName(lineStringElement, "coordinates");
  const coordinates = parseKmlCoordinates(getElementText(coordinatesElement));

  if (!coordinates.length) {
    return null;
  }

  return {
    type: "LineString",
    coordinates
  };
}

function parseKmlPolygon(polygonElement) {
  const outerBoundary = findFirstDescendantByLocalName(polygonElement, "outerboundaryis");
  const outerRing = findFirstDescendantByLocalName(outerBoundary, "linearring");
  const outerCoordinatesElement = findFirstDescendantByLocalName(outerRing, "coordinates");
  const outerCoordinates = parseKmlCoordinates(getElementText(outerCoordinatesElement));

  if (!outerCoordinates.length) {
    return null;
  }

  const innerRings = findDescendantsByLocalName(polygonElement, "innerboundaryis")
    .map((innerBoundary) => findFirstDescendantByLocalName(innerBoundary, "linearring"))
    .map((innerRing) => findFirstDescendantByLocalName(innerRing, "coordinates"))
    .map((coordinatesElement) => parseKmlCoordinates(getElementText(coordinatesElement)))
    .filter((ringCoordinates) => ringCoordinates.length);

  return {
    type: "Polygon",
    coordinates: [outerCoordinates, ...innerRings]
  };
}

function coalesceKmlGeometries(geometries) {
  if (!geometries.length) {
    return null;
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  const geometryTypes = new Set(geometries.map((geometry) => geometry.type));

  if (geometryTypes.size === 1) {
    const [type] = geometryTypes;

    if (type === "Point") {
      return {
        type: "MultiPoint",
        coordinates: geometries.map((geometry) => geometry.coordinates)
      };
    }

    if (type === "LineString") {
      return {
        type: "MultiLineString",
        coordinates: geometries.map((geometry) => geometry.coordinates)
      };
    }

    if (type === "Polygon") {
      return {
        type: "MultiPolygon",
        coordinates: geometries.map((geometry) => geometry.coordinates)
      };
    }
  }

  return {
    type: "GeometryCollection",
    geometries
  };
}

function parseKmlGeometry(geometryElement) {
  const geometryType = getElementLocalName(geometryElement);

  if (geometryType === "point") {
    return parseKmlPoint(geometryElement);
  }

  if (geometryType === "linestring") {
    return parseKmlLineString(geometryElement);
  }

  if (geometryType === "polygon") {
    return parseKmlPolygon(geometryElement);
  }

  if (geometryType === "multigeometry") {
    const geometries = getChildElements(geometryElement)
      .map((child) => parseKmlGeometry(child))
      .filter(Boolean);

    return coalesceKmlGeometries(geometries);
  }

  return null;
}

function parseKmlProperties(placemarkElement) {
  const properties = {};
  const name = getElementText(findFirstDescendantByLocalName(placemarkElement, "name"));
  const description = getElementText(findFirstDescendantByLocalName(placemarkElement, "description"));

  if (name) {
    properties.name = name;
  }

  if (description) {
    properties.description = description;
  }

  findDescendantsByLocalName(placemarkElement, "data").forEach((dataElement) => {
    const key = String(dataElement?.getAttribute?.("name") || "").trim();
    const value = getElementText(findFirstDescendantByLocalName(dataElement, "value"));

    if (key && value) {
      properties[key] = value;
    }
  });

  findDescendantsByLocalName(placemarkElement, "simpledata").forEach((dataElement) => {
    const key = String(dataElement?.getAttribute?.("name") || "").trim();
    const value = getElementText(dataElement);

    if (key && value) {
      properties[key] = value;
    }
  });

  return properties;
}

function parseKmlPlacemark(placemarkElement) {
  const geometryElement = getChildElements(placemarkElement).find((child) => {
    const localName = getElementLocalName(child);
    return localName === "point" || localName === "linestring" || localName === "polygon" || localName === "multigeometry";
  }) || findFirstDescendantByLocalName(placemarkElement, "multigeometry")
    || findFirstDescendantByLocalName(placemarkElement, "polygon")
    || findFirstDescendantByLocalName(placemarkElement, "linestring")
    || findFirstDescendantByLocalName(placemarkElement, "point");

  const geometry = parseKmlGeometry(geometryElement);

  if (!geometry) {
    return null;
  }

  return {
    type: "Feature",
    properties: parseKmlProperties(placemarkElement),
    geometry
  };
}

function parseKmlDocument(xml) {
  const placemarks = findDescendantsByLocalName(xml?.documentElement, "placemark");
  const features = placemarks.map(parseKmlPlacemark).filter(Boolean);

  return {
    type: "FeatureCollection",
    features
  };
}

function parseKmlText(kmlText, sourceUrl) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(kmlText, "application/xml");
  const parserError = xml.querySelector("parsererror");

  if (parserError) {
    throw new Error(`Unable to parse KML from ${sourceUrl}.`);
  }

  const parsed = toGeoJSON.kml(xml);
  const fallback = parseKmlDocument(xml);

  if (Array.isArray(fallback?.features) && fallback.features.length) {
    return fallback;
  }

  if (Array.isArray(parsed?.features) && parsed.features.length) {
    return parsed;
  }

  return fallback;
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
    const geoJson = await response.json();
    return geoJson;
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
