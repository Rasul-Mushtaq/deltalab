// Sticky top navigation bar with dataset metadata and health score.
// Shows filename, row count, critical alerts, and the GitHub link.

import { FileText, Database, AlertTriangle, Github } from "lucide-react";
import type { FileMetadata, HealthReport } from "../types/profiler";
import DeltaLogo from "./DeltaLogo";

interface NavbarProps {
  metadata: FileMetadata | null;
  health: HealthReport | null;
}

export default function Navbar({ metadata, health }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full px-6 pt-4">
      <div className="mx-auto max-w-page rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-lg px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="#"
            className="flex items-center gap-3 group flex-shrink-0"
            aria-label="DeltaLab - Data Health Inspector"
          >
            <span className="w-10 h-10 rounded-lg bg-lime-pulse/10 border border-lime-pulse/30 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-lime-pulse/20 group-hover:scale-105">
              <DeltaLogo className="w-7 h-7" />
            </span>
            <span className="font-goga text-xl font-medium text-phosphor-white tracking-tight whitespace-nowrap hidden sm:inline">
              <span className="text-lime-pulse">Delta</span>Lab
              <span className="text-sage-40 font-normal text-sm ml-2 hidden lg:inline">
                For Instant Analysis
              </span>
            </span>
          </a>
        </div>

        <div className="flex items-center gap-4 min-w-0">
          {metadata && health ? (
            <div className="hidden md:flex items-center gap-6 min-w-0">
              <div className="flex items-center gap-2 text-body-sm text-sage-60 min-w-0">
                <div className="flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-moss-70 shrink-0" />
                </div>
                <span className="max-w-[180px] truncate">
                  {metadata.filename}
                </span>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-sage-60 whitespace-nowrap">
                <div className="flex items-center justify-center shrink-0">
                  <Database size={18} className="text-moss-70 shrink-0" />
                </div>
                <span>{metadata.totalRows.toLocaleString()} rows</span>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-sage-60 whitespace-nowrap">
                <div className="flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-moss-70 shrink-0" />
                </div>
                <span>
                  {
                    health.alerts.filter((a) => a.severity === "critical")
                      .length
                  }{" "}
                  critical
                </span>
              </div>
              <div className="tag tag-active whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-ground-iron" />
                Score: {health.score}
              </div>
            </div>
          ) : null}

          <a
            href="https://github.com/Rasul-Mushtaq/deltalab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2 text-body-sm font-medium text-phosphor-white transition-all duration-300 hover:border-lime-pulse/40 hover:bg-lime-pulse/10 hover:text-lime-pulse flex-shrink-0"
          >
            <div className="flex items-center justify-center shrink-0">
              <Github size={18} className="shrink-0" />
            </div>
            <span className="hidden sm:inline">GitHub Repository</span>
          </a>
        </div>
      </div>
    </header>
  );
}
