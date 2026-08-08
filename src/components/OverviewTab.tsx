// Overview tab: health score breakdown, penalty bars, alert list, and column type chart.
// Landing view after profiling completes.

import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { HealthReport, ColumnProfile } from "../types/profiler";
import ColumnTypePieChart from "./ColumnTypePieChart";

interface OverviewTabProps {
  health: HealthReport;
  columns: ColumnProfile[];
}

const severityStyles = {
  critical: {
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    border: "border-red-500/20",
    bg: "bg-charcoal-rust",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <AlertTriangle size={18} className="text-red-400 shrink-0" />
      </div>
    ),
  },
  warning: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    border: "border-amber-500/20",
    bg: "bg-charcoal-rust",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <AlertTriangle size={18} className="text-amber-400 shrink-0" />
      </div>
    ),
  },
  info: {
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    border: "border-sky-500/20",
    bg: "bg-carbon-veil",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <Info size={18} className="text-sky-400 shrink-0" />
      </div>
    ),
  },
};

export default function OverviewTab({ health, columns }: OverviewTabProps) {
  const sortedAlerts = [...health.alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const totalMissingCells = columns.reduce(
    (sum, col) => sum + col.stats.nullCount,
    0,
  );

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-surface flex items-center gap-3">
          <div className="w-48 h-48 rounded-lg bg-carbon-veil flex items-center justify-center shrink-0">
            <AlertTriangle size={32} className="text-amber-400 shrink-0" />
          </div>
          <div>
            <p className="eyebrow">Missing Values</p>
            <p className="font-goga text-heading-sm text-phosphor-white">
              {health.globalMissingPercent.toFixed(1)}%
            </p>
            <p className="text-caption text-sage-40">
              {totalMissingCells.toLocaleString()} cells
            </p>
          </div>
        </div>

        <div className="card-surface flex items-center gap-3">
          <div className="w-48 h-48 rounded-lg bg-carbon-veil flex items-center justify-center shrink-0">
            <CheckCircle2 size={32} className="text-lime-pulse shrink-0" />
          </div>
          <div>
            <p className="eyebrow">Duplicate Rows</p>
            <p className="font-goga text-heading-sm text-phosphor-white">
              {health.duplicateRowCount > 0
                ? `${(
                    (health.duplicateRowCount /
                      (health.duplicateRowCount +
                        (health.duplicateRowCount > 0
                          ? Math.max(1, health.duplicateRowCount * 0.42)
                          : 1))) *
                    100
                  ).toFixed(1)}%`
                : "0.0%"}
            </p>
            <p className="text-caption text-sage-40">
              {health.duplicateRowCount.toLocaleString()} rows
            </p>
          </div>
        </div>
      </div>

      {/* Penalty Breakdown */}
      <div className="card-surface">
        <p className="eyebrow mb-4">Score Breakdown</p>
        <div className="space-y-4">
          <PenaltyBar
            label="Missing Value Penalty"
            value={health.missingValuePenalty}
            max={30}
          />
          <PenaltyBar
            label="Duplicate Penalty"
            value={health.duplicatePenalty}
            max={20}
          />
          <PenaltyBar
            label="Outlier Penalty"
            value={health.outlierPenalty}
            max={15}
          />
          <PenaltyBar
            label="Constant Column Penalty"
            value={health.constantColumnPenalty}
            max={50}
          />
        </div>
      </div>

      {/* Column Type Distribution - Interactive Donut Chart */}
      <div className="card-surface">
        <p className="eyebrow mb-4">Column Type Distribution</p>
        <ColumnTypePieChart columns={columns} />
      </div>

      {/* Unified Alerts */}
      <div className="card-surface">
        <p className="eyebrow mb-4">Alerts & Findings</p>
        <div className="space-y-3">
          {sortedAlerts.map((alert) => {
            const style = severityStyles[alert.severity];
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${style.border} ${style.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.badge}`}
                      >
                        {alert.severity}
                      </span>
                      <p className="text-body-sm text-phosphor-white font-medium">
                        {alert.title}
                      </p>
                    </div>
                    <p className="text-body-sm text-sage-60 mt-1">
                      {alert.message}
                    </p>
                    {alert.columnName && (
                      <span className="tag tag-neutral mt-2">
                        {alert.columnName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PenaltyBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    value === 0
      ? "bg-lime-pulse"
      : value <= max * 0.4
        ? "bg-amber-400"
        : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-body-sm text-sage-60">{label}</span>
        <span className="text-body-sm text-phosphor-white font-medium">
          -{value.toFixed(1)} pts
        </span>
      </div>
      <div className="h-3 bg-carbon-veil rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
