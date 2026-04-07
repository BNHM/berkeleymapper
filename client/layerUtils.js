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

function findFirstChildByLocalName(node, name) {
  const target = String(name || "").toLowerCase();
  return getChildElements(node).find((child) => getElementLocalName(child) === target) || null;
}

function getElementText(node) {
  return String(node?.textContent || "").trim();
}

function getStyleIdentifier(node) {
  return String(node?.getAttribute?.("id") || node?.getAttribute?.("xml:id") || "").trim();
}

function normalizeKmlStyleReference(styleUrl) {
  const value = String(styleUrl || "").trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("#")) {
    return value;
  }

  const hashIndex = value.indexOf("#");
  if (hashIndex >= 0) {
    const fragment = value.slice(hashIndex);
    return fragment.startsWith("#") ? fragment : `#${fragment}`;
  }

  return value;
}

function parseKmlBoolean(text) {
  const value = String(text || "").trim().toLowerCase();

  if (!value) {
    return undefined;
  }

  if (value === "1" || value === "true") {
    return true;
  }

  if (value === "0" || value === "false") {
    return false;
  }

  return undefined;
}

function parseKmlNumber(text) {
  const value = Number.parseFloat(String(text || "").trim());
  return Number.isFinite(value) ? value : undefined;
}

function parseKmlColor(text) {
  const value = String(text || "").trim().replace(/^#/, "");

  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
    return null;
  }

  const normalized = value.length === 6 ? `ff${value}` : value;
  const alpha = normalized.slice(0, 2);
  const blue = normalized.slice(2, 4);
  const green = normalized.slice(4, 6);
  const red = normalized.slice(6, 8);

  return {
    color: `#${red}${green}${blue}`.toLowerCase(),
    opacity: Number.parseInt(alpha, 16) / 255
  };
}

function resolveKmlIconHref(href, sourceUrl, options = {}) {
  const value = String(href || "").trim();

  if (!value) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (!options.allowRelativeIcons) {
    return "";
  }

  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return "";
  }
}

function mergeKmlStyles(baseStyle, nextStyle) {
  return {
    ...(baseStyle || {}),
    ...(nextStyle || {})
  };
}

function parseKmlLineStyle(styleElement) {
  const lineStyleElement = findFirstChildByLocalName(styleElement, "linestyle");

  if (!lineStyleElement) {
    return null;
  }

  const color = parseKmlColor(getElementText(findFirstChildByLocalName(lineStyleElement, "color")));
  const width = parseKmlNumber(getElementText(findFirstChildByLocalName(lineStyleElement, "width")));
  const style = {};

  if (color?.color) {
    style.lineColor = color.color;
    style.lineOpacity = color.opacity;
  }

  if (width !== undefined) {
    style.lineWidth = width;
  }

  return Object.keys(style).length ? style : null;
}

function parseKmlPolyStyle(styleElement) {
  const polyStyleElement = findFirstChildByLocalName(styleElement, "polystyle");

  if (!polyStyleElement) {
    return null;
  }

  const color = parseKmlColor(getElementText(findFirstChildByLocalName(polyStyleElement, "color")));
  const fill = parseKmlBoolean(getElementText(findFirstChildByLocalName(polyStyleElement, "fill")));
  const outline = parseKmlBoolean(getElementText(findFirstChildByLocalName(polyStyleElement, "outline")));
  const style = {};

  if (color?.color) {
    style.fillColor = color.color;
    style.fillOpacity = color.opacity;
  }

  if (fill !== undefined) {
    style.fill = fill;
  }

  if (outline !== undefined) {
    style.outline = outline;
  }

  return Object.keys(style).length ? style : null;
}

function parseKmlIconStyle(styleElement, sourceUrl, options = {}) {
  const iconStyleElement = findFirstChildByLocalName(styleElement, "iconstyle");

  if (!iconStyleElement) {
    return null;
  }

  const color = parseKmlColor(getElementText(findFirstChildByLocalName(iconStyleElement, "color")));
  const scale = parseKmlNumber(getElementText(findFirstChildByLocalName(iconStyleElement, "scale")));
  const iconElement = findFirstChildByLocalName(iconStyleElement, "icon");
  const href = resolveKmlIconHref(
    getElementText(findFirstChildByLocalName(iconElement, "href")),
    sourceUrl,
    options
  );
  const style = {};

  if (color?.color) {
    style.iconColor = color.color;
    style.iconOpacity = color.opacity;
  }

  if (scale !== undefined) {
    style.iconScale = scale;
  }

  if (href) {
    style.iconHref = href;
  }

  return Object.keys(style).length ? style : null;
}

function parseKmlStyleElement(styleElement, sourceUrl, options = {}) {
  const style = mergeKmlStyles(
    mergeKmlStyles(
      parseKmlLineStyle(styleElement),
      parseKmlPolyStyle(styleElement)
    ),
    parseKmlIconStyle(styleElement, sourceUrl, options)
  );

  return Object.keys(style).length ? style : null;
}

function parseKmlStyleMapElement(styleMapElement, sourceUrl, options = {}) {
  const entries = {};

  getChildElements(styleMapElement)
    .filter((child) => getElementLocalName(child) === "pair")
    .forEach((pairElement) => {
      const key = getElementText(findFirstChildByLocalName(pairElement, "key")).toLowerCase() || "normal";
      const styleUrl = getElementText(findFirstChildByLocalName(pairElement, "styleurl"));
      const inlineStyleElement = findFirstChildByLocalName(pairElement, "style");

      entries[key] = {
        styleUrl,
        style: inlineStyleElement ? parseKmlStyleElement(inlineStyleElement, sourceUrl, options) : null
      };
    });

  return Object.keys(entries).length ? entries : null;
}

function resolveKmlStyleReference(styleUrl, styleContext, trail = new Set()) {
  const reference = normalizeKmlStyleReference(styleUrl);

  if (!reference || trail.has(reference)) {
    return null;
  }

  trail.add(reference);

  if (styleContext.styles.has(reference)) {
    return styleContext.styles.get(reference);
  }

  const styleMap = styleContext.styleMaps.get(reference);
  if (!styleMap) {
    return null;
  }

  const preferredEntries = [
    styleMap.normal,
    styleMap.highlight,
    ...Object.values(styleMap)
  ].filter(Boolean);

  let resolvedStyle = null;
  preferredEntries.forEach((entry) => {
    resolvedStyle = mergeKmlStyles(
      resolvedStyle,
      mergeKmlStyles(
        resolveKmlStyleReference(entry.styleUrl, styleContext, trail),
        entry.style
      )
    );
  });

  return resolvedStyle;
}

function buildKmlStyleContext(xml, sourceUrl, options = {}) {
  const styles = new Map();
  const styleMaps = new Map();

  findDescendantsByLocalName(xml?.documentElement, "style").forEach((styleElement) => {
    const identifier = getStyleIdentifier(styleElement);

    if (!identifier) {
      return;
    }

    const style = parseKmlStyleElement(styleElement, sourceUrl, options);
    if (!style) {
      return;
    }

    styles.set(`#${identifier}`, style);
    styles.set(identifier, style);
  });

  findDescendantsByLocalName(xml?.documentElement, "stylemap").forEach((styleMapElement) => {
    const identifier = getStyleIdentifier(styleMapElement);

    if (!identifier) {
      return;
    }

    const styleMap = parseKmlStyleMapElement(styleMapElement, sourceUrl, options);
    if (!styleMap) {
      return;
    }

    styleMaps.set(`#${identifier}`, styleMap);
    styleMaps.set(identifier, styleMap);
  });

  return {
    styles,
    styleMaps
  };
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

function parseKmlPlacemarkStyle(placemarkElement, styleContext, sourceUrl, options = {}) {
  const directStyleUrl = getElementText(findFirstChildByLocalName(placemarkElement, "styleurl"));
  const directStyleElement = findFirstChildByLocalName(placemarkElement, "style");
  const directStyleMapElement = findFirstChildByLocalName(placemarkElement, "stylemap");
  let style = resolveKmlStyleReference(directStyleUrl, styleContext);

  if (directStyleMapElement) {
    const inlineStyleMap = parseKmlStyleMapElement(directStyleMapElement, sourceUrl, options);
    const preferredEntries = inlineStyleMap
      ? [inlineStyleMap.normal, inlineStyleMap.highlight, ...Object.values(inlineStyleMap)].filter(Boolean)
      : [];

    preferredEntries.forEach((entry) => {
      style = mergeKmlStyles(
        style,
        mergeKmlStyles(
          resolveKmlStyleReference(entry.styleUrl, styleContext),
          entry.style
        )
      );
    });
  }

  if (directStyleElement) {
    style = mergeKmlStyles(style, parseKmlStyleElement(directStyleElement, sourceUrl, options));
  }

  return style && Object.keys(style).length ? style : null;
}

function parseKmlPlacemark(placemarkElement, styleContext, sourceUrl, options = {}) {
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
    geometry,
    kmlStyle: parseKmlPlacemarkStyle(placemarkElement, styleContext, sourceUrl, options)
  };
}

function parseKmlDocument(xml, sourceUrl, options = {}) {
  const placemarks = findDescendantsByLocalName(xml?.documentElement, "placemark");
  const styleContext = buildKmlStyleContext(xml, sourceUrl, options);
  const features = placemarks
    .map((placemarkElement) => parseKmlPlacemark(placemarkElement, styleContext, sourceUrl, options))
    .filter(Boolean);

  return {
    type: "FeatureCollection",
    features
  };
}

function parseKmlText(kmlText, sourceUrl, options = {}) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(kmlText, "application/xml");
  const parserError = xml.querySelector("parsererror");

  if (parserError) {
    throw new Error(`Unable to parse KML from ${sourceUrl}.`);
  }

  const parsed = toGeoJSON.kml(xml);
  const fallback = parseKmlDocument(xml, sourceUrl, options);

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
    return parseKmlText(kmlText, sourceUrl, { allowRelativeIcons: false });
  }

  if (format === "kml") {
    const kmlText = await response.text();
    return parseKmlText(kmlText, sourceUrl, { allowRelativeIcons: true });
  }

  throw new Error(`Unsupported layer format for ${sourceUrl}.`);
}
