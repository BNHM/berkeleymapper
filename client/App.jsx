import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import turfArea from "@turf/area";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { LayersControl, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet.markercluster";
import { getLayerSourceUrl, loadLayerGeoJson } from "./layerUtils.js";
import { buildDatasetPayload } from "../shared/buildDatasetPayload.js";

const brandLogo = "/logo_medium_t.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const defaultCenter = [37.85, -122.27];
const defaultZoom = 4;
const baseMapDefinitions = Object.freeze([
  {
    name: "Street Map",
    checked: true,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  },
  {
    name: "Topographic",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
  },
  {
    name: "USGS Topo",
    attribution: 'Tiles courtesy <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
    maxNativeZoom: 16,
    maxZoom: 19,
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
  },
  {
    name: "USGS Topo (Legacy)",
    attribution: 'Tiles &copy; Esri; Copyright &copy; 2011 National Geographic Society, i-cubed',
    maxNativeZoom: 15,
    maxZoom: 19,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}"
  },
  {
    name: "Imagery",
    attribution: "Tiles &copy; Esri",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  }
]);
const arctosDemo = {
  tabfile: "/sampledata/arctostest.txt",
  configfile: "/sampledata/arctostest.xml"
};
const arctosDemoHref = `?${new URLSearchParams(arctosDemo).toString()}`;
const arctosCsvDemo = {
  tabfile: "/sampledata/arctostest-100.csv",
  configfile: "/sampledata/arctostest.xml"
};
const arctosCsvDemoHref = `?${new URLSearchParams(arctosCsvDemo).toString()}`;
const amphibiawebDemo = {
  tabfile: "/sampledata/amphibiaweb.txt",
  configfile: "/sampledata/amphibiaweb.xml"
};
const amphibiawebDemoHref = `?${new URLSearchParams(amphibiawebDemo).toString()}`;
const configOnlyDemo = {
  configfile: "/sampledata/no-tabfile-config.xml"
};
const configOnlyDemoHref = `?${new URLSearchParams(configOnlyDemo).toString()}`;
const ucmpJoinDemo = {
  configfile: "/sampledata/ucmp2.xml",
  sourcename: "UCMP specimen search",
  tabfile: "/sampledata/ucmp2.txt"
};
const ucmpJoinDemoHref = `?ViewResults=join&${new URLSearchParams(ucmpJoinDemo).toString()}`;
const phoneViewportMediaQuery = "(max-width: 720px)";
const anchorTagPattern = /^<a\s+[^>]*href=(["'])(.*?)\1[^>]*>(.*?)<\/a>$/i;
const urlPattern = /^https?:\/\/\S+$/i;
const markerPalette = [
  "#d73027",
  "#4575b4",
  "#1a9850",
  "#984ea3",
  "#ff7f00",
  "#a6761d",
  "#66a61e",
  "#e7298a",
  "#7570b3",
  "#e6ab02"
];
const numberFormatter = new Intl.NumberFormat();
const spatialStatisticsCoordinatePrecision = 4;
const geocodeSearchUrl = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=";
const datasetLayerPaneName = "bm-dataset-layers";
const recordPointPaneName = "bm-record-points";
const emptyRecordIdsByCountyKey = new Map();
const spatialStatisticsModes = Object.freeze([
  { value: "none", label: "Column Values" },
  { value: "country", label: "Intersect Countries" },
  { value: "state", label: "Intersect States" },
  { value: "county", label: "Intersect Counties" }
]);
const emptySpatialStatisticsResult = Object.freeze({
  country: [],
  state: [],
  county: []
});
const usStateAliasMap = Object.freeze({
  AL: "ALABAMA",
  AK: "ALASKA",
  AZ: "ARIZONA",
  AR: "ARKANSAS",
  CA: "CALIFORNIA",
  CO: "COLORADO",
  CT: "CONNECTICUT",
  DE: "DELAWARE",
  FL: "FLORIDA",
  GA: "GEORGIA",
  HI: "HAWAII",
  ID: "IDAHO",
  IL: "ILLINOIS",
  IN: "INDIANA",
  IA: "IOWA",
  KS: "KANSAS",
  KY: "KENTUCKY",
  LA: "LOUISIANA",
  ME: "MAINE",
  MD: "MARYLAND",
  MA: "MASSACHUSETTS",
  MI: "MICHIGAN",
  MN: "MINNESOTA",
  MS: "MISSISSIPPI",
  MO: "MISSOURI",
  MT: "MONTANA",
  NE: "NEBRASKA",
  NV: "NEVADA",
  NH: "NEW HAMPSHIRE",
  NJ: "NEW JERSEY",
  NM: "NEW MEXICO",
  NY: "NEW YORK",
  NC: "NORTH CAROLINA",
  ND: "NORTH DAKOTA",
  OH: "OHIO",
  OK: "OKLAHOMA",
  OR: "OREGON",
  PA: "PENNSYLVANIA",
  RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA",
  SD: "SOUTH DAKOTA",
  TN: "TENNESSEE",
  TX: "TEXAS",
  UT: "UTAH",
  VT: "VERMONT",
  VA: "VIRGINIA",
  WA: "WASHINGTON",
  WV: "WEST VIRGINIA",
  WI: "WISCONSIN",
  WY: "WYOMING",
  DC: "DISTRICT OF COLUMBIA"
});
const removableCountySuffixPattern = /\b(COUNTY|PARISH|BOROUGH|CENSUS AREA|CITY AND BOROUGH|MUNICIPALITY|DISTRICT|REGION|PREFECTURE|PROVINCE|DEPARTMENT|COMMUNE|METROPOLITAN MUNICIPALITY)\b$/;

function buildInitialLayerStates(layers = []) {
  return layers.map((layer) => ({
    visible: Boolean(layer?.active),
    loading: false,
    loaded: false,
    error: "",
    boundsValid: false,
    zoomNonce: layer?.active ? 1 : 0,
    featureCount: 0,
    loadNonce: 0
  }));
}

function shouldAttemptServerLoad(payload) {
  return Boolean(payload?.tabfile || payload?.configfile) && !payload?.tabdata && !payload?.configdata;
}

function isSameOriginAssetUrl(value) {
  if (!value || typeof window === "undefined") {
    return false;
  }

  try {
    const resolved = new URL(value, window.location.href);
    return resolved.origin === window.location.origin && !resolved.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function shouldLoadDatasetFromClientFiles(payload) {
  if (!shouldAttemptServerLoad(payload)) {
    return false;
  }

  const sources = [payload?.tabfile, payload?.configfile].filter(Boolean);
  return sources.length > 0 && sources.every(isSameOriginAssetUrl);
}

async function fetchRequiredText(url, label) {
  if (!url) {
    return "";
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${label}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function isRecoverableDevDatasetLoadError(error) {
  return Boolean(error?.recoverableDevFallback);
}

function buildInitialForm() {
  const params = new URLSearchParams(window.location.search);

  return {
    tabfile: params.get("tabfile") || "",
    configfile: params.get("configfile") || ""
  };
}

function detectPhoneViewport() {
  return typeof window !== "undefined" && window.matchMedia(phoneViewportMediaQuery).matches;
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, "").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function normalizeJoinText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("&", " and ")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeUsStateName(value) {
  const normalized = normalizeJoinText(value);
  return usStateAliasMap[normalized] || normalized;
}

function stripCountySuffix(value) {
  return normalizeJoinText(value).replace(removableCountySuffixPattern, "").trim();
}

function buildCountyJoinKey(stateValue, countyValue) {
  const stateName = canonicalizeUsStateName(stateValue);
  const countyName = stripCountySuffix(countyValue) || normalizeJoinText(countyValue);

  if (!stateName || !countyName) {
    return "";
  }

  return `${stateName}::${countyName}`;
}

function buildCountyFeatureJoinKeys(properties = {}) {
  const stateName = canonicalizeUsStateName(properties.NAME_1 || properties.state || "");
  const countyName = normalizeJoinText(properties.NAME_2 || properties.county || "");
  const countyType = normalizeJoinText(properties.ENGTYPE_2 || properties.TYPE_2 || "");

  if (!stateName || !countyName) {
    return [];
  }

  const baseCountyName = stripCountySuffix(countyName) || countyName;
  const variants = new Set([countyName, baseCountyName]);

  if (countyType) {
    variants.add(`${baseCountyName} ${countyType}`.trim());
    variants.add(`${countyName} ${countyType}`.trim());
  }

  return [...variants]
    .filter(Boolean)
    .map((countyVariant) => `${stateName}::${countyVariant}`);
}

function getCountyFeatureRecordIds(properties, recordIdsByCountyKey) {
  const recordIds = new Set();

  buildCountyFeatureJoinKeys(properties).forEach((key) => {
    const matchingRecordIds = recordIdsByCountyKey.get(key) || [];
    matchingRecordIds.forEach((recordId) => {
      recordIds.add(recordId);
    });
  });

  return [...recordIds];
}

function buildCountymatchLookup(records, joinConfig) {
  const recordIdsByCountyKey = new Map();
  const stateNames = new Set();
  let maxCount = 0;

  if (!joinConfig?.fieldname1 || !joinConfig?.fieldname2) {
    return {
      recordIdsByCountyKey,
      stateNames: [],
      maxCount
    };
  }

  records.forEach((record) => {
    const stateValue = record.values?.[joinConfig.fieldname1] || "";
    const canonicalStateName = canonicalizeUsStateName(stateValue);
    if (canonicalStateName) {
      stateNames.add(canonicalStateName);
    }

    const key = buildCountyJoinKey(
      stateValue,
      record.values?.[joinConfig.fieldname2] || ""
    );

    if (!key) {
      return;
    }

    const nextRecordIds = recordIdsByCountyKey.get(key) || [];
    nextRecordIds.push(record.id);
    recordIdsByCountyKey.set(key, nextRecordIds);
    maxCount = Math.max(maxCount, nextRecordIds.length);
  });

  return {
    recordIdsByCountyKey,
    stateNames: [...stateNames].sort(),
    maxCount
  };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function looksLikeHtml(value) {
  return typeof value === "string" && /<[^>]+>/.test(value);
}

function sanitizeLayerPopupHtml(value) {
  if (!looksLikeHtml(value)) {
    return escapeHtml(String(value || ""));
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(value, "text/html");
  const allowedTags = new Set([
    "a",
    "b",
    "blockquote",
    "br",
    "caption",
    "code",
    "div",
    "em",
    "i",
    "li",
    "ol",
    "p",
    "pre",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul"
  ]);
  const removableTags = new Set(["head", "html", "body"]);
  const dropTags = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);
  const allowedAttrs = {
    a: new Set(["href", "target", "title"]),
    table: new Set(["border", "cellpadding", "cellspacing"]),
    td: new Set(["align", "bgcolor", "colspan", "rowspan", "valign"]),
    th: new Set(["align", "bgcolor", "colspan", "rowspan", "valign"]),
    tr: new Set(["align", "bgcolor", "valign"]),
    div: new Set(["align"]),
    p: new Set(["align"]),
    span: new Set(["align"])
  };

  const sanitizeUrl = (url) => {
    const trimmed = String(url || "").trim();

    if (!trimmed) {
      return "";
    }

    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }

    return "";
  };

  const walk = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tagName = node.tagName.toLowerCase();

    if (dropTags.has(tagName)) {
      node.remove();
      return;
    }

    if (removableTags.has(tagName) || !allowedTags.has(tagName)) {
      const parent = node.parentNode;

      if (!parent) {
        return;
      }

      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }

      node.remove();
      return;
    }

    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const allowed = allowedAttrs[tagName];

      if (!allowed || !allowed.has(name)) {
        node.removeAttribute(attribute.name);
        return;
      }

      if (tagName === "a" && name === "href") {
        const sanitizedHref = sanitizeUrl(attribute.value);

        if (!sanitizedHref) {
          node.removeAttribute(attribute.name);
          return;
        }

        node.setAttribute("href", sanitizedHref);
      }

      if (tagName === "a" && name === "target" && attribute.value === "_blank") {
        node.setAttribute("rel", "noreferrer noopener");
      }
    });

    [...node.childNodes].forEach(walk);
  };

  [...document.body.childNodes].forEach(walk);

  return document.body.innerHTML;
}

function buildLayerFeaturePopupHtml(title, properties = {}) {
  const featureName = properties.name ? String(properties.name).trim() : "";
  const description = properties.description ? String(properties.description).trim() : "";
  const renderedDescription = description && looksLikeHtml(description)
    ? sanitizeLayerPopupHtml(description)
    : "";
  const rows = Object.entries(properties)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .filter(([key]) => !(renderedDescription && (key === "description" || key === "name")))
    .slice(0, 6);

  if (!rows.length && !renderedDescription && !featureName) {
    return title ? `<div class="popup-body"><strong>${escapeHtml(title)}</strong></div>` : "";
  }

  return [
    `<div class="popup-body">`,
    title ? `<div><strong>${escapeHtml(title)}</strong></div>` : "",
    renderedDescription && featureName && featureName.toLowerCase() !== title?.toLowerCase()
      ? `<div><strong>Name</strong>: ${escapeHtml(featureName)}</div>`
      : "",
    renderedDescription
      ? `<div class="popup-kml-description">${renderedDescription}</div>`
      : rows.map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(value))}</div>`).join(""),
    `</div>`
  ].join("");
}

function buildLayerFeatureDetails(title, properties = {}) {
  const featureName = properties.name ? String(properties.name).trim() : "";
  const description = properties.description ? String(properties.description).trim() : "";
  const descriptionIsHtml = looksLikeHtml(description);

  return {
    title: String(title || "").trim(),
    featureName,
    descriptionHtml: descriptionIsHtml ? sanitizeLayerPopupHtml(description) : "",
    descriptionText: description && !descriptionIsHtml ? description : "",
    rows: Object.entries(properties)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .filter(([key]) => key !== "name" && key !== "description")
  };
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5.5v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M5.5 8h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 12 12 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M7.5 4H12v4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M12.5 6A4.8 4.8 0 1 0 13 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M10.5 3.5h3v3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function truncateLayerTitle(value, maxLength = 20) {
  const text = String(value || "");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function getLayerAccentColor(index) {
  return markerPalette[index % markerPalette.length];
}

function ensureMapPane(map, paneName, zIndex) {
  let pane = map.getPane(paneName);

  if (!pane) {
    pane = map.createPane(paneName);
  }

  pane.style.zIndex = String(zIndex);
  return pane;
}

function clampPositiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clampUnitInterval(value, fallback) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function createKmlPointIconFactory() {
  const iconCache = new Map();

  return (featureStyle) => {
    const iconHref = String(featureStyle?.iconHref || "").trim();
    if (!iconHref) {
      return null;
    }

    const iconScale = clampPositiveNumber(featureStyle?.iconScale, 1);
    const iconSize = Math.max(16, Math.round(32 * iconScale));
    const cacheKey = `${iconHref}|${iconSize}`;

    if (!iconCache.has(cacheKey)) {
      iconCache.set(cacheKey, L.icon({
        iconUrl: iconHref,
        iconRetinaUrl: iconHref,
        iconSize: [iconSize, iconSize],
        iconAnchor: [Math.round(iconSize / 2), iconSize],
        popupAnchor: [0, -iconSize + 6]
      }));
    }

    return iconCache.get(cacheKey) || null;
  };
}

function getLeafletKmlPathStyle(feature, fallbackColor) {
  const featureStyle = feature?.kmlStyle || {};
  const geometryType = feature?.geometry?.type || "";

  if (geometryType.includes("Polygon")) {
    const hasOutline = featureStyle.outline !== false;
    const hasFill = featureStyle.fill !== false;

    return {
      color: featureStyle.lineColor || fallbackColor,
      weight: clampPositiveNumber(featureStyle.lineWidth, 2),
      opacity: clampUnitInterval(featureStyle.lineOpacity, 0.9),
      fillColor: featureStyle.fillColor || fallbackColor,
      fillOpacity: clampUnitInterval(featureStyle.fillOpacity, 0.12),
      stroke: hasOutline,
      fill: hasFill
    };
  }

  return {
    color: featureStyle.lineColor || fallbackColor,
    weight: clampPositiveNumber(featureStyle.lineWidth, 2),
    opacity: clampUnitInterval(featureStyle.lineOpacity, 0.95)
  };
}

function getLeafletKmlPointOptions(feature, fallbackColor) {
  const featureStyle = feature?.kmlStyle || {};
  const pointColor = featureStyle.iconColor || fallbackColor;
  const iconScale = clampPositiveNumber(featureStyle.iconScale, 1);
  const strokeOpacity = clampUnitInterval(featureStyle.iconOpacity, 0.95);
  const fillOpacity = clampUnitInterval(featureStyle.iconOpacity, 0.3);

  return {
    radius: Math.max(4, Math.min(18, Math.round(5 * iconScale))),
    color: pointColor,
    weight: 1.5,
    opacity: strokeOpacity,
    fillColor: pointColor,
    fillOpacity
  };
}

function createLeafletDataLayer(geoJson, layer, index, onFeatureSelect) {
  const color = getLayerAccentColor(index);
  const createPointIcon = createKmlPointIconFactory();

  return L.geoJSON(geoJson, {
    pane: datasetLayerPaneName,
    style(feature) {
      return getLeafletKmlPathStyle(feature, color);
    },
    pointToLayer(feature, latlng) {
      const pointIcon = createPointIcon(feature?.kmlStyle);

      if (pointIcon) {
        return L.marker(latlng, {
          icon: pointIcon,
          pane: datasetLayerPaneName
        });
      }

      return L.circleMarker(latlng, {
        ...getLeafletKmlPointOptions(feature, color),
        pane: datasetLayerPaneName
      });
    },
    onEachFeature(feature, leafletLayer) {
      leafletLayer.on("click", () => {
        onFeatureSelect?.(layer?.title || "Layer Details", feature?.properties || {});
      });
    }
  });
}

function parseLinkValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const anchorMatch = value.trim().match(anchorTagPattern);
  if (anchorMatch) {
    const href = decodeHtmlEntities(anchorMatch[2]);
    const label = decodeHtmlEntities(stripHtml(anchorMatch[3]) || href);

    return {
      href,
      label
    };
  }

  if (urlPattern.test(value.trim())) {
    const decodedValue = decodeHtmlEntities(value.trim());

    return {
      href: decodedValue,
      label: decodedValue
    };
  }

  return null;
}

function renderRecordValue(value, key) {
  const link = parseLinkValue(value);
  if (link) {
    return (
      <a key={key} href={link.href} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
        {link.label}
      </a>
    );
  }

  return value;
}

function renderRecordValueHtml(value) {
  const link = parseLinkValue(value);
  if (link) {
    return `<a href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`;
  }

  return escapeHtml(value || "");
}

function getRecordLabel(record, columns) {
  const firstVisible = columns.find((column) => column.visible && !["Latitude", "Longitude"].includes(column.name));
  if (!firstVisible) {
    return record.id;
  }

  const value = record.values[firstVisible.name] || record.id;
  const link = parseLinkValue(value);
  return link ? link.label : stripHtml(value);
}

function getDisplayedColumns(columns) {
  return columns.filter((column) => column.visible);
}

function parseDecimalDegrees(value) {
  const parts = String(value || "")
    .trim()
    .split(/[\/,\s]+/)
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const latitude = Number.parseFloat(parts[0]);
  const longitude = Number.parseFloat(parts[1]);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  if (latitude > 90 || latitude < -90 || longitude > 180 || longitude < -180) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}

function distanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  return L.latLng(latitudeA, longitudeA).distanceTo(L.latLng(latitudeB, longitudeB));
}

function buildRadiusFromBoundingBox(boundingBox, latitude, longitude) {
  if (!Array.isArray(boundingBox) || boundingBox.length < 4) {
    return 0;
  }

  const south = Number.parseFloat(boundingBox[0]);
  const north = Number.parseFloat(boundingBox[1]);
  const west = Number.parseFloat(boundingBox[2]);
  const east = Number.parseFloat(boundingBox[3]);

  if ([south, north, west, east].some((value) => Number.isNaN(value))) {
    return 0;
  }

  const cornerLatitude = (latitude + north) / 2;
  const cornerLongitude = (longitude + east) / 2;
  return Math.max(1, Math.round(distanceMeters(latitude, longitude, cornerLatitude, cornerLongitude)));
}

function normalizeGeocodeResult(result, query, index) {
  const latitude = Number.parseFloat(result.lat);
  const longitude = Number.parseFloat(result.lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    id: `geocode-${Date.now()}-${index}`,
    query,
    label: result.display_name || query,
    latitude,
    longitude,
    uncertaintyMeters: buildRadiusFromBoundingBox(result.boundingbox, latitude, longitude),
    protocol: "OpenStreetMap Nominatim",
    remarks: result.display_name || result.type || "Geocoded address search"
  };
}

function formatGeocodeResult(result) {
  return {
    id: result.id,
    label: result.label,
    latitude: Number(result.latitude).toFixed(4),
    longitude: Number(result.longitude).toFixed(4),
    uncertaintyMeters: Math.round(result.uncertaintyMeters || 0),
    protocol: result.protocol,
    remarks: result.remarks
  };
}

function buildGeocodePopupHtml(result) {
  const formatted = formatGeocodeResult(result);

  return `
    <div class="popup-body">
      <div><strong>${escapeHtml(result.query)}</strong></div>
      <ul class="popup-record-list">
        <li>Coordinate: ${escapeHtml(formatted.latitude)} / ${escapeHtml(formatted.longitude)} (${escapeHtml(String(formatted.uncertaintyMeters))} meters radius)</li>
        <li>Datum: WGS84</li>
        <li>Protocol: ${escapeHtml(formatted.protocol)}</li>
        <li>Remarks: ${escapeHtml(formatted.remarks)}</li>
      </ul>
      <div class="popup-geocode-actions">
        <button type="button" data-geocode-action="delete" data-geocode-id="${escapeHtml(result.id)}">Delete This</button>
        <button type="button" data-geocode-action="delete-others" data-geocode-id="${escapeHtml(result.id)}">Delete Others</button>
        <button type="button" data-geocode-action="zoom" data-geocode-id="${escapeHtml(result.id)}">Zoom In</button>
      </div>
    </div>
  `;
}

function createMarkerIcon(color) {
  return L.divIcon({
    className: "bm-marker-icon",
    html: `<span class="bm-marker-pin" style="background:${color}"></span>`,
    iconSize: [18, 24],
    iconAnchor: [9, 24],
    popupAnchor: [0, -22]
  });
}

function createPointStyle(color, renderer, selected = false) {
  return {
    renderer,
    radius: selected ? 7 : 4,
    fillColor: color,
    fillOpacity: 0.9,
    color: selected ? "#111111" : color,
    weight: selected ? 2 : 1,
    opacity: 0.95
  };
}

function clampRgbChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(value) {
  const normalized = String(value || "").trim().replace(/^#/, "");

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function toHexColor({ red, green, blue }) {
  return `#${clampRgbChannel(red).toString(16).padStart(2, "0")}${clampRgbChannel(green).toString(16).padStart(2, "0")}${clampRgbChannel(blue).toString(16).padStart(2, "0")}`;
}

function interpolateHexColor(startColor, endColor, ratio) {
  const start = parseHexColor(startColor);
  const end = parseHexColor(endColor);

  if (!start || !end) {
    return "";
  }

  return toHexColor({
    red: start.red + ((end.red - start.red) * ratio),
    green: start.green + ((end.green - start.green) * ratio),
    blue: start.blue + ((end.blue - start.blue) * ratio)
  });
}

function buildGeneratedLegend(uniqueValues, dominantColor, subdominantColor) {
  const firstColor = dominantColor || subdominantColor;
  const secondColor = subdominantColor || dominantColor;

  if (!firstColor || !secondColor) {
    return [];
  }

  if (uniqueValues.length <= 1) {
    return uniqueValues.map((value) => ({
      value,
      color: firstColor
    }));
  }

  return uniqueValues.map((value, index) => ({
    value,
    color: interpolateHexColor(firstColor, secondColor, index / (uniqueValues.length - 1)) || firstColor
  }));
}

function buildColorAssignments(records, colorBy, colorConfigs = []) {
  if (!colorBy) {
    return {
      colorMap: new Map(),
      defaultColor: "#cc3333",
      legend: []
    };
  }

  const activeColorConfig = colorConfigs.find((config) => config?.fieldname === colorBy) || null;

  if ((activeColorConfig?.method === "field" || activeColorConfig?.method === "dynamicfield") && activeColorConfig.colors?.length) {
    const colorMap = new Map();
    let defaultColor = activeColorConfig.dominantColor || "#cc3333";

    activeColorConfig.colors.forEach((entry) => {
      if ((entry.key || "").toLowerCase() === "default") {
        defaultColor = entry.hex || defaultColor;
        return;
      }

      colorMap.set((entry.key || "").trim().toLowerCase(), entry.hex);
    });

    return {
      colorMap,
      defaultColor,
      legend: activeColorConfig.colors
        .filter((entry) => (entry.key || "").toLowerCase() !== "default")
        .map((entry) => ({
          value: entry.label || entry.key,
          color: entry.hex
        }))
    };
  }

  const uniqueValues = [...new Set(records.map((record) => stripHtml(record.values[colorBy] || "").trim()).filter(Boolean))].slice(0, 50);
  const generatedLegend = activeColorConfig
    ? buildGeneratedLegend(uniqueValues, activeColorConfig.dominantColor, activeColorConfig.subdominantColor)
    : [];
  const fallbackLegend = generatedLegend.length
    ? generatedLegend
    : uniqueValues.map((value, index) => ({
      value,
      color: markerPalette[index % markerPalette.length]
    }));
  const colorMap = new Map();
  fallbackLegend.forEach((entry) => {
    colorMap.set(entry.value, entry.color);
  });

  return {
    colorMap,
    defaultColor: activeColorConfig?.dominantColor || "#cc3333",
    legend: fallbackLegend
  };
}

function buildPopupRowsHtml(record, columns) {
  return columns
    .map((column) => {
      const value = record.values[column.name];
      if (!value) {
        return "";
      }

      return `<div><strong>${escapeHtml(column.alias)}</strong>: ${renderRecordValueHtml(value)}</div>`;
    })
    .filter(Boolean)
    .join("");
}

function buildPopupHtml(record, columns) {
  const rows = buildPopupRowsHtml(record, columns);

  return `<div class="popup-body">${rows}</div>`;
}

function buildGroupedPopupHtml(group, columns) {
  if (group.records.length === 1) {
    return buildPopupHtml(group.records[0], columns);
  }

  const sampleRecord = group.records[0];
  const sampleLabel = getRecordLabel(sampleRecord, columns) || sampleRecord.id;
  const extraCount = group.records.length - 1;

  return `
    <div class="popup-body">
      <div><strong>Records At This Point</strong>: ${escapeHtml(String(group.records.length))}</div>
      <div>This placemark represents multiple records with identical coordinates.</div>
      <div class="popup-record-group">
        <div class="popup-record-heading">Sample Record: ${escapeHtml(sampleLabel)}</div>
        ${buildPopupRowsHtml(sampleRecord, columns)}
      </div>
      ${extraCount > 0 ? `<div class="popup-record-note">${escapeHtml(String(extraCount))} additional record${extraCount === 1 ? "" : "s"} share this location.</div>` : ""}
    </div>
  `;
}

function bindPopupForProgrammaticOpen(layer, popupHtml) {
  layer.bindPopup(popupHtml);
  layer.off("click", layer._openPopup, layer);
  layer.off("keypress", layer._onKeyPress, layer);
}

function openProgrammaticPopup(layer, popupHtml) {
  if (!layer.getPopup()) {
    bindPopupForProgrammaticOpen(layer, popupHtml);
  } else if (layer.getPopup().getContent() !== popupHtml) {
    layer.setPopupContent(popupHtml);
  }

  layer.openPopup();
}

function formatCount(value) {
  return numberFormatter.format(value);
}

function formatMeasure(value, digits = 0) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function flattenLatLngs(latlngs) {
  if (!Array.isArray(latlngs)) {
    return [];
  }

  if (latlngs.length && Array.isArray(latlngs[0])) {
    return latlngs.flatMap((entry) => flattenLatLngs(entry));
  }

  return latlngs;
}

function getPolylineLengthMeters(map, latlngs) {
  const vertices = flattenLatLngs(latlngs);
  let total = 0;

  for (let index = 1; index < vertices.length; index += 1) {
    total += map.distance(vertices[index - 1], vertices[index]);
  }

  return total;
}

function fitMapToMarkers(map, markers) {
  if (!markers.length) {
    map.setView(defaultCenter, defaultZoom);
    return;
  }

  const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]));
  map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
}

function buildPointFeature(marker) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [marker.longitude, marker.latitude]
    },
    properties: {
      id: marker.id
    }
  };
}

function queryMarkersInPolygon(markers, polygonFeature) {
  return markers.filter((marker) => booleanPointInPolygon(buildPointFeature(marker), polygonFeature)).map((marker) => marker.id);
}

function queryMarkersInCircle(map, markers, center, radiusMeters) {
  return markers
    .filter((marker) => map.distance(center, L.latLng(marker.latitude, marker.longitude)) <= radiusMeters)
    .map((marker) => marker.id);
}

function groupMarkersByCoordinate(markers) {
  const grouped = new Map();

  markers.forEach((marker) => {
    const key = `${marker.latitude},${marker.longitude}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.recordIds.push(marker.id);
      existing.records.push(marker.record);
      return;
    }

    grouped.set(key, {
      key,
      latitude: marker.latitude,
      longitude: marker.longitude,
      color: marker.color,
      recordIds: [marker.id],
      records: [marker.record]
    });
  });

  return [...grouped.values()];
}

function buildFrequencyRows(records, column) {
  const counts = new Map();

  records.forEach((record) => {
    const rawValue = record.values[column.name] || "";
    const normalizedValue = stripHtml(rawValue).trim() || "(blank)";
    const existing = counts.get(normalizedValue);

    if (existing) {
      existing.count += 1;
      existing.recordIds.push(record.id);
      return;
    }

    counts.set(normalizedValue, {
      value: normalizedValue,
      count: 1,
      recordIds: [record.id]
    });
  });

  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function hasUsablePolygonGeometry(feature) {
  const geometryType = feature?.geometry?.type || "";
  const coordinates = feature?.geometry?.coordinates;

  return (
    (geometryType === "Polygon" || geometryType === "MultiPolygon") &&
    Array.isArray(coordinates) &&
    coordinates.length > 0
  );
}

function appendCoordinatesToBbox(coordinates, bbox) {
  if (!Array.isArray(coordinates)) {
    return;
  }

  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    const longitude = coordinates[0];
    const latitude = coordinates[1];

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    bbox.minLongitude = Math.min(bbox.minLongitude, longitude);
    bbox.minLatitude = Math.min(bbox.minLatitude, latitude);
    bbox.maxLongitude = Math.max(bbox.maxLongitude, longitude);
    bbox.maxLatitude = Math.max(bbox.maxLatitude, latitude);
    return;
  }

  coordinates.forEach((entry) => {
    appendCoordinatesToBbox(entry, bbox);
  });
}

function computeFeatureBbox(feature) {
  if (!hasUsablePolygonGeometry(feature)) {
    return null;
  }

  const bbox = {
    minLatitude: Number.POSITIVE_INFINITY,
    minLongitude: Number.POSITIVE_INFINITY,
    maxLatitude: Number.NEGATIVE_INFINITY,
    maxLongitude: Number.NEGATIVE_INFINITY
  };

  appendCoordinatesToBbox(feature.geometry.coordinates, bbox);

  if (
    !Number.isFinite(bbox.minLatitude) ||
    !Number.isFinite(bbox.minLongitude) ||
    !Number.isFinite(bbox.maxLatitude) ||
    !Number.isFinite(bbox.maxLongitude)
  ) {
    return null;
  }

  return bbox;
}

function pointWithinBbox(latitude, longitude, bbox) {
  if (!bbox) {
    return false;
  }

  return (
    longitude >= bbox.minLongitude &&
    longitude <= bbox.maxLongitude &&
    latitude >= bbox.minLatitude &&
    latitude <= bbox.maxLatitude
  );
}

function normalizeIntersectionFeatures(features) {
  return (Array.isArray(features) ? features : [])
    .map((feature) => {
      if (!hasUsablePolygonGeometry(feature)) {
        return null;
      }

      const bbox = computeFeatureBbox(feature);
      if (!bbox) {
        return null;
      }

      return {
        feature,
        bbox,
        properties: feature.properties || {}
      };
    })
    .filter(Boolean);
}

function buildIntersectionMarkerGroups(markers) {
  const grouped = new Map();

  markers.forEach((marker) => {
    if (!Number.isFinite(marker?.latitude) || !Number.isFinite(marker?.longitude)) {
      return;
    }

    const key = `${marker.latitude},${marker.longitude}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.count += 1;
      existing.recordIds.push(marker.id);
      return;
    }

    grouped.set(key, {
      key,
      latitude: marker.latitude,
      longitude: marker.longitude,
      count: 1,
      recordIds: [marker.id],
      pointFeature: buildPointFeature(marker)
    });
  });

  return [...grouped.values()];
}

async function fetchGadmBoundaryGeoJson({ level, countryName = "", countryNames = [], stateNames = [] }) {
  const normalizedCountryNames = Array.isArray(countryNames) ? countryNames.filter(Boolean) : [];
  const normalizedStateNames = Array.isArray(stateNames) ? stateNames.filter(Boolean) : [];
  const params = new URLSearchParams();
  params.set("level", String(level));

  if (countryName) {
    params.set("country", countryName);
  }

  if (normalizedCountryNames.length) {
    params.set("countries", normalizedCountryNames.join(","));
  }

  if (normalizedStateNames.length) {
    params.set("states", normalizedStateNames.join(","));
  }

  const cacheKey = params.toString();
  if (gadmGeoJsonCache.has(cacheKey)) {
    return gadmGeoJsonCache.get(cacheKey);
  }

  const response = await fetch(`/api/gadm41?${cacheKey}`, {
    headers: {
      Accept: "application/geo+json, application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to load admin boundaries: ${response.status} ${response.statusText}`);
  }

  const geoJson = await response.json();
  gadmGeoJsonCache.set(cacheKey, geoJson);
  return geoJson;
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function roundCoordinateForSpatialStatistics(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return numericValue;
  }

  return Number(numericValue.toFixed(spatialStatisticsCoordinatePrecision));
}

function buildSpatialStatisticsPoints(pointGroups) {
  return (Array.isArray(pointGroups) ? pointGroups : []).map((group) => ({
    latitude: roundCoordinateForSpatialStatistics(group?.latitude),
    longitude: roundCoordinateForSpatialStatistics(group?.longitude),
    count: Array.isArray(group?.recordIds) ? group.recordIds.length : Number(group?.count) || 0
  }));
}

async function gzipText(text) {
  if (typeof CompressionStream !== "function") {
    return null;
  }

  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    const arrayBuffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

async function readJsonResponse(response, serviceLabel) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const responseText = await response.text();
  if (/^\s*</.test(responseText)) {
    const isLikelyGatewayOrSecurityFailure = [400, 403, 404, 413, 502, 503, 504].includes(response.status);
    if (isLikelyGatewayOrSecurityFailure) {
      throw new Error(
        `We hit an issue sending data to the ${serviceLabel.toLowerCase()}. ` +
        `A proxy or security layer in front of the service returned an HTML error page instead of JSON. ` +
        `For very large requests, request-size or request-body inspection limits, such as a 2 MB payload cap, may be the cause. ` +
        `Try narrowing the records in scope and retrying.`
      );
    }

    throw new Error(`${serviceLabel} returned HTML instead of JSON. The /api route is likely missing, rewritten, or blocked before reaching the service.`);
  }

  throw new Error(`${serviceLabel} returned an unexpected response.`);
}

async function fetchSpatialStatistics(pointGroups, onProgress) {
  const requestBodyText = JSON.stringify({
    points: buildSpatialStatisticsPoints(pointGroups)
  });
  const gzippedRequestBody = await gzipText(requestBodyText);
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (gzippedRequestBody) {
    headers["Content-Encoding"] = "gzip";
  }

  const response = await fetch("/api/spatial-statistics", {
    method: "POST",
    headers,
    body: gzippedRequestBody || requestBodyText
  });

  const responseBody = await readJsonResponse(response, "Spatial intersection service");

  if (!response.ok) {
    throw new Error(responseBody?.error || `Unable to compute spatial intersections: ${response.status} ${response.statusText}`);
  }

  const requestId = String(responseBody?.requestId || "").trim();
  if (!requestId) {
    throw new Error("Spatial intersection service did not return a request id.");
  }

  if (typeof onProgress === "function") {
    onProgress({
      requestId,
      status: responseBody?.status || "pending",
      lines: Array.isArray(responseBody?.lines) ? responseBody.lines : []
    });
  }

  for (;;) {
    await delay(350);

    const statusResponse = await fetch(`/api/spatial-statistics?id=${encodeURIComponent(requestId)}`, {
      headers: {
        Accept: "application/json"
      }
    });
    const statusBody = await readJsonResponse(statusResponse, "Spatial intersection status service");

    if (!statusResponse.ok) {
      throw new Error(statusBody?.error || `Unable to read spatial intersection status: ${statusResponse.status} ${statusResponse.statusText}`);
    }

    if (typeof onProgress === "function") {
      onProgress({
        requestId,
        status: statusBody?.status || "pending",
        lines: Array.isArray(statusBody?.lines) ? statusBody.lines : []
      });
    }

    if (statusBody?.status === "error") {
      throw new Error(statusBody?.error || "Unable to compute spatial intersections.");
    }

    if (statusBody?.status === "complete") {
      return {
        country: Array.isArray(statusBody?.result?.country) ? statusBody.result.country : [],
        state: Array.isArray(statusBody?.result?.state) ? statusBody.result.state : [],
        county: Array.isArray(statusBody?.result?.county) ? statusBody.result.county : []
      };
    }
  }
}

function resolveSpatialStatisticsRowRecordIds(row, pointGroups) {
  if (Array.isArray(row?.recordIds) && row.recordIds.length) {
    return row.recordIds.filter(Boolean);
  }

  const recordIds = [];
  const seen = new Set();

  (Array.isArray(row?.groupIndexes) ? row.groupIndexes : []).forEach((groupIndex) => {
    const pointGroup = pointGroups?.[groupIndex];
    if (!pointGroup || !Array.isArray(pointGroup.recordIds)) {
      return;
    }

    pointGroup.recordIds.forEach((recordId) => {
      if (!recordId || seen.has(recordId)) {
        return;
      }

      seen.add(recordId);
      recordIds.push(recordId);
    });
  });

  return recordIds;
}

function buildSpatialIntersectionRows(markers, features, buildLabel) {
  const markerGroups = buildIntersectionMarkerGroups(markers);
  const normalizedFeatures = normalizeIntersectionFeatures(features);
  const rowsByLabel = new Map();

  markerGroups.forEach((markerGroup) => {
    for (const featureEntry of normalizedFeatures) {
      if (!pointWithinBbox(markerGroup.latitude, markerGroup.longitude, featureEntry.bbox)) {
        continue;
      }

      let isMatch = false;

      try {
        isMatch = booleanPointInPolygon(markerGroup.pointFeature, featureEntry.feature);
      } catch {
        continue;
      }

      if (!isMatch) {
        continue;
      }

      const label = buildLabel(featureEntry.properties);
      if (!label) {
        break;
      }

      const existing = rowsByLabel.get(label);
      if (existing) {
        existing.count += markerGroup.count;
        existing.recordIds.push(...markerGroup.recordIds);
      } else {
        rowsByLabel.set(label, {
          value: label,
          count: markerGroup.count,
          recordIds: [...markerGroup.recordIds]
        });
      }

      break;
    }
  });

  return [...rowsByLabel.values()]
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

async function buildCountryIntersectionRows(markers) {
  const cacheKey = `country:${markers.map((marker) => marker.id).join("|")}`;
  if (spatialIntersectionCache.has(cacheKey)) {
    return spatialIntersectionCache.get(cacheKey);
  }

  const geoJson = await fetchGadmBoundaryGeoJson({ level: 0 });
  const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
  const rows = buildSpatialIntersectionRows(markers, features, (properties) => properties.NAME_0 || "");

  const result = {
    rows,
    countries: Array.isArray(rows) ? rows.map((row) => row.value).filter(Boolean) : []
  };

  spatialIntersectionCache.set(cacheKey, result);
  return result;
}

async function buildStateIntersectionRows(markers) {
  const cacheKey = `state:${markers.map((marker) => marker.id).join("|")}`;
  if (spatialIntersectionCache.has(cacheKey)) {
    return spatialIntersectionCache.get(cacheKey);
  }

  const countryResults = await buildCountryIntersectionRows(markers);
  const countries = Array.isArray(countryResults?.countries) ? countryResults.countries : [];

  if (!countries.length) {
    const emptyResult = {
      rows: [],
      countries: [],
      states: []
    };
    spatialIntersectionCache.set(cacheKey, emptyResult);
    return emptyResult;
  }

  const geoJson = await fetchGadmBoundaryGeoJson({
    level: 1,
    countryNames: countries
  });
  const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
  const rows = buildSpatialIntersectionRows(markers, features, (properties) => {
    const stateName = properties.NAME_1 || "";
    const countryName = properties.COUNTRY || "";
    return [stateName, countryName].filter(Boolean).join(", ");
  });

  const result = {
    rows,
    countries,
    states: Array.isArray(rows) ? rows.map((row) => row.value.split(",")[0]?.trim()).filter(Boolean) : []
  };

  spatialIntersectionCache.set(cacheKey, result);
  return result;
}

async function buildCountyIntersectionRows(markers) {
  const cacheKey = `county:${markers.map((marker) => marker.id).join("|")}`;
  if (spatialIntersectionCache.has(cacheKey)) {
    return spatialIntersectionCache.get(cacheKey);
  }

  const stateResults = await buildStateIntersectionRows(markers);
  const countries = Array.isArray(stateResults?.countries) ? stateResults.countries : [];
  const states = Array.isArray(stateResults?.states) ? stateResults.states : [];

  if (!countries.length || !states.length) {
    spatialIntersectionCache.set(cacheKey, []);
    return [];
  }

  const geoJson = await fetchGadmBoundaryGeoJson({
    level: 2,
    countryNames: countries,
    stateNames: states
  });
  const features = Array.isArray(geoJson?.features) ? geoJson.features : [];

  const result = buildSpatialIntersectionRows(markers, features, (properties) => {
    const countyName = properties.NAME_2 || "";
    const stateName = properties.NAME_1 || "";
    const countryName = properties.COUNTRY || "";
    return [countyName, stateName, countryName].filter(Boolean).join(", ");
  });

  spatialIntersectionCache.set(cacheKey, result);
  return result;
}

function serializeDelimited(records, columns) {
  const lines = [
    columns.map((column) => column.alias).join("\t"),
    ...records.map((record) =>
      columns.map((column) => stripHtml(record.values[column.name] || "").replaceAll("\t", " ").replaceAll("\n", " ")).join("\t")
    )
  ];

  return `${lines.join("\n")}\n`;
}

function serializeKml(records, columns, datasetName) {
  const placemarks = records
    .map((record) => {
      const latitude = Number.parseFloat(record.values.Latitude);
      const longitude = Number.parseFloat(record.values.Longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return "";
      }

      const name = escapeHtml(getRecordLabel(record, columns) || record.id);
      const description = columns
        .map((column) => {
          const value = stripHtml(record.values[column.name] || "").trim();
          if (!value) {
            return "";
          }

          return `&lt;div&gt;&lt;strong&gt;${escapeHtml(column.alias)}&lt;/strong&gt;: ${escapeHtml(value)}&lt;/div&gt;`;
        })
        .filter(Boolean)
        .join("");

      return `
        <Placemark>
          <name>${name}</name>
          <description>${description}</description>
          <Point>
            <coordinates>${longitude},${latitude},0</coordinates>
          </Point>
        </Placemark>
      `;
    })
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeHtml(datasetName)}</name>
    ${placemarks}
  </Document>
</kml>
`;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function serializeGeoJson(feature) {
  return `${JSON.stringify(feature, null, 2)}\n`;
}

function MapViewport({ selectedMarker, selectedRecordId, shouldPanToSelection }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedMarker || !shouldPanToSelection) {
      return;
    }

    map.flyTo([selectedMarker.latitude, selectedMarker.longitude], Math.max(map.getZoom(), 8), {
      duration: 0.4
    });
  }, [map, selectedMarker, selectedRecordId, shouldPanToSelection]);

  return null;
}

function MapInstanceBridge({ onMapReady }) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);

    return () => {
      onMapReady(null);
    };
  }, [map, onMapReady]);

  return null;
}

function MapHomeViewport({ viewport, marker }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!viewport) {
      return;
    }

    map.setView(viewport.center, viewport.zoom, {
      animate: viewport.animate !== false
    });
  }, [map, viewport]);

  useEffect(() => {
    if (!marker) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([marker.latitude, marker.longitude]);
      markerRef.current.addTo(map);
    } else {
      markerRef.current.setLatLng([marker.latitude, marker.longitude]);
    }

    markerRef.current.bindPopup(escapeHtml(marker.label || "Selected location"));
    if (marker.openPopup) {
      markerRef.current.openPopup();
    }

    return () => {
      if (markerRef.current && !marker.persist) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, marker]);

  useEffect(() => () => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [map]);

  return null;
}

function MapGeocodeLayer({ results, fitNonce, onDeleteResult, onKeepOnlyResult }) {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    const layerGroup = L.layerGroup();
    layerGroupRef.current = layerGroup;
    map.addLayer(layerGroup);

    return () => {
      map.removeLayer(layerGroup);
      layerGroupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    if (!results.length) {
      return;
    }

    const bounds = L.latLngBounds([]);

    results.forEach((result) => {
      const center = [result.latitude, result.longitude];
      const marker = L.marker(center, {
        title: result.query
      });
      const circle = L.circle(center, {
        radius: Math.max(1, result.uncertaintyMeters || 0),
        fillColor: "#ff00dd",
        fillOpacity: 0.05,
        color: "#ff00dd",
        weight: 1,
        opacity: 0.5
      });

      marker.bindPopup("");
      marker.on("popupopen", () => {
        const popup = marker.getPopup();
        if (!popup) {
          return;
        }

        popup.setContent(buildGeocodePopupHtml(result));
        window.requestAnimationFrame(() => {
          const popupElement = popup.getElement();
          if (!popupElement) {
            return;
          }

          popupElement.querySelectorAll("[data-geocode-action]").forEach((button) => {
            button.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              const action = button.getAttribute("data-geocode-action");

              if (action === "delete") {
                onDeleteResult(result.id);
                marker.closePopup();
                return;
              }

              if (action === "delete-others") {
                onKeepOnlyResult(result.id);
                marker.closePopup();
                return;
              }

              if (action === "zoom") {
                map.fitBounds(circle.getBounds(), {
                  padding: [24, 24],
                  maxZoom: 15
                });
              }
            }, { once: true });
          });
        });
      });

      layerGroup.addLayer(circle);
      layerGroup.addLayer(marker);
      bounds.extend(circle.getBounds());
    });

    if (fitNonce) {
      map.fitBounds(bounds, {
        padding: [36, 36],
        maxZoom: 15
      });
    }
  }, [map, results, fitNonce, onDeleteResult, onKeepOnlyResult]);

  return null;
}

function MapDatasetLayers({ layers, layerStates, onLayerStateChange, onFeatureSelect }) {
  const map = useMap();
  const layerGroupRef = useRef(null);
  const layerCacheRef = useRef(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    ensureMapPane(map, datasetLayerPaneName, 450);
    const layerGroup = L.featureGroup();
    layerGroupRef.current = layerGroup;
    map.addLayer(layerGroup);

    return () => {
      isMountedRef.current = false;
      map.removeLayer(layerGroup);
      layerGroupRef.current = null;
      layerCacheRef.current.clear();
    };
  }, [map]);

  useEffect(() => {
    const layerGroup = layerGroupRef.current;

    if (!layerGroup) {
      return;
    }

    async function ensureLayerLoaded(layer, index, state) {
      const cacheKey = `${index}:${getLayerSourceUrl(layer)}`;
      const cached = layerCacheRef.current.get(cacheKey);
      const sourceUrl = getLayerSourceUrl(layer);

      if (cached?.status === "loading") {
        return;
      }

      if (cached?.status === "error" && cached.loadNonce === state.loadNonce) {
        return;
      }

      layerCacheRef.current.set(cacheKey, {
        ...cached,
        status: "loading",
        loadNonce: state.loadNonce
      });
      onLayerStateChange(index, {
        loading: true,
        error: ""
      });

      try {
        const geoJson = await loadLayerGeoJson(layer);

        if (!isMountedRef.current) {
          return;
        }

        const leafletLayer = createLeafletDataLayer(geoJson, layer, index, onFeatureSelect);
        const bounds = leafletLayer.getBounds?.() || L.latLngBounds([]);
        const featureCount = leafletLayer.getLayers?.().length || 0;
        const boundsValid = bounds.isValid?.() || false;
        const geoJsonFeatureCount = Array.isArray(geoJson?.features) ? geoJson.features.length : 0;
        const geometryTypes = Array.isArray(geoJson?.features)
          ? [...new Set(geoJson.features.map((feature) => feature?.geometry?.type || "unknown"))]
          : [];
        const emptyLayerMessage = featureCount
          ? ""
          : "Layer loaded but produced no displayable geometries.";
        let appliedZoomNonce = 0;

        layerCacheRef.current.set(cacheKey, {
          status: "loaded",
          leafletLayer,
          bounds,
          boundsValid,
          featureCount,
          loadNonce: state.loadNonce,
          zoomNonce: 0
        });

        if (state.visible) {
          layerGroup.addLayer(leafletLayer);
          leafletLayer.bringToFront?.();

          if (boundsValid && state.zoomNonce > 0) {
            map.fitBounds(bounds, {
              padding: [24, 24],
              maxZoom: 13
            });
            appliedZoomNonce = state.zoomNonce;
          }
        }

        layerCacheRef.current.set(cacheKey, {
          status: "loaded",
          leafletLayer,
          bounds,
          boundsValid,
          featureCount,
          loadNonce: state.loadNonce,
          zoomNonce: appliedZoomNonce
        });

        onLayerStateChange(index, {
          loading: false,
          loaded: featureCount > 0,
          boundsValid,
          featureCount,
          error: emptyLayerMessage
        });
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load layer.";
        layerCacheRef.current.set(cacheKey, {
          ...cached,
          status: "error",
          error: message,
          loadNonce: state.loadNonce
        });
        onLayerStateChange(index, {
          loading: false,
          loaded: false,
          boundsValid: false,
          featureCount: 0,
          error: message
        });
      }
    }

    layers.forEach((layer, index) => {
      const state = layerStates[index] || buildInitialLayerStates([layer])[0];
      const cacheKey = `${index}:${getLayerSourceUrl(layer)}`;
      const cached = layerCacheRef.current.get(cacheKey);

      if (state.visible) {
        if (cached?.status === "loaded" && cached.leafletLayer && !layerGroup.hasLayer(cached.leafletLayer)) {
          layerGroup.addLayer(cached.leafletLayer);
          cached.leafletLayer.bringToFront?.();
        }

        if (!cached || cached.status === "loading") {
          if (!cached) {
            ensureLayerLoaded(layer, index, state);
          }
        } else if (cached.status === "error" || cached.status === "idle") {
          ensureLayerLoaded(layer, index, state);
        }
      } else if (cached?.status === "loaded" && cached.leafletLayer && layerGroup.hasLayer(cached.leafletLayer)) {
        layerGroup.removeLayer(cached.leafletLayer);
      }

      if (
        cached?.status === "loaded" &&
        cached.boundsValid &&
        state.zoomNonce > (cached.zoomNonce || 0)
      ) {
        map.fitBounds(cached.bounds, {
          padding: [24, 24],
          maxZoom: 13
        });

        layerCacheRef.current.set(cacheKey, {
          ...cached,
          zoomNonce: state.zoomNonce
        });
      }
    });
  }, [layers, layerStates, map, onFeatureSelect, onLayerStateChange]);

  return null;
}

function MapCountymatchLayer({ joinConfig, recordIdsByCountyKey, stateNames, maxCount, onQueryRecords, shouldFitBounds, onBoundsFit }) {
  const map = useMap();
  const layerRef = useRef(null);
  const geoJsonCacheRef = useRef(new Map());
  const fitTimeoutRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function renderJoinLayer() {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      if (joinConfig?.method !== "countymatch") {
        return;
      }

      ensureMapPane(map, datasetLayerPaneName, 450);

      try {
        const stateQuery = stateNames?.length ? `&states=${encodeURIComponent(stateNames.join(","))}` : "";
        const cacheKey = stateNames?.length ? stateNames.join("|") : "all";
        let geoJson = geoJsonCacheRef.current.get(cacheKey) || null;

        if (!geoJson) {
          const response = await fetch(`/api/gadm41?level=2&country=United%20States${stateQuery}`, {
            signal: controller.signal,
            headers: {
              Accept: "application/geo+json, application/json"
            }
          });

          if (!response.ok) {
            throw new Error(`Unable to load county boundaries: ${response.status} ${response.statusText}`);
          }

          geoJson = await response.json();
          geoJsonCacheRef.current.set(cacheKey, geoJson);
        }

        if (isCancelled) {
          return;
        }

        const matchedFeatures = Array.isArray(geoJson?.features)
          ? geoJson.features.filter((feature) => getCountyFeatureRecordIds(feature?.properties || {}, recordIdsByCountyKey).length > 0)
          : [];

        if (!matchedFeatures.length) {
          onBoundsFit?.();
          return;
        }

        const colorForCount = (count) => {
          const ratio = maxCount > 1 ? Math.min(1, count / maxCount) : 1;
          const lightness = Math.round(92 - (ratio * 42));
          return `hsl(206 58% ${lightness}%)`;
        };

        const leafletLayer = L.geoJSON({
          ...geoJson,
          features: matchedFeatures
        }, {
          pane: datasetLayerPaneName,
          style: (feature) => {
            const recordCount = getCountyFeatureRecordIds(feature?.properties || {}, recordIdsByCountyKey).length;

            return {
              color: "#35597c",
              weight: 1.1,
              opacity: 0.9,
              fillColor: colorForCount(recordCount),
              fillOpacity: 0.72
            };
          },
          onEachFeature: (feature, layer) => {
            const recordIds = getCountyFeatureRecordIds(feature?.properties || {}, recordIdsByCountyKey);
            const countyName = feature?.properties?.NAME_2 || "County";
            const stateName = feature?.properties?.NAME_1 || "";
            const label = [countyName, stateName].filter(Boolean).join(", ");
            const recordCount = recordIds.length;

            layer.bindTooltip(`${label}${label ? " " : ""}(${formatCount(recordCount)} record${recordCount === 1 ? "" : "s"})`, {
              sticky: true
            });

            layer.on("click", () => {
              if (!recordIds.length) {
                return;
              }

              onQueryRecords(recordIds, label || joinConfig?.label || "County Query");
            });
          }
        });

        layerRef.current = leafletLayer;
        leafletLayer.addTo(map);

        if (shouldFitBounds) {
          const bounds = leafletLayer.getBounds?.();

          if (bounds?.isValid?.()) {
            fitTimeoutRef.current = window.setTimeout(() => {
              if (isCancelled) {
                return;
              }

              map.fitBounds(bounds, {
                padding: [24, 24],
                maxZoom: 8
              });
              onBoundsFit?.();
              fitTimeoutRef.current = null;
            }, 140);
          } else {
            onBoundsFit?.();
          }
        }
      } catch (error) {
        if (!isCancelled && error?.name !== "AbortError") {
          console.error("Unable to render countymatch join layer:", error);
        }
      }
    }

    renderJoinLayer();

    return () => {
      isCancelled = true;
      controller.abort();
      if (fitTimeoutRef.current) {
        window.clearTimeout(fitTimeoutRef.current);
        fitTimeoutRef.current = null;
      }

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [joinConfig, map, maxCount, onBoundsFit, onQueryRecords, recordIdsByCountyKey, shouldFitBounds, stateNames]);

  return null;
}

function MapTools({ markers, onQueryRecords, onClearQuery, onShapesChange, registerClearShapes, enableQueries, onSaveGeoJson }) {
  const map = useMap();
  const markersRef = useRef(markers);
  const onQueryRecordsRef = useRef(onQueryRecords);
  const onClearQueryRef = useRef(onClearQuery);
  const onShapesChangeRef = useRef(onShapesChange);
  const registerClearShapesRef = useRef(registerClearShapes);
  const onSaveGeoJsonRef = useRef(onSaveGeoJson);

  useEffect(() => {
    markersRef.current = markers;
    onQueryRecordsRef.current = onQueryRecords;
    onClearQueryRef.current = onClearQuery;
    onShapesChangeRef.current = onShapesChange;
    registerClearShapesRef.current = registerClearShapes;
    onSaveGeoJsonRef.current = onSaveGeoJson;
  }, [markers, onQueryRecords, onClearQuery, onShapesChange, registerClearShapes, onSaveGeoJson]);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const scaleControl = L.control.scale({
      imperial: true,
      metric: true,
      position: "bottomright"
    });
    scaleControl.addTo(map);

    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        marker: false,
        rectangle: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: false
      }
    });
    map.addControl(drawControl);
    if (drawControl._container) {
      drawControl._container.classList.add("bm-draw-controls");
    }

    function clearDrawnShapes() {
      drawnItems.clearLayers();
      onShapesChangeRef.current(false);
      if (enableQueries) {
        onClearQueryRef.current();
      }
    }

    registerClearShapesRef.current(clearDrawnShapes);

    function describeQueryResult(label, recordIds) {
      const count = recordIds.length;
      return `${label} matched ${formatCount(count)} record${count === 1 ? "" : "s"}.`;
    }

    function buildShapePopup(layerType, measurementRows, recordIds, options = {}) {
      const queryCopy =
        recordIds === null
          ? ""
          : `<div><strong>Query</strong>: ${escapeHtml(describeQueryResult("Spatial query", recordIds))}</div>`;
      const actionCopy = options.includeGeoJsonAction
        ? `<div class="popup-geocode-actions"><button type="button" data-shape-action="save-geojson">Save GeoJSON</button></div>`
        : "";

      return `
        <div class="popup-body">
          <div><strong>Shape</strong>: ${escapeHtml(layerType)}</div>
          ${measurementRows.join("")}
          ${queryCopy}
          ${actionCopy}
          <div>Use Trash with All and Results to remove shapes.</div>
        </div>
      `;
    }

    function handleCreated(event) {
      const { layer, layerType } = event;
      drawnItems.addLayer(layer);
      onShapesChangeRef.current(true);

      if (layerType === "polyline") {
        const meters = getPolylineLengthMeters(map, layer.getLatLngs());
        const feet = meters * 3.2808399;
        const miles = feet / 5280;
        layer.bindPopup(
          buildShapePopup("Polyline", [
            `<div><strong>Meters</strong>: ${escapeHtml(formatMeasure(meters))}</div>`,
            `<div><strong>Feet</strong>: ${escapeHtml(formatMeasure(feet))}</div>`,
            `<div><strong>Miles</strong>: ${escapeHtml(formatMeasure(miles, 4))}</div>`
          ], null)
        );
        layer.openPopup();
        return;
      }

      if (layerType === "polygon") {
        const polygonFeature = layer.toGeoJSON();
        const areaSqMeters = turfArea(polygonFeature);
        const acres = areaSqMeters / 4046.85642;
        const squareMiles = areaSqMeters * 0.000000386102159;
        const recordIds = queryMarkersInPolygon(markersRef.current, polygonFeature);

        if (enableQueries) {
          onQueryRecordsRef.current({
            label: "Polygon Query",
            recordIds
          });
        }

        layer.bindPopup(
          buildShapePopup("Polygon", [
            `<div><strong>Sq Meters</strong>: ${escapeHtml(formatMeasure(areaSqMeters))}</div>`,
            `<div><strong>Acres</strong>: ${escapeHtml(formatMeasure(acres, 2))}</div>`,
            `<div><strong>Sq Miles</strong>: ${escapeHtml(formatMeasure(squareMiles, 5))}</div>`
          ], recordIds, { includeGeoJsonAction: true })
        );
        layer.on("popupopen", () => {
          const popup = layer.getPopup();
          const popupElement = popup?.getElement();
          if (!popupElement) {
            return;
          }

          const saveButton = popupElement.querySelector("[data-shape-action='save-geojson']");
          if (!saveButton) {
            return;
          }

          saveButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSaveGeoJsonRef.current({
              title: "Polygon Query",
              filename: `polygon-query-${Date.now()}.geojson`,
              text: serializeGeoJson(polygonFeature)
            });
          }, { once: true });
        });
        layer.openPopup();
        return;
      }

      if (layerType === "circle") {
        const radiusMeters = layer.getRadius();
        const center = layer.getLatLng();
        const areaSqMeters = Math.PI * radiusMeters * radiusMeters;
        const recordIds = queryMarkersInCircle(map, markersRef.current, center, radiusMeters);

        if (enableQueries) {
          onQueryRecordsRef.current({
            label: "Circle Query",
            recordIds
          });
        }

        layer.bindPopup(
          buildShapePopup("Circle", [
            `<div><strong>Radius (m)</strong>: ${escapeHtml(formatMeasure(radiusMeters))}</div>`,
            `<div><strong>Center</strong>: ${escapeHtml(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`)}</div>`,
            `<div><strong>Area (sq m)</strong>: ${escapeHtml(formatMeasure(areaSqMeters))}</div>`
          ], recordIds)
        );
        layer.openPopup();
      }
    }

    function handleDeleted() {
      onShapesChangeRef.current(drawnItems.getLayers().length > 0);
      if (enableQueries) {
        onClearQueryRef.current();
      }
    }

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeControl(scaleControl);
      map.removeLayer(drawnItems);
      registerClearShapesRef.current(null);
    };
  }, [map, enableQueries]);

  return null;
}

function MapMarkerLayer({
  markers,
  displayedColumns,
  selectedRecordId,
  markerRefs,
  onMarkerClick,
  onClusterSelect,
  onRenderProgress,
  shouldFocusSelection
}) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 25,
      chunkedLoading: true,
      showCoverageOnHover: false,
      removeOutsideVisibleBounds: true,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: false
    });

    clusterGroupRef.current = clusterGroup;
    clusterGroup.on("clusterclick", (event) => {
      const recordIds = event.layer.getAllChildMarkers().map((marker) => marker.options.recordId).filter(Boolean);
      onClusterSelect(recordIds);
    });
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroupRef.current = null;
      markerRefs.current.clear();
    };
  }, [map, markerRefs, onClusterSelect]);

  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) {
      return;
    }

    clusterGroup.clearLayers();
    markerRefs.current.clear();
    if (!markers.length) {
      onRenderProgress({ active: false, loaded: 0, total: 0 });
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let index = 0;
    const total = markers.length;
    const chunkSize = 500;

    onRenderProgress({ active: true, loaded: 0, total });

    const processChunk = () => {
      if (cancelled) {
        return;
      }

      const nextIndex = Math.min(index + chunkSize, total);
      for (; index < nextIndex; index += 1) {
        const marker = markers[index];
        const leafletMarker = L.marker([marker.latitude, marker.longitude], {
          icon: createMarkerIcon(marker.color),
          recordId: marker.id,
          popupHtml: buildPopupHtml(marker.record, displayedColumns)
        });

        leafletMarker.on("click", () => {
          onMarkerClick([marker.id]);
        });

        markerRefs.current.set(marker.id, leafletMarker);
        clusterGroup.addLayer(leafletMarker);
      }

      onRenderProgress({ active: nextIndex < total, loaded: nextIndex, total });

      if (nextIndex < total) {
        frameId = window.requestAnimationFrame(processChunk);
      }
    };

    frameId = window.requestAnimationFrame(processChunk);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      onRenderProgress({ active: false, loaded: 0, total: 0 });
    };
  }, [markers, displayedColumns, markerRefs, onMarkerClick, onRenderProgress]);

  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    const marker = markerRefs.current.get(selectedRecordId);

    if (!clusterGroup || !marker || !shouldFocusSelection) {
      return;
    }

    clusterGroup.zoomToShowLayer(marker, () => {
      openProgrammaticPopup(marker, marker.options.popupHtml);
    });
  }, [selectedRecordId, markerRefs, shouldFocusSelection]);

  return null;
}

function MapPointLayer({
  markers,
  displayedColumns,
  selectedRecordId,
  markerRefs,
  onMarkerClick,
  onRenderProgress,
  shouldFocusSelection
}) {
  const map = useMap();
  const layerGroupRef = useRef(null);
  const canvasRendererRef = useRef(null);
  const previousSelectedIdRef = useRef("");
  const groupedMarkers = useMemo(() => groupMarkersByCoordinate(markers), [markers]);

  useEffect(() => {
    ensureMapPane(map, recordPointPaneName, 650);
    const layerGroup = L.layerGroup();
    const pointRenderer = L.svg({
      padding: 0.5,
      pane: recordPointPaneName
    });

    layerGroupRef.current = layerGroup;
    canvasRendererRef.current = pointRenderer;
    map.addLayer(layerGroup);

    return () => {
      map.removeLayer(layerGroup);
      layerGroupRef.current = null;
      canvasRendererRef.current = null;
      previousSelectedIdRef.current = "";
      markerRefs.current.clear();
    };
  }, [map, markerRefs]);

  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    const pointRenderer = canvasRendererRef.current;
    if (!layerGroup) {
      return;
    }

    layerGroup.clearLayers();
    markerRefs.current.clear();
    previousSelectedIdRef.current = "";
    if (!markers.length) {
      onRenderProgress({ active: false, loaded: 0, total: 0 });
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let index = 0;
    let loaded = 0;
    const total = markers.length;
    const chunkSize = 500;

    onRenderProgress({ active: true, loaded: 0, total });

    const processChunk = () => {
      if (cancelled) {
        return;
      }

      const nextIndex = Math.min(index + chunkSize, groupedMarkers.length);
      for (; index < nextIndex; index += 1) {
        const group = groupedMarkers[index];
        const isSelected = group.recordIds.includes(selectedRecordId);
        const leafletMarker = L.circleMarker(
          [group.latitude, group.longitude],
          {
            ...createPointStyle(group.color, pointRenderer, isSelected),
            pane: recordPointPaneName
          }
        );

        leafletMarker.options.popupHtml = buildGroupedPopupHtml(group, displayedColumns);
        leafletMarker.on("click", () => {
          onMarkerClick(group.recordIds);
        });

        group.recordIds.forEach((recordId) => {
          markerRefs.current.set(recordId, leafletMarker);
        });
        layerGroup.addLayer(leafletMarker);
        loaded += group.recordIds.length;
      }

      onRenderProgress({ active: index < groupedMarkers.length, loaded, total });

      if (index < groupedMarkers.length) {
        frameId = window.requestAnimationFrame(processChunk);
      }
    };

    frameId = window.requestAnimationFrame(processChunk);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      onRenderProgress({ active: false, loaded: 0, total: 0 });
    };
  }, [groupedMarkers, markers.length, displayedColumns, markerRefs, onMarkerClick, onRenderProgress, selectedRecordId]);

  useEffect(() => {
    const previousMarker = markerRefs.current.get(previousSelectedIdRef.current);
    const marker = markerRefs.current.get(selectedRecordId);

    if (previousMarker && previousSelectedIdRef.current !== selectedRecordId) {
      previousMarker.setStyle(createPointStyle(previousMarker.options.fillColor, canvasRendererRef.current, false));
    }

    if (marker) {
      marker.setStyle(createPointStyle(marker.options.fillColor, canvasRendererRef.current, true));
      previousSelectedIdRef.current = selectedRecordId;
    }

    if (!marker || !shouldFocusSelection) {
      return;
    }

    marker.bringToFront();
    const target = marker.getLatLng();
    const openSelectedPopup = () => {
      openProgrammaticPopup(marker, marker.options.popupHtml);
    };

    map.once("moveend", openSelectedPopup);
    map.flyTo(target, Math.max(map.getZoom(), 8), {
      duration: 0.4
    });

    return () => {
      map.off("moveend", openSelectedPopup);
    };
  }, [map, selectedRecordId, markerRefs, shouldFocusSelection]);

  return null;
}

function LogoImage({ logo }) {
  const [hidden, setHidden] = useState(false);

  if (hidden || !logo?.img) {
    return null;
  }

  return (
    <a href={logo.url} target="_blank" rel="noreferrer" title={logo.url}>
      <img
        src={logo.img}
        alt="Collection logo"
        loading="eager"
        onError={() => {
          setHidden(true);
        }}
      />
    </a>
  );
}

function App() {
  const [form, setForm] = useState(buildInitialForm);
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPhoneViewport, setIsPhoneViewport] = useState(detectPhoneViewport);
  const [mobileView, setMobileView] = useState("map");
  const [windowViews, setWindowViews] = useState({
    results: "hidden",
    statistics: "hidden",
    geojson: "hidden",
    config: "hidden",
    help: "hidden"
  });
  const [activeWindow, setActiveWindow] = useState("help");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedLayerFeature, setSelectedLayerFeature] = useState(null);
  const [colorBy, setColorBy] = useState("");
  const [pointDisplay, setPointDisplay] = useState("clustered");
  const [activeQuery, setActiveQuery] = useState(null);
  const [hasDrawnShapes, setHasDrawnShapes] = useState(false);
  const [statisticsColumnName, setStatisticsColumnName] = useState("");
  const [statisticsSpatialMode, setStatisticsSpatialMode] = useState("none");
  const [statisticsSpatialResults, setStatisticsSpatialResults] = useState(emptySpatialStatisticsResult);
  const [statisticsSpatialResultKey, setStatisticsSpatialResultKey] = useState("");
  const [statisticsSpatialBusy, setStatisticsSpatialBusy] = useState(false);
  const [statisticsSpatialError, setStatisticsSpatialError] = useState("");
  const [statisticsSpatialStatusLines, setStatisticsSpatialStatusLines] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);
  const [renderProgress, setRenderProgress] = useState({ active: false, loaded: 0, total: 0 });
  const [loadWarning, setLoadWarning] = useState("");
  const [loadWarningDetails, setLoadWarningDetails] = useState({
    tabfile: "",
    configfile: ""
  });
  const [homeViewport, setHomeViewport] = useState({
    center: defaultCenter,
    zoom: defaultZoom,
    animate: false
  });
  const [homeMarker, setHomeMarker] = useState(null);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocodeFitNonce, setGeocodeFitNonce] = useState(0);
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodeSuggestions, setGeocodeSuggestions] = useState([]);
  const [showGeocodeSuggestions, setShowGeocodeSuggestions] = useState(false);
  const [shouldFitLoadedDataset, setShouldFitLoadedDataset] = useState(false);
  const [geoJsonExport, setGeoJsonExport] = useState({
    title: "",
    filename: "shape.geojson",
    text: ""
  });
  const [layerStates, setLayerStates] = useState([]);
  const markerRefs = useRef(new Map());
  const shouldPanToSelectionRef = useRef(false);
  const clearShapesRef = useRef(null);
  const renderProgressFlushTimeoutRef = useRef(null);
  const renderProgressLastCommitRef = useRef(0);
  const pendingRenderProgressRef = useRef({ active: false, loaded: 0, total: 0 });
  const statisticsSpatialRequestKeyRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(phoneViewportMediaQuery);
    const handleChange = (event) => {
      setIsPhoneViewport(event.matches);
    };

    setIsPhoneViewport(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (isPhoneViewport) {
      setMobileView((current) => {
        if (current === "results") {
          return windowViews.results === "hidden" ? "map" : "results";
        }

        return "map";
      });
      return;
    }

    setMobileView("map");
  }, [isPhoneViewport, windowViews.results]);

  const getInitialColorField = useCallback((nextDataset) => {
    const configuredField = nextDataset?.colorConfigs?.[0]?.fieldname || nextDataset?.colorConfig?.fieldname;
    if (!configuredField) {
      return "";
    }

    return nextDataset.columns?.some((column) => column.name === configuredField) ? configuredField : "";
  }, []);

  const handleRecordSelection = useCallback((recordId) => {
    shouldPanToSelectionRef.current = true;
    setSelectedLayerFeature(null);
    setSelectedRecordId(recordId);
  }, []);

  const clearActiveQuery = useCallback(() => {
    setActiveQuery(null);
  }, []);

  const clearDrawnShapes = useCallback(() => {
    clearShapesRef.current?.();
  }, []);

  const patchLayerState = useCallback((layerIndex, patch) => {
    setLayerStates((current) => current.map((state, index) => (index === layerIndex ? { ...state, ...patch } : state)));
  }, []);

  const setLayerVisibility = useCallback((layerIndex, visible) => {
    setLayerStates((current) =>
      current.map((state, index) => (
        index === layerIndex
          ? {
              ...state,
              visible,
              error: visible ? "" : state.error,
              loadNonce: visible ? state.loadNonce + 1 : state.loadNonce
            }
          : state
      ))
    );
  }, []);

  const retryLayerLoad = useCallback((layerIndex) => {
    setLayerStates((current) =>
      current.map((state, index) => (
        index === layerIndex
          ? {
              ...state,
              visible: true,
              error: "",
              loadNonce: state.loadNonce + 1
            }
          : state
      ))
    );
  }, []);

  const zoomToLayer = useCallback((layerIndex) => {
    setLayerStates((current) =>
      current.map((state, index) => (
        index === layerIndex
          ? {
              ...state,
              visible: true,
              error: "",
              loadNonce: state.loaded ? state.loadNonce : state.loadNonce + 1,
              zoomNonce: state.zoomNonce + 1
            }
          : state
      ))
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    mapInstance?.zoomIn();
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    mapInstance?.zoomOut();
  }, [mapInstance]);

  const setWindowView = useCallback((windowName, nextView) => {
    setWindowViews((current) => ({
      ...current,
      [windowName]: nextView
    }));
    if (windowName === "results" && nextView !== "hidden") {
      setMobileView("results");
    }

    if (nextView !== "hidden") {
      setActiveWindow(windowName);
    } else if (windowName === "results") {
      setMobileView((current) => (current === "results" ? "map" : current));
    }
  }, []);

  const openRecordResultsPanel = useCallback(() => {
    setSelectedLayerFeature(null);
    setMobileView("results");
    setWindowView("results", "open");
  }, [setWindowView]);

  const handleLayerFeatureSelect = useCallback((layerTitle, properties = {}) => {
    setSelectedLayerFeature({
      title: layerTitle,
      properties
    });
    setMobileView("results");
    setWindowView("results", "open");
  }, [setWindowView]);

  const toggleWindowFullscreen = useCallback((windowName) => {
    setWindowViews((current) => ({
      ...current,
      [windowName]: current[windowName] === "fullscreen" ? "open" : "fullscreen"
    }));
    setActiveWindow(windowName);
  }, []);

  const flushRenderProgress = useCallback(() => {
    if (renderProgressFlushTimeoutRef.current) {
      window.clearTimeout(renderProgressFlushTimeoutRef.current);
      renderProgressFlushTimeoutRef.current = null;
    }

    renderProgressLastCommitRef.current = window.performance.now();
    setRenderProgress((current) => {
      const next = pendingRenderProgressRef.current;
      return current.active === next.active && current.loaded === next.loaded && current.total === next.total ? current : next;
    });
  }, []);

  const handleRenderProgress = useCallback((nextProgress) => {
    pendingRenderProgressRef.current = nextProgress;

    const isTerminal = !nextProgress.active || nextProgress.loaded >= nextProgress.total;
    const now = window.performance.now();
    const elapsed = now - renderProgressLastCommitRef.current;
    const throttleMs = 160;

    if (!renderProgressLastCommitRef.current || isTerminal || elapsed >= throttleMs) {
      flushRenderProgress();
      return;
    }

    if (renderProgressFlushTimeoutRef.current) {
      return;
    }

    renderProgressFlushTimeoutRef.current = window.setTimeout(flushRenderProgress, throttleMs - elapsed);
  }, [flushRenderProgress]);

  const applyQuerySelection = useCallback((nextQuery) => {
    shouldPanToSelectionRef.current = false;
    setSelectedLayerFeature(null);
    setActiveQuery(nextQuery);
    setWindowView("results", "open");
    setSelectedRecordId((current) => (nextQuery.recordIds.includes(current) ? current : nextQuery.recordIds[0] || ""));
  }, [setWindowView]);

  const applyLoadedDataset = useCallback((nextDataset) => {
    setDataset(nextDataset);
    setLayerStates(buildInitialLayerStates(nextDataset.layers || []));
    setSelectedRecordId(nextDataset.records[0]?.id || "");
    setSelectedLayerFeature(null);
    shouldPanToSelectionRef.current = false;
    setActiveQuery(null);
    setHasDrawnShapes(false);
    setRenderProgress({ active: false, loaded: 0, total: 0 });
    setColorBy(getInitialColorField(nextDataset));
    setStatisticsSpatialMode("none");
    setStatisticsSpatialResults(emptySpatialStatisticsResult);
    setStatisticsSpatialResultKey("");
    setStatisticsSpatialBusy(false);
    setStatisticsSpatialError("");
    setStatisticsSpatialStatusLines([]);
    setLoadWarning("");
    setLoadWarningDetails({
      tabfile: "",
      configfile: ""
    });
    setShouldFitLoadedDataset(true);
    setWindowViews((current) => ({
      ...current,
      results: isPhoneViewport ? "hidden" : "minimized",
      statistics: "hidden"
    }));
    setActiveWindow("results");
    if (isPhoneViewport) {
      setMobileView("map");
    }
  }, [getInitialColorField, isPhoneViewport]);

  const resetLoadedDataset = useCallback(() => {
    setDataset(null);
    setLayerStates([]);
    setSelectedRecordId("");
    setSelectedLayerFeature(null);
    shouldPanToSelectionRef.current = false;
    setActiveQuery(null);
    setHasDrawnShapes(false);
    setRenderProgress({ active: false, loaded: 0, total: 0 });
    setColorBy("");
    setStatisticsSpatialMode("none");
    setStatisticsSpatialResults(emptySpatialStatisticsResult);
    setStatisticsSpatialResultKey("");
    setStatisticsSpatialBusy(false);
    setStatisticsSpatialError("");
    setStatisticsSpatialStatusLines([]);
    setLoadWarning("");
    setLoadWarningDetails({
      tabfile: "",
      configfile: ""
    });
    setWindowViews((current) => ({
      ...current,
      results: "hidden",
      statistics: "hidden"
    }));
    if (isPhoneViewport) {
      setMobileView("map");
    }
  }, [isPhoneViewport]);

  const loadDatasetFromClientFiles = useCallback(async (payload) => {
    const [tabdata, configdata] = await Promise.all([
      fetchRequiredText(payload.tabfile, "tab file"),
      fetchRequiredText(payload.configfile, "config file")
    ]);

    return buildDatasetPayload({
      tabfile: payload.tabfile,
      configfile: payload.configfile,
      tabdata,
      configdata
    });
  }, []);

  const loadDatasetFromServerFiles = useCallback(async (payload) => {
    const params = new URLSearchParams();
    if (payload.tabfile) {
      params.set("tabfile", payload.tabfile);
    }

    if (payload.configfile) {
      params.set("configfile", payload.configfile);
    }

    let response;

    try {
      response = await fetch(`/api/dataset?${params.toString()}`);
    } catch (error) {
      const nextError = new Error("Unable to reach the local dataset API.");
      nextError.recoverableDevFallback = true;
      nextError.cause = error;
      throw nextError;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody?.error || `Unable to load dataset: ${response.status} ${response.statusText}`);
      }

      return responseBody;
    }

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText || `Unable to load dataset: ${response.status} ${response.statusText}`);
    }

    const nextError = new Error("Dataset service returned an unexpected response.");
    nextError.recoverableDevFallback = true;
    throw nextError;
  }, []);

  async function loadDataset(payload, options = {}) {
    const { manageLoading = true } = options;

    if (manageLoading) {
      setLoading(true);
    }
    setError("");

    try {
      let data;

      if (shouldLoadDatasetFromClientFiles(payload)) {
        data = await loadDatasetFromClientFiles(payload);
      } else if (shouldAttemptServerLoad(payload)) {
        try {
          data = await loadDatasetFromServerFiles(payload);
        } catch (serverError) {
          if (import.meta.env.DEV && isRecoverableDevDatasetLoadError(serverError)) {
            data = await loadDatasetFromClientFiles(payload);
          } else {
            throw serverError;
          }
        }
      } else if (payload?.tabdata || payload?.configdata) {
        data = buildDatasetPayload(payload);
      } else {
        throw new Error("Provide a tabfile URL, a configfile URL, or both.");
      }

      applyLoadedDataset(data);
    } catch (nextError) {
      resetLoadedDataset();
      setLoadWarning("Unable to Load Data");
      setLoadWarningDetails({
        tabfile: payload?.tabfile || "",
        configfile: payload?.configfile || ""
      });
      setError(nextError instanceof Error ? nextError.message : "Unable to load dataset.");
    } finally {
      if (manageLoading) {
        setLoading(false);
      }
    }
  }

  const locateUserArea = useCallback(() => {
    if (!navigator.geolocation) {
      setGeocodeError("Geolocation is not available in this browser.");
      return;
    }

    setHomeMarker(null);
    setGeocodeResults([]);
    setGeocodeBusy(true);
    setGeocodeError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeViewport({
          center: [position.coords.latitude, position.coords.longitude],
          zoom: position.coords.accuracy && position.coords.accuracy < 2000 ? 13 : 11,
          animate: true
        });
        setGeocodeBusy(false);
      },
      () => {
        setGeocodeBusy(false);
        setGeocodeError("Unable to determine your current location.");
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000
      }
    );
  }, []);

  const handleGeocodeSubmit = useCallback(async (event) => {
    event.preventDefault();
    const query = geocodeQuery.trim();
    if (!query) {
      setGeocodeError("Enter an address or place name.");
      return;
    }

    setGeocodeBusy(true);
    setGeocodeError("");

    try {
      const directCoordinates = parseDecimalDegrees(query);
      if (directCoordinates) {
        setGeocodeResults([
          {
            id: `geocode-direct-${Date.now()}`,
            query,
            label: query,
            latitude: directCoordinates.latitude,
            longitude: directCoordinates.longitude,
            uncertaintyMeters: 0,
            protocol: "Direct coordinate entry",
            remarks: "Coordinates entered directly by the user"
          }
        ]);
        setGeocodeFitNonce((current) => current + 1);
        setHomeMarker(null);
        return;
      }

      const response = await fetch(`${geocodeSearchUrl}${encodeURIComponent(query)}`, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Geocode search failed: ${response.status} ${response.statusText}`);
      }

      const results = await response.json();
      if (!Array.isArray(results) || !results.length) {
        throw new Error("No matching location was found.");
      }

      const normalizedResults = results.map((result, index) => normalizeGeocodeResult(result, query, index)).filter(Boolean);

      if (!normalizedResults.length) {
        throw new Error("The geocoder returned no usable coordinates.");
      }

      setGeocodeResults(normalizedResults);
      setGeocodeFitNonce((current) => current + 1);
      setHomeMarker(null);
      setGeocodeSuggestions([]);
      setShowGeocodeSuggestions(false);
    } catch (nextError) {
      setGeocodeError(nextError.message || "Unable to geocode that location.");
    } finally {
      setGeocodeBusy(false);
    }
  }, [geocodeQuery]);

  const handleGeocodeSuggestionSelect = useCallback((suggestion) => {
    setGeocodeQuery(suggestion.label);
    setGeocodeResults([suggestion]);
    setGeocodeFitNonce((current) => current + 1);
    setHomeMarker(null);
    setGeocodeError("");
    setGeocodeSuggestions([]);
    setShowGeocodeSuggestions(false);
  }, []);

  const handleDeleteGeocodeResult = useCallback((resultId) => {
    setGeocodeResults((current) => current.filter((result) => result.id !== resultId));
  }, []);

  const handleKeepOnlyGeocodeResult = useCallback((resultId) => {
    setGeocodeResults((current) => current.filter((result) => result.id === resultId));
  }, []);

  const handleSaveGeoJson = useCallback((payload) => {
    setGeoJsonExport({
      title: payload.title || "GeoJSON Export",
      filename: payload.filename || "shape.geojson",
      text: payload.text || ""
    });
    setWindowView("geojson", "open");
  }, [setWindowView]);

  useEffect(() => {
    if (form.tabfile || form.configfile) {
      loadDataset(form);
      return;
    }

    locateUserArea();
    // Initial load is driven once from URL parameters. Other loads happen through explicit UI actions.
  }, []);

  useEffect(() => {
    if (dataset) {
      setGeocodeSuggestions([]);
      setShowGeocodeSuggestions(false);
      return;
    }

    const query = geocodeQuery.trim();
    if (query.length < 3 || parseDecimalDegrees(query)) {
      setGeocodeSuggestions([]);
      setShowGeocodeSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`${geocodeSearchUrl}${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          return;
        }

        const results = await response.json();
        const suggestions = Array.isArray(results)
          ? results.map((result, index) => normalizeGeocodeResult(result, query, index)).filter(Boolean)
          : [];
        setGeocodeSuggestions(suggestions);
        setShowGeocodeSuggestions(Boolean(suggestions.length));
      } catch (nextError) {
        if (nextError.name === "AbortError") {
          return;
        }

        setGeocodeSuggestions([]);
        setShowGeocodeSuggestions(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [dataset, geocodeQuery]);

  const records = dataset?.records || [];
  const columns = dataset?.columns || [];
  const joinConfig = dataset?.join || null;
  const recordLookup = useMemo(() => new Map(records.map((record) => [record.id, record])), [records]);
  const displayedColumns = useMemo(() => getDisplayedColumns(columns), [columns]);
  const colorConfigs = useMemo(() => {
    if (dataset?.colorConfigs?.length) {
      return dataset.colorConfigs;
    }

    if (dataset?.colorConfig) {
      return [dataset.colorConfig];
    }

    return [];
  }, [dataset?.colorConfigs, dataset?.colorConfig]);
  const colorFields = dataset?.colorFields || [];
  const availableColorFields = useMemo(() => {
    const merged = new Map();

    colorFields.forEach((field) => {
      merged.set(field.name, field);
    });

    colorConfigs.forEach((colorConfig) => {
      if (!colorConfig?.fieldname || merged.has(colorConfig.fieldname)) {
        return;
      }

      const matchingColumn = columns.find((column) => column.name === colorConfig.fieldname);
      merged.set(colorConfig.fieldname, {
        name: colorConfig.fieldname,
        alias: colorConfig.label || matchingColumn?.alias || colorConfig.fieldname
      });
    });

    return [...merged.values()];
  }, [colorFields, colorConfigs, columns]);
  const activeColorConfig = colorConfigs.find((config) => config?.fieldname === colorBy) || null;
  const { colorMap, defaultColor, legend: dynamicColorLegend } = useMemo(
    () => buildColorAssignments(records, colorBy, colorConfigs),
    [records, colorBy, colorConfigs]
  );
  const markers = useMemo(
    () =>
      records
        .map((record) => {
          const latitude = Number.parseFloat(record.values.Latitude);
          const longitude = Number.parseFloat(record.values.Longitude);

          if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return null;
          }

          const colorValue = colorBy ? stripHtml(record.values[colorBy] || "").trim() : "";

          return {
            id: record.id,
            latitude,
            longitude,
            record,
            label: getRecordLabel(record, columns),
            color: colorMap.get(colorValue.toLowerCase()) || colorMap.get(colorValue) || defaultColor
          };
        })
        .filter(Boolean),
    [records, columns, colorBy, colorMap, defaultColor]
  );
  const countymatchLookup = useMemo(
    () => (joinConfig?.method === "countymatch" ? buildCountymatchLookup(records, joinConfig) : null),
    [joinConfig, records]
  );
  const shouldShowCountymatchLayer = Boolean(joinConfig?.method === "countymatch");

  const handleZoomAll = useCallback(() => {
    if (!mapInstance) {
      return;
    }

    if (markers.length) {
      fitMapToMarkers(mapInstance, markers);
      return;
    }

    if (shouldShowCountymatchLayer) {
      setShouldFitLoadedDataset(true);
    }
  }, [mapInstance, markers, shouldShowCountymatchLayer]);

  const selectedMarker = markers.find((marker) => marker.id === selectedRecordId) || null;
  const startRecordQuery = useCallback((recordIds, fallbackLabel) => {
    const normalizedRecordIds = Array.isArray(recordIds) ? recordIds.filter(Boolean) : [recordIds].filter(Boolean);
    if (!normalizedRecordIds.length) {
      return;
    }

    const firstRecord = normalizedRecordIds.length === 1 ? recordLookup.get(normalizedRecordIds[0]) : null;
    const queryLabel =
      firstRecord
        ? getRecordLabel(firstRecord, columns) || fallbackLabel
        : fallbackLabel;

    applyQuerySelection({
      label: queryLabel,
      recordIds: normalizedRecordIds
    });
  }, [applyQuerySelection, columns, recordLookup]);
  const handleMapRecordSelection = useCallback((recordIds) => {
    startRecordQuery(recordIds, "Point Query");
  }, [startRecordQuery]);
  const handleClusterSelection = useCallback((recordIds) => {
    startRecordQuery(recordIds, "Cluster Query");
  }, [startRecordQuery]);
  const queryRecordIds = activeQuery?.recordIds || null;
  const recordsForResults = useMemo(() => {
    if (!queryRecordIds) {
      return records;
    }

    const recordIdSet = new Set(queryRecordIds);
    return records.filter((record) => recordIdSet.has(record.id));
  }, [records, queryRecordIds]);
  const markersForResults = useMemo(() => {
    if (!queryRecordIds) {
      return markers;
    }

    const recordIdSet = new Set(queryRecordIds);
    return markers.filter((marker) => recordIdSet.has(marker.id));
  }, [markers, queryRecordIds]);
  const markerResultKey = useMemo(
    () => markersForResults.map((marker) => marker.id).join("|"),
    [markersForResults]
  );
  const statisticsSpatialPointGroups = useMemo(
    () =>
      groupMarkersByCoordinate(markersForResults).map((group) => ({
        latitude: group.latitude,
        longitude: group.longitude,
        recordIds: group.recordIds
      })),
    [markersForResults]
  );
  const resultsSummary = renderProgress.active
    ? `Loading ${formatCount(renderProgress.loaded)} of ${formatCount(renderProgress.total)} records`
    : recordsForResults.length
      ? `${Math.min(recordsForResults.length, 100)} of ${recordsForResults.length} records`
      : activeQuery
        ? "No records matched the current query"
        : "No records loaded";
  const layerFeatureDetails = selectedLayerFeature
    ? buildLayerFeatureDetails(selectedLayerFeature.title, selectedLayerFeature.properties)
    : null;
  const layerFeatureSummary = layerFeatureDetails
    ? layerFeatureDetails.featureName || `${formatCount(layerFeatureDetails.rows.length)} field${layerFeatureDetails.rows.length === 1 ? "" : "s"}`
    : "";
  const resultsView = windowViews.results;
  const statisticsView = windowViews.statistics;
  const geoJsonView = windowViews.geojson;
  const configView = windowViews.config;
  const helpView = windowViews.help;
  const desktopSidebarOpen = !isPhoneViewport && sidebarOpen;
  const legendPanelOpen = isPhoneViewport ? mobileView === "legend" : sidebarOpen;
  const displayResultsView = isPhoneViewport
    ? mobileView === "results" && resultsView !== "hidden"
      ? "open"
      : "hidden"
    : resultsView;
  const getDockedHeight = (view, openHeight) => (view === "open" ? openHeight : view === "minimized" ? "34px" : "0px");
  const resultsDockedHeight = getDockedHeight(displayResultsView, "min(34vh, 320px)");
  const statisticsDockedHeight = getDockedHeight(statisticsView, "min(30vh, 280px)");
  const geoJsonDockedHeight = getDockedHeight(geoJsonView, "min(30vh, 280px)");
  const configDockedHeight = getDockedHeight(configView, "min(36vh, 360px)");
  const resultsDockedBottom = "0px";
  const statisticsDockedBottom = displayResultsView === "fullscreen" ? "0px" : resultsDockedHeight;
  const geoJsonDockedBottom =
    displayResultsView === "fullscreen" || statisticsView === "fullscreen"
      ? "0px"
      : `calc(${resultsDockedHeight} + ${statisticsDockedHeight})`;
  const configDockedBottom =
    displayResultsView === "fullscreen" || statisticsView === "fullscreen" || geoJsonView === "fullscreen"
      ? "0px"
      : `calc(${resultsDockedHeight} + ${statisticsDockedHeight} + ${geoJsonDockedHeight})`;
  const helpDockedBottom =
    displayResultsView === "fullscreen" || statisticsView === "fullscreen" || geoJsonView === "fullscreen" || configView === "fullscreen"
      ? "0px"
      : `calc(${resultsDockedHeight} + ${statisticsDockedHeight} + ${geoJsonDockedHeight} + ${configDockedHeight})`;
  const hiddenWindows = [
    !isPhoneViewport && resultsView === "hidden" ? { key: "results", label: "Results" } : null,
    geoJsonView === "hidden" && geoJsonExport.text ? { key: "geojson", label: "GeoJSON" } : null
  ].filter(Boolean);
  const statisticsColumns = useMemo(
    () => displayedColumns.filter((column) => !["Latitude", "Longitude"].includes(column.name)),
    [displayedColumns]
  );
  const statisticsColumnCount = Array.isArray(statisticsColumns) ? statisticsColumns.length : 0;
  const markerResultCount = Array.isArray(markersForResults) ? markersForResults.length : 0;
  const statisticsColumn =
    statisticsColumns.find((column) => column.name === statisticsColumnName) || statisticsColumns[0] || null;
  const frequencyRows = useMemo(
    () => (statisticsColumn ? buildFrequencyRows(recordsForResults, statisticsColumn) : []),
    [recordsForResults, statisticsColumn]
  );
  const displayedStatisticsRows = statisticsSpatialMode === "none"
    ? (Array.isArray(frequencyRows) ? frequencyRows : [])
    : (Array.isArray(statisticsSpatialResults?.[statisticsSpatialMode]) ? statisticsSpatialResults[statisticsSpatialMode] : []);
  const displayedStatisticsRowCount = displayedStatisticsRows.length;
  const hasStatisticsOptions = Boolean(statisticsColumnCount || markers.length);
  const isSpatialStatisticsReady = !markerResultCount || statisticsSpatialResultKey === markerResultKey;
  const shouldShowSpatialLoading =
    statisticsSpatialMode !== "none" &&
    markerResultCount > 0 &&
    !statisticsSpatialError &&
    (statisticsSpatialBusy || !isSpatialStatisticsReady);
  const shouldShowSpatialError = statisticsSpatialMode !== "none" && Boolean(statisticsSpatialError);
  const statisticsLabel = statisticsSpatialMode === "country"
    ? "Country"
    : statisticsSpatialMode === "state"
      ? "State / Province"
      : statisticsSpatialMode === "county"
        ? "County / District"
        : statisticsColumn?.alias || "Value";
  const statisticsSummary = statisticsSpatialMode === "none"
    ? `${formatCount(recordsForResults.length)} records in scope`
    : `${formatCount(markerResultCount)} mapped records in scope`;
  const datasetName =
    dataset?.metadata?.name && dataset.metadata.name !== "Untitled BerkeleyMapper dataset"
      ? dataset.metadata.name
      : "";
  const legendHtml =
    dataset?.metadata?.legendText ||
    dataset?.metadata?.abstract ||
    (dataset
      ? "No legend text defined for this configuration."
      : "Load a dataset to populate the legend.");
  const configFileText = dataset?.rawConfigText || "";
  const tabFilePreviewText = dataset?.rawTabPreviewText || "";
  const isEmptyLandingState = !dataset && !loading && !error && !loadWarning && !form.tabfile && !form.configfile;
  const aboutPermissionCopy = dataset?.source?.tabfile || dataset?.source?.configfile
    ? "This dataset was requested by passing tabfile/configfile URLs into BerkeleyMapper. The application assumes those URLs were supplied with permission to retrieve and display the data."
    : "When a tabfile and configfile are supplied to BerkeleyMapper, the application assumes it has permission to retrieve and display that material directly in the browser.";

  const ensureSpatialStatisticsLoaded = useCallback(async () => {
    if (!markerResultCount) {
      setStatisticsSpatialResults(emptySpatialStatisticsResult);
      setStatisticsSpatialResultKey("");
      setStatisticsSpatialBusy(false);
      setStatisticsSpatialError("");
      setStatisticsSpatialStatusLines([]);
      statisticsSpatialRequestKeyRef.current = "";
      return;
    }

    if (statisticsSpatialResultKey === markerResultKey || statisticsSpatialRequestKeyRef.current === markerResultKey) {
      return;
    }

    statisticsSpatialRequestKeyRef.current = markerResultKey;
    setStatisticsSpatialBusy(true);
    setStatisticsSpatialError("");
    setStatisticsSpatialStatusLines([]);

    try {
      const nextResults = await fetchSpatialStatistics(statisticsSpatialPointGroups, ({ lines }) => {
        if (statisticsSpatialRequestKeyRef.current !== markerResultKey) {
          return;
        }

        setStatisticsSpatialStatusLines(Array.isArray(lines) ? lines : []);
      });

      if (statisticsSpatialRequestKeyRef.current !== markerResultKey) {
        return;
      }

      setStatisticsSpatialResults(nextResults);
      setStatisticsSpatialResultKey(markerResultKey);
    } catch (error) {
      if (statisticsSpatialRequestKeyRef.current !== markerResultKey) {
        return;
      }

      setStatisticsSpatialResults(emptySpatialStatisticsResult);
      setStatisticsSpatialResultKey("");
      setStatisticsSpatialError(error instanceof Error ? error.message : "Unable to compute spatial intersections.");
    } finally {
      if (statisticsSpatialRequestKeyRef.current === markerResultKey) {
        statisticsSpatialRequestKeyRef.current = "";
        setStatisticsSpatialBusy(false);
      }
    }
  }, [markerResultCount, markerResultKey, statisticsSpatialPointGroups, statisticsSpatialResultKey]);

  const openStatisticsPanel = useCallback(() => {
    setWindowView("statistics", "open");
    setActiveWindow("statistics");
    ensureSpatialStatisticsLoaded();
  }, [ensureSpatialStatisticsLoaded, setWindowView]);

  const handleStatisticsColumnChange = useCallback((event) => {
    setStatisticsColumnName(event.target.value);
    setStatisticsSpatialMode("none");
  }, []);

  const handleStatisticsSpatialModeChange = useCallback((event) => {
    const nextMode = event.target.value;
    setStatisticsSpatialMode(nextMode);

    if (nextMode !== "none") {
      ensureSpatialStatisticsLoaded();
    }
  }, [ensureSpatialStatisticsLoaded]);

  const resetStatisticsSelection = useCallback(() => {
    clearActiveQuery();
    setStatisticsSpatialMode("none");
  }, [clearActiveQuery]);

  useEffect(() => {
    if (!statisticsColumnCount) {
      setStatisticsColumnName("");
      return;
    }

    setStatisticsColumnName((current) =>
      statisticsColumns.some((column) => column.name === current) ? current : statisticsColumns[0].name
    );
  }, [statisticsColumnCount, statisticsColumns]);

  useEffect(() => {
    if (statisticsView === "hidden") {
      return;
    }

    ensureSpatialStatisticsLoaded();
  }, [ensureSpatialStatisticsLoaded, statisticsView]);

  useEffect(() => {
    if (windowViews[activeWindow] !== "hidden") {
      return;
    }

    const fallbackWindow = ["help", "config", "geojson", "statistics", "results"].find((name) => windowViews[name] !== "hidden");
    if (fallbackWindow) {
      setActiveWindow(fallbackWindow);
    }
  }, [activeWindow, windowViews]);

  useEffect(() => () => {
    if (renderProgressFlushTimeoutRef.current) {
      window.clearTimeout(renderProgressFlushTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!shouldFitLoadedDataset || !mapInstance || !markers.length) {
      return;
    }

    fitMapToMarkers(mapInstance, markers);
    setShouldFitLoadedDataset(false);
  }, [shouldFitLoadedDataset, mapInstance, markers]);

  const exportAllViewable = useCallback(() => {
    downloadTextFile(
      `${datasetName.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase() || "berkeleymapper"}_viewable.txt`,
      serializeDelimited(records, displayedColumns),
      "text/tab-separated-values;charset=utf-8"
    );
  }, [datasetName, records, displayedColumns]);

  const exportQueryViewable = useCallback(() => {
    downloadTextFile(
      `${datasetName.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase() || "berkeleymapper"}_subset.txt`,
      serializeDelimited(recordsForResults, displayedColumns),
      "text/tab-separated-values;charset=utf-8"
    );
  }, [datasetName, recordsForResults, displayedColumns]);

  const exportQueryKml = useCallback(() => {
    downloadTextFile(
      `${datasetName.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase() || "berkeleymapper"}_subset.kml`,
      serializeKml(recordsForResults, displayedColumns, datasetName),
      "application/vnd.google-earth.kml+xml;charset=utf-8"
    );
  }, [datasetName, recordsForResults, displayedColumns]);

  const downloadGeoJsonExport = useCallback(() => {
    if (!geoJsonExport.text) {
      return;
    }

    downloadTextFile(geoJsonExport.filename, geoJsonExport.text, "application/geo+json;charset=utf-8");
  }, [geoJsonExport]);

  const copyGeoJsonExport = useCallback(async () => {
    if (!geoJsonExport.text || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(geoJsonExport.text);
  }, [geoJsonExport]);

  return (
    <main className="mapper-shell">
      <div
        className={[
          "map-stage",
          desktopSidebarOpen ? "is-sidebar-open" : "",
          isPhoneViewport ? "is-phone-layout" : "",
          isPhoneViewport ? `is-mobile-${mobileView}` : ""
        ].filter(Boolean).join(" ")}
      >
        {loadWarning ? (
          <div className="top-warning-banner" role="alert">
            <span>{loadWarning}</span>
            <button
              type="button"
              className="processing-help-button text-link"
              onClick={() => setWindowView("help", "open")}
              aria-label="Open help about server-side loading"
            >
              read more
            </button>
          </div>
        ) : null}
        <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom zoomControl={false} className="map-canvas">
          <LayersControl position="topright">
            {baseMapDefinitions.map(({ name, checked, ...tileLayerProps }) => (
              <LayersControl.BaseLayer key={name} checked={checked} name={name}>
                <TileLayer {...tileLayerProps} />
              </LayersControl.BaseLayer>
            ))}
          </LayersControl>
          <MapInstanceBridge onMapReady={setMapInstance} />
          {!dataset ? <MapHomeViewport viewport={homeViewport} marker={homeMarker} /> : null}
          {dataset?.layers?.length ? (
            <MapDatasetLayers
              layers={dataset.layers}
              layerStates={layerStates}
              onLayerStateChange={patchLayerState}
              onFeatureSelect={handleLayerFeatureSelect}
            />
          ) : null}
          {shouldShowCountymatchLayer ? (
            <MapCountymatchLayer
              joinConfig={joinConfig}
              recordIdsByCountyKey={countymatchLookup?.recordIdsByCountyKey || emptyRecordIdsByCountyKey}
              stateNames={countymatchLookup?.stateNames || []}
              maxCount={countymatchLookup?.maxCount || 0}
              onQueryRecords={startRecordQuery}
              shouldFitBounds={shouldFitLoadedDataset && !markers.length}
              onBoundsFit={() => setShouldFitLoadedDataset(false)}
            />
          ) : null}
          <MapGeocodeLayer
            results={geocodeResults}
            fitNonce={geocodeFitNonce}
            onDeleteResult={handleDeleteGeocodeResult}
            onKeepOnlyResult={handleKeepOnlyGeocodeResult}
          />
          <MapTools
            markers={markers}
            onQueryRecords={applyQuerySelection}
            onClearQuery={clearActiveQuery}
            onShapesChange={setHasDrawnShapes}
            registerClearShapes={(callback) => {
              clearShapesRef.current = callback;
            }}
            enableQueries={Boolean(dataset)}
            onSaveGeoJson={handleSaveGeoJson}
          />
          {dataset && pointDisplay !== "markers" ? (
            <MapViewport
              selectedMarker={selectedMarker}
              selectedRecordId={selectedRecordId}
              shouldPanToSelection={shouldPanToSelectionRef.current}
            />
          ) : null}
          {dataset && pointDisplay === "markers" ? (
            <MapPointLayer
              markers={markers}
              displayedColumns={displayedColumns}
              selectedRecordId={selectedRecordId}
              markerRefs={markerRefs}
              onMarkerClick={handleMapRecordSelection}
              onRenderProgress={handleRenderProgress}
              shouldFocusSelection={shouldPanToSelectionRef.current}
            />
          ) : dataset && pointDisplay === "clustered" ? (
            <MapMarkerLayer
              markers={markers}
              displayedColumns={displayedColumns}
              selectedRecordId={selectedRecordId}
              markerRefs={markerRefs}
              onMarkerClick={handleMapRecordSelection}
              onClusterSelect={handleClusterSelection}
              onRenderProgress={handleRenderProgress}
              shouldFocusSelection={shouldPanToSelectionRef.current}
            />
          ) : null}
        </MapContainer>

        <div className="bm-zoom-controls">
          <button type="button" className="bm-zoom-button bm-zoom-in" title="Zoom in" onClick={handleZoomIn}>
            +
          </button>
          <button type="button" className="bm-zoom-button bm-zoom-out" title="Zoom out" onClick={handleZoomOut}>
            -
          </button>
        </div>

        {dataset || hasDrawnShapes ? (
          <div className="bm-action-controls">
            {dataset ? (
              <button type="button" className="bm-map-toolbar-button" title="Zoom to all mapped points" onClick={handleZoomAll}>
                All
              </button>
            ) : null}
            {dataset && !isPhoneViewport ? (
              <button type="button" className="bm-map-toolbar-button" title="Show results panel" onClick={openRecordResultsPanel}>
                Results
              </button>
            ) : null}
            {hasDrawnShapes ? (
              <button type="button" className="bm-map-toolbar-button" title="Remove drawn shapes" onClick={clearDrawnShapes}>
                Trash
              </button>
            ) : null}
            {activeQuery ? (
              <button type="button" className="bm-map-toolbar-button" title="Clear active query" onClick={clearActiveQuery}>
                Clear
              </button>
            ) : null}
          </div>
        ) : null}

        {isPhoneViewport ? (
          <div className="mobile-view-launchers">
            {mobileView !== "legend" ? (
              <button type="button" className="window-reopen" onClick={() => setMobileView("legend")} aria-label="Show legend">
                Legend
              </button>
            ) : null}
            {dataset && mobileView !== "results" ? (
              <button
                type="button"
                className="window-reopen"
                onClick={openRecordResultsPanel}
                aria-label="Show results"
              >
                Results
              </button>
            ) : null}
          </div>
        ) : (
          <div className={`sidebar-toggle ${sidebarOpen ? "is-open" : ""}`}>
            <button type="button" onClick={() => setSidebarOpen((current) => !current)} aria-label="Toggle legend panel">
              {sidebarOpen ? "‹" : "›"}
            </button>
          </div>
        )}

        <aside className={`legend-panel ${legendPanelOpen ? "is-open" : ""}`}>
          <div className="legend-scroll">
            {isPhoneViewport ? (
              <section className="panel-section mobile-panel-switcher">
                <div className="panel-actions">
                  <button type="button" onClick={() => setMobileView("map")}>
                    Map
                  </button>
                  {dataset ? (
                    <button type="button" className="secondary" onClick={openRecordResultsPanel}>
                      Results
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
            <section className="panel-section">
              <h2>
                <button type="button" className="section-title-link" onClick={() => setWindowView("config", "fullscreen")}>
                  About This Application
                </button>
              </h2>
              {loadWarning ? (
                <p className="legend-copy processing-copy">
                  Unable to Load Data
                  <button
                    type="button"
                    className="processing-help-button text-link"
                    onClick={() => setWindowView("help", "open")}
                    aria-label="Open help about server-side loading"
                  >
                    read more
                  </button>
                </p>
              ) : null}
            </section>

            <section className="panel-section">
              <h2>Geocode</h2>
              <form className="geocode-form" onSubmit={handleGeocodeSubmit}>
                <label>
                  Find a place, address, or coordinates
                  <input
                    type="text"
                    value={geocodeQuery}
                    onChange={(event) => setGeocodeQuery(event.target.value)}
                    onFocus={() => {
                      if (geocodeSuggestions.length) {
                        setShowGeocodeSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setShowGeocodeSuggestions(false), 120);
                    }}
                    placeholder="Berkeley, California or 37.87 -122.27"
                  />
                </label>
                {showGeocodeSuggestions && geocodeSuggestions.length ? (
                  <div className="geocode-suggestions" role="listbox" aria-label="Geocode suggestions">
                    {geocodeSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="geocode-suggestion"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleGeocodeSuggestionSelect(suggestion);
                        }}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="panel-actions">
                  <button type="submit" disabled={geocodeBusy}>
                    {geocodeBusy ? "Searching..." : "Geocode"}
                  </button>
                  <button type="button" className="secondary" onClick={locateUserArea} disabled={geocodeBusy}>
                    Use My Location
                  </button>
                </div>
              </form>
              {geocodeError ? <p className="status-banner error">{geocodeError}</p> : null}
            </section>

            {dataset?.logos?.length ? (
              <section className="panel-section logo-panel">
                <div className="logo-stack">
                  {dataset.logos.map((logo) => (
                    <LogoImage key={`${logo.img}-${logo.url}`} logo={logo} />
                  ))}
                </div>
              </section>
            ) : null}

            {!loadWarning && error ? <p className="status-banner error">{error}</p> : null}
            {!error && loading ? <p className="status-banner info">Loading Application ...</p> : null}

            {isEmptyLandingState ? null : dataset ? (
              <>
                <section className="panel-section">
                  <h2>Display</h2>
                  <label>
                    Point Display
                    <select
                      value={pointDisplay}
                      onChange={(event) => {
                        setPointDisplay(event.target.value);
                      }}
                    >
                      <option value="none">No markers</option>
                      <option value="clustered">Marker Clusterer</option>
                      <option value="markers">Placemarks</option>
                    </select>
                  </label>
                  {availableColorFields.length ? (
                    <label>
                      Color By
                      <select
                        value={colorBy}
                        onChange={(event) => {
                          setColorBy(event.target.value);
                        }}
                      >
                        <option value="">None</option>
                        {availableColorFields.map((field) => (
                          <option key={field.name} value={field.name}>
                            {field.alias}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </section>

                {dynamicColorLegend.length ? (
                  <section className="panel-section">
                    <h2>{colorBy && activeColorConfig?.fieldname === colorBy ? activeColorConfig.label || "Marker Colors" : "Marker Colors"}</h2>
                    <div className="color-list">
                      {dynamicColorLegend.map((entry) => (
                        <div className="color-row" key={entry.value}>
                          <span className="marker-chip" style={{ backgroundColor: entry.color }} />
                          <span>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {dataset?.layers?.length ? (
                  <section className="panel-section">
                    <h2>Layers</h2>
                    <div className="layer-list">
                      {dataset.layers.map((layer, index) => {
                        const layerState = layerStates[index] || buildInitialLayerStates([layer])[0];
                        const layerSourceUrl = getLayerSourceUrl(layer);
                        const layerTitle = layer.title || layerSourceUrl;
                        const shortLayerTitle = truncateLayerTitle(layerTitle, 20);
                        const layerToggleId = `layer-toggle-${index}`;
                        const statusMessage = layerState.loading
                          ? "Loading layer..."
                          : layerState.error || "";

                        return (
                          <div className="layer-list-item" key={`${index}-${layer.title}-${layerSourceUrl}`}>
                            <div className="layer-heading">
                              <span
                                className="layer-swatch"
                                style={{ backgroundColor: getLayerAccentColor(index) }}
                                aria-hidden="true"
                              />
                              <input
                                id={layerToggleId}
                                type="checkbox"
                                checked={layerState.visible}
                                onChange={(event) => setLayerVisibility(index, event.target.checked)}
                              />
                              <div className="layer-inline">
                                <label htmlFor={layerToggleId} className="layer-title" title={layerTitle}>
                                  {shortLayerTitle}
                                </label>
                                <div className="layer-inline-actions">
                                  <button
                                    type="button"
                                    className="layer-icon-action layer-zoom-action"
                                    onClick={() => zoomToLayer(index)}
                                    aria-label={`Zoom to ${layerTitle}`}
                                    title="Zoom to layer"
                                  >
                                    <ZoomIcon />
                                  </button>
                                  {layer.url ? (
                                    <a
                                      className="layer-icon-action layer-details-action"
                                      href={layer.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`Open details for ${layerTitle}`}
                                      title="Layer details"
                                    >
                                      <DetailsIcon />
                                    </a>
                                  ) : null}
                                  {layerState.error ? (
                                    <button
                                      type="button"
                                      className="layer-icon-action"
                                      onClick={() => retryLayerLoad(index)}
                                      aria-label={`Retry ${layerTitle}`}
                                      title="Retry layer"
                                    >
                                      <RetryIcon />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            {statusMessage ? (
                              <div className={`layer-status ${layerState.error ? "error" : ""}`}>
                                {statusMessage}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <section className="panel-section">
                  <h2>Actions</h2>
                  <div className="panel-actions">
                    <button
                      type="button"
                      onClick={openStatisticsPanel}
                      disabled={!hasStatisticsOptions}
                    >
                      Statistics
                    </button>
                    <button type="button" className="secondary" onClick={exportAllViewable} disabled={!records.length}>
                      Download Viewable
                    </button>
                    <button type="button" className="secondary" onClick={exportQueryViewable} disabled={!recordsForResults.length}>
                      Download Subset
                    </button>
                    <button type="button" className="secondary" onClick={exportQueryKml} disabled={!recordsForResults.length}>
                      Export KML
                    </button>
                  </div>
                </section>

                {dataset?.metadata?.disclaimer ? (
                  <section className="panel-section">
                    <h2>Disclaimer</h2>
                    <div
                      className="legend-copy disclaimer-copy"
                      dangerouslySetInnerHTML={{
                        __html: dataset.metadata.disclaimer
                      }}
                    />
                  </section>
                ) : null}

                <section className="panel-section metrics-panel">
                  <h2>Summary</h2>
                  <div className="metric-grid">
                    <div className="metric-box">
                      <span>Records</span>
                      <strong>{dataset?.summary?.recordCount || 0}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Mapped Points</span>
                      <strong>{dataset?.summary?.pointCount || 0}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Columns</span>
                      <strong>{dataset?.summary?.columnCount || 0}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Visible Fields</span>
                      <strong>{dataset?.summary?.visibleColumnCount || 0}</strong>
                    </div>
                  </div>
                </section>
              </>
            ) : null}
          </div>
          <div className="legend-footer">
            <a href="https://github.com/BNHM/berkeleymapper" target="_blank" rel="noreferrer">
              <img src={brandLogo} alt="BerkeleyMapper" className="brand-logo" />
            </a>
            <p>
              Powered by{" "}
              <a href="https://github.com/BNHM/berkeleymapper" target="_blank" rel="noreferrer">
                BerkeleyMapper
              </a>
            </p>
          </div>
        </aside>

        {displayResultsView !== "hidden" ? (
          <section
            className={`bottom-drawer results-drawer is-${displayResultsView} ${activeWindow === "results" ? "is-active" : ""}`}
            onMouseDown={() => setActiveWindow("results")}
          >
            <div className="window-titlebar">
              <div className="window-titletext">
                <strong>{selectedLayerFeature ? "Layer Details" : "Results"}</strong>
                <span>{selectedLayerFeature ? layerFeatureSummary : resultsSummary}</span>
              </div>
              {isPhoneViewport ? (
                <div className="mobile-window-nav">
                  <button type="button" className="window-reopen" onClick={() => setMobileView("map")} aria-label="Show map">
                    Map
                  </button>
                  <button type="button" className="window-reopen" onClick={() => setMobileView("legend")} aria-label="Show legend">
                    Legend
                  </button>
                </div>
              ) : null}
              <div className="window-controls">
                {!isPhoneViewport ? (
                  <>
                    <button type="button" className="results-control-button" onClick={() => setWindowView("results", "minimized")} aria-label="Minimize results panel">
                      <span className="results-control-icon results-control-minimize" aria-hidden="true" />
                    </button>
                    {displayResultsView !== "open" ? (
                      <button type="button" className="results-control-button" onClick={() => setWindowView("results", "open")} aria-label="Restore results panel">
                        <span className="results-control-icon results-control-restore" aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="results-control-button"
                      onClick={() => toggleWindowFullscreen("results")}
                      aria-label={displayResultsView === "fullscreen" ? "Exit fullscreen results" : "Fullscreen results"}
                    >
                      <span className="results-control-icon results-control-maximize" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                <button type="button" className="results-control-button" onClick={() => setWindowView("results", "hidden")} aria-label="Close results panel">
                  <span className="results-control-icon results-control-close" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="window-content">
              {layerFeatureDetails ? (
                <div className="layer-feature-panel">
                  <div className="layer-feature-header">
                    <div>
                      <h2>{layerFeatureDetails.featureName || layerFeatureDetails.title || "Layer Feature"}</h2>
                      {layerFeatureDetails.featureName && layerFeatureDetails.title ? (
                        <p>{layerFeatureDetails.title}</p>
                      ) : null}
                    </div>
                    <button type="button" className="secondary" onClick={openRecordResultsPanel}>
                      Record Results
                    </button>
                  </div>
                  {layerFeatureDetails.descriptionHtml ? (
                    <div
                      className="layer-feature-html"
                      dangerouslySetInnerHTML={{
                        __html: layerFeatureDetails.descriptionHtml
                      }}
                    />
                  ) : layerFeatureDetails.descriptionText ? (
                    <div className="layer-feature-html">
                      <p>{layerFeatureDetails.descriptionText}</p>
                    </div>
                  ) : null}
                  {layerFeatureDetails.rows.length ? (
                    <div className="layer-feature-meta">
                      <table>
                        <tbody>
                          {layerFeatureDetails.rows.map(([key, value]) => (
                            <tr key={key}>
                              <th>{key}</th>
                              <td>{renderRecordValue(String(value), `layer-${key}`)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="results-table">
                  <table>
                    <thead>
                      <tr>
                        {displayedColumns.map((column) => (
                          <th key={column.name}>{column.alias}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recordsForResults.slice(0, 100).map((record) => (
                        <tr
                          key={record.id}
                          className={record.id === selectedRecordId ? "is-selected" : ""}
                          onClick={() => {
                            handleRecordSelection(record.id);
                          }}
                        >
                          {displayedColumns.map((column) => (
                            <td key={`${record.id}-${column.name}`}>
                              {renderRecordValue(record.values[column.name] || "", `${record.id}-${column.name}`)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {statisticsView !== "hidden" ? (
          <section
            className={`bottom-drawer statistics-drawer is-${statisticsView} ${activeWindow === "statistics" ? "is-active" : ""}`}
            style={statisticsView === "fullscreen" ? undefined : { bottom: statisticsDockedBottom }}
            onMouseDown={() => {
              setActiveWindow("statistics");
              ensureSpatialStatisticsLoaded();
            }}
          >
            <div className="window-titlebar">
              <div className="window-titletext">
                <strong>Statistics</strong>
                <span>{statisticsSummary}</span>
              </div>
              <div className="window-controls">
                <button type="button" className="results-control-button" onClick={() => setWindowView("statistics", "minimized")} aria-label="Minimize statistics panel">
                  <span className="results-control-icon results-control-minimize" aria-hidden="true" />
                </button>
                {statisticsView !== "open" ? (
                  <button
                    type="button"
                    className="results-control-button"
                    onClick={openStatisticsPanel}
                    aria-label="Restore statistics panel"
                  >
                    <span className="results-control-icon results-control-restore" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="results-control-button"
                  onClick={() => toggleWindowFullscreen("statistics")}
                  aria-label={statisticsView === "fullscreen" ? "Exit fullscreen statistics" : "Fullscreen statistics"}
                >
                  <span className="results-control-icon results-control-maximize" aria-hidden="true" />
                </button>
                <button type="button" className="results-control-button" onClick={() => setWindowView("statistics", "hidden")} aria-label="Close statistics panel">
                  <span className="results-control-icon results-control-close" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="window-content statistics-content">
              <div className="statistics-toolbar">
                <label>
                  Column
                  <select
                    value={statisticsColumn?.name || ""}
                    onChange={handleStatisticsColumnChange}
                    disabled={!statisticsColumnCount}
                  >
                    {statisticsColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.alias}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Spatial Intersection
                  <select value={statisticsSpatialMode} onChange={handleStatisticsSpatialModeChange}>
                    {spatialStatisticsModes.map((mode) => (
                      <option
                        key={mode.value}
                        value={mode.value}
                        disabled={mode.value !== "none" && !markerResultCount}
                      >
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="statistics-summary">
                  <strong>{activeQuery ? activeQuery.label : "Entire Dataset"}</strong>
                  <span>{statisticsSummary}</span>
                </div>
                {activeQuery || statisticsSpatialMode !== "none" ? (
                  <button type="button" className="secondary" onClick={resetStatisticsSelection}>
                    Reset
                  </button>
                ) : null}
              </div>

              {shouldShowSpatialError ? (
                <p className="statistics-empty">{statisticsSpatialError}</p>
              ) : shouldShowSpatialLoading ? (
                <div className="statistics-loading-block">
                  <p className="statistics-empty">Computing spatial intersections...</p>
                  {statisticsSpatialStatusLines.length ? (
                    <ul className="statistics-status-list">
                      {statisticsSpatialStatusLines.map((line, index) => (
                        <li key={`${index}-${line}`}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : statisticsSpatialMode !== "none" && !markerResultCount ? (
                <p className="statistics-empty">No mapped point records are available for spatial intersections.</p>
              ) : statisticsSpatialMode === "none" && !statisticsColumn ? (
                <p className="statistics-empty">No visible columns are available for statistics.</p>
              ) : displayedStatisticsRowCount ? (
                <div className="stats-table-wrap">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>{statisticsLabel}</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStatisticsRows.map((row) => (
                        <tr
                          key={`${statisticsSpatialMode}-${row.value}`}
                          onClick={() => {
                            const rowRecordIds = resolveSpatialStatisticsRowRecordIds(row, statisticsSpatialPointGroups);
                            if (rowRecordIds.length) {
                              startRecordQuery(rowRecordIds, row.value);
                            }
                          }}
                        >
                          <td>{row.value}</td>
                          <td>{formatCount(row.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="statistics-empty">
                  {statisticsSpatialMode === "none"
                    ? "No visible columns are available for statistics."
                    : "No spatial intersections were found for the mapped records in scope."}
                </p>
              )}
            </div>
          </section>
        ) : null}

        {geoJsonView !== "hidden" ? (
          <section
            className={`bottom-drawer geojson-drawer is-${geoJsonView} ${activeWindow === "geojson" ? "is-active" : ""}`}
            style={geoJsonView === "fullscreen" ? undefined : { bottom: geoJsonDockedBottom }}
            onMouseDown={() => setActiveWindow("geojson")}
          >
            <div className="window-titlebar">
              <div className="window-titletext">
                <strong>GeoJSON</strong>
                <span>{geoJsonExport.title || geoJsonExport.filename}</span>
              </div>
              <div className="window-controls">
                <button type="button" className="results-control-button" onClick={() => setWindowView("geojson", "minimized")} aria-label="Minimize GeoJSON panel">
                  <span className="results-control-icon results-control-minimize" aria-hidden="true" />
                </button>
                {geoJsonView !== "open" ? (
                  <button type="button" className="results-control-button" onClick={() => setWindowView("geojson", "open")} aria-label="Restore GeoJSON panel">
                    <span className="results-control-icon results-control-restore" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="results-control-button"
                  onClick={() => toggleWindowFullscreen("geojson")}
                  aria-label={geoJsonView === "fullscreen" ? "Exit fullscreen GeoJSON" : "Fullscreen GeoJSON"}
                >
                  <span className="results-control-icon results-control-maximize" aria-hidden="true" />
                </button>
                <button type="button" className="results-control-button" onClick={() => setWindowView("geojson", "hidden")} aria-label="Close GeoJSON panel">
                  <span className="results-control-icon results-control-close" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="window-content geojson-content">
              <div className="statistics-toolbar">
                <div className="statistics-summary">
                  <strong>{geoJsonExport.filename}</strong>
                  <span>{geoJsonExport.text ? "Polygon GeoJSON ready" : "No GeoJSON generated yet"}</span>
                </div>
                <div className="panel-actions">
                  <button type="button" onClick={copyGeoJsonExport} disabled={!geoJsonExport.text || !navigator.clipboard?.writeText}>
                    Copy To Clipboard
                  </button>
                  <button type="button" className="secondary" onClick={downloadGeoJsonExport} disabled={!geoJsonExport.text}>
                    Download GeoJSON
                  </button>
                </div>
              </div>
              <pre className="config-file-view geojson-view">{geoJsonExport.text || "Draw a polygon and use Save GeoJSON from the popup."}</pre>
            </div>
          </section>
        ) : null}

        {configView !== "hidden" ? (
          <section
            className={`bottom-drawer config-drawer is-${configView} ${activeWindow === "config" ? "is-active" : ""}`}
            style={configView === "fullscreen" ? undefined : { bottom: configDockedBottom }}
            onMouseDown={() => setActiveWindow("config")}
          >
            <div className="window-titlebar">
              <div className="window-titletext">
                <strong>About This Application</strong>
                {datasetName ? <span>{datasetName}</span> : null}
              </div>
              <div className="window-controls">
                <button type="button" className="results-control-button" onClick={() => setWindowView("config", "minimized")} aria-label="Minimize configuration panel">
                  <span className="results-control-icon results-control-minimize" aria-hidden="true" />
                </button>
                {configView !== "open" ? (
                  <button type="button" className="results-control-button" onClick={() => setWindowView("config", "open")} aria-label="Restore configuration panel">
                    <span className="results-control-icon results-control-restore" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="results-control-button"
                  onClick={() => toggleWindowFullscreen("config")}
                  aria-label={configView === "fullscreen" ? "Exit fullscreen configuration" : "Fullscreen configuration"}
                >
                  <span className="results-control-icon results-control-maximize" aria-hidden="true" />
                </button>
                <button type="button" className="results-control-button" onClick={() => setWindowView("config", "hidden")} aria-label="Close configuration panel">
                  <span className="results-control-icon results-control-close" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="window-content config-content">
              <div className="about-content">
                <section className="about-hero">
                  <img src={brandLogo} alt="BerkeleyMapper" className="about-hero-logo" />
                  <div className="about-hero-copy">
                    <p>
                      BerkeleyMapper reads a BerkeleyMapper XML configuration file and, when present, a tab-delimited or CSV data
                      file. Config-only datasets can still load GIS layers even when no tabfile is available.
                    </p>
                    <p>{aboutPermissionCopy}</p>
                  </div>
                </section>

                <section className="about-grid">
                  <article className="about-card">
                    <h4>1. Start With A Dataset</h4>
                    <p>
                      Use a <strong>configfile</strong> URL by itself, or pair it with a <strong>tabfile</strong>. The
                      browser parses field order, aliases, logos, marker colors, layers, and visibility rules directly from
                      the XML configuration.
                    </p>
                    <ul className="about-sample-list">
                      <li><a href={configOnlyDemoHref}>Load Config-Only Demo</a></li>
                      <li><a href={arctosDemoHref}>Load Arctos Demo</a></li>
                      <li><a href={arctosCsvDemoHref}>Load Arctos CSV Demo (100 Records)</a></li>
                      <li><a href={amphibiawebDemoHref}>Load AmphibiaWeb Demo</a></li>
                      <li><a href={ucmpJoinDemoHref}>Load UCMP County Join Demo</a></li>
                    </ul>
                  </article>

                  <article className="about-card">
                    <h4>2. Move Around The Map</h4>
                    <div className="about-toolbar about-toolbar-vertical">
                      <span className="about-tool about-tool-square">+</span>
                      <span className="about-tool about-tool-square">-</span>
                    </div>
                    <p>
                      Use the zoom controls at upper left to move in and out. After a dataset is loaded, <strong>All</strong> fits
                      the map to the full result set and <strong>Results</strong> reopens the bottom results window.
                    </p>
                  </article>

                  <article className="about-card">
                    <h4>3. Measure And Draw</h4>
                    <div className="about-toolbar">
                      <span className="about-tool about-tool-line" />
                      <span className="about-tool about-tool-poly" />
                      <span className="about-tool about-tool-circle" />
                    </div>
                    <p>
                      The top-center shape tools are available immediately. Draw a line to measure distance, or draw a polygon
                      or circle to measure area and define a spatial query.
                    </p>
                  </article>

                  <article className="about-card">
                    <h4>4. Run Spatial Queries</h4>
                    <div className="about-toolbar">
                      <span className="about-chip">Polygon Query</span>
                      <span className="about-chip">Circle Query</span>
                    </div>
                    <p>
                      Once records are loaded, polygon and circle drawings filter the dataset to the matching records. Use
                      <strong>Clear</strong> to remove the active subset, or <strong>Trash</strong> to remove drawn shapes.
                    </p>
                  </article>

                  <article className="about-card">
                    <h4>5. Inspect Records</h4>
                    <div className="about-toolbar">
                      <span className="about-chip">Results</span>
                      <span className="about-chip">Statistics</span>
                      <span className="about-chip">Export KML</span>
                    </div>
                    <p>
                      Use the bottom windows to browse records, review statistics for the current subset, and export the
                      currently viewable records or KML.
                    </p>
                  </article>

                  <article className="about-card">
                    <h4>6. Geocode Places</h4>
                    <div className="about-toolbar about-toolbar-vertical">
                      <span className="about-chip">Geocode</span>
                      <span className="about-chip">Use My Location</span>
                    </div>
                    <p>
                      The geocode panel can search places, addresses, or direct coordinates. Candidate results are drawn on the
                      map with markers and uncertainty circles, and each result can be deleted, isolated, or zoomed.
                    </p>
                  </article>
                </section>

                <section className="about-note">
                  <h4>Server Loading</h4>
                  <p>
                    This deployment loads remote <code>tabfile</code> and <code>configfile</code> URLs on the server, so
                    browser CORS headers are no longer required for those dataset requests.
                  </p>
                </section>

                <section className="about-note">
                  <h4>Sample Calls</h4>
                  <ul className="about-sample-list">
                    <li>
                      <a href={configOnlyDemoHref}><code>?configfile=/sampledata/no-tabfile-config.xml</code></a>
                      <p>
                        Config-only local recreation. This keeps everything local and exercises the config-only load path
                        with a GIS overlay layer and zero tabular records.
                      </p>
                    </li>
                    <li>
                      <a href={ucmpJoinDemoHref}><code>{ucmpJoinDemoHref}</code></a>
                      <p>
                        UCMP county join example. This uses the legacy <code>countymatch</code> XML join logic and shades
                        county polygons from local <code>GADM41/admn_2.shp</code> data so clicking a county filters the
                        records to that county.
                      </p>
                    </li>
                  </ul>
                </section>

                <section className="about-note">
                  <h4>Tabfile Currently In Use: First 20 Rows</h4>
                  <pre className="config-file-view config-file-view-inline">
                    {tabFilePreviewText || "No tabfile is currently loaded."}
                  </pre>
                </section>

                <section className="about-note">
                  <h4>Configuration File Currently In Use</h4>
                  <pre className="config-file-view config-file-view-inline">
                    {configFileText || "No configuration file is currently loaded."}
                  </pre>
                </section>
              </div>
            </div>
          </section>
        ) : null}

        {helpView !== "hidden" ? (
          <section
            className={`bottom-drawer help-drawer is-${helpView} ${activeWindow === "help" ? "is-active" : ""}`}
            style={helpView === "fullscreen" ? undefined : { bottom: helpDockedBottom }}
            onMouseDown={() => setActiveWindow("help")}
          >
            <div className="window-titlebar">
              <div className="window-titletext">
                <strong>Server Loading Help</strong>
                <span>How BerkeleyMapper retrieves remote tabfile and configfile URLs</span>
              </div>
              <div className="window-controls">
                <button type="button" className="results-control-button" onClick={() => setWindowView("help", "minimized")} aria-label="Minimize help panel">
                  <span className="results-control-icon results-control-minimize" aria-hidden="true" />
                </button>
                {helpView !== "open" ? (
                  <button type="button" className="results-control-button" onClick={() => setWindowView("help", "open")} aria-label="Restore help panel">
                    <span className="results-control-icon results-control-restore" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="results-control-button"
                  onClick={() => toggleWindowFullscreen("help")}
                  aria-label={helpView === "fullscreen" ? "Exit fullscreen help" : "Fullscreen help"}
                >
                  <span className="results-control-icon results-control-maximize" aria-hidden="true" />
                </button>
                <button type="button" className="results-control-button" onClick={() => setWindowView("help", "hidden")} aria-label="Close help panel">
                  <span className="results-control-icon results-control-close" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="window-content help-content">
              <p>
                BerkeleyMapper now fetches remote <code>tabfile</code> and <code>configfile</code> URLs on the server and
                returns the parsed dataset to the browser. A config-only load is valid when the XML only defines GIS layers.
              </p>
              {loadWarningDetails.tabfile || loadWarningDetails.configfile ? (
                <>
                  <p><strong>Exact failing request(s)</strong></p>
                  <ul className="help-list">
                    {loadWarningDetails.tabfile ? <li><code>tabfile</code>: {loadWarningDetails.tabfile}</li> : null}
                    {loadWarningDetails.configfile ? <li><code>configfile</code>: {loadWarningDetails.configfile}</li> : null}
                  </ul>
                  <p><strong>Common causes</strong></p>
                  <pre className="config-file-view config-file-view-inline">
{`- the remote host is unreachable from the BerkeleyMapper server
- the URL returns 404/403/500 instead of the dataset
- the remote server has TLS/certificate issues
- the tabfile or configfile contents are invalid`}
                  </pre>
                </>
              ) : null}
              <p>
                Relative source URLs are resolved against the BerkeleyMapper server origin. Absolute source URLs must use
                <code> http://</code> or <code>https://</code>.
              </p>
              <p>
                When a load fails, check the BerkeleyMapper server logs first. The Node service will report the upstream
                fetch or parsing error directly.
              </p>
              <p>
                Local development still falls back to browser-side loading when the dataset API is not running, so CORS can
                still matter in that environment.
              </p>
            </div>
          </section>
        ) : null}
      </div>

      {hiddenWindows.length ? (
        <div className="window-launchers">
          {hiddenWindows.map((windowItem) => (
            <button
              key={windowItem.key}
              type="button"
              className="window-reopen"
              onClick={() => {
                if (windowItem.key === "results") {
                  openRecordResultsPanel();
                  return;
                }

                setWindowView(windowItem.key, "open");
              }}
              aria-label={`Show ${windowItem.label} panel`}
            >
              {windowItem.label}
            </button>
          ))}
        </div>
      ) : null}
    </main>
  );
}

export default App;
