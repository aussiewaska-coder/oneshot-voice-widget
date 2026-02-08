import { NextResponse } from "next/server";
import { saveTurn, loadMemory, buildContextPrompt } from "@/lib/memory";

/**
 * GET /api/memory — Load conversation history + context prompt
 */
export async function GET() {
  try {
    const memory = await loadMemory();
    const contextPrompt = buildContextPrompt(memory);
    return NextResponse.json({
      turns: memory.turns,
      totalTurns: memory.totalTurns,
      contextPrompt,
    });
  } catch (error) {
    console.error("Failed to load memory:", error);
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
      return NextResponse.json({ error: "Missing role or text" }, { status: 400 });
    }
    if (role !== "user" && role !== "agent") {
      return NextResponse.json({ error: "Role must be user or agent" }, { status: 400 });
    }

    const memory = await saveTurn(role, text);
    return NextResponse.json({ ok: true, totalTurns: memory.totalTurns });
  } catch (error) {
    console.error("Failed to save turn:", error);
    // Don't fail the client — memory loss is better than blocking conversation
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
