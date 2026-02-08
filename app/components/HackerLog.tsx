"use client";

import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "debug";
}

export default function HackerLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Expose logger to window for use throughout the app
    (window as any).hackerLog = (message: string, type: "info" | "success" | "error" | "debug" = "info") => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-49), { timestamp, message, type }]); // Keep last 50 logs
      console.log(`[${timestamp}] ${message}`);
    };

    // Auto-scroll to bottom
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "debug":
        return "text-cyan-400";
      default:
        return "text-green-400";
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute bottom-5 left-5 w-10 h-10 rounded bg-green-500/10 border border-green-500/40 hover:border-green-500/80 hover:bg-green-500/20 transition-all flex items-center justify-center text-green-400 hover:text-green-300 z-40 cursor-pointer"
        aria-label="Toggle debug logs"
        title="Toggle debug logs"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      </button>

      {/* Log panel */}
      {isVisible && (
        <div className="absolute bottom-5 left-16 w-[400px] h-[200px] bg-black/80 border border-green-500/40 rounded-lg overflow-hidden flex flex-col font-mono text-[11px] shadow-lg animate-[genieIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)] z-40" style={{
          transformOrigin: "left center",
        }}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-green-500/20 bg-black/50 flex items-center justify-between">
            <span className="text-green-400 font-bold">HACKER_LOG.SYS</span>
            <span className="text-green-400/60 text-[9px]">[{logs.length}/50]</span>
          </div>

          {/* Logs */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-track-black/50 scrollbar-thumb-green-500/20"
          >
            {logs.length === 0 ? (
              <div className="text-green-400/40">$ awaiting events...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-green-500/60 flex-shrink-0">{log.timestamp}</span>
                  <span className={`${getTypeColor(log.type)} flex-1 break-words`}>{log.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1 border-t border-green-500/20 bg-black/50 text-green-400/60 text-[9px]">
            $ root@oneshot:~#
          </div>
        </div>
      )}
    </>
  );
}
