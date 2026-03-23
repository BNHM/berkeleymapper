import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import turfArea from "@turf/area";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet.markercluster";
import brandLogo from "../src/main/webapp/img/logo_medium_t.png";
import { buildDatasetPayload } from "../shared/buildDatasetPayload.js";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const defaultCenter = [37.85, -122.27];
const defaultZoom = 4;
const arctosDemo = {
  tabfile: "https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt",
  configfile: "https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml"
};
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
const clientLoadHostAllowlist = new Set([
  "raw.githubusercontent.com"
]);
const serverProcessingHelpText = [
  "This dataset is using server-based processing because the source host is not available for direct browser loading.",
  "To enable browser-side loading in the future, configure the data host to allow CORS for:",
  "https://berkeleymapper2.netlify.app",
  "https://berkeleymapper.netlify.app",
  "https://berkeleymapper.org",
  "Optional API keys are stored locally in this browser and are sent with server-based load requests for future integrations."
].join("\n");
const apiKeyStorageKey = "berkeleymapper.serverApiKey";

function canClientFetchUrl(url) {
  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin || clientLoadHostAllowlist.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function shouldAttemptClientLoad(payload) {
  return Boolean(payload?.tabfile) && !payload?.tabdata && canClientFetchUrl(payload.tabfile) && canClientFetchUrl(payload.configfile);
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

function buildInitialForm() {
  const params = new URLSearchParams(window.location.search);

  return {
    tabfile: params.get("tabfile") || "",
    configfile: params.get("configfile") || ""
  };
}

function buildInitialApiKey() {
  return window.localStorage.getItem(apiKeyStorageKey) || "";
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, "").trim();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function parseLinkValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const anchorMatch = value.trim().match(anchorTagPattern);
  if (anchorMatch) {
    return {
      href: anchorMatch[2],
      label: stripHtml(anchorMatch[3]) || anchorMatch[2]
    };
  }

  if (urlPattern.test(value.trim())) {
    return {
      href: value.trim(),
      label: value.trim()
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

function buildColorAssignments(records, colorBy, colorConfig) {
  if (!colorBy) {
    return {
      colorMap: new Map(),
      defaultColor: "#cc3333",
      legend: []
    };
  }

  if (colorConfig?.method === "field" && colorConfig.fieldname === colorBy && colorConfig.colors?.length) {
    const colorMap = new Map();
    let defaultColor = "#cc3333";

    colorConfig.colors.forEach((entry) => {
      if ((entry.key || "").toLowerCase() === "default") {
        defaultColor = entry.hex || defaultColor;
        return;
      }

      colorMap.set((entry.key || "").trim().toLowerCase(), entry.hex);
    });

    return {
      colorMap,
      defaultColor,
      legend: colorConfig.colors
        .filter((entry) => (entry.key || "").toLowerCase() !== "default")
        .map((entry) => ({
          value: entry.label || entry.key,
          color: entry.hex
        }))
    };
  }

  const uniqueValues = [...new Set(records.map((record) => stripHtml(record.values[colorBy] || "").trim()).filter(Boolean))].slice(0, 50);
  const colorMap = new Map();
  const legend = uniqueValues.map((value, index) => {
    const color = markerPalette[index % markerPalette.length];
    colorMap.set(value, color);
    return { value, color };
  });

  return { colorMap, legend };
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
    counts.set(normalizedValue, (counts.get(normalizedValue) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
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

function MapTools({ markers, onQueryRecords, onClearQuery, onShapesChange, registerClearShapes }) {
  const map = useMap();
  const markersRef = useRef(markers);
  const onQueryRecordsRef = useRef(onQueryRecords);
  const onClearQueryRef = useRef(onClearQuery);
  const onShapesChangeRef = useRef(onShapesChange);
  const registerClearShapesRef = useRef(registerClearShapes);

  useEffect(() => {
    markersRef.current = markers;
    onQueryRecordsRef.current = onQueryRecords;
    onClearQueryRef.current = onClearQuery;
    onShapesChangeRef.current = onShapesChange;
    registerClearShapesRef.current = registerClearShapes;
  }, [markers, onQueryRecords, onClearQuery, onShapesChange, registerClearShapes]);

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
      onClearQueryRef.current();
    }

    registerClearShapesRef.current(clearDrawnShapes);

    function describeQueryResult(label, recordIds) {
      const count = recordIds.length;
      return `${label} matched ${formatCount(count)} record${count === 1 ? "" : "s"}.`;
    }

    function buildShapePopup(layerType, measurementRows, recordIds) {
      const queryCopy =
        recordIds === null
          ? ""
          : `<div><strong>Query</strong>: ${escapeHtml(describeQueryResult("Spatial query", recordIds))}</div>`;

      return `
        <div class="popup-body">
          <div><strong>Shape</strong>: ${escapeHtml(layerType)}</div>
          ${measurementRows.join("")}
          ${queryCopy}
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

        onQueryRecordsRef.current({
          label: "Polygon Query",
          recordIds
        });

        layer.bindPopup(
          buildShapePopup("Polygon", [
            `<div><strong>Sq Meters</strong>: ${escapeHtml(formatMeasure(areaSqMeters))}</div>`,
            `<div><strong>Acres</strong>: ${escapeHtml(formatMeasure(acres, 2))}</div>`,
            `<div><strong>Sq Miles</strong>: ${escapeHtml(formatMeasure(squareMiles, 5))}</div>`
          ], recordIds)
        );
        layer.openPopup();
        return;
      }

      if (layerType === "circle") {
        const radiusMeters = layer.getRadius();
        const center = layer.getLatLng();
        const areaSqMeters = Math.PI * radiusMeters * radiusMeters;
        const recordIds = queryMarkersInCircle(map, markersRef.current, center, radiusMeters);

        onQueryRecordsRef.current({
          label: "Circle Query",
          recordIds
        });

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
      onClearQueryRef.current();
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
  }, [map]);

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
          recordId: marker.id
        });

        leafletMarker.bindPopup("");
        leafletMarker.on("popupopen", () => {
          const popup = leafletMarker.getPopup();
          if (popup && !popup.getContent()) {
            popup.setContent(buildPopupHtml(marker.record, displayedColumns));
          }
        });
        leafletMarker.on("click", () => {
          onMarkerClick(marker.id);
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
      marker.openPopup();
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
    const layerGroup = L.layerGroup();
    const canvasRenderer = L.canvas({ padding: 0.5 });

    layerGroupRef.current = layerGroup;
    canvasRendererRef.current = canvasRenderer;
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
    const canvasRenderer = canvasRendererRef.current;
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
          createPointStyle(group.color, canvasRenderer, isSelected)
        );

        leafletMarker.bindPopup("");
        leafletMarker.on("popupopen", () => {
          const popup = leafletMarker.getPopup();
          if (popup && !popup.getContent()) {
            popup.setContent(buildGroupedPopupHtml(group, displayedColumns));
          }
        });
        leafletMarker.on("click", () => {
          onMarkerClick(group.recordIds[0]);
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
      marker.openPopup();
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
  const [windowViews, setWindowViews] = useState({
    results: "open",
    statistics: "hidden"
  });
  const [activeWindow, setActiveWindow] = useState("results");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [colorBy, setColorBy] = useState("");
  const [pointDisplay, setPointDisplay] = useState("clustered");
  const [activeQuery, setActiveQuery] = useState(null);
  const [hasDrawnShapes, setHasDrawnShapes] = useState(false);
  const [statisticsColumnName, setStatisticsColumnName] = useState("");
  const [mapInstance, setMapInstance] = useState(null);
  const [renderProgress, setRenderProgress] = useState({ active: false, loaded: 0, total: 0 });
  const [loadPath, setLoadPath] = useState("");
  const [serverApiKey, setServerApiKey] = useState(buildInitialApiKey);
  const markerRefs = useRef(new Map());
  const shouldPanToSelectionRef = useRef(false);
  const clearShapesRef = useRef(null);
  const renderProgressFlushTimeoutRef = useRef(null);
  const renderProgressLastCommitRef = useRef(0);
  const pendingRenderProgressRef = useRef({ active: false, loaded: 0, total: 0 });

  const getInitialColorField = useCallback((nextDataset) => {
    const configuredField = nextDataset?.colorConfig?.fieldname;
    if (!configuredField) {
      return "";
    }

    return nextDataset.columns?.some((column) => column.name === configuredField) ? configuredField : "";
  }, []);

  const handleRecordSelection = useCallback((recordId) => {
    shouldPanToSelectionRef.current = true;
    setSelectedRecordId(recordId);
  }, []);

  const clearActiveQuery = useCallback(() => {
    setActiveQuery(null);
  }, []);

  const clearDrawnShapes = useCallback(() => {
    clearShapesRef.current?.();
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
    if (nextView !== "hidden") {
      setActiveWindow(windowName);
    }
  }, []);

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
    setActiveQuery(nextQuery);
    setWindowView("results", "open");
    setSelectedRecordId((current) => (nextQuery.recordIds.includes(current) ? current : nextQuery.recordIds[0] || ""));
  }, [setWindowView]);

  const handleClusterSelection = useCallback((recordIds) => {
    applyQuerySelection({
      label: "Cluster Query",
      recordIds
    });
  }, [applyQuerySelection]);

  const applyLoadedDataset = useCallback((nextDataset) => {
    setDataset(nextDataset);
    setSelectedRecordId(nextDataset.records[0]?.id || "");
    shouldPanToSelectionRef.current = false;
    setActiveQuery(null);
    setHasDrawnShapes(false);
    setRenderProgress({ active: false, loaded: 0, total: 0 });
    setColorBy(getInitialColorField(nextDataset));
  }, [getInitialColorField]);

  const resetLoadedDataset = useCallback(() => {
    setDataset(null);
    setSelectedRecordId("");
    shouldPanToSelectionRef.current = false;
    setActiveQuery(null);
    setHasDrawnShapes(false);
    setRenderProgress({ active: false, loaded: 0, total: 0 });
    setColorBy("");
    setLoadPath("");
  }, []);

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

  async function loadDataset(payload, options = {}) {
    const { manageLoading = true } = options;

    if (manageLoading) {
      setLoading(true);
    }
    setError("");

    try {
      let data = null;
      let clientLoadError = null;
      let resolvedLoadPath = "server";

      if (shouldAttemptClientLoad(payload)) {
        try {
          data = await loadDatasetFromClientFiles(payload);
          resolvedLoadPath = "client";
        } catch (nextError) {
          clientLoadError = nextError;
        }
      }

      if (!data) {
        const response = await fetch("/api/load", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(serverApiKey ? { "X-BerkeleyMapper-Api-Key": serverApiKey } : {})
          },
          body: JSON.stringify({
            ...payload,
            apiKey: serverApiKey || ""
          })
        });
        data = await response.json();

        if (!response.ok) {
          const serverMessage = data.error || "Unable to load dataset.";

          if (clientLoadError) {
            throw new Error(`Browser load failed (${clientLoadError.message}). Server fallback failed (${serverMessage}).`);
          }

          throw new Error(serverMessage);
        }
      }

      applyLoadedDataset(data);
      setLoadPath(resolvedLoadPath);
    } catch (nextError) {
      setError(nextError.message);
      resetLoadedDataset();
    } finally {
      if (manageLoading) {
        setLoading(false);
      }
    }
  }

  async function loadDemoDataset() {
    setLoading(true);
    setError("");

    try {
      setForm(arctosDemo);
      const demoDataset = await loadDatasetFromClientFiles(arctosDemo);
      applyLoadedDataset(demoDataset);
      setLoadPath("client");
    } catch (nextError) {
      setError(nextError.message);
      resetLoadedDataset();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (form.tabfile) {
      loadDataset(form);
      return;
    }

    loadDemoDataset();
  }, []);

  const records = dataset?.records || [];
  const columns = dataset?.columns || [];
  const displayedColumns = useMemo(() => getDisplayedColumns(columns), [columns]);
  const colorConfig = dataset?.colorConfig || null;
  const isServerProcessing = loadPath === "server";
  const colorFields = dataset?.colorFields || [];
  const availableColorFields = useMemo(() => {
    const merged = new Map();

    colorFields.forEach((field) => {
      merged.set(field.name, field);
    });

    if (colorConfig?.fieldname && !merged.has(colorConfig.fieldname)) {
      const matchingColumn = columns.find((column) => column.name === colorConfig.fieldname);
      merged.set(colorConfig.fieldname, {
        name: colorConfig.fieldname,
        alias: colorConfig.label || matchingColumn?.alias || colorConfig.fieldname
      });
    }

    return [...merged.values()];
  }, [colorFields, colorConfig, columns]);
  const { colorMap, defaultColor, legend: dynamicColorLegend } = useMemo(
    () => buildColorAssignments(records, colorBy, colorConfig),
    [records, colorBy, colorConfig]
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

  const handleZoomAll = useCallback(() => {
    if (!mapInstance) {
      return;
    }

    fitMapToMarkers(mapInstance, markers);
  }, [mapInstance, markers]);

  const selectedMarker = markers.find((marker) => marker.id === selectedRecordId) || null;
  const queryRecordIds = activeQuery?.recordIds || null;
  const recordsForResults = useMemo(() => {
    if (!queryRecordIds) {
      return records;
    }

    const recordIdSet = new Set(queryRecordIds);
    return records.filter((record) => recordIdSet.has(record.id));
  }, [records, queryRecordIds]);
  const resultsSummary = renderProgress.active
    ? `Loading ${formatCount(renderProgress.loaded)} of ${formatCount(renderProgress.total)} records`
    : recordsForResults.length
      ? `${Math.min(recordsForResults.length, 100)} of ${recordsForResults.length} records`
      : activeQuery
        ? "No records matched the current query"
        : "No records loaded";
  const statisticsSummary = `${formatCount(recordsForResults.length)} records in scope`;
  const resultsView = windowViews.results;
  const statisticsView = windowViews.statistics;
  const resultsDockedBottom = resultsView === "open" ? "min(34vh, 320px)" : resultsView === "minimized" ? "34px" : "0px";
  const statisticsDockedBottom = resultsView === "fullscreen" ? "0px" : resultsDockedBottom;
  const hiddenWindows = [
    resultsView === "hidden" ? { key: "results", label: "Results" } : null
  ].filter(Boolean);
  const statisticsColumns = useMemo(
    () => displayedColumns.filter((column) => !["Latitude", "Longitude"].includes(column.name)),
    [displayedColumns]
  );
  const statisticsColumn =
    statisticsColumns.find((column) => column.name === statisticsColumnName) || statisticsColumns[0] || null;
  const frequencyRows = useMemo(
    () => (statisticsColumn ? buildFrequencyRows(recordsForResults, statisticsColumn) : []),
    [recordsForResults, statisticsColumn]
  );
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

  useEffect(() => {
    if (!statisticsColumns.length) {
      setStatisticsColumnName("");
      return;
    }

    setStatisticsColumnName((current) =>
      statisticsColumns.some((column) => column.name === current) ? current : statisticsColumns[0].name
    );
  }, [statisticsColumns]);

  useEffect(() => {
    if (windowViews[activeWindow] !== "hidden") {
      return;
    }

    const fallbackWindow = ["statistics", "results"].find((name) => windowViews[name] !== "hidden");
    if (fallbackWindow) {
      setActiveWindow(fallbackWindow);
    }
  }, [activeWindow, windowViews]);

  useEffect(() => {
    window.localStorage.setItem(apiKeyStorageKey, serverApiKey);
  }, [serverApiKey]);

  useEffect(() => () => {
    if (renderProgressFlushTimeoutRef.current) {
      window.clearTimeout(renderProgressFlushTimeoutRef.current);
    }
  }, []);

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

  return (
    <main className="mapper-shell">
      <div className={`map-stage ${sidebarOpen ? "is-sidebar-open" : ""}`}>
        {isServerProcessing ? (
          <div className="processing-banner" role="status">
            <span>This dataset is using server-based processing.</span>
            <span className="processing-banner-help" title={serverProcessingHelpText} aria-label="More information about server-based processing">
              ?
            </span>
          </div>
        ) : null}
        <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom zoomControl={false} className="map-canvas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInstanceBridge onMapReady={setMapInstance} />
          <MapTools
            markers={markers}
            onQueryRecords={applyQuerySelection}
            onClearQuery={clearActiveQuery}
            onShapesChange={setHasDrawnShapes}
            registerClearShapes={(callback) => {
              clearShapesRef.current = callback;
            }}
          />
          {pointDisplay !== "markers" ? (
            <MapViewport
              selectedMarker={selectedMarker}
              selectedRecordId={selectedRecordId}
              shouldPanToSelection={shouldPanToSelectionRef.current}
            />
          ) : null}
          {pointDisplay === "markers" ? (
            <MapPointLayer
              markers={markers}
              displayedColumns={displayedColumns}
              selectedRecordId={selectedRecordId}
              markerRefs={markerRefs}
              onMarkerClick={handleRecordSelection}
              onRenderProgress={handleRenderProgress}
              shouldFocusSelection={shouldPanToSelectionRef.current}
            />
          ) : (
            <MapMarkerLayer
              markers={markers}
              displayedColumns={displayedColumns}
              selectedRecordId={selectedRecordId}
              markerRefs={markerRefs}
              onMarkerClick={handleRecordSelection}
              onClusterSelect={handleClusterSelection}
              onRenderProgress={handleRenderProgress}
              shouldFocusSelection={shouldPanToSelectionRef.current}
            />
          )}
        </MapContainer>

        <div className="bm-zoom-controls">
          <button type="button" className="bm-zoom-button bm-zoom-in" title="Zoom in" onClick={handleZoomIn}>
            +
          </button>
          <button type="button" className="bm-zoom-button bm-zoom-out" title="Zoom out" onClick={handleZoomOut}>
            -
          </button>
        </div>

        <div className="bm-action-controls">
          <button type="button" className="bm-map-toolbar-button" title="Zoom to all mapped points" onClick={handleZoomAll}>
            All
          </button>
          <button type="button" className="bm-map-toolbar-button" title="Show results panel" onClick={() => setWindowView("results", "open")}>
            Results
          </button>
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

        <div className={`sidebar-toggle ${sidebarOpen ? "is-open" : ""}`}>
          <button type="button" onClick={() => setSidebarOpen((current) => !current)} aria-label="Toggle legend panel">
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        <aside className={`legend-panel ${sidebarOpen ? "is-open" : ""}`}>
          <div className="legend-scroll">
            <section className="panel-section">
              <div className="panel-actions">
                <button type="button" onClick={loadDemoDataset} disabled={loading}>
                  {loading ? "Loading..." : "Load Arctos Demo"}
                </button>
              </div>
            </section>

            <section className="panel-section">
              <h2>Server Processing</h2>
              <label>
                API Key
                <input
                  type="password"
                  value={serverApiKey}
                  onChange={(event) => setServerApiKey(event.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </label>
              <p className="legend-copy tool-note">
                Stored only in this browser and sent with server-based load requests for future integrations.
              </p>
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

            {error ? <p className="status-banner error">{error}</p> : null}
            {!error && loading ? <p className="status-banner info">Loading Application ...</p> : null}

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

            <section className="panel-section">
              <h2>Legend</h2>
              {dataset ? (datasetName ? <p className="meta-title">{datasetName}</p> : null) : <p className="meta-title">No dataset loaded</p>}
              <div
                className="legend-copy"
                dangerouslySetInnerHTML={{
                  __html: legendHtml
                }}
              />
            </section>

            {dynamicColorLegend.length ? (
              <section className="panel-section">
                <h2>{colorBy && colorConfig?.fieldname === colorBy ? colorConfig.label || "Marker Colors" : "Marker Colors"}</h2>
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

            <section className="panel-section">
              <h2>Map Tools</h2>
              <p className="legend-copy">
                Use the map toolbar to draw polylines, circles, and polygons. Line and area measurements open in a popup,
                and polygon or circle drawings filter the results table to matching records.
              </p>
              {activeQuery ? (
                <div className="query-status">
                  <strong>{activeQuery.label}</strong>
                  <span>{formatCount(activeQuery.recordIds.length)} matching records</span>
                  <button type="button" className="secondary" onClick={clearActiveQuery}>
                    Clear Query
                  </button>
                </div>
              ) : null}
            </section>

            <section className="panel-section">
              <h2>Actions</h2>
              <div className="panel-actions">
                <button type="button" onClick={() => setWindowView("statistics", "open")} disabled={!statisticsColumns.length}>
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
              <p className="legend-copy tool-note">
                Statistics use the current result set. Downloads export the visible field order, and KML export follows the
                current subset.
              </p>
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

            {dataset?.layers?.length ? (
              <section className="panel-section">
                <h2>Layers</h2>
                <div className="layer-list">
                  {dataset.layers.map((layer) => (
                    <a key={`${layer.title}-${layer.location}`} href={layer.location || layer.url} target="_blank" rel="noreferrer">
                      {layer.title || layer.location}
                    </a>
                  ))}
                </div>
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

        {resultsView !== "hidden" ? (
          <section
            className={`bottom-drawer results-drawer is-${resultsView} ${activeWindow === "results" ? "is-active" : ""}`}
            onMouseDown={() => setActiveWindow("results")}
          >
            <div className="window-titlebar">
              <div className="window-titletext">
                <strong>Results</strong>
                <span>{resultsSummary}</span>
              </div>
              <div className="window-controls">
                <button type="button" className="results-control-button" onClick={() => setWindowView("results", "minimized")} aria-label="Minimize results panel">
                  <span className="results-control-icon results-control-minimize" aria-hidden="true" />
                </button>
                {resultsView !== "open" ? (
                  <button type="button" className="results-control-button" onClick={() => setWindowView("results", "open")} aria-label="Restore results panel">
                    <span className="results-control-icon results-control-restore" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="results-control-button"
                  onClick={() => toggleWindowFullscreen("results")}
                  aria-label={resultsView === "fullscreen" ? "Exit fullscreen results" : "Fullscreen results"}
                >
                  <span className="results-control-icon results-control-maximize" aria-hidden="true" />
                </button>
                <button type="button" className="results-control-button" onClick={() => setWindowView("results", "hidden")} aria-label="Close results panel">
                  <span className="results-control-icon results-control-close" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="window-content">
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
            </div>
          </section>
        ) : null}

        {statisticsView !== "hidden" ? (
          <section
            className={`bottom-drawer statistics-drawer is-${statisticsView} ${activeWindow === "statistics" ? "is-active" : ""}`}
            style={statisticsView === "fullscreen" ? undefined : { bottom: statisticsDockedBottom }}
            onMouseDown={() => setActiveWindow("statistics")}
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
                  <button type="button" className="results-control-button" onClick={() => setWindowView("statistics", "open")} aria-label="Restore statistics panel">
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
                  <select value={statisticsColumn?.name || ""} onChange={(event) => setStatisticsColumnName(event.target.value)}>
                    {statisticsColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.alias}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="statistics-summary">
                  <strong>{activeQuery ? activeQuery.label : "Entire Dataset"}</strong>
                  <span>{statisticsSummary}</span>
                </div>
              </div>

              {statisticsColumn ? (
                <div className="stats-table-wrap">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>{statisticsColumn.alias}</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequencyRows.map((row) => (
                        <tr key={`${statisticsColumn.name}-${row.value}`}>
                          <td>{row.value}</td>
                          <td>{formatCount(row.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="statistics-empty">No visible columns are available for statistics.</p>
              )}
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
              onClick={() => setWindowView(windowItem.key, "open")}
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
