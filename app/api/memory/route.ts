import { NextResponse } from "next/server";
import { saveTurn, loadMemory, buildContextPrompt } from "@/lib/memory";

/**
 * GET /api/memory — Load conversation history + context prompt
 */
export async function GET() {
  try {
    console.log("[REDIS] GET /api/memory → fetching from persistent store");
    const memory = await loadMemory();
    console.log(`[REDIS] ✓ loaded ${memory.turns.length} turns from redis (${memory.totalTurns} lifetime)`);
    const contextPrompt = buildContextPrompt(memory);
    console.log(`[REDIS] built context prompt: ${contextPrompt.length} chars`);
    return NextResponse.json({
      turns: memory.turns,
      totalTurns: memory.totalTurns,
      contextPrompt,
    });
  } catch (error) {
    console.error("[REDIS] ✗ GET failed:", error);
    return NextResponse.json(
      { turns: [], totalTurns: 0, contextPrompt: "" },
      { status: 200 } // degrade gracefully — don't block the app
    );
  }
}

/**
 * POST /api/memory — Save a single turn
 * Body: { role: "user"|"agent", text: string }
 */
export async function POST(request: Request) {
  try {
    const { role, text } = await request.json();

    if (!role || !text) {
      console.log("[REDIS] ✗ POST invalid payload");
      return NextResponse.json({ error: "Missing role or text" }, { status: 400 });
    }
    if (role !== "user" && role !== "agent") {
      console.log("[REDIS] ✗ POST invalid role:", role);
      return NextResponse.json({ error: "Role must be user or agent" }, { status: 400 });
    }

    console.log(`[REDIS] POST /api/memory → WRITING ${role.toUpperCase()} turn`);
    console.log(`[REDIS] text: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    const memory = await saveTurn(role, text);
    console.log(`[REDIS] ✓ PERSISTED to redis | total turns: ${memory.totalTurns} | stored: ${memory.turns.length}`);
    if (memory.trimmedAt) {
      console.log(`[REDIS] trimmed old turns (keeping last 50)`);
    }
    return NextResponse.json({ ok: true, totalTurns: memory.totalTurns });
  } catch (error) {
    console.error("[REDIS] ✗ POST failed:", error);
    // Don't fail the client — memory loss is better than blocking conversation
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
