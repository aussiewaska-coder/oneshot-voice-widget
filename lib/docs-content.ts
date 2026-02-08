/**
 * TugBot System Documentation Content
 * Three-tier explanation levels: Simple, Middle, Complex
 * Used by DocModal component for rendering documentation
 */

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: {
    simple: string;
    middle: string;
    complex: string;
  };
}

export const DOCUMENTATION: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    icon: "🤖",
    content: {
      simple: "TugBot is your voice-powered AI assistant. Just connect, speak naturally, and TugBot understands and responds. It remembers past conversations so you can pick up where you left off.",
      middle: "TugBot is a real-time voice conversational AI integrated with ElevenLabs Conversational AI API. It maintains persistent memory across sessions, automatically reconnects on network drops, and provides a beautiful glassmorphic UI with live volume visualization. Your conversations are stored securely and injected into the agent's system prompt for continuous context.",
      complex: "TugBot orchestrates WebSocket bidirectional communication with ElevenLabs ConvAI servers (signedUrl from /api/get-signed-url). Memory system uses triple-layer persistence: Vercel KV (Redis) → local fs (/data/conversation.json) → in-memory cache. Session initialization injects full conversation history into agent's system prompt via overrides.agent.prompt. Auto-reconnect with 2s delay on unexpected disconnect (flag-based via intentionalDisconnectRef). Volume polling via requestAnimationFrame for smooth 60fps orb visualization.",
    },
  },
  {
    id: "capabilities",
    title: "Capabilities",
    icon: "⚡",
    content: {
      simple: "TugBot can: understand natural speech, respond with voice and text, remember your conversations, suggest relevant topics, and reconnect automatically if connection drops.",
      middle: "Voice I/O with real-time input/output volume metering. Persistent multi-turn conversation memory with trimming to last 50 turns. Auto-reconnect within 2 seconds on unexpected disconnect. Glassmorphic UI with animated orb responding to input/output volume. Multiple color palettes. Session-based context injection with system prompt override. Mic permission handling with mute toggle.",
      complex: "WebSocket message streaming with isFinal detection. Volume sampling at 60fps via requestAnimationFrame (not setInterval—prevents heartbeat conflicts). Memory trimming: saves new turn → checks if >50 → trims oldest → commits to Redis. Auto-reconnect: onDisconnect checks intentionalDisconnectRef → schedules setTimeout(handleConnect, 2000) → uses flag to suppress on user-initiated endSession. System prompt override: builds contextPrompt from memory.turns → injects into startSession({overrides: {agent: {prompt: {prompt: customPrompt}}}}) → agent sees full history from session start.",
    },
  },
  {
    id: "architecture",
    title: "Architecture",
    icon: "🏗️",
    content: {
      simple: "TugBot has three main parts: the Voice Engine (handles connection and audio), the Memory System (remembers conversations), and the UI (lets you interact with TugBot).",
      middle: "VoiceAgent.tsx orchestrates the core: WebSocket connection management, memory loading, system prompt injection, and keyboard shortcuts. GlassChat.tsx provides the UI (messages, buttons, status). OrbBackground.tsx visualizes audio volume in real-time. HackerLog.tsx shows system events for debugging. Memory system (lib/memory.ts) manages Redis/local-fs persistence. Auto-reconnect uses refs to track connection state without intervals.",
      complex: "VoiceAgent: useConversation hook → onConnect/onDisconnect/onMessage/onError callbacks. requestAnimationFrame pollVolume loop (only when connected). handleConnect: parallel fetch(/api/get-signed-url, /api/memory, getUserMedia) → builds customSystemPrompt with contextPrompt → startSession({overrides}) → contextInjectedRef prevents duplicate injections. handleDisconnect: sets intentionalDisconnectRef, clears reconnectTimeoutRef, calls endSession. GlassChat: stateful input, display messages, buttons dispatch callbacks. OrbBackground: SVG orb with morphing paths based on volume (input → left hemisphere, output → right). HackerLog: useEffect exposes window.hackerLog for app-wide logging, window.toggleHackerLog for shortcuts. Memory API: GET /api/memory returns {turns, totalTurns, contextPrompt}, POST /api/memory appends turn.",
    },
  },
  {
    id: "memory",
    title: "Memory & Persistence",
    icon: "💾",
    content: {
      simple: "TugBot remembers everything you say. When you reconnect, it loads your old conversations and reminds itself what you were talking about.",
      middle: "Conversations are stored in three layers: Vercel KV (Redis) as primary, local filesystem as fallback, in-memory cache as final fallback. Each turn (user message or agent response) is persisted immediately. Memory is trimmed to last 50 turns to keep context focused. When connecting, full conversation history is loaded and injected into agent's system prompt as context.",
      complex: "persistTurn(role, text): fire-and-forget POST /api/memory → {role, text}. API endpoint: appends to Redis (key: 'conversation:turns'), checks length, trims if >50 (keeps last 50, removes oldest), increments totalTurns counter. Fallback: if Redis fails, writes to /data/conversation.json. On connect: GET /api/memory returns {turns: Turn[], totalTurns: number, contextPrompt: string} (pre-formatted markdown history). System prompt override includes full contextPrompt section so agent has immediate access. Memory injection is more reliable than sendContextualUpdate (soft context agent can ignore).",
    },
  },
  {
    id: "auto-reconnect",
    title: "Auto-Reconnect System",
    icon: "🔄",
    content: {
      simple: "If the connection drops accidentally, TugBot automatically reconnects in 2 seconds. If you intentionally disconnect, it stays disconnected.",
      middle: "Auto-reconnect is triggered on unexpected disconnect. The system tracks whether the disconnect was intentional (user clicked 'End') or accidental (network drop). For accidental disconnects, it waits 2 seconds then reconnects automatically. This keeps the conversation flowing without user intervention.",
      complex: "onDisconnect callback checks intentionalDisconnectRef.current. If false (accidental): logs [RECONNECT] warning → schedules reconnectTimeoutRef = setTimeout(handleConnect, 2000). If true (user-initiated): resets flag to false → clears timeout → stays disconnected. handleDisconnect sets intentionalDisconnectRef=true, clears reconnectTimeoutRef, calls endSession. Prevents race conditions with proper cleanup. 2s delay gives UI time to update before reconnect attempt.",
    },
  },
  {
    id: "health",
    title: "Health Monitoring",
    icon: "❤️",
    content: {
      simple: "The Health Dashboard shows if everything is working: green means healthy, yellow means something's not perfect, red means there's a problem.",
      middle: "Four health indicators track system state: Connection (WebSocket status and uptime), Memory (which storage layer is active), Audio (mic permission and mute status), and Logs (error/warning count). Each shows a status icon, metric name, and real-time indicators. Health is computed on-demand when modal opens, not via background polling.",
      complex: "SystemHealth interface: connection {status, wsStatus, uptimeMs, lastConnected}, memory {status, activeLayer, totalTurns, lastWriteSuccess}, audio {status, micPermission, micMuted, inputActive, outputActive}, logs {status, errorCount, warningCount}, overall. Computed from existing state/refs: connectionStatus → wsStatus, Date.now() - connectionStartTimeRef → uptimeMs, memory API responses → activeLayer/lastWriteSuccess, navigator.permissions.query → micPermission, logs.filter → errorCount/warningCount. Overall: critical if any critical, degraded if any degraded, healthy otherwise, offline if wsStatus=disconnected.",
    },
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    icon: "⌨️",
    content: {
      simple: "Use keyboard shortcuts to control TugBot without clicking: Spacebar to connect/disconnect, arrow keys to open/close chat, Tab to open debug logs, and D to open documentation.",
      middle: "Space: Connect/Disconnect (toggled). Left Arrow: Open chat window. Right Arrow: Close chat window. Up/Down Arrow: Scroll chat up/down. Tab: Toggle HackerLog (debug console). D: Open system documentation and health dashboard. These shortcuts work globally and don't interfere with text input in chat.",
      complex: "Handled in VoiceAgent handleKeyDown effect (line 318). Code checks: Space → preventDefault if not 'nnecting' → toggles based on connectionStatus. ArrowLeft/Right/Up/Down → preventDefault → calls window.openChat/closeChat/scrollChatUp/scrollChatDown. Tab → preventDefault → calls window.toggleHackerLog. KeyD → preventDefault if no metaKey/ctrlKey → calls window.toggleDocModal. Global function exposure via (window as any).functionName = () => {} pattern. All prevent default to avoid form submission or page scroll conflicts.",
    },
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "🔧",
    content: {
      simple: "Connection won't work? Check your internet and microphone. If debug logs show errors, try disconnecting and reconnecting. Memory not loading? Check if Redis is configured.",
      middle: "Connection drops immediately: Verify NEXT_PUBLIC_AGENT_ID and NEXT_PUBLIC_ELEVENLABS_API_KEY in .env.local. Check ElevenLabs agent exists and isn't paused. Memory not loading: Verify Vercel KV is configured or /data/conversation.json exists. Agent ignores context: Ensure 'System prompt' override is enabled in agent's Security settings on ElevenLabs. Multiple auto-reconnects: May indicate intentional disconnect flag not resetting—check browser console for [RECONNECT] logs.",
      complex: "Check /api/get-signed-url returns valid signedUrl (not null/error). Verify conversation.startSession({signedUrl, overrides}) doesn't throw. If memory API fails: check Redis connection string (KV_URL, KV_REST_API_TOKEN), verify fallback writes to /data/conversation.json, check file permissions. If context ignored: agent requires overrides.enabled=true in Security tab—soft sendContextualUpdate() won't work. Auto-reconnect loops: Check intentionalDisconnectRef resets in onDisconnect, verify reconnectTimeoutRef clears in handleDisconnect. Check browser DevTools → Network for WebSocket closure reason (1000=clean, 1006=abnormal). HackerLog shows [ERROR] tags—investigate message for specifics.",
    },
  },
  {
    id: "tech-stack",
    title: "Tech Stack",
    icon: "⚙️",
    content: {
      simple: "TugBot is built with modern web technologies: Next.js for the app framework, TypeScript for safety, Tailwind CSS for styling, and ElevenLabs for voice AI.",
      middle: "Framework: Next.js 16 with App Router, TypeScript for type safety. Styling: Tailwind CSS v4 + CSS Modules for component-level styling. Voice AI: ElevenLabs Conversational AI WebSocket API. State: React hooks (useState, useRef, useCallback, useEffect). Persistence: Vercel KV (Redis) for primary storage, local fs for fallback. Animations: Framer Motion + custom CSS keyframes. Font: Ubuntu (Google Fonts) for typography.",
      complex: "Next.js App Router: lib/elevenlabs.ts exports agent creation and SOUL.md. API routes: app/api/get-signed-url (proxies ElevenLabs), app/api/memory (CRUD turns). Client: useConversation from @elevenlabs/react. Storage: Vercel KV (redis.ts client), local fallback fs.writeFileSync to /data/conversation.json. CSS: Tailwind v4 with @layer directives, custom @keyframes in globals.css (.chat-glass, genieIn/genieOut animations). Animations: CSS transforms (GPU-accelerated), requestAnimationFrame for volume polling (60fps). Fonts: loaded in layout.tsx via google/next-font. Build: TypeScript strict mode, next build → Vercel deployment.",
    },
  },
];

export type ComplexityLevel = "simple" | "middle" | "complex";
