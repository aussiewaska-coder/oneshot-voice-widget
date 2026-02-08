"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./MessageBubble";
import { Response } from "@/components/ui/response";
import { ShimmeringText } from "@/components/ui/shimmering-text";

interface GlassChatProps {
  messages: ChatMessage[];
  status: "connected" | "disconnected" | "connecting";
  isSpeaking: boolean;
  micMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onClearMessages: () => void;
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
  micMuted,
  onConnect,
  onDisconnect,
  onSendMessage,
  onToggleMic,
  onClearMessages,
}: GlassChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Rotate prompt phrases when connected with no messages
  useEffect(() => {
    if (status === "connected" && messages.length === 0) {
      const interval = setInterval(() => {
        setPromptIndex((prev) => (prev + 1) % PROMPT_PHRASES.length);
      }, 4000); // Change phrase every 4 seconds
      return () => clearInterval(interval);
    }
  }, [status, messages.length]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || status !== "connected") return;
    onSendMessage(trimmed);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="absolute right-5 top-5 bottom-5 w-[420px] max-w-[calc(100vw-5rem)] z-20 flex flex-col rounded-3xl overflow-hidden chat-glass font-ubuntu">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            {status === "connected" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            )}
            {status === "connecting" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                status === "connected"
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  : status === "connecting"
                  ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                  : "bg-white/20"
              }`}
            />
          </span>
          <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/50">
            {status === "connected"
              ? isSpeaking
                ? "Speaking"
                : "Listening"
              : status === "connecting"
              ? "Connecting"
              : "Offline"}
          </span>
        </div>

        {/* Speaking indicator bars */}
        {status === "connected" && isSpeaking && (
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

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            {status === "connected" ? (
              <ShimmeringText
                text={PROMPT_PHRASES[promptIndex]}
                className="text-xl font-light"
                color="rgba(255,255,255,0.25)"
                shimmerColor="rgba(255,255,255,0.6)"
                duration={2.5}
                spread={1.5}
              />
            ) : (
              <p className="text-[13px] text-white/20 font-light">
                Press Connect to begin
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

      {/* ── Input bar (only when connected) ── */}
      {status === "connected" && (
        <div className="px-4 py-3.5 flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={onToggleMic}
            disabled={status !== "connected"}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              micMuted
                ? "bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20"
                : "bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
            } disabled:opacity-15 disabled:cursor-not-allowed`}
            aria-label={micMuted ? "Unmute" : "Mute"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {micMuted ? (
                <>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.48-.35 2.15" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              )}
            </svg>
          </button>

          {/* Text field */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={status !== "connected"}
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-[13px] text-white/90 placeholder-white/15 outline-none focus:border-white/15 focus:bg-white/[0.05] transition-all disabled:opacity-15 disabled:cursor-not-allowed"
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={status !== "connected" || !inputValue.trim()}
            className="p-2.5 rounded-xl bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all disabled:opacity-15 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>

          {/* Clear */}
          <button
            onClick={onClearMessages}
            disabled={messages.length === 0}
            className="p-2.5 rounded-xl bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all disabled:opacity-15 disabled:cursor-not-allowed"
            aria-label="Clear messages"
            title="Clear chat display (memory preserved)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      )}

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* ── Bottom action button ── */}
      <div className="px-4 py-4 flex justify-center">
        <button
          onClick={status === "connected" ? onDisconnect : onConnect}
          disabled={status === "connecting"}
          className={`relative px-8 py-3.5 rounded-xl text-[11px] font-semibold tracking-[0.12em] uppercase transition-all duration-300 overflow-hidden ${
            status === "connected"
              ? "bg-white/[0.04] text-white/30 hover:bg-red-500/15 hover:text-red-300"
              : "bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white/90"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {status !== "connected" && status !== "connecting" && (
            <span className="absolute inset-0 rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-colors" />
          )}
          {status === "connected"
            ? "End"
            : status === "connecting"
            ? "..."
            : "Connect"}
        </button>
      </div>
    </div>
  );
}
