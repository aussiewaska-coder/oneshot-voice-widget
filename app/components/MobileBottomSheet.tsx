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
  micMuted: boolean;
  logs: LogEntry[];
  health: SystemHealth;
  fontSizeMultiplier: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
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
  micMuted,
  logs,
  health,
  fontSizeMultiplier,
  onConnect,
  onDisconnect,
  onSendMessage,
  onToggleMic,
  onClearMessages,
  onFontSizeChange,
  lowPerformance = false,
}: MobileBottomSheetProps) {
  const [sheetState, setSheetState] = useState<BottomSheetState>("collapsed");
  const [activeTab, setActiveTab] = useState<"chat" | "logs" | "health">("chat");
  const [isDragging, setIsDragging] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);

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
        className="flex flex-col items-center gap-3 px-4 md:px-6 py-3 border-b border-white/8 touch-none select-none"
        style={{ touchAction: "none" }}
      >
        {/* Drag Handle Visual */}
        <div className="w-12 h-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors" />

        {/* Status Bar (only shown when collapsed or partial) */}
        {sheetState !== "full" && (
          <div className="w-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                {status === "connected" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
                {status === "connecting" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    status === "connected"
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                      : status === "connecting"
                      ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                      : "bg-white/20"
                  }`}
                />
              </div>
              <span className="text-white/60">
                {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Offline"}
              </span>
            </div>

            {/* Connect/Disconnect Button */}
            <button
              onClick={status === "connected" ? onDisconnect : onConnect}
              disabled={status === "connecting"}
              className={`text-xs font-bold px-3 py-1 rounded transition-all min-w-16 ${
                status === "connected"
                  ? "bg-red-500/30 text-red-200 hover:bg-red-500/40"
                  : "bg-white/15 text-white/90 hover:bg-white/25"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
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
              micMuted={micMuted}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onSendMessage={onSendMessage}
              onToggleMic={onToggleMic}
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

    </>
  );
}
