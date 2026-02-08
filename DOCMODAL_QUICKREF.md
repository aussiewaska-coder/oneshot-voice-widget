# DocModal Quick Reference

## Quick Start

### Opening the Documentation
- **Keyboard**: Press `D`
- **Mouse**: Click the 📄 icon in HackerLog header
- **Close**: Press `Esc` or click close button

### Health Dashboard (Top of Modal)
Four cards showing real-time system status:
- 🟢 **Connection** - WebSocket status & uptime
- 🟢 **Memory** - Storage layer & turn count
- 🟢 **Audio** - Mic permission & activity
- 🟢 **Logs** - Error/warning count

Overall status bar shows combined health.

## Documentation Sections

### 1. 🤖 Overview
User-focused: What TugBot is and does

**Simple**: Voice AI that remembers conversations
**Middle**: Real-time WebSocket AI with persistent memory
**Complex**: Triple-layer storage with system prompt injection

### 2. ⚡ Capabilities
What TugBot can do

**Simple**: Voice I/O, remembers conversations, auto-reconnects
**Middle**: Real-time streaming, memory trimming, palette switching
**Complex**: 60fps volume polling, requestAnimationFrame, context injection

### 3. 🏗️ Architecture
How TugBot works

**Simple**: Three parts - Voice Engine, Memory, UI
**Middle**: VoiceAgent orchestration, components, memory system
**Complex**: useConversation hook, callback flow, system prompt override

### 4. 💾 Memory & Persistence
How conversations are saved

**Simple**: Redis saves conversations, can reload later
**Middle**: Triple-layer storage with auto-fallback
**Complex**: persistTurn fire-and-forget, trimming to 50 turns, contextPrompt format

### 5. 🔄 Auto-Reconnect
How TugBot handles disconnects

**Simple**: Automatic 2s reconnect if connection drops
**Middle**: Intent flag prevents unwanted reconnects
**Complex**: intentionalDisconnectRef, reconnectTimeoutRef, cleanup logic

### 6. ❤️ Health Monitoring
Understanding system health

**Simple**: Green = good, Yellow = warning, Red = problem
**Middle**: Each subsystem tracked independently
**Complex**: On-demand computation, no background polling, SSR-safe

### 7. ⌨️ Keyboard Shortcuts
All available shortcuts

**Simple**: Space=connect, Arrows=navigate, Tab=logs, D=docs
**Middle**: Global function exposure pattern
**Complex**: KeyboardEvent handling, preventDefault, flag checking

### 8. 🔧 Troubleshooting
Common issues and fixes

**Simple**: Connection won't work? Check internet & mic
**Middle**: Check env vars, verify Redis config
**Complex**: WebSocket closure reasons, debug log analysis

### 9. ⚙️ Tech Stack
Technologies used

**Simple**: Next.js, React, ElevenLabs, Tailwind
**Middle**: App Router, useConversation hook, CSS Modules
**Complex**: Turbopack build, WebSocket streaming, Vercel KV, requestAnimationFrame

## Tech Level Selector

Located at bottom of modal. Switch between:
- **Simple**: For non-technical users
- **Middle**: For technical users wanting overview
- **Complex**: For developers

Changes all visible documentation content.

## Tips

1. **Lost?** Start with Overview (Simple level)
2. **Technical help?** Go to Architecture or Tech Stack (Complex level)
3. **Troubleshooting?** Jump to Troubleshooting section
4. **Learning?** Progress Simple → Middle → Complex
5. **Integrating?** Complex sections have implementation details

## Health Status Meanings

### Connection
- 🟢 Connected with stable uptime
- 🟡 Connecting or unstable
- ⚪ Intentionally disconnected

### Memory
- 🟢 Using Redis successfully
- 🟡 Using fallback (local fs or in-memory)
- ⚪ All storage failing

### Audio
- 🟢 Microphone active and functional
- 🟡 Muted or idle
- ⚪ Mic permission denied

### Logs
- 🟢 No errors
- 🟡 Some warnings/errors present
- ⚪ Critical error count

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D | Toggle Documentation Modal |
| Space | Connect/Disconnect |
| ← | Open Chat |
| → | Close Chat |
| ↑ | Scroll Chat Up |
| ↓ | Scroll Chat Down |
| Tab | Toggle Debug Logs |
| Esc | Close Modal (when open) |

## File Structure

```
lib/
├── docs-content.ts        # Documentation content (8 sections × 3 levels)
└── memory.ts              # Memory persistence logic

app/components/
├── DocModal.tsx           # Main modal component
├── HealthDashboard.tsx    # Health indicator cards
├── VoiceAgent.tsx         # Health tracking + modal integration
└── HackerLog.tsx          # Doc button integration
```

## Debugging

If modal doesn't open:
1. Check browser console for errors
2. Verify D key is not captured by other handlers
3. Check `window.toggleDocModal` is defined
4. Verify `DocModal` is rendered in VoiceAgent

If health shows incorrect data:
1. Open browser DevTools → Console
2. Type `window.hackerLog` and press Enter
3. Should show object with logs array
4. Check `logs` property has entries with type="error"

---

**Last Updated**: February 8, 2026
**Version**: 1.0
**Status**: Production Ready
