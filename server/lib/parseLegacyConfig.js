import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  cdataPropName: "cdata"
});

const datatypeMap = {
  "darwin:decimallatitude": "Latitude",
  "darwin:decimallongitude": "Longitude",
  "darwin:horizontaldatum": "Datum",
  "darwin:coordinateuncertaintyinmeters": "ErrorRadiusInMeters"
};

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    if (typeof value.cdata === "string") {
      return value.cdata;
    }

    if (typeof value["#text"] === "string") {
      return value["#text"];
    }

    return "";
  }

  return "";
}

function toHex(red, green, blue) {
  const clamp = (value) => Number.parseInt(value || 0, 10).toString(16).padStart(2, "0");
  return `#${clamp(red)}${clamp(green)}${clamp(blue)}`;
}

function normalizeWebColor(value) {
  const normalized = String(value || "").trim().replace(/^#/, "");

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }

  return "";
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function parseRecordLinkBack(recordLinkBackNode) {
  const linkback = recordLinkBackNode?.linkback || recordLinkBackNode;

  if (!linkback || typeof linkback !== "object") {
    return null;
  }

  const keys = Object.keys(linkback)
    .filter((key) => /^key\d+$/i.test(key))
    .sort((left, right) => Number(left.replace(/\D/g, "")) - Number(right.replace(/\D/g, "")))
    .map((key) => ({
      key: linkback[key],
      value: linkback[`value${key.replace(/\D/g, "")}`]
    }))
    .filter((entry) => entry.key && entry.value);

  return {
    method: toText(linkback.method).toLowerCase(),
    linkurl: decodeXmlEntities(toText(linkback.linkurl)),
    text: toText(linkback.text),
    fieldname: toText(linkback.fieldname) || "Link Back",
    keys
  };
}

function parseDominantPalette(colorsNode, paletteFallback = {}) {
  const dominantColor = normalizeWebColor(colorsNode?.dominantcolor?.webcolor || paletteFallback.dominantColor);
  const subdominantColor = normalizeWebColor(colorsNode?.subdominantcolor?.webcolor || paletteFallback.subdominantColor);
  const textDominantColor = normalizeWebColor(colorsNode?.textdominantcolor?.webcolor || paletteFallback.textDominantColor);

  return {
    dominantColor,
    subdominantColor,
    textDominantColor
  };
}

function parseColorConfig(colorsNode, paletteFallback = {}) {
  if (!colorsNode || typeof colorsNode !== "object") {
    return null;
  }

  const method = toText(colorsNode.method).toLowerCase();
  const fieldname = normalizeColumnName(toText(colorsNode.fieldname));

  if (!method || !fieldname) {
    return null;
  }

  const palette = parseDominantPalette(colorsNode, paletteFallback);

  return {
    method,
    fieldname,
    label: toText(colorsNode.label) || fieldname,
    dominantColor: palette.dominantColor,
    subdominantColor: palette.subdominantColor,
    textDominantColor: palette.textDominantColor,
    colors: toArray(colorsNode.color).map((color) => ({
      key: color.key || "default",
      label: color.label || color.key || "Default",
      red: Number(color.red || 0),
      green: Number(color.green || 0),
      blue: Number(color.blue || 0),
      hex: toHex(color.red, color.green, color.blue)
    }))
  };
}

export function normalizeColumnName(datatype = "") {
  return datatypeMap[datatype.toLowerCase()] || datatype;
}

export function parseLegacyConfig(xmlText) {
  if (!xmlText?.trim()) {
    return {
      metadata: {},
      concepts: [],
      colors: [],
      logos: [],
      layers: []
    };
  }

  const parsed = parser.parse(xmlText);
  const root =
    parsed.berkeleymapper ||
    parsed.bnhmmaps ||
    parsed.BNHMMaps ||
    parsed[Object.keys(parsed)[0]] ||
    {};
  const metadata = root.metadata || {};
  const paletteFallback = parseDominantPalette(root);
  const colorConfigs = toArray(root.colors)
    .map((colorsNode) => parseColorConfig(colorsNode, paletteFallback))
    .filter(Boolean);
  const colors = colorConfigs[0] || {};

  return {
    metadata: {
      name: toText(metadata.name) || "Untitled BerkeleyMapper dataset",
      abstract: toText(metadata.abstract),
      disclaimer: toText(metadata.disclaimer),
      relatedinformation: toText(metadata.relatedinformation),
      legendText: toText(metadata.legendText) || toText(metadata.abstract)
    },
    concepts: toArray(root.concepts?.concept).map((concept, index) => ({
      index,
      order: Number(concept.order || index + 1),
      alias: concept.alias || normalizeColumnName(concept.datatype),
      datatype: concept.datatype || "",
      name: normalizeColumnName(concept.datatype),
      viewlist: concept.viewlist === undefined ? true : `${concept.viewlist}` === "1",
      colorlist: concept.colorlist === undefined ? false : `${concept.colorlist}` === "1"
    })),
    colors: toArray(colors.color).map((color) => ({
      key: color.key || "default",
      label: color.label || color.key || "Default",
      red: Number(color.red || 0),
      green: Number(color.green || 0),
      blue: Number(color.blue || 0),
      hex: toHex(color.red, color.green, color.blue)
    })),
    colorConfig: colorConfigs[0] || null,
    colorConfigs,
    logos: toArray(metadata.logo).concat(toArray(root.logos?.logo || root.logo)).map((logo) => ({
      img: logo.img || "",
      url: logo.url || ""
    })).filter((logo) => logo.img || logo.url),
    layers: toArray(root.gisdata?.layer).map((layer) => ({
      title: layer.title || "",
      url: layer.url || "",
      active: `${layer.active || ""}` === "1",
      legend: `${layer.legend || ""}` === "1",
      location: layer.cdata || layer["#text"] || ""
    })),
    recordLinkBack: parseRecordLinkBack(root.recordlinkback || root.linkback || metadata.linkback)
  };
}
