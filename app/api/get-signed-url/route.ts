import { NextResponse } from "next/server";
import { getConversationToken } from "@/lib/elevenlabs";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_PUBLIC_AGENT_ID;

  console.log("[SIGNED-URL] API key present:", !!apiKey, "length:", apiKey?.length);
  console.log("[SIGNED-URL] Agent ID:", agentId);

  if (!apiKey || !agentId) {
    console.error("[SIGNED-URL] Missing credentials");
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY or NEXT_PUBLIC_AGENT_ID" },
      { status: 500 }
    );
  }

  try {
    console.log("[SIGNED-URL] Calling ElevenLabs API...");
    const data = await getConversationToken(apiKey, agentId);
    console.log("[SIGNED-URL] ✓ Got signed URL:", data.signed_url?.substring(0, 80));
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("[SIGNED-URL] ✗ Failed:", error);
    return NextResponse.json(
      { error: `Failed to generate signed URL: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
