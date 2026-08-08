// Main app shell: file upload, worker orchestration, tab routing.
// Owns the profiling state and passes data down to feature panels.

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText } from "lucide-react";
import Navbar from "./components/Navbar";
import FileDropZone from "./components/FileDropZone";
import HealthSummaryBar from "./components/HealthSummaryBar";
import TabNavigation, { type TabId } from "./components/TabNavigation";
import ColumnExplorer from "./components/ColumnExplorer";
import CorrelationMatrix from "./components/CorrelationMatrix";
import OverviewTab from "./components/OverviewTab";
import DataGrid from "./components/DataGrid";
import ShapeGrid from "./components/ShapeGrid";
import QuickCleanSection from "./components/QuickCleanSection";
import DeltaLogo from "./components/DeltaLogo";
import type {
  ProfileResult,
  WorkerProgress,
  WorkerRequest,
  WorkerResponse,
} from "./types/profiler";
import { downloadCSV } from "./utils/cleaner";

export default function App() {
  // Core app state: profiling result, processing status, active tab.
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Worker lifecycle refs for cancel and cleanup.
  const workerRef = useRef<Worker | null>(null);
  const startTimeRef = useRef<number>(0);
  const pendingTimeoutRef = useRef<number | null>(null);
  const MIN_PROCESSING_MS = 2000;

  const clearPendingTimeout = useCallback(() => {
    if (pendingTimeoutRef.current !== null) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimeout();
      if (workerRef.current) {
        workerRef.current.onerror = null;
        workerRef.current.terminate();
      }
    };
  }, [clearPendingTimeout]);

  // Kick off a new profiling run in a background worker.
  const handleFileSelected = useCallback(
    (file: File) => {
      clearPendingTimeout();
      setError(null);
      setResult(null);
      setIsProcessing(true);
      setProgress({ phase: "parsing", percent: 0, message: "Starting..." });
      startTimeRef.current = Date.now();

      if (workerRef.current) {
        workerRef.current.onerror = null;
        workerRef.current.terminate();
      }

      const worker = new Worker(
        new URL("./workers/statsWorker.ts", import.meta.url),
        {
          type: "module",
        },
      );

      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (workerRef.current !== worker) return;
        const response = e.data;
        if (response.type === "progress") {
          setProgress(response.progress);
          if (response.progress.phase === "done") {
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, MIN_PROCESSING_MS - elapsed);
            clearPendingTimeout();
            pendingTimeoutRef.current = window.setTimeout(
              () => setIsProcessing(false),
              remaining,
            );
          }
        } else if (response.type === "result") {
          const elapsed = Date.now() - startTimeRef.current;
          const remaining = Math.max(0, MIN_PROCESSING_MS - elapsed);
          clearPendingTimeout();
          pendingTimeoutRef.current = window.setTimeout(() => {
            pendingTimeoutRef.current = null;
            setResult(response.result);
            setIsProcessing(false);
            setActiveTab("overview");
          }, remaining);
        } else if (response.type === "error") {
          setError(response.message);
          setIsProcessing(false);
        }
      };

      worker.onerror = (e) => {
        if (workerRef.current === worker) {
          setError(e.message || "Worker error occurred");
          setIsProcessing(false);
        }
      };

      const request: WorkerRequest = { type: "process", file };
      worker.postMessage(request);
    },
    [clearPendingTimeout],
  );

  // Stop the active worker and reset processing state.
  const handleCancel = useCallback(() => {
    clearPendingTimeout();
    if (workerRef.current) {
      workerRef.current.onerror = null;
      const request: WorkerRequest = { type: "cancel" };
      workerRef.current.postMessage(request);
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsProcessing(false);
    setProgress(null);
  }, [clearPendingTimeout]);

  // Clear everything and return to the landing screen.
  const handleReset = useCallback(() => {
    handleCancel();
    setResult(null);
    setError(null);
    setActiveTab("overview");
  }, [handleCancel]);

  // Export the raw dataset as a CSV file.
  const handleExportCSV = useCallback(() => {
    if (!result) return;
    const baseName = result.metadata.filename.replace(/\.(csv|json)$/i, "");
    downloadCSV(result.rawData, `${baseName}_export.csv`);
  }, [result]);

  // Export the raw dataset as a JSON file.
  const handleExportJSON = useCallback(() => {
    if (!result) return;
    const baseName = result.metadata.filename.replace(/\.(csv|json)$/i, "");
    const blob = new Blob([JSON.stringify(result.rawData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [result]);

  const alertCount = result?.health.alerts.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-void-black text-sage-60">
      <Navbar
        metadata={result?.metadata ?? null}
        health={result?.health ?? null}
      />

      <main className="flex-1 flex flex-col mx-auto max-w-page px-6 py-8 space-y-8">
        {!result && !isProcessing && (
          <section className="relative overflow-hidden rounded-2xl border border-circuit-border bg-ground-iron min-h-[70vh] flex items-center">
            <ShapeGrid
              direction="diagonal"
              speed={0.5}
              borderColor="#0e5019"
              squareSize={40}
              hoverFillColor="#222"
              shape="square"
              hoverTrailAmount={3}
            />
            <div className="relative z-10 w-full py-20 px-6">
              <div className="text-center mb-12">
                {/* Hero Brand Icon - Large anchor */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-lime-pulse/20 blur-3xl scale-150" />
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-carbon-veil border border-lime-pulse/30 flex items-center justify-center shadow-[0_0_60px_rgba(0,200,83,0.15)] transition-transform duration-500 hover:scale-105">
                      <DeltaLogo className="w-20 h-20 md:w-28 md:h-28" />
                    </div>
                  </div>
                </div>

                <p className="eyebrow mb-3 text-lime-pulse">
                  DeltaLab - Data Health Inspector
                </p>
                <h1 className="font-goga text-heading-lg md:text-display text-phosphor-white">
                  <span className="text-lime-pulse">Inspect</span> your data
                  health instantly
                </h1>
                <p className="text-subheading text-moss-80 max-w-2xl mx-auto mt-4">
                  Data health checks, automated schema inspection, and instant
                  data cleaning (all in your browser).
                </p>
              </div>
              <FileDropZone
                onFileSelected={handleFileSelected}
                isProcessing={isProcessing}
                progress={progress}
                onCancel={handleCancel}
              />
              {error && (
                <div className="mt-6 max-w-2xl mx-auto p-4 rounded-lg bg-charcoal-rust border border-phosphor-white/20">
                  <p className="text-body-sm text-phosphor-white">{error}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {isProcessing && (
          <section className="py-16">
            <FileDropZone
              onFileSelected={handleFileSelected}
              isProcessing={isProcessing}
              progress={progress}
              onCancel={handleCancel}
            />
          </section>
        )}

        {result && !isProcessing && (
          <>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Profile Report</p>
                <h2 className="font-goga text-heading text-phosphor-white">
                  {result.metadata.filename}
                </h2>
                <p className="text-body-sm text-sage-40 mt-1">
                  {(result.metadata.fileSize / 1024).toFixed(1)} KB ·{" "}
                  {result.metadata.totalRows.toLocaleString()} rows ·{" "}
                  {result.metadata.totalColumns} columns
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleExportCSV} className="btn-ghost">
                  <span className="inline-flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Cleaned Data (CSV)
                  </span>
                </button>
                <button onClick={handleExportJSON} className="btn-ghost">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    JSON
                  </span>
                </button>
                <button onClick={handleReset} className="btn-ghost">
                  New File
                </button>
              </div>
            </div>

            <HealthSummaryBar
              health={result.health}
              metadata={result.metadata}
            />

            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              alertCount={alertCount}
            />

            <div className="pt-6">
              {activeTab === "overview" && (
                <OverviewTab health={result.health} columns={result.columns} />
              )}
              {activeTab === "explorer" && (
                <ColumnExplorer columns={result.columns} />
              )}
              {activeTab === "correlations" && (
                <CorrelationMatrix
                  correlations={result.correlations}
                  columns={result.columns}
                  rawData={result.rawData}
                />
              )}
              {activeTab === "grid" && (
                <DataGrid data={result.rawData} columns={result.columns} />
              )}
              {activeTab === "clean" && (
                <QuickCleanSection
                  data={result.rawData}
                  columns={result.columns}
                  filename={result.metadata.filename}
                />
              )}
            </div>
          </>
        )}

        <footer className="mt-auto pt-8 text-center text-xs text-sage-40">
          © 2026 DeltaLab. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
