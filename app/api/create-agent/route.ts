import { NextResponse } from "next/server";
import { createAgent } from "@/lib/elevenlabs";

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const data = await createAgent(apiKey);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
