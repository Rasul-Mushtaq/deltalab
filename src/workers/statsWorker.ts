// Background worker: parses CSV, computes per-column stats, correlations, and health.
// Runs off the main thread so large datasets do not freeze the UI.

/// <reference lib="webworker" />
import Papa from "papaparse";
import type {
  ColumnProfile,
  ColumnStats,
  CorrelationPair,
  FileMetadata,
  HealthReport,
  NumericStats,
  ProfileResult,
  WorkerProgress,
  WorkerRequest,
  WorkerResponse,
} from "../types/profiler";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let cancelled = false;

// Send a progress update back to the main thread.
function postProgress(
  percent: number,
  message: string,
  phase: WorkerProgress["phase"] = "parsing",
) {
  const progress: WorkerProgress = { phase, percent, message };
  const response: WorkerResponse = { type: "progress", progress };
  ctx.postMessage(response);
}

function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  const str = String(value).trim();
  if (str === "") return false;
  return !isNaN(Number(str));
}

function isBooleanValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).trim().toLowerCase();
  return ["true", "false", "yes", "no", "1", "0", "t", "f"].includes(str);
}

function isDatetimeValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  if (str === "") return false;
  if (isNumericValue(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

// Guess the column type from a sample of its values.
function inferColumnType(values: unknown[]): ColumnStats["type"] {
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  if (nonNull.length === 0) return "text";

  const sample = nonNull.slice(0, 100);
  const numericCount = sample.filter(isNumericValue).length;
  const boolCount = sample.filter(isBooleanValue).length;
  const dateCount = sample.filter(isDatetimeValue).length;

  if (numericCount / sample.length > 0.9) return "numeric";
  if (boolCount / sample.length > 0.9) return "boolean";
  if (dateCount / sample.length > 0.9) return "datetime";

  const unique = new Set(nonNull.map((v) => String(v)));
  if (unique.size / nonNull.length < 0.5) return "categorical";
  return "text";
}

// Compute full numeric stats: mean, median, std dev, outliers, and bins.
function computeNumericStats(values: unknown[]): NumericStats {
  const numbers: number[] = [];
  const nullCount = values.filter(
    (v) => v === null || v === undefined || v === "",
  ).length;

  for (const v of values) {
    if (v !== null && v !== undefined && v !== "" && !isNaN(Number(v))) {
      numbers.push(Number(v));
    }
  }

  const count = numbers.length;
  const missingPercent =
    values.length > 0 ? (nullCount / values.length) * 100 : 0;

  if (count === 0) {
    return {
      type: "numeric",
      count: 0,
      nullCount,
      missingPercent,
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      skewness: 0,
      outlierCount: 0,
      outlierIndices: [],
      binFrequencies: [],
      uniqueCount: 0,
      isConstant: true,
    };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = numbers.reduce((a, b) => a + b, 0) / count;

  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

  const variance = numbers.reduce((a, b) => a + (b - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  const skewness =
    count > 2
      ? numbers.reduce((a, b) => a + (b - mean) ** 3, 0) /
        count /
        (stdDev ** 3 || 1)
      : 0;

  const q1 = sorted[Math.floor(count * 0.25)];
  const q3 = sorted[Math.floor(count * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outlierIndices: number[] = [];
  numbers.forEach((n, i) => {
    if (n < lowerBound || n > upperBound) outlierIndices.push(i);
  });

  const uniqueCount = new Set(numbers).size;
  const isConstant = uniqueCount <= 1;

  const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(count))));
  const binWidth = (max - min) / binCount || 1;
  const binFrequencies: { binStart: number; binEnd: number; count: number }[] =
    [];

  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const binCountVal = numbers.filter(
      (n) => n >= binStart && (i === binCount - 1 ? n <= binEnd : n < binEnd),
    ).length;
    binFrequencies.push({ binStart, binEnd, count: binCountVal });
  }

  return {
    type: "numeric",
    count,
    nullCount,
    missingPercent,
    mean,
    median,
    stdDev,
    min,
    max,
    skewness,
    outlierCount: outlierIndices.length,
    outlierIndices,
    binFrequencies,
    uniqueCount,
    isConstant,
  };
}

function computeCategoricalStats(values: unknown[]) {
  const nullCount = values.filter(
    (v) => v === null || v === undefined || v === "",
  ).length;
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  const missingPercent =
    values.length > 0 ? (nullCount / values.length) * 100 : 0;

  const freqMap = new Map<string, number>();
  for (const v of nonNull) {
    const key = String(v);
    freqMap.set(key, (freqMap.get(key) || 0) + 1);
  }

  const topValues = [...freqMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const uniqueCount = freqMap.size;
  const mode = topValues.length > 0 ? topValues[0].value : "";
  const isConstant = uniqueCount <= 1;

  return {
    type: "categorical" as const,
    count: nonNull.length,
    nullCount,
    missingPercent,
    uniqueCount,
    mode,
    topValues,
    isConstant,
  };
}

function computeDatetimeStats(values: unknown[]) {
  const nullCount = values.filter(
    (v) => v === null || v === undefined || v === "",
  ).length;
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  const missingPercent =
    values.length > 0 ? (nullCount / values.length) * 100 : 0;

  const dates = nonNull
    .map((v) => new Date(String(v)).getTime())
    .filter((t) => !isNaN(t));
  const uniqueCount = new Set(nonNull.map((v) => String(v))).size;
  const isConstant = uniqueCount <= 1;

  return {
    type: "datetime" as const,
    count: nonNull.length,
    nullCount,
    missingPercent,
    uniqueCount,
    min: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : "",
    max: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : "",
    isConstant,
  };
}

function computeBooleanStats(values: unknown[]) {
  const nullCount = values.filter(
    (v) => v === null || v === undefined || v === "",
  ).length;
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  const missingPercent =
    values.length > 0 ? (nullCount / values.length) * 100 : 0;

  let trueCount = 0;
  for (const v of nonNull) {
    const str = String(v).trim().toLowerCase();
    if (["true", "yes", "1", "t"].includes(str)) trueCount++;
  }

  const falseCount = nonNull.length - trueCount;
  const truePercent =
    nonNull.length > 0 ? (trueCount / nonNull.length) * 100 : 0;
  const isConstant = trueCount === 0 || falseCount === 0;

  return {
    type: "boolean" as const,
    count: nonNull.length,
    nullCount,
    missingPercent,
    trueCount,
    falseCount,
    truePercent,
    isConstant,
  };
}

function computeTextStats(values: unknown[]) {
  const nullCount = values.filter(
    (v) => v === null || v === undefined || v === "",
  ).length;
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== "",
  );
  const missingPercent =
    values.length > 0 ? (nullCount / values.length) * 100 : 0;

  const lengths = nonNull.map((v) => String(v).length);
  const avgLength =
    lengths.length > 0
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 0;
  const minLength = lengths.length > 0 ? Math.min(...lengths) : 0;
  const maxLength = lengths.length > 0 ? Math.max(...lengths) : 0;
  const uniqueCount = new Set(nonNull.map((v) => String(v))).size;
  const isConstant = uniqueCount <= 1;

  return {
    type: "text" as const,
    count: nonNull.length,
    nullCount,
    missingPercent,
    uniqueCount,
    avgLength,
    minLength,
    maxLength,
    isConstant,
  };
}

// Compute Pearson correlation for every numeric column pair.
function computeCorrelations(
  columns: ColumnProfile[],
  rawData: Record<string, string | number | boolean | null>[],
): CorrelationPair[] {
  const numericCols = columns.filter((c) => c.stats.type === "numeric");
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i].name;
      const colB = numericCols[j].name;

      const valuesA: number[] = [];
      const valuesB: number[] = [];

      for (const row of rawData) {
        const va = row[colA];
        const vb = row[colB];
        if (
          va !== null &&
          va !== undefined &&
          va !== "" &&
          vb !== null &&
          vb !== undefined &&
          vb !== ""
        ) {
          const na = Number(va);
          const nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb)) {
            valuesA.push(na);
            valuesB.push(nb);
          }
        }
      }

      if (valuesA.length < 2) continue;

      const meanA = valuesA.reduce((a, b) => a + b, 0) / valuesA.length;
      const meanB = valuesB.reduce((a, b) => a + b, 0) / valuesB.length;

      let numerator = 0;
      let denomA = 0;
      let denomB = 0;

      for (let k = 0; k < valuesA.length; k++) {
        const da = valuesA[k] - meanA;
        const db = valuesB[k] - meanB;
        numerator += da * db;
        denomA += da * da;
        denomB += db * db;
      }

      const denom = Math.sqrt(denomA * denomB);
      const coefficient = denom !== 0 ? numerator / denom : 0;

      pairs.push({ colA, colB, coefficient });
    }
  }

  return pairs;
}

function computeHealthReport(
  columns: ColumnProfile[],
  rawData: Record<string, string | number | boolean | null>[],
  metadata: FileMetadata,
): HealthReport {
  let score = 100;
  const alerts: HealthReport["alerts"] = [];

  const totalCells = metadata.totalRows * metadata.totalColumns;
  let totalNulls = 0;
  for (const col of columns) {
    totalNulls += col.stats.nullCount;
  }
  const globalMissingPercent =
    totalCells > 0 ? (totalNulls / totalCells) * 100 : 0;

  const missingValuePenalty = Math.min(30, (globalMissingPercent / 100) * 30);
  score -= missingValuePenalty;

  const seen = new Set<string>();
  let duplicateRowCount = 0;
  for (const row of rawData) {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicateRowCount++;
    else seen.add(key);
  }

  const duplicatePenalty =
    metadata.totalRows > 0
      ? Math.min(20, (duplicateRowCount / metadata.totalRows) * 40)
      : 0;
  score -= duplicatePenalty;

  let totalOutliers = 0;
  for (const col of columns) {
    if (col.stats.type === "numeric") {
      totalOutliers += col.stats.outlierCount;
    }
  }

  const outlierRatio =
    metadata.totalRows > 0 ? totalOutliers / metadata.totalRows : 0;
  const outlierPenalty = outlierRatio > 0.05 ? 15 : 0;
  score -= outlierPenalty;

  const constantCols = columns.filter((c) => c.stats.isConstant);
  const constantColumnPenalty = constantCols.length * 10;
  score -= constantColumnPenalty;

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (globalMissingPercent > 20) {
    alerts.push({
      id: "missing-critical",
      severity: "critical",
      title: "High missing value ratio",
      message: `${globalMissingPercent.toFixed(1)}% of all cells are missing. Consider imputation strategies.`,
    });
  } else if (globalMissingPercent > 5) {
    alerts.push({
      id: "missing-warning",
      severity: "warning",
      title: "Moderate missing values",
      message: `${globalMissingPercent.toFixed(1)}% of all cells are missing. Review columns with high null counts.`,
    });
  }

  if (duplicateRowCount > 0) {
    const dupRatio =
      metadata.totalRows > 0
        ? (duplicateRowCount / metadata.totalRows) * 100
        : 0;
    alerts.push({
      id: "duplicates",
      severity: dupRatio > 10 ? "critical" : "warning",
      title: "Duplicate rows detected",
      message: `${duplicateRowCount} duplicate rows found (${dupRatio.toFixed(1)}% of total).`,
    });
  }

  if (outlierRatio > 0.05) {
    alerts.push({
      id: "outliers",
      severity: "warning",
      title: "High outlier concentration",
      message: `${totalOutliers} outlier values detected across numeric columns (${(outlierRatio * 100).toFixed(1)}% of rows).`,
    });
  }

  for (const col of constantCols) {
    alerts.push({
      id: `constant-${col.name}`,
      severity: "warning",
      title: "Constant column detected",
      message: `Column "${col.name}" has zero variance (single unique value). It provides no predictive information.`,
      columnName: col.name,
    });
  }

  for (const col of columns) {
    if (col.stats.missingPercent > 50) {
      alerts.push({
        id: `null-${col.name}`,
        severity: "critical",
        title: "Column mostly empty",
        message: `Column "${col.name}" is ${col.stats.missingPercent.toFixed(1)}% null. Consider dropping or imputing.`,
        columnName: col.name,
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "healthy",
      severity: "info",
      title: "Dataset looks healthy",
      message: "No significant data quality issues detected.",
    });
  }

  return {
    score,
    missingValuePenalty,
    duplicatePenalty,
    outlierPenalty,
    constantColumnPenalty,
    duplicateRowCount,
    globalMissingPercent,
    alerts,
  };
}

// Parse the file and run the full profiling pipeline.
function processFile(file: File) {
  cancelled = false;
  postProgress(0, "Reading file...");

  const reader = new FileReader();
  reader.onload = (e) => {
    if (cancelled) return;
    const text = e.target?.result as string;
    postProgress(5, "Parsing CSV...");

    Papa.parse<Record<string, string>>(text, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (cancelled) return;
        postProgress(50, "Parsing complete. Computing statistics...");

        const rawData = results.data as Record<
          string,
          string | number | boolean | null
        >[];
        const columnNames = results.meta.fields || [];
        const totalRows = rawData.length;
        const totalColumns = columnNames.length;

        const metadata: FileMetadata = {
          filename: file.name,
          fileSize: file.size,
          totalRows,
          totalColumns,
        };

        const columns: ColumnProfile[] = [];
        const totalCols = columnNames.length;

        columnNames.forEach((colName, idx) => {
          if (cancelled) return;
          const values = rawData.map((row) => row[colName] ?? null);
          const type = inferColumnType(values);

          let stats: ColumnStats;
          switch (type) {
            case "numeric":
              stats = computeNumericStats(values);
              break;
            case "categorical":
              stats = computeCategoricalStats(values);
              break;
            case "datetime":
              stats = computeDatetimeStats(values);
              break;
            case "boolean":
              stats = computeBooleanStats(values);
              break;
            default:
              stats = computeTextStats(values);
          }

          columns.push({ name: colName, stats });
          postProgress(
            50 + ((idx + 1) / totalCols) * 30,
            `Computing stats for "${colName}"...`,
            "computing",
          );
        });

        if (cancelled) return;
        postProgress(85, "Computing correlations...", "computing");
        const correlations = computeCorrelations(columns, rawData);

        postProgress(95, "Generating health report...", "computing");
        const health = computeHealthReport(columns, rawData, metadata);

        const result: ProfileResult = {
          metadata,
          columns,
          correlations,
          health,
          rawData,
          columnNames,
        };

        postProgress(100, "Done", "done");
        const response: WorkerResponse = { type: "result", result };
        ctx.postMessage(response);
      },
      error: (err: Error) => {
        const response: WorkerResponse = {
          type: "error",
          message: err.message,
        };
        ctx.postMessage(response);
      },
    });
  };

  reader.onerror = () => {
    const response: WorkerResponse = {
      type: "error",
      message: "Failed to read file",
    };
    ctx.postMessage(response);
  };

  reader.readAsText(file);
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const request = e.data;
  if (request.type === "process") {
    processFile(request.file);
  } else if (request.type === "cancel") {
    cancelled = true;
  }
};
