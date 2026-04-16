import { createHash } from "node:crypto";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { readCachedGadmGeoJson } from "./gadmBoundaries.js";

const normalizedBoundaryCache = new Map();
const spatialStatisticsCache = new Map();
const pendingSpatialStatisticsBuilds = new Map();
const SPATIAL_STATISTICS_CACHE_LIMIT = 24;
const COUNTRY_SIMPLIFY_TOLERANCE = 0.1;
const GRID_CELL_SIZE_BY_LEVEL = {
  0: 30,
  1: 8,
  2: 2
};

function nowMs() {
  return Date.now();
}

function formatDurationMs(startTime) {
  return `${nowMs() - startTime}ms`;
}

function logSpatialStatistics(logContext, message) {
  if (typeof logContext?.onStatus === "function") {
    logContext.onStatus(message);
  }
}

function yieldToEventLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function buildBoundaryCacheKey({ level, countryName = "", countryNames = [], stateNames = [], simplifyTolerance = 0 }) {
  return JSON.stringify({
    level,
    countryName,
    countryNames: [...countryNames].sort(),
    stateNames: [...stateNames].sort(),
    simplifyTolerance: Number(simplifyTolerance || 0)
  });
}

function setBoundedCacheValue(cache, key, value, limit) {
  if (cache.has(key)) {
    cache.delete(key);
  }

  cache.set(key, value);
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
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

function buildPointFeature(group) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [group.longitude, group.latitude]
    },
    properties: {}
  };
}

function normalizePointGroups(points = []) {
  return (Array.isArray(points) ? points : [])
    .map((point, index) => {
      const latitude = Number(point?.latitude);
      const longitude = Number(point?.longitude);
      const recordIds = Array.isArray(point?.recordIds) ? point.recordIds.filter(Boolean).sort() : [];

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !recordIds.length) {
        return null;
      }

      return {
        key: `${latitude},${longitude}:${index}`,
        latitude,
        longitude,
        recordIds,
        count: recordIds.length,
        pointFeature: buildPointFeature({ latitude, longitude })
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.latitude - right.latitude || left.longitude - right.longitude || left.key.localeCompare(right.key));
}

function buildSpatialStatisticsCacheKey(pointGroups) {
  const hash = createHash("sha1");

  pointGroups.forEach((group) => {
    hash.update(`${group.latitude},${group.longitude}:${group.recordIds.join(",")};`);
  });

  return hash.digest("hex");
}

function getGridCellKey(latitudeCell, longitudeCell) {
  return `${latitudeCell}:${longitudeCell}`;
}

function getCoordinateCell(value, cellSize) {
  return Math.floor(value / cellSize);
}

function buildBoundaryIndex(normalizedFeatures, level) {
  const normalizedLevel = String(level ?? "").trim();
  const cellSize = GRID_CELL_SIZE_BY_LEVEL[normalizedLevel] || GRID_CELL_SIZE_BY_LEVEL[2];
  const cells = new Map();

  normalizedFeatures.forEach((featureEntry) => {
    const minLatitudeCell = getCoordinateCell(featureEntry.bbox.minLatitude, cellSize);
    const maxLatitudeCell = getCoordinateCell(featureEntry.bbox.maxLatitude, cellSize);
    const minLongitudeCell = getCoordinateCell(featureEntry.bbox.minLongitude, cellSize);
    const maxLongitudeCell = getCoordinateCell(featureEntry.bbox.maxLongitude, cellSize);

    for (let latitudeCell = minLatitudeCell; latitudeCell <= maxLatitudeCell; latitudeCell += 1) {
      for (let longitudeCell = minLongitudeCell; longitudeCell <= maxLongitudeCell; longitudeCell += 1) {
        const cellKey = getGridCellKey(latitudeCell, longitudeCell);
        const existingCell = cells.get(cellKey);

        if (existingCell) {
          existingCell.push(featureEntry);
        } else {
          cells.set(cellKey, [featureEntry]);
        }
      }
    }
  });

  return {
    cellSize,
    cells
  };
}

function getCandidateFeatures(boundarySet, latitude, longitude) {
  const cellKey = getGridCellKey(
    getCoordinateCell(latitude, boundarySet.index.cellSize),
    getCoordinateCell(longitude, boundarySet.index.cellSize)
  );

  return boundarySet.index.cells.get(cellKey) || [];
}

async function getNormalizedBoundarySet(options) {
  const cacheKey = buildBoundaryCacheKey(options);

  if (normalizedBoundaryCache.has(cacheKey)) {
    return normalizedBoundaryCache.get(cacheKey);
  }

  const body = await readCachedGadmGeoJson(options);
  const geoJson = JSON.parse(body.toString("utf-8"));
  const normalizedFeatures = (Array.isArray(geoJson?.features) ? geoJson.features : [])
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

  const boundarySet = {
    level: String(options?.level ?? "").trim(),
    features: normalizedFeatures,
    index: buildBoundaryIndex(normalizedFeatures, options?.level)
  };

  normalizedBoundaryCache.set(cacheKey, boundarySet);
  return boundarySet;
}

async function matchPointGroups(pointGroups, boundarySet, { yieldEvery = 80 } = {}) {
  const matches = [];
  const unmatchedGroups = [];

  for (let groupIndex = 0; groupIndex < pointGroups.length; groupIndex += 1) {
    const pointGroup = pointGroups[groupIndex];
    let matched = false;
    const candidateFeatures = getCandidateFeatures(boundarySet, pointGroup.latitude, pointGroup.longitude);

    for (const featureEntry of candidateFeatures) {
      if (!pointWithinBbox(pointGroup.latitude, pointGroup.longitude, featureEntry.bbox)) {
        continue;
      }

      let isMatch = false;

      try {
        isMatch = booleanPointInPolygon(pointGroup.pointFeature, featureEntry.feature);
      } catch {
        continue;
      }

      if (!isMatch) {
        continue;
      }

      matches.push({
        pointGroup,
        recordIds: pointGroup.recordIds,
        count: pointGroup.count,
        properties: featureEntry.properties
      });
      matched = true;
      break;
    }

    if (!matched) {
      unmatchedGroups.push(pointGroup);
    }

    if ((groupIndex + 1) % yieldEvery === 0) {
      await yieldToEventLoop();
    }
  }

  return {
    matches,
    unmatchedGroups
  };
}

function groupPointGroupsByCountry(matches) {
  const groupsByCountry = new Map();

  matches.forEach((match) => {
    const countryName = match.properties?.NAME_0 || match.properties?.COUNTRY || "";
    if (!countryName || !match.pointGroup) {
      return;
    }

    const existing = groupsByCountry.get(countryName);
    if (existing) {
      existing.push(match.pointGroup);
    } else {
      groupsByCountry.set(countryName, [match.pointGroup]);
    }
  });

  return groupsByCountry;
}

function aggregateMatches(matches, labelBuilder) {
  const rowsByLabel = new Map();

  matches.forEach((match) => {
    const label = labelBuilder(match.properties || {});
    if (!label) {
      return;
    }

    const existing = rowsByLabel.get(label);
    if (existing) {
      existing.count += match.count;
      existing.recordIds.push(...match.recordIds);
      return;
    }

    rowsByLabel.set(label, {
      value: label,
      count: match.count,
      recordIds: [...match.recordIds]
    });
  });

  return [...rowsByLabel.values()]
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

export async function buildSpatialStatistics(points, logContext = {}) {
  const overallStartTime = nowMs();
  const pointGroups = normalizePointGroups(points);
  logSpatialStatistics(
    logContext,
    `start rawPoints=${Array.isArray(points) ? points.length : 0} groupedPoints=${pointGroups.length}`
  );

  if (!pointGroups.length) {
    logSpatialStatistics(logContext, `complete empty result in ${formatDurationMs(overallStartTime)}`);
    return {
      country: [],
      state: [],
      county: []
    };
  }

  const cacheKey = buildSpatialStatisticsCacheKey(pointGroups);
  if (spatialStatisticsCache.has(cacheKey)) {
    logSpatialStatistics(logContext, `cache hit key=${cacheKey.slice(0, 10)} in ${formatDurationMs(overallStartTime)}`);
    return spatialStatisticsCache.get(cacheKey);
  }

  if (pendingSpatialStatisticsBuilds.has(cacheKey)) {
    logSpatialStatistics(logContext, `join pending build key=${cacheKey.slice(0, 10)} after ${formatDurationMs(overallStartTime)}`);
    return pendingSpatialStatisticsBuilds.get(cacheKey);
  }

  const buildPromise = (async () => {
    const countryPhaseStartTime = nowMs();
    const countryBoundarySet = await getNormalizedBoundarySet({
      level: 0,
      simplifyTolerance: COUNTRY_SIMPLIFY_TOLERANCE
    });
    const countryMatchesResult = await matchPointGroups(pointGroups, countryBoundarySet, { yieldEvery: 240 });
    const countryMatches = countryMatchesResult.matches;
    const countryNames = [...new Set(countryMatches.map((match) => match.properties?.NAME_0).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right));
    logSpatialStatistics(
      logContext,
      `country pass matched=${countryMatches.length}/${pointGroups.length} countries=${countryNames.length} simplify=${COUNTRY_SIMPLIFY_TOLERANCE} in ${formatDurationMs(countryPhaseStartTime)}`
    );

    if (!countryNames.length) {
      logSpatialStatistics(logContext, `complete no matched countries in ${formatDurationMs(overallStartTime)}`);
      return {
        country: [],
        state: [],
        county: []
      };
    }

    const pointGroupsByCountry = groupPointGroupsByCountry(countryMatches);
    const countyMatches = [];
    const stateMatches = [];

    for (const countryName of countryNames) {
      const countryStartTime = nowMs();
      const countryPointGroups = pointGroupsByCountry.get(countryName) || [];
      if (!countryPointGroups.length) {
        continue;
      }

      const countyPhaseStartTime = nowMs();
      const countyBoundarySet = await getNormalizedBoundarySet({
        level: 2,
        countryName
      });
      const countyMatchesResult = await matchPointGroups(countryPointGroups, countyBoundarySet, { yieldEvery: 120 });
      countyMatches.push(...countyMatchesResult.matches);
      logSpatialStatistics(
        logContext,
        `country=${countryName} county matched=${countyMatchesResult.matches.length}/${countryPointGroups.length} unmatched=${countyMatchesResult.unmatchedGroups.length} in ${formatDurationMs(countyPhaseStartTime)}`
      );

      if (countyMatchesResult.unmatchedGroups.length) {
        const statePhaseStartTime = nowMs();
        const stateBoundarySet = await getNormalizedBoundarySet({
          level: 1,
          countryName
        });
        const stateMatchesResult = await matchPointGroups(countyMatchesResult.unmatchedGroups, stateBoundarySet, { yieldEvery: 120 });
        stateMatches.push(...stateMatchesResult.matches);
        logSpatialStatistics(
          logContext,
          `country=${countryName} state fallback matched=${stateMatchesResult.matches.length}/${countyMatchesResult.unmatchedGroups.length} remaining=${stateMatchesResult.unmatchedGroups.length} in ${formatDurationMs(statePhaseStartTime)}`
        );
      }

      logSpatialStatistics(logContext, `country=${countryName} total refinement ${formatDurationMs(countryStartTime)}`);
      await yieldToEventLoop();
    }

    const countryRows = aggregateMatches(
      countryMatches,
      (properties) => properties.COUNTRY || properties.NAME_0 || ""
    );
    const stateRows = aggregateMatches(
      [...countyMatches, ...stateMatches],
      (properties) => {
        const stateName = properties.NAME_1 || "";
        const countryName = properties.COUNTRY || properties.NAME_0 || "";
        return [stateName, countryName].filter(Boolean).join(", ");
      }
    );
    const countyRows = aggregateMatches(
      countyMatches,
      (properties) => {
        const countyName = properties.NAME_2 || "";
        const stateName = properties.NAME_1 || "";
        const countryName = properties.COUNTRY || properties.NAME_0 || "";
        return [countyName, stateName, countryName].filter(Boolean).join(", ");
      }
    );

    const result = {
      country: countryRows,
      state: stateRows,
      county: countyRows
    };

    setBoundedCacheValue(spatialStatisticsCache, cacheKey, result, SPATIAL_STATISTICS_CACHE_LIMIT);
    logSpatialStatistics(
      logContext,
      `complete countryRows=${countryRows.length} stateRows=${stateRows.length} countyRows=${countyRows.length} in ${formatDurationMs(overallStartTime)}`
    );
    return result;
  })()
    .finally(() => {
      pendingSpatialStatisticsBuilds.delete(cacheKey);
    });

  pendingSpatialStatisticsBuilds.set(cacheKey, buildPromise);
  return buildPromise;
}
