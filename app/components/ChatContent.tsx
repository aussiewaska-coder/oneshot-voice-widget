"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./MessageBubble";
import { Response } from "@/components/ui/response";
import { ShimmeringText } from "@/components/ui/shimmering-text";

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

interface ChatContentProps {
  messages: ChatMessage[];
  status: "connected" | "disconnected" | "connecting";
  isSpeaking: boolean;
  micMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onClearMessages: () => void;
  compact?: boolean; // true for mobile, false for desktop
}

/**
 * Shared chat content component used by both desktop GlassChat and mobile MobileBottomSheet.
 * Handles message display, input, and connection controls.
 *
 * @param compact - If true, hide the connect/disconnect button (handled by parent)
 */
export function ChatContent({
  messages,
  status,
  isSpeaking,
  micMuted,
  onConnect,
  onDisconnect,
  onSendMessage,
  onToggleMic,
  onClearMessages,
  compact = false,
}: ChatContentProps) {
  const [inputValue, setInputValue] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialization phase - show initializing for 1-2 seconds
  useEffect(() => {
    if (isInitializing) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInitializing]);

  // Rotate prompt phrases when connected with no messages
  useEffect(() => {
    if (status === "connected" && messages.length === 0 && !isInitializing) {
      const interval = setInterval(() => {
        setPromptIndex((prev) => (prev + 1) % PROMPT_PHRASES.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [status, messages.length, isInitializing]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (status !== "connected") {
      onConnect();
    }
    onSendMessage(trimmed);
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
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
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Container */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto space-y-4 ${
          compact ? "px-4 py-4" : "px-6 py-6"
        } scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10`}
      >
        {isInitializing ? (
          <div className="flex items-center justify-center h-full">
            <ShimmeringText
              text="Connecting..."
              className="text-sm text-white/40"
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-base text-white/50 font-ubuntu">No messages yet</p>
            <p className="text-sm text-white/30 text-center max-w-xs font-ubuntu">
              {status === "connected"
                ? PROMPT_PHRASES[promptIndex]
                : "Connect to start a conversation"}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <span className="text-xs text-white/40 font-ubuntu font-bold">
                {msg.role === "user" ? "You" : "Agent"}
              </span>
              {msg.role === "agent" ? (
                <Response className="streamdown">
                  {msg.text}
                </Response>
              ) : (
                <p className="text-white/80">{msg.text}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className={`border-t border-white/8 ${compact ? "px-4 py-4" : "px-6 py-4"}`}>
        <div className="flex items-center gap-2">
          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={PROMPT_PHRASES[promptIndex]}
            className="flex-1 bg-white/5 text-white placeholder-white/30 px-4 py-3 rounded-lg text-sm font-ubuntu focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all min-h-12"
            disabled={status !== "connected"}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || status !== "connected"}
            className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all min-w-12 min-h-12 flex items-center justify-center"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>

          {/* Mic Toggle */}
          <button
            onClick={onToggleMic}
            className={`p-2 rounded-lg transition-all min-w-12 min-h-12 flex items-center justify-center ${
              micMuted
                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
            aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
            title={micMuted ? "Unmute (Command key)" : "Mute (Command key)"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {micMuted ? (
                <>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v6a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12m14 0a7 7 0 0 1-13.8 1"></path>
                </>
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
