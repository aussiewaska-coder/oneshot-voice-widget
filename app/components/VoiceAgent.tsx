"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import OrbBackground from "./OrbBackground";
import GlassChat from "./GlassChat";
import PaletteSwitcher from "./PaletteSwitcher";
import HackerLog from "./HackerLog";
import { ChatMessage } from "./MessageBubble";

// Fire-and-forget save — never blocks the conversation
function persistTurn(role: "user" | "agent", text: string) {
  const log = (window as any).hackerLog;
  log?.(`[REDIS] WRITE ${role.toUpperCase()} → "${text.substring(0, 60)}${text.length > 60 ? "..." : ""}"`, "debug");
  fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, text }),
  })
    .then((res) => {
      if (res.ok) {
        log?.(`[REDIS] ✓ COMMITTED to persistent store`, "success");
      } else {
        log?.(`[REDIS] ✗ HTTP ${res.status}`, "error");
      }
    })
    .catch((err) => log?.(`[REDIS] ✗ WRITE FAILED: ${err.message}`, "error"));
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
    const log = (window as any).hackerLog;
    log?.(`[REDIS] QUERYING persistent conversation history...`, "debug");
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data) => {
        if (data.turns && data.turns.length > 0) {
          log?.(`[REDIS] ✓ LOADED ${data.turns.length} turns (${data.totalTurns} total lifetime)`, "success");
          data.turns.forEach((t: any, i: number) => {
            log?.(`  [${i + 1}] ${t.role.toUpperCase()}: "${t.text.substring(0, 50)}${t.text.length > 50 ? "..." : ""}"`, "info");
          });
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
        } else {
          log?.(`[REDIS] → empty (first conversation)`, "debug");
        }
      })
      .catch((err) => log?.(`[REDIS] ✗ LOAD FAILED: ${err.message}`, "error"));
  }, []);

  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      const log = (window as any).hackerLog;
      log?.(`[WEBSOCKET] connected to agent`, "success");
      isConnectedRef.current = true;
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      const log = (window as any).hackerLog;
      log?.(`[WEBSOCKET] disconnected`, "debug");
      isConnectedRef.current = false;
      stopPolling();
      setConnectionStatus("disconnected");
    },
    onMessage: (message) => {
      const log = (window as any).hackerLog;
      const id = `msg-${messageIdCounter.current++}`;
      const role = message.source === "user" ? "user" : "agent";

      log?.(`[MESSAGE] ${role}: "${message.message.substring(0, 50)}${message.message.length > 50 ? "..." : ""}"`, "info");

      setMessages((prev) => [
        ...prev,
        { id, role, text: message.message, isFinal: true },
      ]);

      // Persist every turn to disk immediately
      persistTurn(role, message.message);
    },
    onError: (error) => {
      const log = (window as any).hackerLog;
      log?.(`[ERROR] ${error}`, "error");
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
    const log = (window as any).hackerLog;
    try {
      log?.(`[CONNECT] requesting mic permission...`, "debug");
      setConnectionStatus("connecting");

      // Fetch signed URL, mic permission, and memory in parallel
      const [urlRes, memRes] = await Promise.all([
        fetch("/api/get-signed-url").then((r) => {
          log?.(`[API] GET /api/get-signed-url`, "debug");
          return r;
        }),
        fetch("/api/memory")
          .then((r) => {
            log?.(`[API] GET /api/memory`, "debug");
            return r;
          })
          .catch(() => null),
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          log?.(`[MIC] permission granted`, "success");
          stream.getTracks().forEach((t) => t.stop()); // Stop preview tracks
          return undefined;
        }),
      ]);

      if (!urlRes.ok) throw new Error("Failed to get signed URL");
      const { signedUrl } = await urlRes.json();
      log?.(`[SESSION] obtained signed url`, "success");

      // Build overrides if we have conversation history
      let overrides: Record<string, unknown> | undefined;
      if (memRes && memRes.ok) {
        const memData = await memRes.json();
        if (memData.contextPrompt) {
          log?.(`[REDIS] ✓ BUILDING prompt override with ${memData.turns?.length || 0} conversation turns`, "success");
          log?.(`[REDIS] context size: ${memData.contextPrompt.length} chars`, "debug");
          log?.(`[REDIS] total lifetime turns: ${memData.totalTurns}`, "info");
          if (memData.trimmedAt) {
            log?.(`[REDIS] last trimmed: ${memData.trimmedAt}`, "debug");
          }
          overrides = {
            agent: {
              prompt: {
                prompt: memData.contextPrompt,
              },
            },
          };
        } else {
          log?.(`[REDIS] → no prior context (fresh session)`, "debug");
        }
      }

      log?.(`[SESSION] initiating websocket with redis context...`, "debug");
      await conversation.startSession({ signedUrl, overrides });
      log?.(`[REDIS] ✓ CONTEXT INJECTED into agent prompt`, "success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log?.(`[CONNECT] failed: ${msg}`, "error");
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
      <HackerLog />
    </div>
  );
}
