// Quick Clean panel: one-click cleaning options with before/after preview.
// Applies imputation, dedup, type casting, and whitespace cleanup.

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Sparkles,
  Trash2,
  Columns3,
  Wand2,
  Scissors,
  Type,
  Braces,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type {
  CleanOptions,
  CleanResult,
  ColumnProfile,
} from "../types/profiler";
import { cleanData, downloadCSV } from "../utils/cleaner";

interface QuickCleanSectionProps {
  data: Record<string, string | number | boolean | null>[];
  columns: ColumnProfile[];
  filename: string;
}

const DEFAULT_OPTIONS: CleanOptions = {
  imputeMissing: true,
  imputeStrategy: "mean",
  dropDuplicates: true,
  removeConstantColumns: true,
  trimWhitespace: false,
  castColumnTypes: false,
  stripSpecialCharacters: false,
};

const CLEAN_OPTIONS_META: {
  key: keyof CleanOptions;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "dropDuplicates",
    label: "Remove Duplicate Rows",
    description: "Drop rows with identical values across all columns",
    icon: <Trash2 className="w-5 h-5 text-moss-70" />,
  },
  {
    key: "imputeMissing",
    label: "Fill Missing Values",
    description: "Impute null cells with computed values",
    icon: <Wand2 className="w-5 h-5 text-moss-70" />,
  },
  {
    key: "trimWhitespace",
    label: "Trim Whitespace",
    description: "Strip leading and trailing spaces from string values",
    icon: <Scissors className="w-5 h-5 text-moss-70" />,
  },
  {
    key: "castColumnTypes",
    label: "Cast Column Types",
    description: "Coerce values to their detected schema type",
    icon: <Type className="w-5 h-5 text-moss-70" />,
  },
  {
    key: "stripSpecialCharacters",
    label: "Strip Special Characters",
    description: "Remove control and non-printable characters from text",
    icon: <Braces className="w-5 h-5 text-moss-70" />,
  },
  {
    key: "removeConstantColumns",
    label: "Remove Constant Columns",
    description: "Drop columns with a single repeated value",
    icon: <Columns3 className="w-5 h-5 text-moss-70" />,
  },
];

export default function QuickCleanSection({
  data,
  columns,
  filename,
}: QuickCleanSectionProps) {
  // Local UI state for accordion, options, and preview tab.
  const [isExpanded, setIsExpanded] = useState(false);
  const [options, setOptions] = useState<CleanOptions>(DEFAULT_OPTIONS);
  const [previewTab, setPreviewTab] = useState<"before" | "after">("before");
  const [result, setResult] = useState<CleanResult | null>(null);

  const columnNames = useMemo(() => columns.map((c) => c.name), [columns]);

  // Estimate duplicates, constant columns, and missing cells for the summary.
  const duplicateEstimate = useMemo(
    () => data.length - new Set(data.map((r) => JSON.stringify(r))).size,
    [data],
  );

  const constantCols = useMemo(
    () => columns.filter((c) => c.stats.isConstant),
    [columns],
  );

  const missingCellCount = useMemo(
    () => columns.reduce((sum, c) => sum + c.stats.nullCount, 0),
    [columns],
  );

  const previewRows = useMemo(() => {
    const rows = result ? result.data : data;
    return rows.slice(0, 8);
  }, [data, result]);

  const beforeRows = useMemo(() => data.slice(0, 8), [data]);

  const activeOptionCount = useMemo(() => {
    return Object.entries(options).filter(
      ([key, value]) => key !== "imputeStrategy" && value === true,
    ).length;
  }, [options]);

  // Toggle a single cleaning option.
  const handleToggle = (key: keyof CleanOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Run the cleaning pipeline and switch to the after preview.
  const handleApply = () => {
    const cleanResult = cleanData(data, columns, options);
    setResult(cleanResult);
    setPreviewTab("after");
  };

  // Download the cleaned dataset as CSV.
  const handleDownload = () => {
    if (!result) return;
    const baseName = filename.replace(/\.(csv|json)$/i, "");
    downloadCSV(result.data, `${baseName}_cleaned.csv`);
  };

  const isDirty = activeOptionCount > 0;

  return (
    <div className="card-surface overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-white/[0.02] transition-colors duration-300"
        aria-expanded={isExpanded}
        aria-controls="quick-clean-panel"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-lime-pulse/10 border border-lime-pulse/30 flex items-center justify-center flex-shrink-0">
            <Sparkles size={32} className="text-lime-pulse" />
          </div>
          <div>
            <h3 className="font-goga text-heading-sm text-phosphor-white">
              Quick Clean
            </h3>
            <p className="text-caption text-sage-40 mt-0.5">
              {isDirty
                ? `${activeOptionCount} cleaning option${activeOptionCount !== 1 ? "s" : ""} selected · Live preview below`
                : "Sanitize your dataset with one-click cleaning actions"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className="hidden sm:inline-flex items-center gap-1.5 tag tag-active">
              <CheckCircle2 className="w-4 h-4" />
              {result.data.length.toLocaleString()} rows
            </span>
          )}
          <ChevronDown
            className={`w-6 h-6 text-sage-40 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expandable Panel */}
      {isExpanded && (
        <div
          id="quick-clean-panel"
          className="border-t border-phosphor-blue-black p-6 space-y-6"
        >
          {/* Cleaning Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLEAN_OPTIONS_META.map((meta) => {
              const isEnabled = options[meta.key] === true;
              const isImpute = meta.key === "imputeMissing";
              return (
                <div
                  key={meta.key}
                  className={`rounded-lg border p-4 transition-all duration-300 ${
                    isEnabled
                      ? "border-lime-pulse/40 bg-lime-pulse/[0.04]"
                      : "border-circuit-border bg-transparent hover:border-sage-40/50"
                  }`}
                >
                  <label className="flex items-start justify-between gap-3 cursor-pointer">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 transition-colors duration-300 ${
                          isEnabled ? "text-lime-pulse" : "text-moss-70"
                        }`}
                      >
                        {meta.icon}
                      </span>
                      <div>
                        <p className="text-body-sm text-phosphor-white font-medium">
                          {meta.label}
                        </p>
                        <p className="text-caption text-sage-40 mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggle(meta.key)}
                      className="w-4 h-4 accent-lime-pulse mt-1 flex-shrink-0"
                      aria-label={meta.label}
                    />
                  </label>

                  {isImpute && isEnabled && (
                    <div className="mt-3 flex gap-2">
                      {(["mean", "median", "mode"] as const).map((strategy) => (
                        <button
                          key={strategy}
                          onClick={() =>
                            setOptions({ ...options, imputeStrategy: strategy })
                          }
                          className={`tag transition-colors duration-300 ${
                            options.imputeStrategy === strategy
                              ? "tag-active"
                              : "tag-neutral"
                          }`}
                        >
                          {strategy}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-carbon-veil p-4">
              <p className="text-caption text-sage-40 uppercase tracking-wider">
                Duplicates
              </p>
              <p className="font-goga text-heading-sm text-phosphor-white mt-1">
                {duplicateEstimate.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-carbon-veil p-4">
              <p className="text-caption text-sage-40 uppercase tracking-wider">
                Missing Cells
              </p>
              <p className="font-goga text-heading-sm text-phosphor-white mt-1">
                {missingCellCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-carbon-veil p-4">
              <p className="text-caption text-sage-40 uppercase tracking-wider">
                Constant Columns
              </p>
              <p className="font-goga text-heading-sm text-phosphor-white mt-1">
                {constantCols.length}
              </p>
            </div>
            <div className="rounded-lg bg-carbon-veil p-4">
              <p className="text-caption text-sage-40 uppercase tracking-wider">
                Total Rows
              </p>
              <p className="font-goga text-heading-sm text-phosphor-white mt-1">
                {data.length.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Before / After Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTab("before")}
                  className={`tag transition-colors duration-300 ${
                    previewTab === "before" ? "tag-active" : "tag-neutral"
                  }`}
                >
                  Before Cleaning
                </button>
                <button
                  onClick={() => setPreviewTab("after")}
                  className={`tag transition-colors duration-300 ${
                    previewTab === "after" ? "tag-active" : "tag-neutral"
                  }`}
                >
                  After Cleaning
                </button>
              </div>
              {previewTab === "after" && result && (
                <span className="text-caption text-sage-40">
                  {result.removedRows.toLocaleString()} rows removed ·{" "}
                  {result.imputedCells.toLocaleString()} cells imputed
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-circuit-border">
              <div className="min-w-max">
                <table className="border-collapse w-full">
                  <thead>
                    <tr className="bg-carbon-veil">
                      <th className="px-4 py-2.5 text-caption text-sage-40 font-medium uppercase tracking-wider text-left w-12">
                        #
                      </th>
                      {columnNames.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2.5 text-caption text-sage-40 font-medium uppercase tracking-wider text-left"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(previewTab === "before" ? beforeRows : previewRows).map(
                      (row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={`border-t border-phosphor-blue-black/50 ${
                            rowIdx % 2 === 0 ? "bg-white/[0.02]" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-caption text-sage-40">
                            {rowIdx + 1}
                          </td>
                          {columnNames.map((col) => {
                            const value = row[col];
                            const isMissing =
                              value === null ||
                              value === undefined ||
                              value === "";
                            const isChanged =
                              previewTab === "after" &&
                              result &&
                              beforeRows[rowIdx] &&
                              beforeRows[rowIdx][col] !== value;
                            return (
                              <td
                                key={col}
                                className={`px-4 py-2 text-body-sm max-w-[200px] truncate ${
                                  isMissing
                                    ? "text-red-400"
                                    : isChanged
                                      ? "text-lime-pulse"
                                      : "text-sage-60"
                                }`}
                              >
                                {isMissing ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[11px] font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    N/A
                                  </span>
                                ) : isChanged ? (
                                  <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    {String(value)}
                                  </span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleApply} className="btn-accent-pill">
              Apply Cleaning
            </button>
            {result && (
              <button onClick={handleDownload} className="btn-ghost">
                <span className="inline-flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download Cleaned CSV
                </span>
              </button>
            )}
            {result && (
              <span className="text-caption text-sage-40">
                {result.removedColumns.length > 0 && (
                  <>
                    Removed columns:{" "}
                    {result.removedColumns.map((col) => (
                      <span key={col} className="tag tag-neutral ml-1">
                        {col}
                      </span>
                    ))}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
