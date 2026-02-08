import { kv } from "@vercel/kv";
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
    return JSON.parse(raw) as ConversationMemory;
  } catch {
    return { turns: [], totalTurns: 0, trimmedAt: null };
  }
}

function writeMemoryLocal(memory: ConversationMemory): void {
  const filePath = getMemoryPath();
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), "utf-8");
}

async function readMemoryRedis(): Promise<ConversationMemory> {
  try {
    console.log("[REDIS-KV] querying key:", MEMORY_KEY);
    const stored = await kv.get<ConversationMemory>(MEMORY_KEY);
    if (stored) {
      console.log(`[REDIS-KV] ✓ HIT | turns: ${stored.turns.length} | lifetime: ${stored.totalTurns}`);
      return stored;
    } else {
      console.log(`[REDIS-KV] MISS | empty or null`);
      return { turns: [], totalTurns: 0, trimmedAt: null };
    }
  } catch (err) {
    // KV not available, fallback to local
    console.log("[REDIS-KV] ✗ ERROR:", err instanceof Error ? err.message : String(err));
    console.log("[REDIS-KV] falling back to local fs");
    return readMemoryLocal();
  }
}

async function writeMemoryRedis(memory: ConversationMemory): Promise<void> {
  try {
    console.log(`[REDIS-KV] WRITE key: ${MEMORY_KEY} | turns: ${memory.turns.length} | lifetime: ${memory.totalTurns}`);
    await kv.set(MEMORY_KEY, memory);
    console.log(`[REDIS-KV] ✓ COMMITTED to redis`);
  } catch (err) {
    // KV not available, fallback to local
    console.log("[REDIS-KV] ✗ WRITE ERROR:", err instanceof Error ? err.message : String(err));
    console.log("[REDIS-KV] falling back to local fs");
    writeMemoryLocal(memory);
  }
}

/**
 * Append a single turn. Trims to MAX_TURNS. Writes immediately.
 */
export async function saveTurn(role: "user" | "agent", text: string): Promise<ConversationMemory> {
  console.log(`[MEMORY] saveTurn(${role}, "${text.substring(0, 60)}${text.length > 60 ? "..." : ""}")`);
  const memory = await readMemoryRedis();
  console.log(`[MEMORY] read existing: ${memory.turns.length} turns`);

  memory.turns.push({
    role,
    text,
    ts: new Date().toISOString(),
  });
  memory.totalTurns++;
  console.log(`[MEMORY] appended turn | now: ${memory.turns.length} stored, ${memory.totalTurns} lifetime`);

  // Trim oldest turns if over limit
  if (memory.turns.length > MAX_TURNS) {
    const overflow = memory.turns.length - MAX_TURNS;
    console.log(`[MEMORY] ⚠ TRIMMING ${overflow} old turns (keeping max ${MAX_TURNS})`);
    memory.turns = memory.turns.slice(overflow);
    memory.trimmedAt = new Date().toISOString();
  }

  await writeMemoryRedis(memory);
  console.log(`[MEMORY] ✓ saveTurn complete`);
  return memory;
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
