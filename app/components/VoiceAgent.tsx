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
  
  const animFrameRef = useRef<number | null>(null);
  const messageIdCounter = useRef(0);
  const isConnectedRef = useRef(false);
  const { isMobile } = useViewport();

  const conversation = useConversation({
    onConnect: () => {
      console.log("[EL] Connected");
      isConnectedRef.current = true;
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      console.log("[EL] Disconnected");
      isConnectedRef.current = false;
      setConnectionStatus("disconnected");
      setInputVolume(0);
      setOutputVolume(0);
    },
    onMessage: (message) => {
      console.log("[EL] Message:", message);
      const id = `msg-${messageIdCounter.current++}`;
      const role = message.source === "user" ? "user" : "agent";
      setMessages((prev) => [...prev, { id, role, text: message.message, isFinal: true }]);
    },
    onError: (error) => {
      console.error("[EL] Error:", error);
      setConnectionStatus("disconnected");
    },
  });

  const pollVolume = useCallback(() => {
    if (!isConnectedRef.current) return;
    try {
      setInputVolume(conversation.getInputVolume());
      setOutputVolume(conversation.getOutputVolume());
    } catch {}
    animFrameRef.current = requestAnimationFrame(pollVolume);
  }, [conversation]);

  useEffect(() => {
    if (connectionStatus === "connected") {
      animFrameRef.current = requestAnimationFrame(pollVolume);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [connectionStatus, pollVolume]);

  const handleConnect = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      const res = await fetch("/api/get-signed-url");
      const { signedUrl } = await res.json();
      
      await conversation.startSession({ 
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: "You are Ray Shoesmith. Direct, dry, and efficient. Speak like a regular Aussie bloke. Keep it short." },
            first_message: "Yeah, I'm here. What's the go?",
          }
        }
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionStatus("disconnected");
    }
  }, [conversation]);

  const handleDisconnect = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <OrbBackground palette={5} inputVolume={inputVolume} outputVolume={outputVolume} isSpeaking={conversation.isSpeaking} isConnected={connectionStatus === "connected"} onPaletteChange={() => {}} isMobile={isMobile} lowPerformance={false} />
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
