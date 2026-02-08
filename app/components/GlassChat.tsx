"use client";

import { useState } from "react";
import { ChatMessage } from "./MessageBubble";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/conversation";
import { Message, MessageContent } from "@/components/ui/message";
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
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
      : status === "connecting"
      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"
      : "bg-white/20";

  const statusText =
    status === "connected"
      ? isSpeaking
        ? "Speaking"
        : "Listening"
      : status === "connecting"
      ? "Connecting"
      : "Offline";

  return (
    <div className="absolute right-6 top-6 bottom-6 w-[400px] max-w-[calc(100vw-5rem)] z-20 flex flex-col rounded-2xl overflow-hidden glass-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
          <span className="text-white/70 text-xs font-medium tracking-wider uppercase">
            {statusText}
          </span>
        </div>
        {status === "connected" && isSpeaking && (
          <div className="flex gap-[3px] items-end h-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[2px] bg-white/40 rounded-full animate-pulse"
                style={{
                  height: `${6 + Math.random() * 6}px`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.6s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messages area using ElevenLabs Conversation component */}
      <Conversation className="flex-1 scrollbar-thin">
        <ConversationContent className="space-y-1 px-3 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="text-white/30"
              title={
                status === "connected" ? (
                  <ShimmeringText
                    text="Waiting for conversation..."
                    className="text-sm"
                    color="rgba(255,255,255,0.25)"
                    shimmerColor="rgba(255,255,255,0.5)"
                    duration={3}
                    spread={1}
                  />
                ) : (
                  <span className="text-sm text-white/25">
                    Click Connect to start
                  </span>
                )
              }
              description=""
            />
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLatestAgent =
                !isUser &&
                msg.isFinal &&
                index ===
                  messages.findLastIndex((m) => m.role === "agent");

              return (
                <Message
                  key={msg.id}
                  from={isUser ? "user" : "assistant"}
                  className="py-2"
                >
                  <MessageContent
                    variant={isUser ? "contained" : "flat"}
                    className={
                      isUser
                        ? "bg-white/[0.12] text-white rounded-2xl rounded-br-md"
                        : "text-white/90"
                    }
                  >
                    {isUser ? (
                      <span className="text-[13px] leading-relaxed">
                        {msg.text}
                      </span>
                    ) : isLatestAgent ? (
                      <Response className="text-[13px] leading-relaxed streamdown">
                        {msg.text}
                      </Response>
                    ) : (
                      <span className="text-[13px] leading-relaxed">
                        {msg.text}
                      </span>
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton className="bg-white/10 border-white/10 text-white hover:bg-white/20 backdrop-blur-sm" />
      </Conversation>

      {/* Input area */}
      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center gap-2">
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          disabled={status !== "connected"}
          className={`p-2.5 rounded-xl transition-all duration-200 ${
            micMuted
              ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/30"
              : "bg-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.1]"
          } disabled:opacity-20 disabled:cursor-not-allowed`}
          aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          <svg
            width="16"
            height="16"
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
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={status !== "connected" || !inputValue.trim()}
          className="p-2.5 rounded-xl bg-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.1] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
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
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 ${
            status === "connected"
              ? "bg-white/[0.06] text-white/40 hover:bg-red-500/20 hover:text-red-300 hover:ring-1 hover:ring-red-500/20"
              : "bg-white/[0.1] text-white/70 hover:bg-white/[0.15] hover:text-white"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
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
