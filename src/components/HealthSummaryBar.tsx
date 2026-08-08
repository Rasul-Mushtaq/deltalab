// Summary strip with the health score gauge and key dataset metrics.
// Shows score, row count, column count, missing values, and duplicates.

import {
  Shield,
  Rows3,
  Columns3,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { HealthReport, FileMetadata } from "../types/profiler";
import { getScoreStatus } from "../utils/healthScore";

interface HealthSummaryBarProps {
  health: HealthReport;
  metadata: FileMetadata;
}

export default function HealthSummaryBar({
  health,
  metadata,
}: HealthSummaryBarProps) {
  const status = getScoreStatus(health.score);

  const statusColors = {
    excellent: {
      border: "border-lime-pulse",
      bg: "bg-lime-pulse",
      text: "text-lime-pulse",
    },
    good: { border: "border-moss-80", bg: "bg-moss-80", text: "text-moss-80" },
    fair: { border: "border-moss-70", bg: "bg-moss-70", text: "text-moss-70" },
    poor: {
      border: "border-phosphor-white",
      bg: "bg-phosphor-white",
      text: "text-phosphor-white",
    },
  };

  const colors = statusColors[status];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Health Score Gauge */}
      <div className="card-surface flex items-center gap-3">
        <div
          className={`relative w-[80px] h-[80px] rounded-full border-2 ${colors.border} flex items-center justify-center shrink-0`}
        >
          <Shield size={32} className={`${colors.text} shrink-0`} />
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 80 80"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-carbon-veil"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${(health.score / 100) * 226} 226`}
              className={colors.text}
            />
          </svg>
        </div>
        <div>
          <p className="eyebrow">Data Health</p>
          <p className={`font-goga text-heading ${colors.text}`}>
            {health.score}
          </p>
          <p className="text-caption text-sage-40 uppercase tracking-wider">
            {status}
          </p>
        </div>
      </div>

      {/* Total Rows */}
      <div className="card-surface flex items-center gap-3">
        <div className="w-48 h-48 rounded-lg bg-carbon-veil flex items-center justify-center shrink-0">
          <Rows3 size={32} className="text-moss-70 shrink-0" />
        </div>
        <div>
          <p className="eyebrow">Total Rows</p>
          <p className="font-goga text-heading-sm text-phosphor-white">
            {metadata.totalRows.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Total Columns */}
      <div className="card-surface flex items-center gap-3">
        <div className="w-48 h-48 rounded-lg bg-carbon-veil flex items-center justify-center shrink-0">
          <Columns3 size={32} className="text-moss-70 shrink-0" />
        </div>
        <div>
          <p className="eyebrow">Total Columns</p>
          <p className="font-goga text-heading-sm text-phosphor-white">
            {metadata.totalColumns}
          </p>
        </div>
      </div>

      {/* Missing Values */}
      <div className="card-surface flex items-center gap-3">
        <div className="w-48 h-48 rounded-lg bg-carbon-veil flex items-center justify-center shrink-0">
          <AlertTriangle size={32} className="text-amber-400 shrink-0" />
        </div>
        <div>
          <p className="eyebrow">Missing Values</p>
          <p className="font-goga text-heading-sm text-phosphor-white">
            {health.globalMissingPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Duplicate Rows */}
      <div className="card-surface flex items-center gap-3">
        <div className="w-48 h-48 rounded-lg bg-carbon-veil flex items-center justify-center shrink-0">
          <CheckCircle2 size={32} className="text-lime-pulse shrink-0" />
        </div>
        <div>
          <p className="eyebrow">Duplicate Rows</p>
          <p className="font-goga text-heading-sm text-phosphor-white">
            {health.duplicateRowCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
