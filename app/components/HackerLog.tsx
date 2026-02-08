"use client";

import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "debug";
}

export default function HackerLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
    <div className="absolute bottom-5 left-5 w-[400px] h-[200px] bg-black/80 border border-green-500/40 rounded-lg overflow-hidden flex flex-col font-mono text-[11px] shadow-lg">
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
  );
}
