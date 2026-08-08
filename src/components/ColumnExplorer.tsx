// Column explorer view: search, type filter, and per-column detail cards.
// Renders a grid of ColumnCard components for the selected dataset.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ColumnProfile } from "../types/profiler";
import ColumnCard from "./ColumnCard";

interface ColumnExplorerProps {
  columns: ColumnProfile[];
}

export default function ColumnExplorer({ columns }: ColumnExplorerProps) {
  // Local filter state for search text and column type.
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Apply search and type filters to the column list.
  const filteredColumns = useMemo(() => {
    return columns.filter((col) => {
      const matchesSearch = col.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || col.stats.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [columns, search, typeFilter]);

  // Count columns per type for the filter buttons.
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const col of columns) {
      counts[col.stats.type] = (counts[col.stats.type] || 0) + 1;
    }
    return counts;
  }, [columns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            className="input-field w-full pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`tag transition-colors duration-300 ${
              typeFilter === "all" ? "tag-active" : "tag-neutral"
            }`}
          >
            All ({columns.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`tag transition-colors duration-300 ${
                typeFilter === type ? "tag-active" : "tag-neutral"
              }`}
            >
              {type} ({count})
            </button>
          ))}
        </div>
      </div>

      {filteredColumns.length === 0 ? (
        <div className="card-surface text-center py-12">
          <p className="text-body text-sage-40">
            No columns match your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredColumns.map((col) => (
            <ColumnCard key={col.name} column={col} />
          ))}
        </div>
      )}
    </div>
  );
}
