"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import OrbBackground from "./OrbBackground";
import GlassChat from "./GlassChat";
import Logo from "./Logo";
import { ChatMessage } from "./MessageBubble";
import { useViewport } from "@/app/hooks/useViewport";

export default function VoiceAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  
  const messageIdCounter = useRef(0);
  const { isMobile } = useViewport();

  const conversation = useConversation({
    onConnect: () => {
      console.log("[DRAGONS-DEN] WebSocket Connected");
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      console.log("[DRAGONS-DEN] WebSocket Disconnected");
      setConnectionStatus("disconnected");
    },
    onMessage: (message) => {
      console.log("[DRAGONS-DEN] Message:", message);
      const text = message.message || (message as any).text || "";
      if (!text) return;
      setMessages((prev) => [...prev, { id: `msg-${messageIdCounter.current++}`, role: message.source === "user" ? "user" : "agent", text, isFinal: true }]);
    },
    onError: (error) => {
      console.error("[DRAGONS-DEN] Error:", error);
    }
  });

  const handleConnect = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      const res = await fetch("/api/get-signed-url");
      const { signedUrl } = await res.json();
      
      console.log("[DRAGONS-DEN] Starting...");
      await conversation.startSession({ signedUrl });
    } catch (e) {
      setConnectionStatus("disconnected");
    }
  }, [conversation]);

  const handleDisconnect = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="relative w-full h-screen bg-black">
      <OrbBackground palette={5} inputVolume={0} outputVolume={0} isSpeaking={conversation.isSpeaking} isConnected={connectionStatus === "connected"} onPaletteChange={() => {}} isMobile={isMobile} lowPerformance={false} />
      <Logo />
      <GlassChat 
        messages={messages} 
        status={connectionStatus} 
        isSpeaking={conversation.isSpeaking} 
        onConnect={handleConnect} 
        onDisconnect={handleDisconnect} 
        onSendMessage={(text) => {
          conversation.sendUserMessage(text);
          setMessages(prev => [...prev, { id: `msg-${messageIdCounter.current++}`, role: "user", text, isFinal: true }]);
        }} 
        onClearMessages={() => setMessages([])} 
        onChatOpenChange={() => {}} 
      />
    </div>
  );
}
