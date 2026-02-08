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

#### DocModal.tsx
Interactive documentation system:
- Glassmorphic modal (z-index 50) with smooth genieIn/genieOut animations
- 8 documentation sections (Overview, Capabilities, Architecture, Memory, Auto-Reconnect, Health, Shortcuts, Troubleshooting)
- Sidebar navigation with active highlighting
- Three complexity levels (Simple/Middle/Complex) per section
- Real-time health dashboard integration at top
- Esc key or click-outside to close
- Keyboard shortcut: D key to toggle

#### HealthDashboard.tsx
Real-time system monitoring:
- 4 health cards: Connection (clickable), Memory, Audio, Logs
- Color-coded status (Green/Amber/Red/Gray)
- Connection card is a button for connect/disconnect
- Health computed on-demand (no background polling)
- Uptime tracking, memory layer detection, audio activity, error counting
- Overall health status computed from subsystems

#### HackerLog.tsx
Enhanced debug console:
- Font size accessibility controls (+/- buttons, 80%-140% range)
- Rotating ring clickable to open docs (when connected)
- Offline indicator as rotating red LED (red LED taillight effect)
- Doc button enlarged (20x20) with hover effects
- Proper Ubuntu font for readability
- All controls work offline

#### CapabilitiesList.tsx
Capability showcase with complexity levels:
- Three-level toggle: Simple, Middle, Complex
- Simple: User-friendly descriptions
- Middle: Technical overview
- Complex: Code-formatted snippets with indentation
- Pre-formatted code blocks for developer reference
- Clean, uncluttered interface

#### GlassChat.tsx + globals.css
Styling:
- Glassmorphic effect (backdrop-filter blur)
- Neon glow effects
- Liquid animations (cyan-to-blue gradients)
- Smooth transitions and hover states
- Custom @keyframes: genieIn/genieOut, redLedRotate, shimmer

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

### TugBot System Documentation Wiki (Commits ee53134, c7cf186)
- **DocModal.tsx:** Glassmorphic modal with 8 documentation sections
- **HealthDashboard.tsx:** Real-time 4-card health indicator system
- **docs-content.ts:** Three-tier documentation (Simple/Middle/Complex)
- **Health Monitoring:** Connection, Memory, Audio, Logs status tracking
- **Interactive:** Connection card is a clickable connect/disconnect button
- **Features:** Sidebar navigation, smooth animations (genieIn/genieOut)
- **Z-index:** Modal at z-50 (above HackerLog at z-40)

### Keyboard Shortcut Enhancements (Session Feb 8-9, 2026)
- **D Key:** Opens/closes documentation modal
- **Tab Key:** Closes doc modal first, then HackerLog on second press
- **Command Hold:** Hold Command key to temporarily mute mic
- **Command Double-Tap:** Press Command twice (within 300ms) to toggle mute
- **Release Command:** Auto-unmutes if was hold-to-mute
- **Logging:** All mute state changes logged to HackerLog

### Capabilities List Enhancement (Commit afccd43)
- **Complexity Levels:** Simple, Middle, Complex with toggle buttons
- **Simple Level:** User-friendly descriptions
- **Middle Level:** Technical overview
- **Complex Level:** Code-formatted snippets with proper indentation
- **Styling:** Pre-formatted code blocks for developer-level details
- **Font:** Ubuntu throughout for consistency

### Accessibility Improvements (Commit 42f553a)
- **Font Size Controls:** +/- buttons in HackerLog header
- **Range:** 80% to 140% adjustable font size
- **Display:** Current percentage shown
- **Font Change:** Switched HackerLog from mono to Ubuntu for better readability
- **Buttons:** Disabled at min/max sizes for UX clarity

### HackerLog UI Improvements (Commit 4c895e2)
- **Rotating Ring:** Clickable to open documentation (when connected)
- **Offline Indicator:** Rotating red LED effect (like a taillight)
- **Animations:** `redLedRotate` 360° glow effect on offline indicator
- **Hover Effects:** Shimmer and pulse animations when hovering
- **Doc Button:** Enlarged from 14x14 to 20x20 with hover background
- **Works Offline:** All controls functional regardless of connection status

### Capabilities List Cleanup (Commit 7bda387)
- **Removed:** Pulsing blue bullet points
- **Removed:** Hover tooltip overlays
- **Result:** Cleaner, less cluttered interface
- **Navigation:** Simplified interaction model

---

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
│   ├── VoiceAgent.tsx         # Main orchestration + WebSocket + keyboard shortcuts
│   ├── GlassChat.tsx          # Chat UI
│   ├── OrbBackground.tsx      # Animated orb
│   ├── OrbBackground.module.css
│   ├── HackerLog.tsx          # Debug log + font size controls
│   ├── PaletteSwitcher.tsx    # Color theme
│   ├── MessageBubble.tsx      # Message styling
│   ├── DocModal.tsx           # Documentation modal (new)
│   ├── HealthDashboard.tsx    # Health indicators (new)
│   ├── CapabilitiesList.tsx   # Capabilities with complexity levels
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
├── docs-content.ts            # Documentation content (new)
└── ...

public/                         # Static assets
data/                          # Local memory fallback

package.json, tsconfig.json, tailwind.config.ts, etc.
```

---

## Keyboard Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| **Space** | Connect/Disconnect | Toggle connection to agent |
| **D** | Open/Close Documentation | Opens TugBot documentation modal |
| **Tab** | Close docs first, then logs | Hierarchical closing (docs → logs) |
| **Command (Hold)** | Temporary Mute | Mutes mic while held, auto-unmutes on release |
| **Command + Command** | Toggle Mute | Double-tap within 300ms to permanently toggle |
| **← (Left Arrow)** | Open Chat | Slides chat panel in |
| **→ (Right Arrow)** | Close Chat | Slides chat panel out |
| **↑ (Up Arrow)** | Scroll Chat Up | Scrolls message history up |
| **↓ (Down Arrow)** | Scroll Chat Down | Scrolls message history down |

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

### Documentation Modal & Health Monitoring
- Health data computed on-demand (no background polling) to prevent WebSocket issues
- SSR-safe: Check `typeof window === "undefined"` before accessing globals
- Modal uses z-50 to layer above HackerLog (z-40)
- Three-tier documentation content uses TypeScript objects (type-safe, no parsing)
- Health status derived from existing state sources only

### Keyboard Shortcuts
- Command key uses MetaLeft/MetaRight codes for cross-platform compatibility
- Double-tap detection uses 300ms window for Command key toggle
- Tab key uses hierarchical closing: docs first, then logs (prevents log-trap)
- All shortcuts use preventDefault() to avoid form submission

### Mute State Management
- Two tracking refs: `commandMutedRef` (toggle) vs temporary hold
- Separate logic for hold-to-mute vs permanent toggle
- Auto-unmute only triggers if mute was caused by holding Command
- Logged to HackerLog for debugging mic state changes

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

## Feature Completeness Checklist

✅ **Core Features**
- Voice conversational AI (ElevenLabs WebSocket)
- Persistent multi-session memory (Redis + fallback)
- Auto-reconnect with 2-second delay
- Message persistence and trimming

✅ **UI/UX**
- Glassmorphic design with smooth animations
- Real-time volume visualization (orb)
- Color palette switching
- Chat interface with status indicators
- Ubuntu typography throughout

✅ **Documentation & Help**
- Interactive documentation modal (8 sections)
- Three-tier explanations (Simple/Middle/Complex)
- Real-time health monitoring dashboard
- System debugging (HackerLog console)
- Quick reference guides

✅ **Accessibility**
- Font size controls (80%-140% adjustable)
- Keyboard-first navigation
- ARIA labels and semantic HTML
- Clear status indicators
- Ubuntu font for readability

✅ **Advanced Features**
- Command key mute (hold + double-tap toggle)
- Clickable connection indicator
- Red LED offline effect
- Rotating ring interaction
- Capability complexity levels with code formatting

---

**Last Updated:** February 9, 2026
**Status:** Production-ready with documentation modal, accessibility features, and advanced keyboard controls
**Agent:** Ray (Outlaw Twin) - Conversational AI partner
**Latest Features:** DocModal, HealthDashboard, Command-key mute, Font accessibility, Enhanced capabilities list
