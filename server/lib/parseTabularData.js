import { normalizeColumnName } from "./parseLegacyConfig.js";

function normalizeTabularText(tabText) {
  return String(tabText || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function hasUsableRowContent(values = []) {
  return values.some((value) => String(value || "").trim() !== "");
}

function detectDelimiter(tabText) {
  const text = normalizeTabularText(tabText);
  let inQuotes = false;
  let commaCount = 0;
  let tabCount = 0;
  let rowHasContent = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && character === "\n") {
      if (rowHasContent) {
        break;
      }

      commaCount = 0;
      tabCount = 0;
      rowHasContent = false;
      continue;
    }

    if (character.trim()) {
      rowHasContent = true;
    }

    if (!inQuotes && character === ",") {
      commaCount += 1;
      continue;
    }

    if (!inQuotes && character === "\t") {
      tabCount += 1;
    }
  }

  if (tabCount > 0 && tabCount >= commaCount) {
    return "\t";
  }

  if (commaCount > 0) {
    return ",";
  }

  return "\t";
}

function parseDelimitedRows(tabText, delimiter = "\t") {
  const text = normalizeTabularText(tabText);
  const rows = [];
  const currentRow = [];
  let currentValue = "";
  let inQuotes = false;
  let lineNumber = 1;
  let rowLineNumber = 1;

  function pushField() {
    currentRow.push(currentValue);
    currentValue = "";
  }

  function pushRow() {
    if (!currentRow.length) {
      return;
    }

    if (hasUsableRowContent(currentRow)) {
      rows.push({
        values: [...currentRow],
        line: rowLineNumber
      });
    }

    currentRow.length = 0;
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        currentValue += "\"";
        index += 1;
        continue;
      }

      if (!inQuotes && currentValue === "") {
        inQuotes = true;
        continue;
      }

      if (inQuotes) {
        inQuotes = false;
        continue;
      }
    }

    if (character === "\n") {
      if (inQuotes) {
        currentValue += character;
        lineNumber += 1;
        continue;
      }

      pushField();
      pushRow();
      lineNumber += 1;
      rowLineNumber = lineNumber;
      continue;
    }

    if (!inQuotes && character === delimiter) {
      pushField();
      continue;
    }

    currentValue += character;
  }

  if (inQuotes) {
    throw new Error("Data file has an unterminated quoted field.");
  }

  if (currentValue !== "" || currentRow.length) {
    pushField();
    pushRow();
  }

  return rows;
}

function buildColumnsFromConfig(concepts) {
  if (!concepts.length) {
    return [];
  }

  return concepts.map((concept) => ({
    name: concept.name,
    alias: concept.alias || concept.name,
    visible: concept.viewlist !== false,
    order: concept.order,
    colorable: concept.colorlist === true,
    datatype: concept.datatype || concept.name
  }));
}

function buildSummary(columns, records, markers) {
  return {
    columnCount: columns.length,
    visibleColumnCount: columns.filter((column) => column.visible).length,
    recordCount: records.length,
    pointCount: markers.length
  };
}

function columnMatchKey(value) {
  if (!value) {
    return "";
  }

  const normalized = normalizeColumnName(value)
    .toLowerCase()
    .split(":")
    .pop();

  return normalized.replace(/[^a-z0-9]/g, "");
}

function looksLikeHeader(firstRow, configColumns) {
  if (!firstRow.length) {
    return false;
  }

  if (!configColumns.length) {
    return true;
  }

  let matches = 0;

  for (const value of firstRow) {
    const normalized = columnMatchKey(value.trim());
    if (configColumns.some((column) =>
      columnMatchKey(column.name) === normalized ||
      columnMatchKey(column.alias) === normalized ||
      columnMatchKey(column.datatype) === normalized
    )) {
      matches += 1;
    }
  }

  const requiredMatches = Math.max(2, Math.ceil(Math.min(firstRow.length, configColumns.length) / 2));
  return matches >= requiredMatches;
}

function findConfigColumnForHeader(configColumns, headerValue, columnIndex) {
  const normalizedHeader = columnMatchKey(headerValue);
  if (normalizedHeader) {
    const matchedColumn = configColumns.find((column) =>
      columnMatchKey(column.name) === normalizedHeader ||
      columnMatchKey(column.alias) === normalizedHeader ||
      columnMatchKey(column.datatype) === normalizedHeader
    );

    if (matchedColumn) {
      return matchedColumn;
    }
  }

  return configColumns[columnIndex] || null;
}

function inferCoordinateColumns(columns) {
  const latitudeColumn = columns.find((column) => column.name.toLowerCase() === "latitude");
  const longitudeColumn = columns.find((column) => column.name.toLowerCase() === "longitude");
  return {
    latitudeKey: latitudeColumn?.name || "",
    longitudeKey: longitudeColumn?.name || ""
  };
}

function sortColumns(columns) {
  return [...columns].sort((left, right) => {
    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.originalIndex - right.originalIndex;
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHrefWithParams(baseUrl, entries, valueLookup) {
  const params = entries
    .map((entry) => {
      const paramValue = valueLookup.get(entry.value) || valueLookup.get(entry.value.toLowerCase()) || "";
      if (!paramValue) {
        return "";
      }

      return `${encodeURIComponent(entry.key)}=${encodeURIComponent(paramValue)}`;
    })
    .filter(Boolean);

  if (!params.length) {
    return baseUrl;
  }

  const delimiter = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${delimiter}${params.join("&")}`;
}

function buildValueLookup(recordValues, columns) {
  const lookup = new Map();

  for (const column of columns) {
    const value = recordValues[column.name] || "";
    const keys = [
      column.name,
      column.alias,
      column.datatype,
      column.name.toLowerCase(),
      column.alias.toLowerCase(),
      column.datatype?.toLowerCase(),
      column.name.split(":").pop(),
      column.datatype?.split(":").pop()
    ].filter(Boolean);

    for (const key of keys) {
      lookup.set(key, value);
    }
  }

  return lookup;
}

function interpolatePattern(template, valueLookup) {
  return template.replace(/\$\{([^}]+)\}/g, (_match, key) => valueLookup.get(key) || valueLookup.get(key.toLowerCase()) || "");
}

function buildRecordLinkValue(recordValues, columns, recordLinkBack) {
  if (!recordLinkBack || !recordLinkBack.method || recordLinkBack.method === "none") {
    return "";
  }

  const valueLookup = buildValueLookup(recordValues, columns);
  const label = recordLinkBack.text || recordLinkBack.fieldname || "View Details";

  if (recordLinkBack.method === "pattern") {
    const href = interpolatePattern(recordLinkBack.linkurl, valueLookup).trim();
    if (!href) {
      return "";
    }

    return `<a href="${escapeHtml(href)}" target="_blank">${escapeHtml(label)}</a>`;
  }

  if (recordLinkBack.method === "root") {
    const href = buildHrefWithParams(recordLinkBack.linkurl, recordLinkBack.keys, valueLookup).trim();
    if (!href) {
      return "";
    }

    return `<a href="${escapeHtml(href)}" target="_blank">${escapeHtml(label)}</a>`;
  }

  if (recordLinkBack.method === "entireurl") {
    const href = valueLookup.get(recordLinkBack.linkurl) || valueLookup.get(recordLinkBack.linkurl?.toLowerCase()) || "";
    if (!href) {
      return "";
    }

    return `<a href="${escapeHtml(href)}" target="_blank">${escapeHtml(label)}</a>`;
  }

  return "";
}

export function parseTabularData(tabText, config) {
  const delimiter = detectDelimiter(tabText);
  const rows = parseDelimitedRows(tabText, delimiter);

  if (!rows.length) {
    throw new Error("Data file is empty.");
  }

  const configColumns = buildColumnsFromConfig(config.concepts || []);
  const rawFirstRow = rows[0].values;
  const hasHeader = looksLikeHeader(rawFirstRow, configColumns);
  const parseColumns = rawFirstRow.map((headerValue, index) => {
    const fallbackHeader = hasHeader ? headerValue.trim() || `Column ${index + 1}` : `Column ${index + 1}`;
    const configColumn = configColumns.length
      ? hasHeader
        ? findConfigColumnForHeader(configColumns, fallbackHeader, index)
        : configColumns[index] || null
      : null;
    const resolvedName = configColumn?.name || normalizeColumnName(fallbackHeader);

    return {
      name: resolvedName,
      alias: configColumn?.alias || fallbackHeader,
      visible: configColumn?.visible ?? true,
      order: configColumn?.order,
      originalIndex: index,
      colorable: configColumn?.colorable ?? false,
      datatype: configColumn?.datatype || resolvedName
    };
  });

  if (
    config.recordLinkBack &&
    config.recordLinkBack.method &&
    config.recordLinkBack.method !== "none" &&
    !parseColumns.some((column) => column.name === config.recordLinkBack.fieldname)
  ) {
    const maxOrder = parseColumns.reduce((currentMax, column) => Math.max(currentMax, column.order ?? 0), 0);
    parseColumns.push({
      name: config.recordLinkBack.fieldname,
      alias: config.recordLinkBack.fieldname,
      visible: true,
      order: maxOrder + 1,
      originalIndex: parseColumns.length,
      colorable: false,
      datatype: config.recordLinkBack.fieldname
    });
  }

  const orderedColumns = sortColumns(parseColumns);

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const coordinateColumns = inferCoordinateColumns(parseColumns);
  const records = [];
  const markers = [];

  dataRows.forEach((row, rowIndex) => {
    const values = row.values;
    const recordValues = {};

    parseColumns.forEach((column, columnIndex) => {
      if (column.name === config.recordLinkBack?.fieldname && columnIndex >= values.length) {
        return;
      }
      recordValues[column.name] = values[columnIndex]?.trim() || "";
    });

    const generatedLinkBack = buildRecordLinkValue(recordValues, parseColumns, config.recordLinkBack);
    if (generatedLinkBack) {
      recordValues[config.recordLinkBack.fieldname] = generatedLinkBack;
    }

    const record = {
      id: `row-${rowIndex + 1}`,
      line: row.line,
      values: recordValues
    };

    records.push(record);

    const latitude = Number.parseFloat(recordValues[coordinateColumns.latitudeKey]);
    const longitude = Number.parseFloat(recordValues[coordinateColumns.longitudeKey]);

    if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
      const labelColumn = orderedColumns.find((column) => column.visible && !["Latitude", "Longitude"].includes(column.name));
      markers.push({
        id: record.id,
        latitude,
        longitude,
        label: labelColumn ? recordValues[labelColumn.name] || record.id : record.id
      });
    }
  });

  return {
    columns: orderedColumns,
    records,
    markers,
    colorFields: orderedColumns
      .filter((column) => column.colorable)
      .map((column) => ({
        name: column.name,
        alias: column.alias
      })),
    summary: buildSummary(orderedColumns, records, markers)
  };
}

export function buildEmptyTabularData(config) {
  const configuredColumns = buildColumnsFromConfig(config?.concepts || []).map((column, index) => ({
    ...column,
    originalIndex: index
  }));
  const orderedColumns = sortColumns(configuredColumns);
  const records = [];
  const markers = [];

  return {
    columns: orderedColumns,
    records,
    markers,
    colorFields: orderedColumns
      .filter((column) => column.colorable)
      .map((column) => ({
        name: column.name,
        alias: column.alias
      })),
    summary: buildSummary(orderedColumns, records, markers)
  };
}
