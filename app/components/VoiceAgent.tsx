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
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  
  const messageIdCounter = useRef(0);
  const isConnectedRef = useRef(false);
  const { isMobile } = useViewport();

  const conversation = useConversation({
    onConnect: () => {
      console.log("[CRITICAL] WebSocket Connected");
      isConnectedRef.current = true;
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      console.log("[CRITICAL] WebSocket Disconnected");
      isConnectedRef.current = false;
      setConnectionStatus("disconnected");
    },
    onMessage: (message) => {
      console.log("[CRITICAL] Message Event:", message);
      // SDK might put text in 'message' or 'text'
      const text = message.message || (message as any).text || "";
      if (!text) return;

      setMessages((prev) => {
        const id = `msg-${messageIdCounter.current++}`;
        const role = message.source === "user" ? "user" : "agent";
        return [...prev, { id, role, text, isFinal: true }];
      });
    },
    onError: (error) => {
      console.error("[CRITICAL] SDK Error:", error);
    }
  });

  const handleConnect = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      const res = await fetch("/api/get-signed-url");
      const { signedUrl } = await res.json();
      
      console.log("[CRITICAL] Starting session with overrides...");
      await conversation.startSession({ 
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: "Your name is Ray. You are a dry Aussie bloke. Respond to everything Leon says. Always give a response." },
            firstMessage: "Yeah Leon, engine's idling. What've you got?",
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

  const handleSendMessage = useCallback((text: string) => {
    conversation.sendUserMessage(text);
    setMessages(prev => [...prev, { id: `msg-${messageIdCounter.current++}`, role: "user", text, isFinal: true }]);
  }, [conversation]);

  return (
    <div className="relative w-full h-screen bg-black">
      <OrbBackground palette={5} inputVolume={inputVolume} outputVolume={outputVolume} isSpeaking={conversation.isSpeaking} isConnected={connectionStatus === "connected"} onPaletteChange={() => {}} isMobile={isMobile} lowPerformance={false} />
      <Logo />
      <GlassChat messages={messages} status={connectionStatus} isSpeaking={conversation.isSpeaking} onConnect={handleConnect} onDisconnect={handleDisconnect} onSendMessage={handleSendMessage} onClearMessages={() => setMessages([])} onChatOpenChange={() => {}} />
    </div>
  );
}
