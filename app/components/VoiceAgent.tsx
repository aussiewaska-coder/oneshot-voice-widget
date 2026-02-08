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

  // THE BRAIN: ElevenLabs SDK handles the heavy lifting
  const conversation = useConversation({
    onConnect: () => {
      console.log("[DEBUG] WebSocket Connected");
      isConnectedRef.current = true;
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      console.log("[DEBUG] WebSocket Disconnected");
      isConnectedRef.current = false;
      setConnectionStatus("disconnected");
      setInputVolume(0);
      setOutputVolume(0);
    },
    onMessage: (message) => {
      console.log("[DEBUG] Message Received:", message);
      // Ensure we catch whatever text property ElevenLabs sends
      const text = message.message || (message as any).text;
      if (!text) return;

      const id = `msg-${messageIdCounter.current++}`;
      const role = message.source === "user" ? "user" : "agent";
      
      // Update UI
      setMessages((prev) => [...prev, { id, role, text, isFinal: true }]);
    },
    onError: (error) => {
      console.error("[DEBUG] ElevenLabs Error:", error);
      setConnectionStatus("disconnected");
    },
  });

  // VOLUME POLLING (For the Orb visualization)
  const pollVolume = useCallback(() => {
    if (!isConnectedRef.current) return;
    try {
      setInputVolume(conversation.getInputVolume());
      setOutputVolume(conversation.getOutputVolume());
    } catch (e) {}
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
      
      // 1. Get the authenticated URL from your backend
      const res = await fetch("/api/get-signed-url");
      if (!res.ok) throw new Error("Failed to get signed URL");
      const { signedUrl } = await res.json();
      
      console.log("[DEBUG] Starting Session...");
      
      // 2. Start the conversation with a clean prompt
      // We force Ray's persona here so it's not buried in complex history logic
      await conversation.startSession({ 
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: "You are Ray Shoesmith. Direct, dry, and efficient. Speak like a regular Aussie bloke. Keep it short. Most importantly: RESPOND TO EVERY USER INPUT." },
            first_message: "Yeah, it's Ray. I'm on the bike and ready. What've you got for me?",
          }
        }
      });
    } catch (error) {
      console.error("[DEBUG] Connection Flow Failed:", error);
      setConnectionStatus("disconnected");
    }
  }, [conversation]);

  const handleDisconnect = useCallback(async () => {
    console.log("[DEBUG] Ending Session...");
    await conversation.endSession();
  }, [conversation]);

  const handleSendMessage = useCallback((text: string) => {
    if (!isConnectedRef.current) return;
    console.log("[DEBUG] Sending user text:", text);
    
    // Send to ElevenLabs
    conversation.sendUserMessage(text);
    
    // Add to local UI immediately
    const id = `msg-${messageIdCounter.current++}`;
    setMessages(prev => [...prev, { id, role: "user", text, isFinal: true }]);
  }, [conversation]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Visual background and Orb */}
      <OrbBackground 
        palette={5} 
        inputVolume={inputVolume} 
        outputVolume={outputVolume} 
        isSpeaking={conversation.isSpeaking} 
        isConnected={connectionStatus === "connected"} 
        onPaletteChange={() => {}} 
        isMobile={isMobile} 
        lowPerformance={false} 
      />
      
      <Logo />

      {/* The actual chat window component */}
      <GlassChat 
        messages={messages} 
        status={connectionStatus} 
        isSpeaking={conversation.isSpeaking} 
        onConnect={handleConnect} 
        onDisconnect={handleDisconnect} 
        onSendMessage={handleSendMessage} 
        onClearMessages={() => setMessages([])} 
        onChatOpenChange={() => {}} 
      />
    </div>
  );
}
