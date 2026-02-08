"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import OrbBackground from "./OrbBackground";
import GlassChat from "./GlassChat";
import PaletteSwitcher from "./PaletteSwitcher";
import { ChatMessage } from "./MessageBubble";

// Fire-and-forget save — never blocks the conversation
function persistTurn(role: "user" | "agent", text: string) {
  fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, text }),
  }).catch(() => {
    // Memory loss is acceptable; blocking conversation is not
  });
}

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
  const isConnectedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setInputVolume(0);
    setOutputVolume(0);
  }, []);

  // Load previous conversation into the chat panel on mount
  useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data) => {
        if (data.turns && data.turns.length > 0) {
          const loaded: ChatMessage[] = data.turns.map(
            (t: { role: string; text: string }, i: number) => ({
              id: `history-${i}`,
              role: t.role as "user" | "agent",
              text: t.text,
              isFinal: true,
            })
          );
          setMessages(loaded);
          messageIdCounter.current = loaded.length;
        }
      })
      .catch(() => {});
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

      // Persist every turn to disk immediately
      persistTurn(role, message.message);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      isConnectedRef.current = false;
      stopPolling();
      setConnectionStatus("disconnected");
    },
  });

  // Volume polling
  const pollVolume = useCallback(() => {
    if (!isConnectedRef.current) {
      animFrameRef.current = null;
      return;
    }
    try {
      setInputVolume(conversation.getInputVolume());
      setOutputVolume(conversation.getOutputVolume());
    } catch {
      // WebSocket may have closed
    }
    animFrameRef.current = requestAnimationFrame(pollVolume);
  }, [conversation]);

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

      // Fetch signed URL, mic permission, and memory in parallel
      const [urlRes, memRes] = await Promise.all([
        fetch("/api/get-signed-url"),
        fetch("/api/memory").catch(() => null),
        navigator.mediaDevices.getUserMedia({ audio: true }),
      ]);

      if (!urlRes.ok) throw new Error("Failed to get signed URL");
      const { signedUrl } = await urlRes.json();

      // Build overrides if we have conversation history
      let overrides: Record<string, unknown> | undefined;
      if (memRes && memRes.ok) {
        const memData = await memRes.json();
        if (memData.contextPrompt) {
          overrides = {
            agent: {
              prompt: {
                prompt: memData.contextPrompt,
              },
            },
          };
        }
      }

      await conversation.startSession({ signedUrl, overrides });
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionStatus("disconnected");
    }
  }, [conversation]);

  const handleDisconnect = useCallback(async () => {
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
      // Typed messages also get persisted
      persistTurn("user", text);
    },
    [conversation]
  );

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
        onToggleMic={handleToggleMic}
      />
    </div>
  );
}
