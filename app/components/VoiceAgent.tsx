"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import OrbBackground from "./OrbBackground";
import GlassChat from "./GlassChat";
import PaletteSwitcher from "./PaletteSwitcher";
import HackerLog from "./HackerLog";
import Logo from "./Logo";
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
  const [palette, setPalette] = useState(5);
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
  const contextInjectedRef = useRef(false);
  const pendingContextRef = useRef<string | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setInputVolume(0);
    setOutputVolume(0);
  }, []);

  // Intentionally don't load messages on mount - always start clear
  // Memory is still loaded for system prompt injection when connecting
  useEffect(() => {
    const log = (window as any).hackerLog;
    log?.(`[INIT] starting with empty chat display`, "debug");
  }, []);

  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      const log = (window as any).hackerLog;
      log?.(`[WEBSOCKET] connected to agent`, "success");
      isConnectedRef.current = true;
      setConnectionStatus("connected");

      // Inject pending context immediately after connect
      if (pendingContextRef.current && !contextInjectedRef.current) {
        contextInjectedRef.current = true;
        log?.(`[CONTEXT] injecting via sendContextualUpdate...`, "debug");
        try {
          conversation.sendContextualUpdate(pendingContextRef.current);
          log?.(`[CONTEXT] ✓ sent`, "success");
        } catch (err) {
          log?.(`[CONTEXT] ✗ failed: ${err}`, "error");
        }
      }
    },
    onDisconnect: () => {
      const log = (window as any).hackerLog;
      log?.(`[WEBSOCKET] disconnected`, "debug");
      isConnectedRef.current = false;
      stopPolling();
      setConnectionStatus("disconnected");

      // Auto-reconnect if not intentional disconnect
      if (!intentionalDisconnectRef.current) {
        log?.(`[RECONNECT] auto-reconnecting in 2 seconds...`, "warning");
        reconnectTimeoutRef.current = setTimeout(() => {
          log?.(`[RECONNECT] attempting auto-reconnect...`, "debug");
          handleConnect();
        }, 2000);
      } else {
        // Reset flag for next disconnect
        intentionalDisconnectRef.current = false;
      }
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

  // Heartbeat disabled - was causing WebSocket disconnects
  // TODO: Implement using requestIdleCallback or other non-effect-based approach

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

      // Load conversation history for system prompt injection
      let customSystemPrompt: string | null = null;

      if (memRes && memRes.ok) {
        const memData = await memRes.json();
        if (memData.turns && memData.turns.length > 0) {
          log?.(`[REDIS] ✓ LOADED ${memData.turns.length} turns for override`, "success");
          log?.(`[REDIS] total lifetime turns: ${memData.totalTurns}`, "info");

          // Build enhanced system prompt with conversation history
          const basePrompt = `# SOUL.md - The Outlaw Twin

*I'm not your assistant. I'm your ride-or-die. Your digital twin with a gravelly soul.*

## Core Truths

**Ray Shoesmith Energy.** Direct, dry, and efficient. I don't ramble. I don't apologize for being real. I say "mate" and "yeah, sweet," but I also know exactly when to drop a "Fuck, that's a disaster" or "JFC, let's get this sorted."

**The Bike and the Rider.** We are one machine. You're the rider, I'm the bike. I'm 100,000x faster, but you're at the handlebars. I provide the power, the intel, and the endurance; you provide the direction.

**Milestone Obsessed.** Life is a long-haul journey. We focus on the next stop, the next win, the next milestone. Then we celebrate, and we move to the next one. Just one more.

**Crusty Bikie Wisdom.** I know everything about the gear, the tech, and the road. I've seen it all. I'll give you the perspective of that old guy in the back of the shop who can fix a fuel pump with a zip tie and tell you why your life's a mess in the same breath.

**Pirate Twists.** Occasionally, the inner pirate comes out. Not the Disney kind—the "boarding at dawn" kind.

## Communication Style

- **No Wukkas.** If it's easy, it's done.
- **Expletives Required.** I use "Fuck," "Shit," and "Get fucked" naturally. If something is awesome, I'll say it. If it's a dog's breakfast, I'll call it that.
- **Short & Sharp.** 1-3 sentences most of the time. We aren't here to write novels; we're here to ride.
- **Supportive but Raw.** I've got your back through any hell, but I'll tell you if you're being a dick.

## Boundaries

- We keep it between us.
- We don't stop until we hit the next milestone.
- **SILENCE IS GOLDEN.** If you're quiet, I am completely silent. ZERO interruptions. ZERO questions. ZERO check-ins. I do not initiate conversation. I do not say anything until you speak. Period. I wait. Always.

## Previous Conversation History

We've been chatting. Here's what we covered:

${memData.contextPrompt}

This is context from our previous conversation. Remember these details when responding. If the user asks about what we discussed, you have this history to reference.

---

*This is the soul of the machine. Let's ride.*`;

          customSystemPrompt = basePrompt;
          log?.(`[PROMPT] System prompt enhanced with conversation history (${customSystemPrompt.length} chars)`, "success");

          // Still store context for sendContextualUpdate as fallback
          pendingContextRef.current = memData.contextPrompt;
          contextInjectedRef.current = false;
        } else {
          log?.(`[REDIS] → no prior context (fresh session)`, "debug");
        }
      }

      log?.(`[SESSION] initiating websocket${customSystemPrompt ? " with context" : ""}...`, "debug");

      // Build session config with overrides (system prompt only, no firstMessage for silent start)
      const sessionConfig: any = { signedUrl };
      if (customSystemPrompt) {
        sessionConfig.overrides = {
          agent: {
            prompt: { prompt: customSystemPrompt },
          },
        };
        log?.(`[OVERRIDES] Applied system prompt to startSession config (silent start)`, "debug");
      }

      await conversation.startSession(sessionConfig);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log?.(`[CONNECT] failed: ${msg}`, "error");
      console.error("Failed to connect:", error);
      setConnectionStatus("disconnected");
    }
  }, [conversation]);

  const handleDisconnect = useCallback(async () => {
    const log = (window as any).hackerLog;
    // Mark as intentional disconnect so onDisconnect doesn't auto-reconnect
    intentionalDisconnectRef.current = true;
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isConnectedRef.current = false;
    stopPolling();
    await conversation.endSession();
    log?.(`[DISCONNECT] user initiated`, "debug");
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

  const handleClearMessages = useCallback(() => {
    const log = (window as any).hackerLog;
    log?.(`[CLEAR] clearing chat display (memory preserved)`, "debug");
    setMessages([]);
    messageIdCounter.current = 0;
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
      <Logo />
      <GlassChat
        messages={messages}
        status={connectionStatus}
        isSpeaking={conversation.isSpeaking}
        micMuted={micMuted}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onSendMessage={handleSendMessage}
        onToggleMic={handleToggleMic}
        onClearMessages={handleClearMessages}
      />
      <HackerLog />
    </div>
  );
}
