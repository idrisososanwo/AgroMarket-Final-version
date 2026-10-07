import * as React from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  variant = "underline",
  className = "",
}: TabsProps) {
  if (variant === "pills") {
    return (
      <div
        className={`flex space-x-1.5 p-1 bg-[#FBF9F4] border border-[#E5E0D5] rounded-lg overflow-x-auto ${className}`}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white text-[#0F4327] shadow-xs"
                  : "text-neutral-600 hover:text-[#0F4327] hover:bg-white/60"
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? "bg-[#DCFCE7] text-[#0F4327]"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline variant
  return (
    <div
      className={`border-b border-[#E5E0D5] flex space-x-6 overflow-x-auto ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? "border-[#0F4327] text-[#0F4327]"
                : "border-transparent text-neutral-500 hover:text-[#1A231E] hover:border-neutral-300"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-neutral-100 text-neutral-600">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
