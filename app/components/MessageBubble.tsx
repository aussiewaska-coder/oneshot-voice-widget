"use client";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  isFinal: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-white/20 text-white rounded-br-md"
            : "bg-white/10 text-white/90 rounded-bl-md"
        } ${!message.isFinal ? "italic opacity-60" : ""}`}
      >
        {message.text}
      </div>
    </div>
  );
}
