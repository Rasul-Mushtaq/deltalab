// Donut chart showing the distribution of column types across the dataset.
// Interactive: hover to highlight a slice and see its share.

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import type { ColumnProfile } from "../types/profiler";

interface ColumnTypePieChartProps {
  columns: ColumnProfile[];
}

const TYPE_LABELS: Record<string, string> = {
  numeric: "Numeric",
  categorical: "String / Text",
  datetime: "Date / Time",
  boolean: "Boolean",
  text: "Text",
};

const TYPE_COLORS: Record<string, string> = {
  numeric: "#00C853",
  categorical: "#7fee64",
  datetime: "#4db6ac",
  boolean: "#aed2a4",
  text: "#677d64",
};

interface PieDatum {
  name: string;
  label: string;
  value: number;
  color: string;
}

function renderActiveShape(props: unknown) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
    };

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={3}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
}

export default function ColumnTypePieChart({
  columns,
}: ColumnTypePieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const data: PieDatum[] = useMemo(() => {
    const distribution = columns.reduce<Record<string, number>>((acc, col) => {
      acc[col.stats.type] = (acc[col.stats.type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution)
      .map(([type, count]) => ({
        name: type,
        label: TYPE_LABELS[type] || type,
        value: count,
        color: TYPE_COLORS[type] || "#677d64",
      }))
      .sort((a, b) => b.value - a.value);
  }, [columns]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
      {/* Donut Chart */}
      <div className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              stroke="none"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  className="cursor-pointer transition-opacity duration-200"
                  fillOpacity={
                    activeIndex === -1 || activeIndex === index ? 1 : 0.4
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const datum = payload[0] as {
                  name: string;
                  payload: PieDatum;
                };
                const d = datum?.payload;
                if (!d) return null;
                const pct = ((d.value / total) * 100).toFixed(1);
                return (
                  <div className="rounded-lg border border-circuit-border bg-carbon-veil px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-body-sm text-phosphor-white font-medium">
                        {d.label}
                      </span>
                    </div>
                    <p className="text-caption text-sage-40">
                      {d.value} column{d.value !== 1 ? "s" : ""} · {pct}%
                    </p>
                  </div>
                );
              }}
            />
            {/* Center label */}
            <text
              x="50%"
              y="47%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-goga"
              fill="#ddffdc"
              fontSize={32}
              fontWeight={600}
            >
              {total}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#677d64"
              fontSize={11}
              letterSpacing={1}
              style={{ textTransform: "uppercase" }}
            >
              Columns
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {data.map((d, index) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          const isActive = activeIndex === -1 || activeIndex === index;
          return (
            <button
              key={d.name}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
              className={`w-full flex items-center justify-between p-3 pr-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50 transition-all duration-300 ${
                isActive ? "opacity-100" : "opacity-40"
              }`}
              aria-label={`${d.label}: ${d.value} columns, ${pct}%`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-body-sm text-phosphor-white font-medium capitalize truncate">
                  {d.label}
                </span>
              </span>
              <span className="flex items-center gap-4 shrink-0">
                <span className="text-body-sm text-sage-60 font-medium">
                  {d.value}
                </span>
                <span className="text-caption text-sage-40 min-w-fit text-right">
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
