"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./MessageBubble";
import { ChatContent } from "./ChatContent";
import { LogContent } from "./LogContent";
import { TabBar, Tab } from "./TabBar";
import HealthDashboard from "./HealthDashboard";
import type { SystemHealth } from "./HealthDashboard";
import { LogEntry } from "./HackerLog";
import { useTouchGesture } from "@/app/hooks/useTouchGesture";
import { haptics } from "@/app/utils/haptics";

interface MobileBottomSheetProps {
  messages: ChatMessage[];
  status: "connected" | "disconnected" | "connecting";
  isSpeaking: boolean;
  logs: LogEntry[];
  health: SystemHealth;
  fontSizeMultiplier: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  onFontSizeChange: (multiplier: number) => void;
  lowPerformance?: boolean;
}

type BottomSheetState = "collapsed" | "partial" | "full";

/**
 * Mobile bottom sheet with collapsible chat, logs, and health tabs.
 * - Collapsed: 64px (status bar + drag handle)
 * - Partial: 50vh (active tab content)
 * - Full: 85vh (maximized)
 * - Smooth spring animations
 * - Touch gesture support (swipe up/down, drag handle)
 */
export function MobileBottomSheet({
  messages,
  status,
  isSpeaking,
  logs,
  health,
  fontSizeMultiplier,
  onConnect,
  onDisconnect,
  onSendMessage,
  onClearMessages,
  onFontSizeChange,
  lowPerformance = false,
}: MobileBottomSheetProps) {
  const [sheetState, setSheetState] = useState<BottomSheetState>("collapsed");
  const [activeTab, setActiveTab] = useState<"chat" | "logs" | "health">("chat");
  const [isDragging, setIsDragging] = useState(false);
  const [showFullscreenButton, setShowFullscreenButton] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Fade in fullscreen button after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFullscreenButton(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Calculate height based on state
  const getSheetHeight = () => {
    switch (sheetState) {
      case "collapsed":
        return "h-16"; // 64px
      case "partial":
        return "h-[50vh]";
      case "full":
        return "h-[85vh]";
      default:
        return "h-16";
    }
  };

  // Handle swipe gestures
  const handleSwipeUp = () => {
    haptics.double();
    if (sheetState === "collapsed") {
      setSheetState("partial");
    } else if (sheetState === "partial") {
      setSheetState("full");
    }
  };

  const handleSwipeDown = () => {
    haptics.double();
    if (sheetState === "full") {
      setSheetState("partial");
    } else if (sheetState === "partial") {
      setSheetState("collapsed");
    }
  };

  const handleDragHandleTap = () => {
    haptics.light();
    if (sheetState === "collapsed") {
      setSheetState("partial");
    } else if (sheetState === "partial") {
      setSheetState("collapsed");
    }
  };

  useTouchGesture(dragHandleRef, {
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onTap: handleDragHandleTap,
  });

  // Tab definitions
  const tabs: Tab[] = [
    {
      id: "chat",
      label: "Chat",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "logs",
      label: "Logs",
      badge: logs.filter((l) => l.type === "error").length,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11H3v2h6V11zM18 11h-6v2h6v-2zM9 5H3v2h6V5zm9 0h-6v2h6V5z" />
        </svg>
      ),
    },
    {
      id: "health",
      label: "Health",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-45 flex flex-col transition-all duration-400 ease-out ${getSheetHeight()} rounded-t-3xl overflow-hidden chat-glass`}
        style={{
          backdropFilter: lowPerformance ? "blur(20px)" : "blur(30px)",
          boxShadow:
            "0 -4px 24px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.08) inset",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
      {/* Drag Handle + Status Bar */}
      <div
        ref={dragHandleRef}
        className="flex flex-col items-center gap-3 px-4 py-5 border-b border-white/8 touch-none select-none"
        style={{
          touchAction: "none",
          paddingTop: "max(1.25rem, calc(1.25rem + env(safe-area-inset-top)))"
        }}
      >
        {/* Drag Handle Visual */}
        <div className="w-12 h-1.5 rounded-full bg-white/30 hover:bg-white/40 transition-colors cursor-grab active:cursor-grabbing" />

        {/* Status Bar (only shown when collapsed or partial) */}
        {sheetState !== "full" && (
          <div className="w-full flex items-center justify-between gap-4">
            {/* Status Indicator + Text */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Connection Status Dot */}
              <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                {status === "connected" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
                {status === "connecting" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full transition-all ${
                    status === "connected"
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      : status === "connecting"
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                      : "bg-gray-500 shadow-[0_0_6px_rgba(107,114,128,0.6)]"
                  }`}
                />
              </div>

              {/* Status Text */}
              <span className="text-sm font-medium text-white/70 truncate">
                {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Offline"}
              </span>
            </div>

            {/* Connect/Disconnect Button - Prominent with Pink Glow */}
            <button
              onClick={status === "connected" ? onDisconnect : onConnect}
              disabled={status === "connecting"}
              className={`
                font-bold text-sm px-5 py-2.5 rounded-lg transition-all
                min-w-max flex-shrink-0
                transform active:scale-95
                focus:outline-none focus:ring-2 focus:ring-offset-0
                ${
                  status === "connected"
                    ? "bg-red-500/40 text-red-100 hover:bg-red-500/50 border border-red-400/30 focus:ring-red-400/50"
                    : "bg-pink-500/35 text-pink-50 hover:bg-pink-500/45 border border-pink-400/40 focus:ring-pink-400/50"
                }
                disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
              `}
              style={
                status !== "connected"
                  ? {
                      boxShadow: "0 0 20px rgba(236, 72, 153, 0.8), 0 0 40px rgba(236, 72, 153, 0.4)",
                    }
                  : undefined
              }
              title={status === "connected" ? "End conversation" : status === "connecting" ? "Connecting..." : "Start conversation"}
            >
              {status === "connected" ? "End" : status === "connecting" ? "..." : "Connect"}
            </button>
          </div>
        )}
      </div>

      {/* Tab Bar (shown when expanded) */}
      {sheetState !== "collapsed" && (
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as "chat" | "logs" | "health")}
        />
      )}

      {/* Tab Content (shown when expanded) */}
      {sheetState !== "collapsed" && (
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <ChatContent
              messages={messages}
              status={status}
              isSpeaking={isSpeaking}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onSendMessage={onSendMessage}
              onClearMessages={onClearMessages}
              compact={true}
            />
          )}

          {activeTab === "logs" && (
            <LogContent
              logs={logs}
              fontSize={fontSizeMultiplier}
              onFontSizeChange={onFontSizeChange}
              compact={true}
            />
          )}

          {activeTab === "health" && (
            <div className="p-4 overflow-y-auto h-full">
              <HealthDashboard health={health} compact={true} />
            </div>
          )}
        </div>
      )}
    </div>

      {/* Fullscreen Button - Fixed top-right corner */}
      {sheetState !== "full" && showFullscreenButton && (
        <button
          onClick={() => {
            haptics.double();
            setSheetState("full");
          }}
          className="fixed top-4 right-4 z-46 p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 transition-all duration-500 opacity-0 animate-fadeIn min-w-9 min-h-9 flex items-center justify-center"
          title="Expand to fullscreen"
          aria-label="Expand bottom sheet to fullscreen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      )}

    </>
  );
}
