"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble, { ChatMessage } from "./MessageBubble";

interface GlassChatProps {
  messages: ChatMessage[];
  status: "connected" | "disconnected" | "connecting";
  isSpeaking: boolean;
  micMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onSendActivity: () => void;
  onToggleMic: () => void;
}

export default function GlassChat({
  messages,
  status,
  isSpeaking,
  micMuted,
  onConnect,
  onDisconnect,
  onSendMessage,
  onSendActivity,
  onToggleMic,
}: GlassChatProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const statusColor =
    status === "connected"
      ? "bg-green-400"
      : status === "connecting"
      ? "bg-yellow-400"
      : "bg-red-400";

  const statusText =
    status === "connected"
      ? isSpeaking
        ? "Agent speaking..."
        : "Listening"
      : status === "connecting"
      ? "Connecting..."
      : "Disconnected";

  return (
    <div className="absolute right-6 top-6 bottom-6 w-[380px] max-w-[calc(100vw-5rem)] z-20 flex flex-col rounded-2xl overflow-hidden glass-panel">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor} shrink-0`} />
        <span className="text-white/80 text-sm font-medium">{statusText}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin"
      >
        {messages.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-8">
            {status === "connected"
              ? "Waiting for conversation..."
              : "Click Connect to start"}
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-3 flex items-center gap-2">
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          disabled={status !== "connected"}
          className={`p-2 rounded-lg transition-colors ${
            micMuted
              ? "bg-red-500/30 text-red-300"
              : "bg-white/10 text-white/70 hover:text-white"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

        {/* Text input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (status === "connected") onSendActivity();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            status === "connected" ? "Type a message..." : "Connect first..."
          }
          disabled={status !== "connected"}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={status !== "connected" || !inputValue.trim()}
          className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

        {/* Connect/Disconnect button */}
        <button
          onClick={status === "connected" ? onDisconnect : onConnect}
          disabled={status === "connecting"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            status === "connected"
              ? "bg-red-500/30 text-red-300 hover:bg-red-500/50"
              : "bg-green-500/30 text-green-300 hover:bg-green-500/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
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
