// Health scoring logic: computes the 0-100 score and generates alerts.
// Also maps a score to a human-readable status label.

import type { Alert, ColumnProfile, HealthReport } from "../types/profiler";

// Compute the health score and alert list from column profiles.
export function computeHealthScore(
  columns: ColumnProfile[],
  totalRows: number,
  totalColumns: number,
  duplicateRowCount: number,
  totalOutliers: number,
): HealthReport {
  let score = 100;
  const alerts: Alert[] = [];

  const totalCells = totalRows * totalColumns;
  let totalNulls = 0;
  for (const col of columns) {
    totalNulls += col.stats.nullCount;
  }
  const globalMissingPercent =
    totalCells > 0 ? (totalNulls / totalCells) * 100 : 0;

  const missingValuePenalty = Math.min(30, (globalMissingPercent / 100) * 30);
  score -= missingValuePenalty;

  const duplicatePenalty =
    totalRows > 0 ? Math.min(20, (duplicateRowCount / totalRows) * 40) : 0;
  score -= duplicatePenalty;

  const outlierRatio = totalRows > 0 ? totalOutliers / totalRows : 0;
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
    const dupRatio = totalRows > 0 ? (duplicateRowCount / totalRows) * 100 : 0;
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

// Map a numeric score to a status label.
export function getScoreStatus(
  score: number,
): "excellent" | "good" | "fair" | "poor" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 50) return "fair";
  return "poor";
}
