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
  const contextInjectedRef = useRef(false);
  const pendingContextRef = useRef<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

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

  // Heartbeat to keep connection alive (every 1 minute)
  useEffect(() => {
    if (connectionStatus === "connected") {
      const log = (window as any).hackerLog;
      heartbeatRef.current = setInterval(() => {
        try {
          // Send a keep-alive context update to prevent timeout
          conversation.sendContextualUpdate(".");
          log?.(`[HEARTBEAT] keep-alive sent`, "debug");
        } catch (err) {
          log?.(`[HEARTBEAT] failed: ${err}`, "debug");
        }
      }, 60000); // 60 seconds = 1 minute
    }
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [connectionStatus, conversation]);

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
      let customFirstMessage: string | null = null;
      let customSystemPrompt: string | null = null;

      if (memRes && memRes.ok) {
        const memData = await memRes.json();
        if (memData.turns && memData.turns.length > 0) {
          log?.(`[REDIS] ✓ LOADED ${memData.turns.length} turns for override`, "success");
          log?.(`[REDIS] total lifetime turns: ${memData.totalTurns}`, "info");

          // Build a custom first message that acknowledges the conversation history
          // Use agent's last response as context (more meaningful than user's last message)
          const lastAgentMsg = memData.turns.filter((t: any) => t.role === "agent").pop();
          const lastUserMsg = memData.turns.filter((t: any) => t.role === "user").pop();

          if (lastAgentMsg) {
            // Extract first meaningful phrase from agent's last response (first sentence or ~60 chars)
            const agentText = lastAgentMsg.text;
            const firstSentence = agentText.split(/[.!?]+/)[0] || agentText.substring(0, 60);
            const snippet = firstSentence.substring(0, 60);
            customFirstMessage = `Alright mate, we were just talking about ${snippet.toLowerCase()}${snippet.length === 60 ? "..." : ""} Where were we?`;
            log?.(`[OVERRIDE] Custom first message generated from agent context`, "success");
            log?.(`  "${customFirstMessage}"`, "info");
          } else if (lastUserMsg) {
            // Fallback to user message if no agent message
            const snippet = lastUserMsg.text.substring(0, 50);
            customFirstMessage = `Gday, back for more? We were discussing "${snippet}${lastUserMsg.text.length > 50 ? "..." : ""}"`;
            log?.(`[OVERRIDE] Custom first message generated from user context`, "success");
            log?.(`  "${customFirstMessage}"`, "info");
          } else {
            log?.(`[REDIS] → no messages in history, using default first message`, "debug");
          }

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

      log?.(`[SESSION] initiating websocket${customFirstMessage ? " with context" : ""}...`, "debug");

      // Build session config with overrides (both firstMessage and system prompt)
      const sessionConfig: any = { signedUrl };
      if (customFirstMessage || customSystemPrompt) {
        sessionConfig.overrides = {
          agent: {
            ...(customFirstMessage && { firstMessage: customFirstMessage }),
            ...(customSystemPrompt && { prompt: { prompt: customSystemPrompt } }),
          },
        };
        log?.(`[OVERRIDES] Applied to startSession config`, "debug");
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
