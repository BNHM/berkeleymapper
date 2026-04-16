import { createHash } from "node:crypto";
import { access, mkdir, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename, resolve } from "node:path";
import { runtimeConfig } from "./runtimeConfig.js";

const execFileAsync = promisify(execFile);
const pendingCacheBuilds = new Map();
const gadmCacheVersion = "gadm41-v5";

const levelConfigs = {
  "0": {
    inputFile: "admn_0.shp",
    layerName: "admn_0",
    fields: ["NAME_0"]
  },
  "1": {
    inputFile: "admn_1.shp",
    layerName: "admn_1",
    fields: ["GID_0", "COUNTRY", "GID_1", "NAME_1", "VARNAME_1", "TYPE_1", "ENGTYPE_1"]
  },
  "2": {
    inputFile: "admn_2.shp",
    layerName: "admn_2",
    fields: ["GID_0", "COUNTRY", "GID_1", "NAME_1", "GID_2", "NAME_2", "TYPE_2", "ENGTYPE_2", "CC_2", "HASC_2"]
  }
};

function escapeSqlLiteral(value) {
  return String(value || "").replaceAll("'", "''");
}

function sanitizePathSegment(value, fallback) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

function buildHashedSegment(values, fallbackLabel) {
  const normalizedValues = values
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (!normalizedValues.length) {
    return fallbackLabel;
  }

  const compactLabel = sanitizePathSegment(normalizedValues.join("-"), fallbackLabel);
  if (compactLabel.length <= 80) {
    return compactLabel;
  }

  const hash = createHash("sha1")
    .update(normalizedValues.join("|"))
    .digest("hex")
    .slice(0, 12);

  return `${fallbackLabel}-${normalizedValues.length}-${hash}`;
}

async function canWriteDirectory(directoryPath) {
  try {
    await mkdir(directoryPath, { recursive: true });
    await access(directoryPath, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveCacheRoot() {
  const preferredRoot = runtimeConfig.spatialDataDir
    ? resolve(runtimeConfig.spatialDataDir, "cache", "berkeleymapper", gadmCacheVersion)
    : "";

  if (preferredRoot && await canWriteDirectory(preferredRoot)) {
    return preferredRoot;
  }

  const fallbackRoot = resolve(runtimeConfig.repoRoot, ".cache", gadmCacheVersion);
  if (await canWriteDirectory(fallbackRoot)) {
    return fallbackRoot;
  }

  throw new Error("Unable to create a writable BerkeleyMapper GADM cache directory.");
}

function getLevelConfig(level) {
  const normalizedLevel = String(level ?? "").trim();
  const config = levelConfigs[normalizedLevel];

  if (!config) {
    throw new Error("Unsupported GADM level. Expected 0 (countries), 1 (states/provinces), or 2 (counties/districts).");
  }

  return {
    ...config,
    level: normalizedLevel
  };
}

function buildWhereClause(level, countryName, countryNames = []) {
  const trimmedCountryName = String(countryName || "").trim();
  const normalizedCountryNames = [...new Set(
    countryNames
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];

  if (level === "0") {
    if (!trimmedCountryName) {
      return "";
    }

    return `NAME_0 = '${escapeSqlLiteral(trimmedCountryName)}'`;
  }

  if (normalizedCountryNames.length) {
    const countryList = normalizedCountryNames.map((value) => `'${escapeSqlLiteral(value)}'`).join(", ");
    return `COUNTRY IN (${countryList})`;
  }

  if (!trimmedCountryName) {
    throw new Error("A country name is required for GADM level 1 and level 2 boundary requests.");
  }

  return `COUNTRY = '${escapeSqlLiteral(trimmedCountryName)}'`;
}

function buildStateClause(level, stateNames = []) {
  const normalizedStateNames = [...new Set(
    stateNames
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean)
  )];

  if (!normalizedStateNames.length || level === "0") {
    return "";
  }

  const stateList = normalizedStateNames.map((value) => `'${escapeSqlLiteral(value)}'`).join(", ");
  return `UPPER(NAME_1) IN (${stateList})`;
}

function buildSql(levelConfig, countryName, countryNames = [], stateNames = []) {
  const whereParts = [
    buildWhereClause(levelConfig.level, countryName, countryNames),
    buildStateClause(levelConfig.level, stateNames)
  ].filter(Boolean);

  return whereParts.length
    ? `SELECT * FROM ${levelConfig.layerName} WHERE ${whereParts.join(" AND ")}`
    : `SELECT * FROM ${levelConfig.layerName}`;
}

async function ensureInputExists(inputPath) {
  try {
    await access(inputPath, fsConstants.R_OK);
  } catch {
    throw new Error(`GADM input file not found: ${basename(inputPath)} in ${runtimeConfig.gadm41Dir || "(unset GADM41_DIR)"}`);
  }
}

async function buildGeoJsonCache(outputPath, inputPath, sql, simplifyTolerance = 0) {
  const ogrArgs = [
    "-skipfailures",
    "-f",
    "GeoJSON",
    "-lco",
    "RFC7946=YES",
    "-lco",
    "COORDINATE_PRECISION=6"
  ];

  if (Number.isFinite(Number(simplifyTolerance)) && Number(simplifyTolerance) > 0) {
    ogrArgs.push("-simplify", String(simplifyTolerance));
  }

  ogrArgs.push(
    outputPath,
    inputPath,
    "-dialect",
    "SQLITE",
    "-sql",
    sql
  );

  try {
    await execFileAsync("ogr2ogr", ogrArgs, {
      maxBuffer: 1024 * 1024 * 64,
      env: {
        ...process.env,
        SHAPE_RESTORE_SHX: "YES"
      }
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr).trim() : "";
    const message = stderr || error?.message || "ogr2ogr failed while building the GADM cache.";
    throw new Error(message);
  }
}

export async function getCachedGadmGeoJson({ level, countryName = "", countryNames = [], stateNames = [], simplifyTolerance = 0 }) {
  if (!runtimeConfig.gadm41Dir) {
    throw new Error("GADM41_DIR is not configured.");
  }

  const levelConfig = getLevelConfig(level);
  const inputPath = resolve(runtimeConfig.gadm41Dir, levelConfig.inputFile);
  const cacheRoot = await resolveCacheRoot();
  const cacheDirectory = resolve(cacheRoot, `level-${levelConfig.level}`);
  const normalizedCountryNames = [...new Set(countryNames.map((value) => String(value || "").trim()).filter(Boolean))];
  const countrySlug = normalizedCountryNames.length
    ? buildHashedSegment(normalizedCountryNames, levelConfig.level === "0" ? "all-countries" : "countries")
    : sanitizePathSegment(countryName, levelConfig.level === "0" ? "all-countries" : "country");
  const normalizedStateNames = [...new Set(stateNames.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))];
  const stateSlug = normalizedStateNames.length
    ? `--${buildHashedSegment(normalizedStateNames, "states")}`
    : "";
  const simplifySuffix = Number.isFinite(Number(simplifyTolerance)) && Number(simplifyTolerance) > 0
    ? `--simp-${String(simplifyTolerance).replace(/[^0-9.]+/g, "").replaceAll(".", "_")}`
    : "";
  const outputPath = resolve(cacheDirectory, `${countrySlug}${stateSlug}${simplifySuffix}.geojson`);
  const cacheKey = `${levelConfig.level}:${countrySlug}:${normalizedCountryNames.join("|")}:${normalizedStateNames.join("|")}:${simplifyTolerance || 0}`;

  await ensureInputExists(inputPath);
  await mkdir(cacheDirectory, { recursive: true });

  try {
    await access(outputPath, fsConstants.R_OK);
    return outputPath;
  } catch {
    // Build cache on demand below.
  }

  if (!pendingCacheBuilds.has(cacheKey)) {
    const sql = buildSql(levelConfig, countryName, normalizedCountryNames, normalizedStateNames);
    const buildPromise = buildGeoJsonCache(outputPath, inputPath, sql, simplifyTolerance)
      .finally(() => {
        pendingCacheBuilds.delete(cacheKey);
      });
    pendingCacheBuilds.set(cacheKey, buildPromise);
  }

  await pendingCacheBuilds.get(cacheKey);
  return outputPath;
}

export async function readCachedGadmGeoJson(options) {
  const cachePath = await getCachedGadmGeoJson(options);
  return readFile(cachePath);
}
