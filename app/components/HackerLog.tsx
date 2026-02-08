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

const ELEVENLABS_VOICES = [
  "Adam", "Bella", "Benjamin", "Callum", "Charlotte", "Chris", "Daniel", "Dave",
  "Dillan", "Donald", "Dylan", "Ethan", "Eve", "Fin", "Freya", "Gigi", "Grace",
  "Hank", "Hannah", "Harry", "Henri", "Hugo", "Irina", "Ivy", "Jackson", "James",
  "Jane", "Jason", "Jean", "Jelly", "Jenny", "Jeremy", "Jesse", "Jessica", "Joe",
  "Joey", "John", "Joseph", "Josh", "Josie", "Joyce", "Jules", "Julian", "Julie",
  "Juno", "Kaiser", "Kali", "Kara", "Karen", "Keith", "Kelley", "Kelly", "Kenneth",
  "Kenny", "Kevin", "Kim", "Kimi", "King", "Kira", "Krystal", "Kyle", "Kyra", "Laura",
  "Lauren", "Lauryn", "Lea", "Leon", "Leona", "Leslie", "Liam", "Lina", "Linda",
  "Liz", "Lola", "London", "Lora", "Lorenzo", "Louis", "Louise", "Loyd", "Lucia",
  "Lucien", "Lucio", "Lucy", "Luis", "Luke", "Lyam", "Lyla", "Lyn", "Lynda", "Lynn",
  "Mabel", "Mace", "Madeleine", "Madison", "Madelyn", "Mae", "Mafini", "Mag", "Magali",
];

function getRandomVoice(): string {
  return ELEVENLABS_VOICES[Math.floor(Math.random() * ELEVENLABS_VOICES.length)];
}

interface HackerLogProps {
  palette?: number;
  onPaletteChange?: (palette: number) => void;
  connectionStatus?: "connected" | "disconnected" | "connecting";
}

export default function HackerLog({ palette = 5, onPaletteChange, connectionStatus = "disconnected" }: HackerLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(getRandomVoice());
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 600); // Match the animation duration
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Expose logger to window for use throughout the app
    (window as any).hackerLog = (message: string, type: "info" | "success" | "error" | "debug" = "info") => {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => {
        const newLogs = [...prev.slice(-49), { timestamp, message, type }]; // Keep last 50 logs
        // Sync to shared state for mobile if available
        (window as any).setSharedLogs?.(newLogs);
        return newLogs;
      });
      console.log(`[${timestamp}] ${message}`);
    };

    // Auto-scroll to bottom
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Expose toggleHackerLog function to window for keyboard shortcuts
  useEffect(() => {
    (window as any).toggleHackerLog = () => {
      if (isVisible) {
        handleClose();
      } else {
        setIsVisible(true);
      }
    };
    (window as any).openHackerLog = () => setIsVisible(true); // Keep for backwards compatibility
    return () => {
      delete (window as any).toggleHackerLog;
      delete (window as any).openHackerLog;
    };
  }, [isVisible]);

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
        <div className={`absolute bottom-5 left-5 w-[480px] h-[500px] bg-black/80 border border-green-500/40 rounded-lg overflow-hidden flex flex-col font-ubuntu text-[11px] z-40 ${
          isClosing ? "animate-[genieOut_0.6s_ease-out_forwards]" : "animate-[genieIn_0.8s_ease-out_forwards]"
        }`} style={{
          transformOrigin: "left center",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 0, 0, 0.3) inset",
          fontSize: `${11 * fontSizeMultiplier}px`,
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
            @keyframes redLedRotate {
              0% {
                box-shadow: 0 0 15px rgba(239, 68, 68, 0.8), inset 0 0 10px rgba(239, 68, 68, 0.5);
                transform: rotate(0deg);
              }
              50% {
                box-shadow: 0 0 25px rgba(239, 68, 68, 1), inset 0 0 15px rgba(239, 68, 68, 0.8);
              }
              100% {
                box-shadow: 0 0 15px rgba(239, 68, 68, 0.8), inset 0 0 10px rgba(239, 68, 68, 0.5);
                transform: rotate(360deg);
              }
            }
            @keyframes shimmer {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.7;
                transform: scale(1.1);
              }
            }
          `}</style>
          <div className="px-6 py-6 border-b border-green-500/20 bg-black/70 flex items-center justify-between gap-6">
            {/* Matrix rain background + ring */}
            <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
              {/* Matrix rain effect */}
              <div className="absolute inset-0 overflow-hidden rounded-lg opacity-30">
                {connectionStatus === "connected" && (
                  <Matrix rows={5} cols={5} frames={loader} fps={12} loop size={8} gap={1.5} />
                )}
              </div>

              {/* Thinking ring - clickable when connected */}
              {connectionStatus === "connected" && (
                <button
                  onClick={() => (window as any).toggleDocModal?.()}
                  className="relative w-16 h-16 cursor-pointer group"
                  aria-label="Open documentation"
                  title="Click to open documentation"
                >
                  {/* Outer rotating ring */}
                  <div
                    className="absolute inset-0 border-2 border-transparent border-t-cyan-400 border-r-blue-400 rounded-full group-hover:animate-pulse"
                    style={{
                      animation: "spin 3s cubic-bezier(0.6, 0.2, 0.2, 0.6) infinite",
                      boxShadow: "0 0 15px rgba(34, 211, 238, 0.6), inset 0 0 15px rgba(59, 130, 246, 0.2)",
                    }}
                  />
                  {/* Inner morphing shape */}
                  <div
                    className="absolute inset-3 border-2 border-green-400 bg-gradient-to-br from-green-500/10 to-cyan-500/5 group-hover:from-green-500/20 group-hover:to-cyan-500/10 transition-all"
                    style={{
                      animation: "thinkingRing 4s ease-in-out infinite",
                      boxShadow: "0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)",
                    }}
                  />
                  {/* Pulse center dot */}
                  <div className="absolute inset-5 bg-gradient-to-b from-cyan-400 to-green-400 rounded-full group-hover:animate-bounce"
                    style={{
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      boxShadow: "0 0 10px rgba(34, 211, 238, 0.8)",
                    }}
                  />
                </button>
              )}

              {/* Offline indicator - Red LED rotating effect */}
              {connectionStatus !== "connected" && (
                <button
                  onClick={() => (window as any).toggleDocModal?.()}
                  className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  aria-label="Open documentation"
                  title="Click to open documentation (offline mode)"
                >
                  <div
                    className="w-12 h-12 border-2 border-red-600 rounded-full flex items-center justify-center group-hover:animate-pulse"
                    style={{
                      animation: "redLedRotate 2s linear infinite",
                      backgroundColor: "rgba(220, 38, 38, 0.1)",
                    }}
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full"
                      style={{
                        boxShadow: "0 0 8px rgba(239, 68, 68, 0.8), 0 0 16px rgba(220, 38, 38, 0.6)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-red-400/60 group-hover:text-red-400">OFFLINE</span>
                </button>
              )}
            </div>

            {/* Model and status info */}
            <div className="flex-1 space-y-2">
              <div className="text-[11px] text-green-400 font-bold">
                {connectionStatus === "connected" ? "● BRAIN ONLINE" : "○ BRAIN OFFLINE"}
              </div>
              <div className="text-[10px] text-green-400/70 font-mono">
                Model: OpenClaw Brain
              </div>
              <div className="text-[9px] text-green-400/50">
                Status: {connectionStatus === "connecting" ? "Initializing..." : connectionStatus === "connected" ? "Active" : "Standby"}
              </div>
            </div>

            {/* Voice selector */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSelectedVoice(getRandomVoice())}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-green-500/30 hover:border-green-500/60 hover:bg-green-500/10 transition-all group cursor-pointer"
                title="Click to select a random voice"
                aria-label="Select voice"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400/60 group-hover:text-green-400">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="text-[9px] text-green-400/60 group-hover:text-green-400 font-mono whitespace-nowrap">{selectedVoice}</span>
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="relative px-3 py-2 border-b border-green-500/20 bg-black/50 flex items-center justify-between overflow-hidden">
            {/* Matrix background */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <Matrix rows={3} cols={20} frames={loader} fps={8} loop size={5} gap={0.8} />
            </div>

            <span className="relative text-green-400 font-bold text-[10px] z-10">HACKER_LOG.SYS</span>

            {/* Palette selector and doc button */}
            <div className="relative flex items-center gap-2 z-10">
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

              {/* Doc button */}
              <button
                onClick={() => (window as any).toggleDocModal?.()}
                className="p-2 rounded text-green-400/60 hover:text-green-400 hover:bg-green-400/10 transition-all"
                aria-label="Open documentation"
                title="System Documentation (Press D)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </button>
            </div>

            <div className="relative flex items-center gap-2 z-10">
              <span className="text-green-400/60 text-[9px]">[{logs.length}/50]</span>

              {/* Font size controls for accessibility */}
              <div className="flex items-center gap-0.5 border-l border-green-500/20 pl-2">
                <button
                  onClick={() => setFontSizeMultiplier(Math.max(0.8, fontSizeMultiplier - 0.1))}
                  className="text-green-400/40 hover:text-green-400 transition-colors p-1"
                  aria-label="Decrease font size"
                  title="Decrease font size (Accessibility)"
                  disabled={fontSizeMultiplier <= 0.8}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="text-green-400/60 text-[8px] px-1 select-none">{Math.round(fontSizeMultiplier * 100)}%</span>
                <button
                  onClick={() => setFontSizeMultiplier(Math.min(1.4, fontSizeMultiplier + 0.1))}
                  className="text-green-400/40 hover:text-green-400 transition-colors p-1"
                  aria-label="Increase font size"
                  title="Increase font size (Accessibility)"
                  disabled={fontSizeMultiplier >= 1.4}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              <button
                onClick={handleClose}
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
