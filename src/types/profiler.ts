// Shared type definitions for profiling, health, cleaning, and worker messages.
// Central contract used across the app, worker, and utility modules.

export type ColumnType =
  | "numeric"
  | "categorical"
  | "datetime"
  | "boolean"
  | "text";

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  columnName?: string;
}

export interface NumericStats {
  type: "numeric";
  count: number;
  nullCount: number;
  missingPercent: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  skewness: number;
  outlierCount: number;
  outlierIndices: number[];
  binFrequencies: { binStart: number; binEnd: number; count: number }[];
  uniqueCount: number;
  isConstant: boolean;
}

export interface CategoricalStats {
  type: "categorical";
  count: number;
  nullCount: number;
  missingPercent: number;
  uniqueCount: number;
  mode: string;
  topValues: { value: string; count: number }[];
  isConstant: boolean;
}

export interface DatetimeStats {
  type: "datetime";
  count: number;
  nullCount: number;
  missingPercent: number;
  uniqueCount: number;
  min: string;
  max: string;
  isConstant: boolean;
}

export interface BooleanStats {
  type: "boolean";
  count: number;
  nullCount: number;
  missingPercent: number;
  trueCount: number;
  falseCount: number;
  truePercent: number;
  isConstant: boolean;
}

export interface TextStats {
  type: "text";
  count: number;
  nullCount: number;
  missingPercent: number;
  uniqueCount: number;
  avgLength: number;
  minLength: number;
  maxLength: number;
  isConstant: boolean;
}

export type ColumnStats =
  | NumericStats
  | CategoricalStats
  | DatetimeStats
  | BooleanStats
  | TextStats;

export interface ColumnProfile {
  name: string;
  stats: ColumnStats;
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  coefficient: number;
}

export interface FileMetadata {
  filename: string;
  fileSize: number;
  totalRows: number;
  totalColumns: number;
}

export interface HealthReport {
  score: number;
  missingValuePenalty: number;
  duplicatePenalty: number;
  outlierPenalty: number;
  constantColumnPenalty: number;
  duplicateRowCount: number;
  globalMissingPercent: number;
  alerts: Alert[];
}

export interface ProfileResult {
  metadata: FileMetadata;
  columns: ColumnProfile[];
  correlations: CorrelationPair[];
  health: HealthReport;
  rawData: Record<string, string | number | boolean | null>[];
  columnNames: string[];
}

export interface WorkerProgress {
  phase: "parsing" | "computing" | "done";
  percent: number;
  message: string;
}

export type WorkerRequest =
  | { type: "process"; file: File }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "progress"; progress: WorkerProgress }
  | { type: "result"; result: ProfileResult }
  | { type: "error"; message: string };

export interface CleanOptions {
  imputeMissing: boolean;
  imputeStrategy: "mean" | "median" | "mode";
  dropDuplicates: boolean;
  removeConstantColumns: boolean;
  trimWhitespace: boolean;
  castColumnTypes: boolean;
  stripSpecialCharacters: boolean;
}

export interface CleanResult {
  data: Record<string, string | number | boolean | null>[];
  columnNames: string[];
  removedRows: number;
  removedColumns: string[];
  imputedCells: number;
}
