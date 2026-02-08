"use client";

import { useEffect, useRef } from "react";
import { LogEntry } from "./HackerLog";

interface LogContentProps {
  logs: LogEntry[];
  fontSize: number; // 0.8 to 1.4 (80% to 140%)
  onFontSizeChange: (multiplier: number) => void;
  compact?: boolean; // true for mobile, false for desktop
}

/**
 * Shared log content component used by both desktop HackerLog and mobile MobileBottomSheet.
 * Displays debug logs with font size controls.
 */
export function LogContent({
  logs,
  fontSize,
  onFontSizeChange,
  compact = false,
}: LogContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-emerald-400";
      case "error":
        return "text-red-400";
      case "debug":
        return "text-cyan-300";
      default:
        return "text-white/60";
    }
  };

  const fontSizePercent = Math.round(fontSize * 100);
  const canIncrease = fontSize < 1.4;
  const canDecrease = fontSize > 0.8;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Font Size Controls */}
      {!compact && (
        <div className="border-b border-white/8 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-white/50">Font Size</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFontSizeChange(Math.max(0.8, fontSize - 0.1))}
              disabled={!canDecrease}
              className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Decrease font size"
            >
              −
            </button>
            <span className="text-xs text-white/70 w-10 text-center">{fontSizePercent}%</span>
            <button
              onClick={() => onFontSizeChange(Math.min(1.4, fontSize + 0.1))}
              disabled={!canIncrease}
              className="px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Increase font size"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Logs Container */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto space-y-1 font-mono ${
          compact ? "px-4 py-4" : "px-6 py-4"
        } scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10`}
        style={{
          fontSize: `${fontSize * 12}px`,
        }}
      >
        {logs.length === 0 ? (
          <div className="text-white/30 text-center py-8">No logs yet</div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className={`${getLogColor(log.type)} whitespace-nowrap overflow-ellipsis overflow-hidden`}
            >
              <span className="text-white/40">[{log.timestamp}]</span>{" "}
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
