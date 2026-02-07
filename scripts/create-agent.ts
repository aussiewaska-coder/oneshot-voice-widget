import "dotenv/config";
import { createAgent } from "../lib/elevenlabs";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env.local");
    process.exit(1);
  }

  console.log("Creating ElevenLabs agent...");
  const data = await createAgent(apiKey);
  console.log("Agent created successfully!");
  console.log("Agent ID:", data.agent_id);
  console.log("\nAdd this to your .env.local:");
  console.log(`NEXT_PUBLIC_AGENT_ID=${data.agent_id}`);
}

main().catch((err) => {
  console.error("Failed to create agent:", err);
  process.exit(1);
});
