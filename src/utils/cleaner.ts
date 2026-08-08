// Data cleaning utilities: imputation, dedup, type casting, and CSV export.
// Used by the Quick Clean panel and export buttons.

import type {
  CleanOptions,
  CleanResult,
  ColumnProfile,
} from "../types/profiler";

// Pick a fill value for a column based on its stats and chosen strategy.
function computeImputeValue(
  column: ColumnProfile,
  strategy: CleanOptions["imputeStrategy"],
): string | number | boolean | null {
  const stats = column.stats;

  if (stats.type === "numeric") {
    if (strategy === "mean") return stats.mean;
    if (strategy === "median") return stats.median;
    return stats.mean;
  }

  if (stats.type === "categorical") {
    return stats.mode;
  }

  if (stats.type === "boolean") {
    return stats.truePercent >= 50 ? true : false;
  }

  if (stats.type === "datetime") {
    return stats.min || "";
  }

  return "";
}

// Coerce a single value to the target column type.
export function castColumnValue(
  value: string | number | boolean | null,
  type: string,
): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;

  switch (type) {
    case "numeric": {
      const num = Number(String(value).replace(/[,$%\s]/g, ""));
      return Number.isNaN(num) ? value : num;
    }
    case "boolean": {
      const str = String(value).trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(str)) return true;
      if (["false", "0", "no", "n"].includes(str)) return false;
      return value;
    }
    case "datetime": {
      const date = new Date(String(value));
      if (!Number.isNaN(date.getTime()) && typeof value === "string") {
        return date.toISOString();
      }
      return value;
    }
    default:
      return value;
  }
}

// Run the full cleaning pipeline in order: constants, impute, dedup, trim, strip, cast.
export function cleanData(
  data: Record<string, string | number | boolean | null>[],
  columnProfiles: ColumnProfile[],
  options: CleanOptions,
): CleanResult {
  let workingData = [...data];
  let removedRows = 0;
  let imputedCells = 0;
  const removedColumns: string[] = [];

  const profileMap = new Map(columnProfiles.map((c) => [c.name, c]));
  const typeMap = new Map(columnProfiles.map((c) => [c.name, c.stats.type]));

  if (options.removeConstantColumns) {
    const constantCols = columnProfiles.filter((c) => c.stats.isConstant);
    const constantNames = new Set(constantCols.map((c) => c.name));

    if (constantNames.size > 0) {
      workingData = workingData.map((row) => {
        const newRow: Record<string, string | number | boolean | null> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!constantNames.has(key)) {
            newRow[key] = value;
          }
        }
        return newRow;
      });
      removedColumns.push(...constantNames);
    }
  }

  if (options.imputeMissing) {
    const strategy = options.imputeStrategy;

    workingData = workingData.map((row) => {
      const newRow = { ...row };
      for (const [key, value] of Object.entries(newRow)) {
        if (value === null || value === undefined || value === "") {
          const profile = profileMap.get(key);
          if (profile) {
            const imputeValue = computeImputeValue(profile, strategy);
            newRow[key] = imputeValue;
            imputedCells++;
          }
        }
      }
      return newRow;
    });
  }

  if (options.dropDuplicates) {
    const seen = new Set<string>();
    const deduped: Record<string, string | number | boolean | null>[] = [];

    for (const row of workingData) {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(row);
      } else {
        removedRows++;
      }
    }

    workingData = deduped;
  }

  if (options.trimWhitespace) {
    workingData = workingData.map((row) => {
      const newRow = { ...row };
      for (const [key, value] of Object.entries(newRow)) {
        if (typeof value === "string") {
          newRow[key] = value.trim();
        }
      }
      return newRow;
    });
  }

  if (options.stripSpecialCharacters) {
    workingData = workingData.map((row) => {
      const newRow = { ...row };
      for (const [key, value] of Object.entries(newRow)) {
        if (typeof value === "string" && typeMap.get(key) === "text") {
          // Remove control characters and non-printable special characters
          newRow[key] = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        }
      }
      return newRow;
    });
  }

  if (options.castColumnTypes) {
    workingData = workingData.map((row) => {
      const newRow: Record<string, string | number | boolean | null> = {};
      for (const [key, value] of Object.entries(row)) {
        const colType = typeMap.get(key);
        if (colType) {
          newRow[key] = castColumnValue(value, colType);
        } else {
          newRow[key] = value;
        }
      }
      return newRow;
    });
  }

  const columnNames = workingData.length > 0 ? Object.keys(workingData[0]) : [];

  return {
    data: workingData,
    columnNames,
    removedRows,
    removedColumns,
    imputedCells,
  };
}

// Serialize rows to CSV and trigger a browser download.
export function downloadCSV(
  data: Record<string, string | number | boolean | null>[],
  filename: string,
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const escapeValue = (value: string | number | boolean | null): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => escapeValue(row[h])).join(",")),
  ];

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
