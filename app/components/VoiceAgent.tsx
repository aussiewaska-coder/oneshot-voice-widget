"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import OrbBackground from "./OrbBackground";
import GlassChat from "./GlassChat";
import PaletteSwitcher from "./PaletteSwitcher";
import { ChatMessage } from "./MessageBubble";

export default function VoiceAgent() {
  const [palette, setPalette] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");

  const animFrameRef = useRef<number | null>(null);
  const messageIdCounter = useRef(0);
  // Synchronous flag the RAF loop can check without waiting for React state
  const isConnectedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setInputVolume(0);
    setOutputVolume(0);
  }, []);

  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      isConnectedRef.current = true;
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      isConnectedRef.current = false;
      stopPolling();
      setConnectionStatus("disconnected");
    },
    onMessage: (message) => {
      const id = `msg-${messageIdCounter.current++}`;
      const role = message.source === "user" ? "user" : "agent";
      setMessages((prev) => [
        ...prev,
        { id, role, text: message.message, isFinal: true },
      ]);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      isConnectedRef.current = false;
      stopPolling();
      setConnectionStatus("disconnected");
    },
  });

  // Volume polling via requestAnimationFrame — guards with synchronous ref
  const pollVolume = useCallback(() => {
    if (!isConnectedRef.current) {
      animFrameRef.current = null;
      return;
    }
    try {
      setInputVolume(conversation.getInputVolume());
      setOutputVolume(conversation.getOutputVolume());
    } catch {
      // WebSocket may have closed between the ref check and the call
    }
    animFrameRef.current = requestAnimationFrame(pollVolume);
  }, [conversation]);

  // Start volume polling when connected
  useEffect(() => {
    if (connectionStatus === "connected") {
      animFrameRef.current = requestAnimationFrame(pollVolume);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [connectionStatus, pollVolume]);

  const handleConnect = useCallback(async () => {
    try {
      setConnectionStatus("connecting");

      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Fetch signed URL from our API route
      const response = await fetch("/api/get-signed-url");
      if (!response.ok) throw new Error("Failed to get signed URL");
      const { signedUrl } = await response.json();

      // Start conversation session
      await conversation.startSession({
        signedUrl,
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionStatus("disconnected");
    }
  }, [conversation]);

  const handleDisconnect = useCallback(async () => {
    // Stop polling immediately — don't wait for onDisconnect callback
    isConnectedRef.current = false;
    stopPolling();
    await conversation.endSession();
  }, [conversation, stopPolling]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!isConnectedRef.current) return;
      conversation.sendUserMessage(text);
      const id = `msg-${messageIdCounter.current++}`;
      setMessages((prev) => [
        ...prev,
        { id, role: "user", text, isFinal: true },
      ]);
    },
    [conversation]
  );

  const handleSendActivity = useCallback(() => {
    if (!isConnectedRef.current) return;
    try {
      conversation.sendUserActivity();
    } catch {
      // Swallow if WS already closed
    }
  }, [conversation]);

  const handleToggleMic = useCallback(() => {
    setMicMuted((prev) => !prev);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <OrbBackground
        palette={palette}
        inputVolume={inputVolume}
        outputVolume={outputVolume}
        isSpeaking={conversation.isSpeaking}
        isConnected={connectionStatus === "connected"}
      />
      <PaletteSwitcher activePalette={palette} onPaletteChange={setPalette} />
      <GlassChat
        messages={messages}
        status={connectionStatus}
        isSpeaking={conversation.isSpeaking}
        micMuted={micMuted}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSendMessage={handleSendMessage}
        onSendActivity={handleSendActivity}
        onToggleMic={handleToggleMic}
      />
    </div>
  );
}
