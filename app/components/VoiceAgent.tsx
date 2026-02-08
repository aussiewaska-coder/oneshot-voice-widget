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
      console.log("[DRAGONS-DEN] Connected!");
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      console.log("[DRAGONS-DEN] Disconnected");
      setConnectionStatus("disconnected");
    },
    onMessage: (message) => {
      console.log("[DRAGONS-DEN] Raw Message:", message);
      const text = message.message || (message as any).text || "";
      if (!text) return;

      const id = `msg-${messageIdCounter.current++}`;
      const role = message.source === "user" ? "user" : "agent";
      setMessages((prev) => [...prev, { id, role, text, isFinal: true }]);
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
      
      await conversation.startSession({ 
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: "You are Ray. Keep responses extremely short and direct." },
            firstMessage: "Ready to go.",
          }
        }
      });
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
