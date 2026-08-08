// Sortable, searchable data table with pagination for raw dataset rows.
// Handles search, row sorting, and cell-level type formatting.

import { useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash,
  Tag,
  Calendar,
  ToggleLeft,
  Type,
} from "lucide-react";
import type { ColumnProfile } from "../types/profiler";

interface DataGridProps {
  data: Record<string, string | number | boolean | null>[];
  columns: ColumnProfile[];
}

type SortDirection = "asc" | "desc" | null;

const typeIcons: Record<string, React.ReactNode> = {
  numeric: <Hash className="w-[19px] h-[19px]" />,
  categorical: <Tag className="w-[19px] h-[19px]" />,
  datetime: <Calendar className="w-[19px] h-[19px]" />,
  boolean: <ToggleLeft className="w-[19px] h-[19px]" />,
  text: <Type className="w-[19px] h-[19px]" />,
};

const typeLabels: Record<string, string> = {
  numeric: "Numeric",
  categorical: "String / Text",
  datetime: "Date / Time",
  boolean: "Boolean",
  text: "Text",
};

const typeColors: Record<string, string> = {
  numeric: "text-lime-pulse",
  categorical: "text-moss-80",
  datetime: "text-moss-70",
  boolean: "text-fern-link",
  text: "text-sage-60",
};

export default function DataGrid({ data, columns }: DataGridProps) {
  // Local state for search, pagination, and sort column/direction.
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const columnNames = useMemo(() => columns.map((c) => c.name), [columns]);
  const typeMap = useMemo(
    () => new Map(columns.map((c) => [c.name, c.stats.type])),
    [columns],
  );

  // Apply search filter and optional column sorting.
  const filteredData = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((v) =>
          v !== null && v !== undefined
            ? String(v).toLowerCase().includes(q)
            : false,
        ),
      );
    }
    if (sortCol && sortDir) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortCol];
        const vb = b[sortCol];
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filteredData.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  // Cycle sort direction: asc, desc, then clear.
  const handleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortCol(null);
      setSortDir(null);
    }
    setPage(0);
  };

  // Render cell values with a badge for missing data.
  const formatCell = (value: string | number | boolean | null) => {
    if (value === null || value === undefined || value === "") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[11px] font-medium">
          N/A
        </span>
      );
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search rows..."
            className="input-field w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-caption text-sage-40 uppercase tracking-wider">
            Rows per page:
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="input-field"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface p-0 overflow-hidden hover:border-lime-pulse/40 hover:shadow-[0_0_24px_rgba(127,238,100,0.08)] transition-all duration-300 ease-out">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <table className="border-collapse w-full">
              <thead>
                <tr className="bg-carbon-veil">
                  <th className="sticky top-0 z-10 bg-carbon-veil px-4 py-3 text-caption text-sage-40 font-medium uppercase tracking-wider text-left w-16">
                    #
                  </th>
                  {columnNames.map((col) => {
                    const type = typeMap.get(col) || "text";
                    const isSorted = sortCol === col;
                    return (
                      <th
                        key={col}
                        className="sticky top-0 z-10 bg-carbon-veil px-4 py-3 text-left group/th"
                      >
                        <button
                          onClick={() => handleSort(col)}
                          className="flex items-center gap-2.5 text-caption text-sage-40 font-medium uppercase tracking-wider hover:text-phosphor-white transition-colors duration-300"
                        >
                          <span
                            className={`${typeColors[type]} inline-flex items-center justify-center transition-transform duration-300 group-hover/th:scale-110`}
                            title={`${typeLabels[type]} column type`}
                            aria-label={`${typeLabels[type]} column type`}
                          >
                            {typeIcons[type]}
                          </span>
                          <span className="max-w-[160px] truncate">{col}</span>
                          {isSorted ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-4 h-4 text-lime-pulse" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-lime-pulse" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-40" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, rowIdx) => {
                  const globalIdx = safePage * pageSize + rowIdx;
                  return (
                    <tr
                      key={globalIdx}
                      className={`border-t border-phosphor-blue-black/50 transition-all duration-200 group/row ${
                        rowIdx % 2 === 0 ? "bg-white/[0.02]" : ""
                      } hover:bg-lime-pulse/[0.07] hover:shadow-[inset_0_0_0_1px_rgba(127,238,100,0.15)]`}
                    >
                      <td className="px-4 py-2 text-caption text-sage-40 group-hover/row:text-lime-pulse/80 transition-colors duration-200">
                        {globalIdx + 1}
                      </td>
                      {columnNames.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2 text-body-sm text-sage-60 max-w-[240px] truncate group-hover/row:text-sage-60/90 transition-colors duration-200"
                          title={
                            row[col] !== null && row[col] !== undefined
                              ? String(row[col])
                              : "N/A"
                          }
                        >
                          <span className="transition-opacity duration-200 group-hover/row:opacity-90">
                            {formatCell(row[col] ?? null)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {pageData.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnNames.length + 1}
                      className="px-4 py-12 text-center text-body text-sage-40"
                    >
                      No rows match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-caption text-sage-40">
          Showing {filteredData.length === 0 ? 0 : safePage * pageSize + 1}–
          {Math.min((safePage + 1) * pageSize, filteredData.length)} of{" "}
          {filteredData.length.toLocaleString()} rows
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="p-2 rounded-lg border border-circuit-border text-sage-60 hover:text-phosphor-white hover:border-sage-40 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-body-sm text-sage-60">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-2 rounded-lg border border-circuit-border text-sage-60 hover:text-phosphor-white hover:border-sage-40 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
