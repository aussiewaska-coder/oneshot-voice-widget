"use client";

import { useState, useEffect, useRef } from "react";
import { haptics } from "@/app/utils/haptics";

export interface Tab {
  id: string;
  label: string;
  badge?: number; // Badge count (e.g., unread messages, error count)
  icon?: React.ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Horizontal tab navigation with smooth indicator animation.
 * - 48px height (touch-friendly)
 * - Sliding underline indicator
 * - Optional badge indicators
 * - Haptic feedback on tab switch
 */
export function TabBar({ tabs, activeTab, onTabChange, className = "" }: TabBarProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const tabRefsMap = useRef<Record<string, HTMLButtonElement | null>>({});

  // Update indicator position when activeTab changes
  useEffect(() => {
    const activeButton = tabRefsMap.current[activeTab];
    if (activeButton) {
      const parent = activeButton.parentElement;
      if (parent) {
        const offsetLeft = activeButton.offsetLeft;
        const width = activeButton.offsetWidth;
        setIndicatorStyle({ left: offsetLeft, width });
      }
    }
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    if (tabId !== activeTab) {
      haptics.light(); // Light tap for tab switch
      onTabChange(tabId);
    }
  };

  return (
    <div className={`relative flex items-center border-b border-white/8 ${className}`}>
      {/* Tab buttons */}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefsMap.current[tab.id] = el;
          }}
          onClick={() => handleTabClick(tab.id)}
          className={`flex-1 h-12 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-200 relative min-h-12 min-w-12 ${
            activeTab === tab.id ? "text-cyan-400" : "text-white/60 hover:text-white/80"
          }`}
          aria-selected={activeTab === tab.id}
          role="tab"
          title={tab.label}
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span className="truncate">{tab.label}</span>

          {/* Badge indicator */}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="absolute top-2 right-2 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500/40 text-red-200 text-xs font-bold">
              {tab.badge}
            </span>
          )}
        </button>
      ))}

      {/* Sliding indicator - positioned absolutely */}
      {indicatorStyle && (
        <div
          className="absolute bottom-0 h-0.5 bg-cyan-400 transition-all duration-300 ease-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      )}
    </div>
  );
}
