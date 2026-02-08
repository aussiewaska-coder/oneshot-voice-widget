import fs from "fs";
import path from "path";

export interface Turn {
  role: "user" | "agent";
  text: string;
  ts: string; // ISO timestamp
}

export interface ConversationMemory {
  turns: Turn[];
  totalTurns: number; // lifetime count (including trimmed)
  trimmedAt: string | null; // ISO timestamp of last trim
}

const MAX_TURNS = 50;
const MEMORY_KEY = "conversation:memory";

// In-memory fallback (for Vercel serverless where /tmp is ephemeral)
let memoryCache: ConversationMemory | null = null;

let kv: any = null;
try {
  kv = require("@vercel/kv").kv;
  console.log("[MEMORY-INIT] Vercel KV available");
} catch (err) {
  console.log("[MEMORY-INIT] Vercel KV not available, using in-memory cache + fs fallback");
}

// Local fallback for dev (when KV is not available)
function getMemoryPath(): string {
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Test write access
    const testFile = path.join(localDir, ".write-test");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    return path.join(localDir, "conversation.json");
  } catch {
    return "/tmp/conversation.json";
  }
}

function readMemoryLocal(): ConversationMemory {
  const filePath = getMemoryPath();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ConversationMemory;
    console.log(`[FS-LOCAL] ✓ READ from ${filePath} | ${parsed.turns.length} turns`);
    return parsed;
  } catch (err) {
    console.log(`[FS-LOCAL] read failed, using empty state`);
    return { turns: [], totalTurns: 0, trimmedAt: null };
  }
}

function writeMemoryLocal(memory: ConversationMemory): void {
  const filePath = getMemoryPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), "utf-8");
    console.log(`[FS-LOCAL] ✓ WROTE to ${filePath} | ${memory.turns.length} turns`);
  } catch (err) {
    console.log(`[FS-LOCAL] write failed:`, err);
  }
}

async function readMemoryRedis(): Promise<ConversationMemory> {
  // If we have cached memory, use it (warm instance)
  if (memoryCache) {
    console.log(`[MEMORY-CACHE] ✓ HIT | ${memoryCache.turns.length} turns in memory`);
    return memoryCache;
  }

  // Try Redis
  if (kv) {
    try {
      console.log(`[REDIS-KV] querying key: ${MEMORY_KEY}`);
      const stored = await Promise.race([
        kv.get(MEMORY_KEY) as Promise<ConversationMemory | null>,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      if (stored) {
        console.log(`[REDIS-KV] ✓ HIT | ${stored.turns.length} turns | lifetime: ${stored.totalTurns}`);
        memoryCache = stored; // Cache it
        return stored;
      } else {
        console.log(`[REDIS-KV] MISS | empty result`);
      }
    } catch (err) {
      console.log(`[REDIS-KV] ✗ ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Fallback to local fs
  console.log(`[MEMORY] falling back to local fs`);
  const local = readMemoryLocal();
  memoryCache = local; // Cache it
  return local;
}

async function writeMemoryRedis(memory: ConversationMemory): Promise<void> {
  // Always cache in memory (hot path)
  memoryCache = memory;
  console.log(`[MEMORY-CACHE] updated in-memory cache | ${memory.turns.length} turns`);

  // Try Redis
  if (kv) {
    try {
      console.log(`[REDIS-KV] WRITE key: ${MEMORY_KEY} | ${memory.turns.length} turns`);
      const result = await Promise.race([
        kv.set(MEMORY_KEY, memory),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      console.log(`[REDIS-KV] ✓ COMMITTED | result: ${JSON.stringify(result)}`);
      return;
    } catch (err) {
      console.log(`[REDIS-KV] ✗ ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Fallback to local fs
  console.log(`[MEMORY] falling back to local fs write`);
  writeMemoryLocal(memory);
}

// Serialize writes within the same serverless instance to prevent
// concurrent read-modify-write from dropping turns.
let writeLock: Promise<any> = Promise.resolve();

/**
 * Append a single turn. Trims to MAX_TURNS. Writes immediately.
 * Serialized via writeLock to prevent concurrent mutation races.
 */
export async function saveTurn(role: "user" | "agent", text: string): Promise<ConversationMemory> {
  const doSave = async (): Promise<ConversationMemory> => {
    console.log(`[MEMORY] saveTurn(${role}, "${text.substring(0, 60)}${text.length > 60 ? "..." : ""}")`);
    const memory = await readMemoryRedis();
    console.log(`[MEMORY] read: ${memory.turns.length} turns`);

    memory.turns.push({
      role,
      text,
      ts: new Date().toISOString(),
    });
    memory.totalTurns++;
    console.log(`[MEMORY] appended | now: ${memory.turns.length} stored, ${memory.totalTurns} lifetime`);

    // Trim oldest turns if over limit
    if (memory.turns.length > MAX_TURNS) {
      const overflow = memory.turns.length - MAX_TURNS;
      console.log(`[MEMORY] ⚠ TRIMMING ${overflow} turns (keeping max ${MAX_TURNS})`);
      memory.turns = memory.turns.slice(overflow);
      memory.trimmedAt = new Date().toISOString();
    }

    await writeMemoryRedis(memory);
    console.log(`[MEMORY] ✓ saveTurn complete`);
    return memory;
  };

  // Chain behind any in-flight write so reads always see the latest state
  const result = writeLock.then(doSave);
  writeLock = result.catch(() => {}); // Don't let a failed write block future ones
  return result;
}

/**
 * Load the last N turns + metadata. No mutations.
 */
export async function loadMemory(lastN?: number): Promise<ConversationMemory> {
  console.log(`[MEMORY] loadMemory(${lastN ? `lastN=${lastN}` : "all"})`);
  const memory = await readMemoryRedis();
  if (lastN && lastN < memory.turns.length) {
    console.log(`[MEMORY] slicing to last ${lastN} of ${memory.turns.length}`);
    return {
      ...memory,
      turns: memory.turns.slice(-lastN),
    };
  }
  console.log(`[MEMORY] returning all ${memory.turns.length} turns (${memory.totalTurns} lifetime)`);
  return memory;
}

/**
 * Build a context string from memory for injecting into the agent.
 */
export function buildContextPrompt(memory: ConversationMemory): string {
  if (memory.turns.length === 0) {
    console.log(`[MEMORY] buildContextPrompt() → empty (no context)`);
    return "";
  }

  const dropped = memory.totalTurns - memory.turns.length;
  let ctx = "=== CONVERSATION MEMORY (previous session) ===\n";
  if (dropped > 0) {
    ctx += `[${dropped} older turns trimmed]\n`;
  }
  for (const turn of memory.turns) {
    const label = turn.role === "user" ? "User" : "Agent";
    ctx += `${label}: ${turn.text}\n`;
  }
  ctx += "=== END MEMORY ===\n";
  ctx += "Continue the conversation naturally from where we left off. Do not repeat or summarize the above — just pick up where you were.";

  console.log(`[MEMORY] buildContextPrompt() → ${ctx.length} chars, ${memory.turns.length} turns`);
  return ctx;
}
