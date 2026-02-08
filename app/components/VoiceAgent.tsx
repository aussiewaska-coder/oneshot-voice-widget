"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import OrbBackground from "./OrbBackground";
import GlassChat from "./GlassChat";
import PaletteSwitcher from "./PaletteSwitcher";
import HackerLog from "./HackerLog";
import Logo from "./Logo";
import FadeIn from "./FadeIn";
import DocModal from "./DocModal";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { ChatMessage } from "./MessageBubble";
import type { SystemHealth } from "./HealthDashboard";
import type { LogEntry } from "./HackerLog";
import { useViewport } from "@/app/hooks/useViewport";
import { usePerformanceMode } from "@/app/hooks/usePerformanceMode";

// Fire-and-forget save — never blocks the conversation
function persistTurn(role: "user" | "agent", text: string, onWriteSuccess?: (layer: "redis" | "local-fs") => void) {
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
        onWriteSuccess?.("redis");
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [memoryLayer, setMemoryLayer] = useState<"redis" | "local-fs" | "in-memory">("in-memory");
  const [memoryTurns, setMemoryTurns] = useState(0);
  const [memoryWriteSuccess, setMemoryWriteSuccess] = useState(false);
  const [logStats, setLogStats] = useState({ errorCount: 0, warningCount: 0 });
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1); // For shared font size control
  const [logs, setLogs] = useState<LogEntry[]>([]); // Shared logs state for mobile

  const animFrameRef = useRef<number | null>(null);
  const messageIdCounter = useRef(0);
  const isConnectedRef = useRef(false);
  const contextInjectedRef = useRef(false);
  const pendingContextRef = useRef<string | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number | null>(null);
  const commandPressedRef = useRef(false);
  const commandMutedRef = useRef(false);
  const lastCommandPressRef = useRef(0);

  // Responsive hooks
  const { isMobile } = useViewport();
  const { isLowPerformance } = usePerformanceMode();

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

  // Sync logs from window to state (for mobile tab)
  // HackerLog manages its own state, but we need access for mobile
  useEffect(() => {
    // Expose a function to update shared logs state
    (window as any).setSharedLogs = (newLogs: LogEntry[]) => {
      setLogs(newLogs);
    };

    return () => {
      delete (window as any).setSharedLogs;
    };
  }, []);

  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      const log = (window as any).hackerLog;
      log?.(`[WEBSOCKET] connected to agent`, "success");
      isConnectedRef.current = true;
      connectionStartTimeRef.current = Date.now();
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
      connectionStartTimeRef.current = null;
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
      persistTurn(role, message.message, (layer) => {
        setMemoryLayer(layer);
        setMemoryWriteSuccess(true);
      });
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
        setMemoryTurns(memData.totalTurns || 0);
        setMemoryLayer("redis");
        setMemoryWriteSuccess(true);
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
      } else {
        // Redis failed, try to detect fallback layer
        setMemoryLayer("local-fs");
        setMemoryWriteSuccess(false);
      }

      // Check mic permission
      try {
        const micPerm = await navigator.permissions.query({ name: "microphone" });
        setMicPermission(micPerm.state as "granted" | "denied" | "prompt");
      } catch (err) {
        // Some browsers don't support permission query
        setMicPermission("prompt");
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
      persistTurn("user", text, (layer) => {
        setMemoryLayer(layer);
        setMemoryWriteSuccess(true);
      });
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

  // Compute health data on-demand
  const health = useMemo(() => {
    if (typeof window === "undefined") {
      // Return default health during SSR
      return {
        connection: { status: "offline" as const, wsStatus: "disconnected" as const, uptimeMs: 0, lastConnected: null },
        memory: { status: "offline" as const, activeLayer: "in-memory" as const, totalTurns: 0, lastWriteSuccess: false },
        audio: { status: "offline" as const, micPermission: "prompt" as const, micMuted: false, inputActive: false, outputActive: false },
        logs: { status: "healthy" as const, errorCount: 0, warningCount: 0 },
        overall: "offline" as const,
      };
    }

    const log = (window as any).hackerLog as any;
    const logs = log?.logs || [];
    const errorCount = logs.filter((l: any) => l.type === "error").length;
    const warningCount = logs.filter((l: any) => l.type === "debug").length;

    const connectionUptimeMs =
      connectionStartTimeRef.current && connectionStatus === "connected"
        ? Date.now() - connectionStartTimeRef.current
        : 0;

    const health: SystemHealth = {
      connection: {
        status:
          connectionStatus === "connected"
            ? "healthy"
            : connectionStatus === "connecting"
              ? "degraded"
              : "offline",
        wsStatus: connectionStatus as "connected" | "disconnected" | "connecting",
        uptimeMs: connectionUptimeMs,
        lastConnected: connectionStatus === "connected" ? new Date().toLocaleTimeString() : null,
      },
      memory: {
        status: memoryWriteSuccess ? "healthy" : "degraded",
        activeLayer: memoryLayer,
        totalTurns: memoryTurns,
        lastWriteSuccess: memoryWriteSuccess,
      },
      audio: {
        status:
          micPermission === "denied"
            ? "offline"
            : micMuted || (!inputVolume && !outputVolume)
              ? "degraded"
              : "healthy",
        micPermission,
        micMuted,
        inputActive: inputVolume > 0.05,
        outputActive: outputVolume > 0.05,
      },
      logs: {
        status: errorCount > 5 ? "critical" : errorCount > 0 || warningCount > 3 ? "warning" : "healthy",
        errorCount,
        warningCount,
      },
      overall: "healthy" as const,
    };

    // Compute overall status
    const statuses = [
      health.connection.status,
      health.memory.status,
      health.audio.status,
      health.logs.status,
    ];
    if (statuses.includes("offline") && connectionStatus === "disconnected") {
      health.overall = "offline";
    } else if (statuses.includes("critical")) {
      health.overall = "critical";
    } else if (statuses.includes("degraded") || statuses.includes("warning")) {
      health.overall = "degraded";
    }

    return health;
  }, [
    connectionStatus,
    connectionStartTimeRef,
    inputVolume,
    outputVolume,
    micMuted,
    micPermission,
    memoryLayer,
    memoryTurns,
    memoryWriteSuccess,
  ]);

  // Expose toggleDocModal to window
  useEffect(() => {
    (window as any).toggleDocModal = () => {
      setDocModalOpen((prev) => !prev);
    };
    return () => {
      delete (window as any).toggleDocModal;
    };
  }, []);

  // Keyboard shortcuts: Spacebar (connect/disconnect), ArrowLeft (open chat), ArrowRight (close chat), Up/Down (scroll), Tab (close docs first, then logs), D (doc modal), Command (hold to mute, double-tap to toggle)
  useEffect(() => {
    const log = (window as any).hackerLog;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Command key (Meta) - hold to mute, double-tap to toggle
      if (e.code === "MetaLeft" || e.code === "MetaRight") {
        const now = Date.now();
        const timeSinceLastPress = now - lastCommandPressRef.current;

        // Double-tap detection (within 300ms)
        if (timeSinceLastPress < 300 && timeSinceLastPress > 0) {
          e.preventDefault();
          // Toggle mute
          setMicMuted((prev) => !prev);
          commandMutedRef.current = false;
          log?.(`[MIC] toggled mute to ${!micMuted}`, "info");
        } else {
          // Single press - mute while held
          commandPressedRef.current = true;
          if (!commandMutedRef.current) {
            commandMutedRef.current = true;
            setMicMuted(true);
            log?.(`[MIC] muted (hold Command)`, "debug");
          }
        }

        lastCommandPressRef.current = now;
        return;
      }

      if (e.code === "Space" && !connectionStatus.includes("nnecting")) {
        e.preventDefault();
        if (connectionStatus === "connected") {
          handleDisconnect();
        } else {
          handleConnect();
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        (window as any).openChat?.();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        (window as any).closeChat?.();
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        (window as any).scrollChatUp?.();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        (window as any).scrollChatDown?.();
      } else if (e.code === "Tab") {
        e.preventDefault();
        // Close doc modal first, then toggle logs
        if (docModalOpen) {
          setDocModalOpen(false);
        } else {
          (window as any).toggleHackerLog?.();
        }
      } else if (e.code === "KeyD" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        (window as any).toggleDocModal?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release mute when Command is released
      if (e.code === "MetaLeft" || e.code === "MetaRight") {
        commandPressedRef.current = false;
        if (commandMutedRef.current) {
          // Only unmute if it was muted by holding Command (not by toggle)
          const timeSincePress = Date.now() - lastCommandPressRef.current;
          if (timeSincePress > 50) {
            // Give some time buffer to detect double-tap
            setMicMuted(false);
            commandMutedRef.current = false;
            const log = (window as any).hackerLog;
            log?.(`[MIC] unmuted (released Command)`, "debug");
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [connectionStatus, handleConnect, handleDisconnect, docModalOpen, micMuted]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ height: "100dvh" }}>
      <FadeIn />

      {/* Orb - always shown, sizing changes based on viewport */}
      <OrbBackground
        palette={palette}
        inputVolume={inputVolume}
        outputVolume={outputVolume}
        isSpeaking={conversation.isSpeaking}
        isConnected={connectionStatus === "connected"}
        onPaletteChange={setPalette}
        isMobile={isMobile}
        lowPerformance={isLowPerformance}
      />

      {/* Logo - always shown */}
      <Logo />

      {/* Desktop Layout (>= 1024px) */}
      {!isMobile && (
        <>
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
            onClearMessages={handleClearMessages}
            onChatOpenChange={setIsChatOpen}
          />
          <HackerLog
            palette={palette}
            onPaletteChange={setPalette}
            connectionStatus={connectionStatus}
          />
        </>
      )}

      {/* Mobile Layout (< 1024px) */}
      {isMobile && (
        <MobileBottomSheet
          messages={messages}
          status={connectionStatus}
          isSpeaking={conversation.isSpeaking}
          micMuted={micMuted}
          logs={logs}
          health={health}
          fontSizeMultiplier={fontSizeMultiplier}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onSendMessage={handleSendMessage}
          onToggleMic={handleToggleMic}
          onClearMessages={handleClearMessages}
          onFontSizeChange={setFontSizeMultiplier}
          lowPerformance={isLowPerformance}
        />
      )}

      {/* Modals - shown on all layouts */}
      <DocModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        health={health}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
