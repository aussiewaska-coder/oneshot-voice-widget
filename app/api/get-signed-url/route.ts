import { NextResponse } from "next/server";
import { getConversationToken } from "@/lib/elevenlabs";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_PUBLIC_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY or NEXT_PUBLIC_AGENT_ID" },
      { status: 500 }
    );
  }

  try {
    const data = await getConversationToken(apiKey, agentId);
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Failed to get signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
