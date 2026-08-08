// Per-column detail card with type icon, mini bar chart, and stats.
// Supports low-cardinality numeric columns viewed as categorical.

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChevronDown,
  Hash,
  Tag,
  Calendar,
  ToggleLeft,
  Type,
  Eye,
} from "lucide-react";
import type { ColumnProfile } from "../types/profiler";

interface ColumnCardProps {
  column: ColumnProfile;
}

const typeIcons = {
  numeric: <Hash className="w-5 h-5" />,
  categorical: <Tag className="w-5 h-5" />,
  datetime: <Calendar className="w-5 h-5" />,
  boolean: <ToggleLeft className="w-5 h-5" />,
  text: <Type className="w-5 h-5" />,
};

const typeColors = {
  numeric: "text-lime-pulse",
  categorical: "text-moss-80",
  datetime: "text-moss-70",
  boolean: "text-fern-link",
  text: "text-sage-60",
};

export default function ColumnCard({ column }: ColumnCardProps) {
  // Local UI state for expanded details and categorical view toggle.
  const [expanded, setExpanded] = useState(false);
  const [viewAsCategorical, setViewAsCategorical] = useState(false);
  const { name, stats } = column;

  // Low-cardinality detection for numeric columns.
  const isLowCardinality = stats.type === "numeric" && stats.uniqueCount <= 10;

  const effectiveType =
    viewAsCategorical && isLowCardinality ? "categorical" : stats.type;

  // Build chart data based on the effective column type.
  const chartData =
    effectiveType === "numeric"
      ? stats.type === "numeric"
        ? stats.binFrequencies.map((bin) => ({
            name: `${bin.binStart.toFixed(1)}`,
            count: bin.count,
          }))
        : []
      : stats.type === "categorical"
        ? stats.topValues.map((v) => ({ name: v.value, count: v.count }))
        : isLowCardinality && stats.type === "numeric"
          ? Array.from({ length: stats.uniqueCount }, (_, i) => {
              const val =
                stats.min +
                ((stats.max - stats.min) / Math.max(1, stats.uniqueCount - 1)) *
                  i;
              return { name: val.toFixed(0), count: 0 };
            })
          : [];

  const hasChart = chartData.length > 0;

  return (
    <div className="card-surface p-6 hover:border-sage-40 transition-all duration-300 ease-out">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`${typeColors[stats.type]}`}>
              {typeIcons[stats.type]}
            </span>
            <h4 className="font-goga text-subheading text-phosphor-white truncate">
              {name}
            </h4>
          </div>
          <p className="text-caption text-sage-40 mt-1 uppercase tracking-wider">
            {effectiveType} · {stats.count.toLocaleString()} values
          </p>
        </div>
        <span className="tag tag-neutral flex-shrink-0">
          {stats.missingPercent.toFixed(1)}% null
        </span>
      </div>

      {isLowCardinality && stats.type === "numeric" && (
        <div className="mt-3 flex items-center gap-2">
          <span className="tag tag-active text-[10px]">Low cardinality</span>
          <button
            onClick={() => setViewAsCategorical(!viewAsCategorical)}
            className="inline-flex items-center gap-1.5 text-body-sm text-fern-link hover:text-moss-80 transition-colors duration-300"
          >
            <Eye className="w-4 h-4" />
            {viewAsCategorical ? "View as Numeric" : "View as Categorical"}
          </button>
        </div>
      )}

      {hasChart && (
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: "#677d64", fontSize: 10 }}
                axisLine={{ stroke: "#485346" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#677d64", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#7fee64" fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 flex items-center gap-1 text-body-sm text-fern-link hover:text-moss-80 transition-colors duration-300"
      >
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
        />
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-phosphor-blue-black space-y-2">
          {stats.type === "numeric" && (
            <>
              <StatRow label="Mean" value={stats.mean.toFixed(4)} />
              <StatRow label="Median" value={stats.median.toFixed(4)} />
              <StatRow label="Std Dev" value={stats.stdDev.toFixed(4)} />
              <StatRow label="Min" value={stats.min.toFixed(4)} />
              <StatRow label="Max" value={stats.max.toFixed(4)} />
              <StatRow label="Skewness" value={stats.skewness.toFixed(4)} />
              <StatRow label="Outliers" value={String(stats.outlierCount)} />
              <StatRow label="Unique" value={String(stats.uniqueCount)} />
            </>
          )}
          {stats.type === "categorical" && (
            <>
              <StatRow label="Unique" value={String(stats.uniqueCount)} />
              <StatRow label="Mode" value={stats.mode} />
              <div className="pt-2">
                <p className="text-caption text-sage-40 uppercase tracking-wider mb-2">
                  Top Values
                </p>
                <div className="space-y-1">
                  {stats.topValues.slice(0, 5).map((v) => (
                    <div
                      key={v.value}
                      className="flex items-center justify-between text-body-sm"
                    >
                      <span className="text-sage-60 truncate max-w-[60%]">
                        {v.value}
                      </span>
                      <span className="text-sage-40">
                        {v.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {stats.type === "datetime" && (
            <>
              <StatRow label="Min" value={stats.min} />
              <StatRow label="Max" value={stats.max} />
              <StatRow label="Unique" value={String(stats.uniqueCount)} />
            </>
          )}
          {stats.type === "boolean" && (
            <>
              <StatRow label="True" value={String(stats.trueCount)} />
              <StatRow label="False" value={String(stats.falseCount)} />
              <StatRow
                label="True %"
                value={`${stats.truePercent.toFixed(1)}%`}
              />
            </>
          )}
          {stats.type === "text" && (
            <>
              <StatRow label="Unique" value={String(stats.uniqueCount)} />
              <StatRow label="Avg Length" value={stats.avgLength.toFixed(1)} />
              <StatRow label="Min Length" value={String(stats.minLength)} />
              <StatRow label="Max Length" value={String(stats.maxLength)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-sm text-sage-40">{label}</span>
      <span className="text-body-sm text-phosphor-white font-medium">
        {value}
      </span>
    </div>
  );
}
