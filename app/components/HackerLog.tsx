"use client";

import { useEffect, useRef, useState } from "react";
import { useCallback } from "react";
import { Matrix, loader } from "@/components/ui/matrix";

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "debug";
}

const PALETTE_COLORS = [
  { id: 1, bg0: "#101030", bg1: "#050515" },
  { id: 2, bg0: "#4a1a1a", bg1: "#0a0a0a" },
  { id: 3, bg0: "#0d2b0d", bg1: "#000a00" },
  { id: 4, bg0: "#2a1a3a", bg1: "#0f0510" },
  { id: 5, bg0: "#004aad", bg1: "#051c2c" },
];

interface HackerLogProps {
  palette?: number;
  onPaletteChange?: (palette: number) => void;
  connectionStatus?: "connected" | "disconnected" | "connecting";
}

export default function HackerLog({ palette = 5, onPaletteChange, connectionStatus = "disconnected" }: HackerLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
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

  // Expose openHackerLog function to window for keyboard shortcuts
  useEffect(() => {
    (window as any).openHackerLog = () => setIsVisible(true);
    return () => {
      delete (window as any).openHackerLog;
    };
  }, []);

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
      {/* Toggle button - hidden when logs are visible */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="absolute bottom-5 left-5 w-10 h-10 rounded bg-green-500/10 border border-green-500/40 hover:border-green-500/80 hover:bg-green-500/20 transition-all flex items-center justify-center text-green-400 hover:text-green-300 z-40 cursor-pointer"
          aria-label="Show debug logs"
          title="Show debug logs"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="2" y1="20" x2="22" y2="20" />
          </svg>
        </button>
      )}

      {/* Log panel */}
      {isVisible && (
        <div className="absolute bottom-5 left-5 w-[480px] h-[500px] bg-black/80 border border-green-500/40 rounded-lg overflow-hidden flex flex-col font-mono text-[11px] shadow-lg animate-[genieIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)] z-40" style={{
          transformOrigin: "left center",
        }}>
          {/* Top visualization section - Brain is thinking when online */}
          <style>{`
            @keyframes thinkingRing {
              0% {
                transform: rotate(0deg) scale(1);
                border-radius: 50%;
              }
              25% {
                border-radius: 35%;
              }
              50% {
                transform: rotate(180deg) scale(1.1);
                border-radius: 20%;
              }
              75% {
                border-radius: 35%;
              }
              100% {
                transform: rotate(360deg) scale(1);
                border-radius: 50%;
              }
            }
            @keyframes matrixFall {
              0% { transform: translateY(-100%); opacity: 1; }
              100% { transform: translateY(100%); opacity: 0; }
            }
          `}</style>
          <div className="px-4 py-5 border-b border-green-500/20 bg-black/70 flex items-center justify-between">
            {/* Matrix rain background + ring */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Matrix rain effect */}
              <div className="absolute inset-0 overflow-hidden rounded-lg opacity-30">
                {connectionStatus === "connected" && (
                  <Matrix rows={4} cols={4} frames={loader} fps={12} loop size={6} gap={1} />
                )}
              </div>

              {/* Thinking ring - only animates when connected */}
              {connectionStatus === "connected" && (
                <div className="relative w-12 h-12">
                  {/* Outer rotating ring */}
                  <div
                    className="absolute inset-0 border-2 border-transparent border-t-cyan-400 border-r-blue-400 rounded-full"
                    style={{
                      animation: "spin 3s cubic-bezier(0.6, 0.2, 0.2, 0.6) infinite",
                      boxShadow: "0 0 15px rgba(34, 211, 238, 0.6), inset 0 0 15px rgba(59, 130, 246, 0.2)",
                    }}
                  />
                  {/* Inner morphing shape */}
                  <div
                    className="absolute inset-2 border-2 border-green-400 bg-gradient-to-br from-green-500/10 to-cyan-500/5"
                    style={{
                      animation: "thinkingRing 4s ease-in-out infinite",
                      boxShadow: "0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)",
                    }}
                  />
                  {/* Pulse center dot */}
                  <div className="absolute inset-4 bg-gradient-to-b from-cyan-400 to-green-400 rounded-full"
                    style={{
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      boxShadow: "0 0 10px rgba(34, 211, 238, 0.8)",
                    }}
                  />
                </div>
              )}

              {/* Offline indicator */}
              {connectionStatus !== "connected" && (
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="w-8 h-8 border-2 border-red-500/50 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                  <span className="text-[8px] text-red-400/60">OFFLINE</span>
                </div>
              )}
            </div>

            {/* Model and status info */}
            <div className="flex-1 ml-4 space-y-1">
              <div className="text-[9px] text-green-400 font-bold">
                {connectionStatus === "connected" ? "● BRAIN ONLINE" : "○ BRAIN OFFLINE"}
              </div>
              <div className="text-[8px] text-green-400/60">
                Model: ElevenLabs Convai
              </div>
              <div className="text-[8px] text-green-400/50">
                Status: {connectionStatus === "connecting" ? "Initializing..." : connectionStatus === "connected" ? "Active" : "Standby"}
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="px-3 py-2 border-b border-green-500/20 bg-black/50 flex items-center justify-between">
            <span className="text-green-400 font-bold text-[10px]">HACKER_LOG.SYS</span>

            {/* Palette selector */}
            <div className="flex items-center gap-1.5">
              {PALETTE_COLORS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPaletteChange?.(p.id)}
                  className={`w-4 h-4 rounded-full transition-all cursor-pointer ${
                    palette === p.id ? "ring-2 ring-white scale-110" : "hover:scale-105"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${p.bg0}, ${p.bg1})`,
                  }}
                  title={`Palette ${p.id}`}
                  aria-label={`Palette ${p.id}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-green-400/60 text-[9px]">[{logs.length}/50]</span>
              <button
                onClick={() => setIsVisible(false)}
                className="text-green-400/40 hover:text-green-400 transition-colors p-1"
                aria-label="Minimize logs"
                title="Minimize logs"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Logs */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-track-black/50 scrollbar-thumb-green-500/30 text-[10px]"
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
