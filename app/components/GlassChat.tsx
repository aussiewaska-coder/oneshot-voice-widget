"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./MessageBubble";
import { Response } from "@/components/ui/response";
import { ShimmeringText } from "@/components/ui/shimmering-text";

interface GlassChatProps {
  messages: ChatMessage[];
  status: "connected" | "disconnected" | "connecting";
  isSpeaking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  onChatOpenChange?: (isOpen: boolean) => void;
}

const PROMPT_PHRASES = [
  "What's on your mind?",
  "Say something...",
  "I'm listening...",
  "Go on, I'm all ears...",
  "Lay it on me...",
  "Talk to me...",
  "What've you got?",
  "Speak up...",
  "I'm ready...",
  "Your move...",
];

export default function GlassChat({
  messages,
  status,
  isSpeaking,
  onConnect,
  onDisconnect,
  onSendMessage,
  onClearMessages,
  onChatOpenChange,
}: GlassChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify parent when chat opens/closes
  useEffect(() => {
    onChatOpenChange?.(!isCollapsed);
  }, [isCollapsed, onChatOpenChange]);

  // Expose chat control functions to window for keyboard shortcuts
  useEffect(() => {
    (window as any).openChat = () => setIsCollapsed(false);
    (window as any).closeChat = () => setIsCollapsed(true);
    (window as any).scrollChatUp = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = Math.max(0, scrollRef.current.scrollTop - 60);
      }
    };
    (window as any).scrollChatDown = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = Math.min(
          scrollRef.current.scrollHeight,
          scrollRef.current.scrollTop + 60
        );
      }
    };
    return () => {
      delete (window as any).openChat;
      delete (window as any).closeChat;
      delete (window as any).scrollChatUp;
      delete (window as any).scrollChatDown;
    };
  }, []);

  // Initialization phase - show initializing for 1-2 seconds
  useEffect(() => {
    if (isInitializing) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 1500); // 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [isInitializing]);

  // Rotate prompt phrases when connected with no messages
  useEffect(() => {
    if (status === "connected" && messages.length === 0 && !isInitializing) {
      const interval = setInterval(() => {
        setPromptIndex((prev) => (prev + 1) % PROMPT_PHRASES.length);
      }, 4000); // Change phrase every 4 seconds
      return () => clearInterval(interval);
    }
  }, [status, messages.length, isInitializing]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    // If not connected, connect first
    if (status !== "connected") {
      onConnect();
    }
    onSendMessage(trimmed);
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Auto-connect on first key input if not already connected
    if (!inputValue && e.target.value && status === "disconnected") {
      onConnect();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`absolute right-5 top-5 z-20 flex flex-col rounded-3xl overflow-hidden chat-glass font-ubuntu transition-all duration-700 ease-in-out ${
        isCollapsed
          ? "w-auto h-auto"
          : "bottom-5 w-[420px] max-w-[calc(100vw-5rem)]"
      }`}
      style={{
        transformOrigin: "top right",
        boxShadow: isCollapsed
          ? "0 0 40px -10px rgba(0, 162, 199, 0.6), 0 0 80px -20px rgba(0, 74, 173, 0.3)"
          : "0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 0 60px -15px rgba(100, 150, 255, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 120px -30px rgba(120, 100, 255, 0.15)"
      }}
    >
      {/* ── Header / Control Bar ── */}
      <div className={`flex items-center justify-between ${isCollapsed ? "px-3 py-2 gap-2" : "px-6 py-4"}`}>
        {isCollapsed ? (
          // Collapsed: show icon + status + connect button
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
              aria-label="Open chat"
              title="Open chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <span className="relative flex h-2 w-2">
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
            </span>
          </div>
        ) : (
          // Expanded: show connect button left, status + collapse right
          <div className="flex items-center justify-between w-full gap-3">
            {/* Connect button - left side, prominent */}
            <button
              onClick={status === "connected" ? onDisconnect : onConnect}
              disabled={status === "connecting"}
              className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                status === "connected"
                  ? "bg-red-500/30 text-red-200 hover:bg-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-white/15 text-white/90 hover:bg-white/25 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {status === "connected" ? "End" : status === "connecting" ? "..." : "Connect"}
            </button>

            {/* Status + collapse - right side */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
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
                </span>
                <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-white/40">
                  {status === "connected"
                    ? isSpeaking
                      ? "Speaking"
                      : "Listening"
                    : status === "connecting"
                    ? "Connecting"
                    : "Offline"}
                </span>
              </div>

              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
                aria-label="Collapse chat"
                title="Collapse chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Speaking indicator bars */}
        {!isCollapsed && status === "connected" && isSpeaking && (
          <div className="flex gap-[3px] items-center h-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[2px] rounded-full bg-gradient-to-t from-white/20 to-white/50"
                style={{
                  animation: `speakBar 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            {status === "connected" && isInitializing && (
              <div className="transition-opacity duration-1000 opacity-100">
                <ShimmeringText
                  text="...initializing..."
                  className="text-xl font-light"
                  color="rgba(0, 162, 199, 0.4)"
                  shimmerColor="rgba(0, 210, 255, 0.8)"
                  duration={2.5}
                  spread={1.5}
                />
              </div>
            )}
            {status === "connected" && !isInitializing && (
              <div className="transition-opacity duration-1000 opacity-100">
                <ShimmeringText
                  text={PROMPT_PHRASES[promptIndex]}
                  className="text-xl font-light"
                  color="rgba(255,255,255,0.25)"
                  shimmerColor="rgba(255,255,255,0.6)"
                  duration={2.5}
                  spread={1.5}
                />
              </div>
            )}
            {status !== "connected" && (
              <p className="text-[13px] text-white/40 font-light">
                Start typing to connect...
              </p>
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const isLatestAgent =
              !isUser &&
              index === messages.findLastIndex((m) => m.role === "agent");

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"} animate-[fadeSlideIn_0.3s_ease-out]`}
              >
                {isUser ? (
                  /* ── User bubble ── */
                  <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-white/[0.12] to-white/[0.06] border border-white/[0.08] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:from-white/[0.15]">
                    <p className="text-[13px] leading-relaxed text-white/90 font-light">
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  /* ── Agent message ── */
                  <div className="max-w-[92%] pl-1">
                    {/* Tiny accent bar with liquid flow */}
                    <div className="flex items-start gap-3">
                      <div className="w-[2px] mt-1 self-stretch rounded-full bg-gradient-to-b from-cyan-400/50 via-blue-400/30 to-transparent flex-shrink-0 transition-all duration-300" />
                      <div className="text-[13px] leading-[1.7] text-white/85 font-light font-ubuntu">
                        {isLatestAgent ? (
                          <Response className="streamdown">
                            {msg.text}
                          </Response>
                        ) : (
                          <p className="text-white/80">{msg.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* ── Input bar (always visible) ── */}
      <div className="px-4 py-4 flex items-center gap-2.5">
        {/* Mic indicator */}
        <div className={`p-3 rounded-xl ${
          status === "connected"
            ? "bg-white/[0.08] text-white/60"
            : "opacity-15"
        }`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>

        {/* Text field - more prominent */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={status === "connected" ? "Type a message..." : "Start typing to connect..."}
          disabled={!isCollapsed && status !== "connected"}
          className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-[13px] text-white/95 placeholder-white/30 outline-none focus:border-white/25 focus:bg-white/[0.08] transition-all disabled:opacity-15 disabled:cursor-not-allowed font-medium"
        />

        {/* Send - more prominent */}
        <button
          onClick={handleSend}
          disabled={!isCollapsed && (status !== "connected" || !inputValue.trim())}
          className="p-3 rounded-xl bg-white/[0.08] text-white/70 hover:text-white/95 hover:bg-white/[0.12] transition-all disabled:opacity-15 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(255,255,255,0.08)]"
          aria-label="Send"
          title="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>

      </div>

      {/* Clear button - always visible when connected, prominent */}
      {status === "connected" && (
        <button
          onClick={onClearMessages}
          disabled={messages.length === 0}
          className="absolute right-2 top-2 p-2.5 rounded-lg bg-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.12] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(255,255,255,0.05)]"
          aria-label="Clear messages"
          title="Clear chat display (memory preserved)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7v5M7 12h10" />
          </svg>
        </button>
      )}

          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </>
      )}
    </div>
  );
}
