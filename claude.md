# OneShot Voice Widget - Project Documentation

## Overview
Real-time voice conversational AI agent with persistent memory, integrated with ElevenLabs Conversational AI API. Features session persistence, memory injection, auto-reconnect, and a beautiful glassmorphic UI with animated orb visualization.

**Location:** `/Users/aussiewaska/oneshot-voice-widget/`
**GitHub:** `https://github.com/aussiewaska-coder/oneshot-voice-widget`
**Live:** Deployed (Vercel compatible)

---

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + CSS Modules
- **Voice AI:** ElevenLabs Conversational AI (WebSocket)
- **Memory:** Vercel KV (Redis) + local file fallback
- **Animations:** Framer Motion + custom CSS keyframes
- **Font:** Ubuntu (Google Fonts) + Geist

---

## Architecture

### Core Components

#### VoiceAgent.tsx
Main component orchestrating:
- WebSocket connection to ElevenLabs agent
- Memory loading and injection (system prompt override)
- Auto-reconnect on unexpected disconnect
- Volume polling for orb visualization
- Message persistence to Redis
- Conversation state management

#### GlassChat.tsx
UI component with:
- Message display (user/agent bubbles)
- Connect/Disconnect buttons
- Text input with send
- Mic mute toggle
- Status indicators (Listening/Speaking/Connecting/Offline)
- Ubuntu font typography
- Liquid/flowing gradient effects

#### OrbBackground.tsx
Animated SVG orb with:
- Real-time input/output volume visualization
- Color palette switching
- Smooth morphing animations
- Responsive sizing

#### GlassChat.tsx + globals.css
Styling:
- Glassmorphic effect (backdrop-filter blur)
- Neon glow effects
- Liquid animations (cyan-to-blue gradients)
- Smooth transitions and hover states

---

## ElevenLabs Integration

### Connection Flow
1. **Server-side:** `GET /api/get-signed-url` → ElevenLabs returns signed WebSocket URL
2. **Client-side:** Pass `signedUrl` to `conversation.startSession()`
3. **WebSocket:** Real-time voice/text bidirectional connection
4. **Session ID:** Returned in `ConversationInitiationMetadata` event

### Key API Details
- **Base URL:** `https://api.elevenlabs.io`
- **Endpoint:** `GET /v1/convai/conversation/get-signed-url?agent_id={AGENT_ID}`
- **Auth:** Header `xi-api-key: {API_KEY}`
- **SDK:** `@elevenlabs/react` (useConversation hook)
- **Connection Type:** WebSocket (via `signedUrl`)

### React SDK Methods
```typescript
conversation.startSession({ signedUrl, overrides?: {} })
conversation.endSession()
conversation.sendUserMessage(text)
conversation.sendContextualUpdate(context) // Soft context injection
conversation.getInputVolume() // 0-1 float
conversation.getOutputVolume() // 0-1 float
conversation.isSpeaking // boolean
```

### Agent Configuration (SOUL.md)
Located in: `lib/elevenlabs.ts` (basePrompt)

**Character:** Ray Shoesmith (crusty bikie, ride-or-die personality)
- Direct, dry, efficient communication
- Expletives natural (Fuck, Shit)
- Short & sharp (1-3 sentences max)
- Supportive but raw
- Patient—doesn't pester during silence

**Override at session start:**
```typescript
startSession({
  signedUrl,
  overrides: {
    agent: {
      prompt: { prompt: customSystemPrompt },
      firstMessage: customFirstMessage
    }
  }
})
```

---

## Memory & Persistence System

### Storage
- **Primary:** Vercel KV (Redis)
- **Fallback:** Local file system (`/data/conversation.json`)
- **Fallback-fallback:** In-memory cache

### Data Structure
```typescript
interface ConversationMemory {
  turns: { role: "user"|"agent", text: string, ts: string }[]
  totalTurns: number // Lifetime count (including trimmed)
  trimmedAt?: string // Last trim timestamp
}
```

### Key Functions (lib/memory.ts)
- `saveTurn(role, text)` → Appends turn, trims to MAX_TURNS (50)
- `loadMemory(lastN?)` → Load turns (optionally slice to last N)
- `buildContextPrompt(memory)` → Format for agent context

### Memory Injection Flow
1. **On mount:** Load previous turns, display in chat
2. **On connect:** Load turns again, build custom first message
3. **Build system prompt:** Embed full conversation history
4. **Override:** Pass via `startSession({ overrides: { agent: { prompt } } })`
5. **Agent sees:** Full conversation context immediately

**Why system prompt, not sendContextualUpdate?**
- `sendContextualUpdate()` is "soft" context agents can ignore
- System prompt is baked into agent's instructions from the start
- Guarantees agent has access to conversation history

---

## Auto-Reconnect System

### Flow
1. **Unexpected disconnect:** `onDisconnect` callback fires
2. **Check flag:** If `intentionalDisconnectRef.current` is false:
   - Schedule reconnect in 2 seconds
   - Log: `[RECONNECT] auto-reconnecting in 2 seconds...`
3. **Reconnect:** Call `handleConnect()` automatically
4. **User disconnect:** Set flag, clear timeout → stays disconnected

### Logging
- `[RECONNECT] auto-reconnecting in 2 seconds...` (warning)
- `[RECONNECT] attempting auto-reconnect...` (debug)
- `[DISCONNECT] user initiated` (debug)

---

## Recent Implementations (Feb 8, 2026)

### Session Persistence & Memory Injection (Commits c5fa003, ecbe64b)
- **Problem:** ElevenLabs has NO cross-session conversation resumption
- **Solution:** Inject full conversation history into agent's system prompt
- **Implementation:** Dynamic system prompt override at `startSession()`
- **Result:** Agent acknowledges previous conversations and can recall details

### Improved First Message (Commit ecbe64b)
- **Before:** Generic "back for more?" with last user message quoted
- **After:** Contextual message referencing agent's last topic
- **Example:** "Alright mate, we were just talking about rolling papers... where were we?"

### Ubuntu Font + Liquid UI (Commit bef9852)
- **Font:** Ubuntu (Google Fonts, weights 300-700)
- **Effects:** Gradient message bubbles, flowing accent bars (cyan-to-blue)
- **Hover:** Subtle brightness increase on message bubbles
- **Animations:** `liquidGlow` keyframe for future glow effects

### Silence the Pester (Commit 20b57c2)
- **Added to SOUL.md:** "If you're quiet, I wait. No pestering..."
- **Result:** Agent stops checking in during silence

### Enhanced Connect Button (Commit 4a51942)
- **Size:** Increased padding (px-5 py-2.5 → px-6 py-3)
- **Subtlety:** Not overt, just more visible

### Auto-Reconnect (Commit 277aa3c)
- **Unexpected disconnect:** Auto-reconnect after 2 seconds
- **Intentional disconnect:** User-initiated "End" stays disconnected
- **Flag system:** `intentionalDisconnectRef` tracks user action

---

## Environment Variables (.env.local)
```
NEXT_PUBLIC_ELEVENLABS_API_KEY=<xi-api-key>
NEXT_PUBLIC_AGENT_ID=<agent-id>
KV_URL=<redis-url>
KV_REST_API_URL=<redis-url>
KV_REST_API_TOKEN=<redis-token>
```

---

## API Routes

### GET /api/get-signed-url
- **Purpose:** Obtain WebSocket signed URL from ElevenLabs
- **Response:** `{ signedUrl: string }`

### GET /api/memory
- **Purpose:** Load conversation history + context prompt
- **Response:** `{ turns: Turn[], totalTurns: number, contextPrompt: string }`

### POST /api/memory
- **Purpose:** Save single conversation turn
- **Body:** `{ role: "user"|"agent", text: string }`
- **Response:** `{ ok: boolean, totalTurns: number }`

---

## File Structure
```
app/
├── components/
│   ├── VoiceAgent.tsx         # Main orchestration + WebSocket
│   ├── GlassChat.tsx          # Chat UI
│   ├── OrbBackground.tsx      # Animated orb
│   ├── OrbBackground.module.css
│   ├── HackerLog.tsx          # Debug log display
│   ├── PaletteSwitcher.tsx    # Color theme
│   ├── MessageBubble.tsx      # Message styling
│   └── ...
├── api/
│   ├── get-signed-url/route.ts
│   ├── memory/route.ts
│   └── create-agent/route.ts
├── layout.tsx                  # Root layout + font imports
├── globals.css                 # Global styles + animations
└── page.tsx                    # Main page

lib/
├── elevenlabs.ts              # Agent creation, SOUL.md
├── memory.ts                  # Memory persistence logic
└── ...

public/                         # Static assets
data/                          # Local memory fallback

package.json, tsconfig.json, tailwind.config.ts, etc.
```

---

## Important Notes & Gotchas

### ElevenLabs SDK
- `MessagePayload` type has NO `isFinal` property (unlike older APIs)
- Each `startSession()` creates a NEW conversation (no resumption)
- `overrides` must be ENABLED in agent's Security settings
- Property names are camelCase: `firstMessage` (not `first_message`)

### Memory Injection
- System prompt override is more reliable than `sendContextualUpdate()`
- Context format: Markdown conversation history + instruction
- Agent SOUL.md tone can override weak context—use system prompt for authority

### CSS Modules
- Orb animation uses inline path strings (no variable substitution)
- CSS `d: path(...)` requires explicit strings in keyframes

### React Effects
- Avoid dependencies on frequently-changing objects like `conversation`
- Use refs to track stable state across re-renders
- Guard against multiple activations in useEffect

### Auto-Reconnect
- Flag-based approach (`intentionalDisconnectRef`) prevents unwanted reconnects
- 2-second delay gives UI time to update before attempting reconnect
- Clear pending timeouts in handleDisconnect to avoid race conditions

---

## Development

### Install & Run
```bash
npm install
npm run dev  # http://localhost:3000
npm run build
npm start
```

### Build & Deploy
```bash
npm run build
# Deploy to Vercel (automatic from git push)
```

### Testing Changes
1. Make changes to component/lib files
2. Build: `npm run build`
3. Check for TypeScript errors
4. Test in browser (dev or deployed)
5. Commit & push

---

## Git Workflow
- Main branch is production-ready
- Feature branches for major changes
- Commits include `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`
- Recent commits show full implementation history

Key commits:
- `277aa3c` - Auto-reconnect
- `bef9852` - Ubuntu font + liquid UI
- `20b57c2` - Silence pester checks
- `c5fa003` - System prompt memory injection
- `ecbe64b` - Improved pickup message

---

## Future Improvements
- Glow effect behind connect button (tsParticles or Tailwind+Motion)
- Better heartbeat mechanism (not useEffect-based)
- Conversation threading (if ElevenLabs adds support)
- Clear memory button with warning
- Voice speed/stability control
- More SOUL.md customization at runtime

---

## Debugging

### HackerLog Console
Shows real-time events:
- `[REDIS]` - Memory operations
- `[WEBSOCKET]` - Connection events
- `[MESSAGE]` - Message send/receive
- `[RECONNECT]` - Auto-reconnect attempts
- `[CONTEXT]` - Context injection
- `[OVERRIDE]` - System prompt overrides
- `[SESSION]` - Session initialization

### Common Issues
1. **Connection drops immediately:** Check `NEXT_PUBLIC_AGENT_ID` and API key in .env.local
2. **Memory not loading:** Verify Redis KV is configured, or check `/data/conversation.json`
3. **Agent ignores context:** Ensure "System prompt" override is enabled in agent Security settings
4. **Multiple reconnects:** Check if intentional disconnect flag is set correctly

---

## Contact & Resources
- **Project Owner:** aussiewaska-coder (GitHub)
- **ElevenLabs Docs:** https://elevenlabs.io/docs/agents-platform
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Framer Motion:** https://www.framer.com/motion

---

**Last Updated:** February 8, 2026
**Status:** Production-ready with auto-reconnect and persistent memory
**Agent:** Ray (Outlaw Twin) - Conversational AI partner
