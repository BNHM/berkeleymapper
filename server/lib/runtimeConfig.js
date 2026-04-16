import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  const text = readFileSync(filePath, "utf-8");

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  });

  return values;
}

const envFileValues = parseEnvFile(resolve(repoRoot, ".env"));

function getEnv(name, fallback = "") {
  const directValue = process.env[name];
  if (typeof directValue === "string" && directValue.trim()) {
    return directValue.trim();
  }

  const fileValue = envFileValues[name];
  if (typeof fileValue === "string" && fileValue.trim()) {
    return fileValue.trim();
  }

  return fallback;
}

const spatialDataDir = getEnv("SPATIAL_DATA_DIR", getEnv("BOUNDARY_DATA_DIR", ""));
const gadm41Dir = getEnv("GADM41_DIR", spatialDataDir ? resolve(spatialDataDir, "GADM41") : "");
const host = getEnv("HOST", "127.0.0.1");
const port = Number.parseInt(getEnv("PORT", "4173"), 10);

export const runtimeConfig = Object.freeze({
  repoRoot,
  host,
  port: Number.isFinite(port) ? port : 4173,
  spatialDataDir,
  gadm41Dir
});

export function getBoundaryPath(...segments) {
  if (!runtimeConfig.spatialDataDir) {
    return "";
  }

  return resolve(runtimeConfig.spatialDataDir, ...segments);
}

export function getGadm41Path(...segments) {
  if (!runtimeConfig.gadm41Dir) {
    return "";
  }

  return resolve(runtimeConfig.gadm41Dir, ...segments);
}
