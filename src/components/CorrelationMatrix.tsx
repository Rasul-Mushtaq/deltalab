// Correlation matrix heatmap with click-to-open scatter plot modal.
// Handles pair selection, hover tooltips, and scatter rendering.

import { useMemo, useState } from "react";
import { BarChart3, X } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { CorrelationPair, ColumnProfile } from "../types/profiler";

interface CorrelationMatrixProps {
  correlations: CorrelationPair[];
  columns: ColumnProfile[];
  rawData: Record<string, string | number | boolean | null>[];
}

// Max points rendered on the scatter plot to keep the DOM light.
const MAX_SCATTER_POINTS = 2500;

function getDivergingColor(coefficient: number): string {
  const abs = Math.abs(coefficient);
  if (coefficient >= 0) {
    // Positive: emerald/green scale
    if (abs < 0.1) return "rgba(127, 238, 100, 0.1)";
    if (abs < 0.3) return "rgba(127, 238, 100, 0.3)";
    if (abs < 0.5) return "rgba(127, 238, 100, 0.5)";
    if (abs < 0.7) return "rgba(127, 238, 100, 0.7)";
    if (abs < 0.9) return "rgba(127, 238, 100, 0.85)";
    return "rgba(127, 238, 100, 1)";
  } else {
    // Negative: purple/blue scale
    if (abs < 0.1) return "rgba(147, 51, 234, 0.1)";
    if (abs < 0.3) return "rgba(147, 51, 234, 0.3)";
    if (abs < 0.5) return "rgba(147, 51, 234, 0.5)";
    if (abs < 0.7) return "rgba(147, 51, 234, 0.7)";
    if (abs < 0.9) return "rgba(147, 51, 234, 0.85)";
    return "rgba(147, 51, 234, 1)";
  }
}

// Uniformly sample an array down to maxPoints, preserving distribution.
function uniformSample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const sampled: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(arr[Math.floor(i * step)]);
  }
  return sampled;
}

export default function CorrelationMatrix({
  correlations,
  columns,
  rawData,
}: CorrelationMatrixProps) {
  const [hoveredPair, setHoveredPair] = useState<CorrelationPair | null>(null);
  const [selectedPair, setSelectedPair] = useState<CorrelationPair | null>(
    null,
  );

  // Only numeric columns participate in correlation pairs.
  const numericCols = useMemo(
    () => columns.filter((c) => c.stats.type === "numeric").map((c) => c.name),
    [columns],
  );

  // Build a lookup map for quick coefficient access by column pair.
  const corrMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const pair of correlations) {
      map.set(`${pair.colA}::${pair.colB}`, pair.coefficient);
      map.set(`${pair.colB}::${pair.colA}`, pair.coefficient);
    }
    return map;
  }, [correlations]);

  // Filter valid rows, map to x/y coordinates, then sample for rendering.
  const scatterData = useMemo(() => {
    if (!selectedPair) return [];
    const points = rawData
      .filter(
        (row) =>
          row[selectedPair.colA] !== null &&
          row[selectedPair.colA] !== undefined &&
          row[selectedPair.colA] !== "" &&
          row[selectedPair.colB] !== null &&
          row[selectedPair.colB] !== undefined &&
          row[selectedPair.colB] !== "",
      )
      .map((row) => ({
        x: Number(row[selectedPair.colA]),
        y: Number(row[selectedPair.colB]),
      }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    return uniformSample(points, MAX_SCATTER_POINTS);
  }, [selectedPair, rawData]);

  // Actual number of valid points before sampling, shown in the footer.
  const totalPointCount = useMemo(() => {
    if (!selectedPair) return 0;
    return rawData.filter(
      (row) =>
        row[selectedPair.colA] !== null &&
        row[selectedPair.colA] !== undefined &&
        row[selectedPair.colA] !== "" &&
        row[selectedPair.colB] !== null &&
        row[selectedPair.colB] !== undefined &&
        row[selectedPair.colB] !== "" &&
        !isNaN(Number(row[selectedPair.colA])) &&
        !isNaN(Number(row[selectedPair.colB])),
    ).length;
  }, [selectedPair, rawData]);

  if (numericCols.length < 2) {
    return (
      <div className="card-surface text-center py-12">
        <BarChart3 className="w-8 h-8 text-sage-40 mx-auto mb-4" />
        <p className="text-body text-sage-40">
          At least 2 numeric columns are required to compute correlations.
        </p>
      </div>
    );
  }

  const getCoefficient = (a: string, b: string): number | null => {
    if (a === b) return 1;
    return corrMap.get(`${a}::${b}`) ?? null;
  };

  return (
    <div className="space-y-6">
      <div className="card-surface overflow-x-auto">
        <div className="min-w-max">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="p-2" />
                {numericCols.map((col) => (
                  <th
                    key={col}
                    className="p-2 text-caption text-sage-40 font-medium uppercase tracking-wider max-w-[120px] truncate"
                    title={col}
                  >
                    {col.length > 12 ? `${col.slice(0, 12)}...` : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numericCols.map((rowCol) => (
                <tr key={rowCol}>
                  <td
                    className="p-2 text-caption text-sage-40 font-medium uppercase tracking-wider max-w-[120px] truncate"
                    title={rowCol}
                  >
                    {rowCol.length > 12 ? `${rowCol.slice(0, 12)}...` : rowCol}
                  </td>
                  {numericCols.map((colCol) => {
                    const coeff = getCoefficient(rowCol, colCol);
                    const isHovered =
                      hoveredPair &&
                      ((hoveredPair.colA === rowCol &&
                        hoveredPair.colB === colCol) ||
                        (hoveredPair.colA === colCol &&
                          hoveredPair.colB === rowCol));

                    return (
                      <td
                        key={colCol}
                        className="p-1"
                        onMouseEnter={() => {
                          if (rowCol !== colCol && coeff !== null) {
                            setHoveredPair({
                              colA: rowCol,
                              colB: colCol,
                              coefficient: coeff,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredPair(null)}
                        onClick={() => {
                          if (rowCol !== colCol && coeff !== null) {
                            setSelectedPair({
                              colA: rowCol,
                              colB: colCol,
                              coefficient: coeff,
                            });
                          }
                        }}
                      >
                        <div
                          className={`w-12 h-12 rounded flex items-center justify-center text-caption transition-all duration-300 ease-out cursor-pointer ${
                            isHovered ? "ring-1 ring-lime-pulse" : ""
                          }`}
                          style={{
                            backgroundColor:
                              rowCol === colCol
                                ? "rgba(127, 238, 100, 0.2)"
                                : coeff !== null
                                  ? getDivergingColor(coeff)
                                  : "rgba(72, 83, 70, 0.1)",
                            color:
                              coeff !== null && Math.abs(coeff) > 0.5
                                ? "#181818"
                                : "#8cab87",
                          }}
                          title={
                            rowCol === colCol
                              ? `${rowCol} x ${rowCol}: 1.00`
                              : coeff !== null
                                ? `${rowCol} x ${colCol}: ${coeff.toFixed(2)}`
                                : "No data"
                          }
                        >
                          {rowCol === colCol
                            ? "1.00"
                            : coeff !== null
                              ? coeff.toFixed(2)
                              : "-"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="card-surface p-4 overflow-hidden"
        aria-live="polite"
        style={{ minHeight: 86 }}
      >
        {hoveredPair ? (
          <>
            <p className="text-body-sm text-sage-60">
              <span className="text-phosphor-white font-medium">
                {hoveredPair.colA}
              </span>{" "}
              x{" "}
              <span className="text-phosphor-white font-medium">
                {hoveredPair.colB}
              </span>
              :{" "}
              <span className="text-lime-pulse font-medium">
                r = {hoveredPair.coefficient.toFixed(4)}
              </span>
            </p>
            <p className="text-caption text-sage-40 mt-1">
              {Math.abs(hoveredPair.coefficient) >= 0.7
                ? "Strong correlation"
                : Math.abs(hoveredPair.coefficient) >= 0.4
                  ? "Moderate correlation"
                  : Math.abs(hoveredPair.coefficient) >= 0.2
                    ? "Weak correlation"
                    : "Negligible correlation"}
              {" · "}Click to view scatter plot
            </p>
          </>
        ) : (
          <p className="text-body-sm text-sage-40">
            Hover over a cell to inspect a correlation pair.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-caption text-sage-40">
        <span className="text-purple-400">-1.0</span>
        <div className="flex gap-0.5">
          {[-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getDivergingColor(v) }}
            />
          ))}
        </div>
        <span className="text-lime-pulse">+1.0</span>
      </div>

      {/* Scatter Plot Modal */}
      {selectedPair && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedPair(null)}
          />
          <div className="relative w-full max-w-2xl bg-carbon-veil border border-circuit-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-goga text-heading-sm text-phosphor-white">
                  {selectedPair.colA} x {selectedPair.colB}
                </h3>
                <p className="text-body-sm text-sage-60 mt-1">
                  Correlation:{" "}
                  <span className="text-lime-pulse font-medium">
                    r = {selectedPair.coefficient.toFixed(4)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPair(null)}
                className="p-2 rounded-lg text-sage-40 hover:text-phosphor-white transition-colors duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid stroke="#485346" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={selectedPair.colA}
                    tick={{ fill: "#677d64", fontSize: 11 }}
                    stroke="#485346"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={selectedPair.colB}
                    tick={{ fill: "#677d64", fontSize: 11 }}
                    stroke="#485346"
                  />
                  <ZAxis range={[50, 50]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#212525",
                      border: "1px solid #485346",
                      borderRadius: "8px",
                      color: "#ddffdc",
                    }}
                    labelStyle={{ color: "#ddffdc" }}
                  />
                  <Scatter
                    data={scatterData}
                    fill="#7fee64"
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-caption text-sage-40 mt-3 text-center">
              {totalPointCount.toLocaleString()} data points
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
