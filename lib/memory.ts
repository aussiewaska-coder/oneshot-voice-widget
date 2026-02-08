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
    const stored = await kv.get<ConversationMemory>(MEMORY_KEY);
    return stored || { turns: [], totalTurns: 0, trimmedAt: null };
  } catch {
    // KV not available, fallback to local
    return readMemoryLocal();
  }
}

async function writeMemoryRedis(memory: ConversationMemory): Promise<void> {
  try {
    await kv.set(MEMORY_KEY, memory);
  } catch {
    // KV not available, fallback to local
    writeMemoryLocal(memory);
  }
}

/**
 * Append a single turn. Trims to MAX_TURNS. Writes immediately.
 */
export async function saveTurn(role: "user" | "agent", text: string): Promise<ConversationMemory> {
  const memory = await readMemoryRedis();

  memory.turns.push({
    role,
    text,
    ts: new Date().toISOString(),
  });
  memory.totalTurns++;

  // Trim oldest turns if over limit
  if (memory.turns.length > MAX_TURNS) {
    const overflow = memory.turns.length - MAX_TURNS;
    memory.turns = memory.turns.slice(overflow);
    memory.trimmedAt = new Date().toISOString();
  }

  await writeMemoryRedis(memory);
  return memory;
}

/**
 * Load the last N turns + metadata. No mutations.
 */
export async function loadMemory(lastN?: number): Promise<ConversationMemory> {
  const memory = await readMemoryRedis();
  if (lastN && lastN < memory.turns.length) {
    return {
      ...memory,
      turns: memory.turns.slice(-lastN),
    };
  }
  return memory;
}

/**
 * Build a context string from memory for injecting into the agent.
 */
export function buildContextPrompt(memory: ConversationMemory): string {
  if (memory.turns.length === 0) return "";

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
  return ctx;
}
