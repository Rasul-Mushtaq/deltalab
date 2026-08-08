// Tab bar for switching between the main report views.
// Exposes the TabId union used across the app for active tab state.

import { BarChart3, Grid3X3, Activity, Sparkles, Table2 } from "lucide-react";

export type TabId = "overview" | "explorer" | "correlations" | "grid" | "clean";

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alertCount: number;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "Overview & Alerts",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <Activity size={18} className="shrink-0" />
      </div>
    ),
  },
  {
    id: "explorer",
    label: "Column Explorer",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <Grid3X3 size={18} className="shrink-0" />
      </div>
    ),
  },
  {
    id: "correlations",
    label: "Correlations",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <BarChart3 size={18} className="shrink-0" />
      </div>
    ),
  },
  {
    id: "grid",
    label: "Data Grid",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <Table2 size={18} className="shrink-0" />
      </div>
    ),
  },
  {
    id: "clean",
    label: "Quick Clean",
    icon: (
      <div className="flex items-center justify-center shrink-0">
        <Sparkles size={18} className="shrink-0" />
      </div>
    ),
  },
];

export default function TabNavigation({
  activeTab,
  onTabChange,
  alertCount,
}: TabNavigationProps) {
  return (
    <nav className="flex gap-1 border-b border-phosphor-blue-black overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-body-sm font-medium transition-all duration-300 ease-out whitespace-nowrap ${
              isActive
                ? "text-phosphor-white"
                : "text-sage-40 hover:text-sage-60"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "overview" && alertCount > 0 && (
              <span className="tag tag-active px-1.5 py-0.5 text-[10px] leading-none">
                {alertCount}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
