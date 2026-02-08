"use client";

import { useState } from "react";

const CAPABILITIES = [
  {
    name: "SMS Integration",
    simple: "Send and receive text messages",
    middle: "Full SMS communication through the bot interface, enabling text-based interactions, alerts, and notifications.",
    complex: "const sms = { provider: 'twilio', encoding: 'utf8', delivery: 'guaranteed', retry: 'exponential', logging: 'full' };",
  },
  {
    name: "Conversationalism",
    simple: "Chat naturally with context awareness",
    middle: "Experience natural, human-like dialogue with context awareness, conversation memory, and intelligent topic switching.",
    complex: "const conversation = { model: 'gpt4', memory: 'turns:50', context: 'injected', tone: 'ray_shoesmith', interrupts: 'enabled' };",
  },
];

export default function CapabilitiesList() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [complexityLevel, setComplexityLevel] = useState<"simple" | "middle" | "complex">("simple");

  return (
    <div className="absolute top-40 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-8">
      <style>{`
        @keyframes easeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 0px rgba(100, 200, 255, 0);
          }
          50% {
            text-shadow: 0 0 12px rgba(100, 200, 255, 0.8), 0 0 24px rgba(59, 130, 246, 0.5);
          }
        }

        .capability-item {
          animation: easeUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }

        .capability-item.hovered {
          animation: glow 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-4">
        {/* Complexity level switcher */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-cyan-400/60 font-ubuntu text-xs">Level:</span>
          {(["simple", "middle", "complex"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setComplexityLevel(level)}
              className={`px-3 py-1 rounded font-ubuntu text-xs transition-all ${
                complexityLevel === level
                  ? "bg-cyan-400/20 border border-cyan-400 text-cyan-300"
                  : "bg-transparent border border-cyan-400/30 text-cyan-400/60 hover:text-cyan-400"
              }`}
            >
              {level === "simple" ? "Simple" : level === "middle" ? "Middle" : "Complex"}
            </button>
          ))}
        </div>

        {/* Capabilities list */}
        <div className="space-y-3">
          {CAPABILITIES.map((capability, index) => (
            <div
              key={index}
              className="capability-item relative"
              style={{
                animationDelay: `${index * 0.15}s`,
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-start gap-4 cursor-pointer group">
                {/* Capability text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-ubuntu text-base font-light transition-all duration-300 ${
                      hoveredIndex === index
                        ? "text-cyan-300 capability-item hovered"
                        : "text-cyan-400/60"
                    }`}
                  >
                    {capability.name}
                  </p>

                  {/* Description based on complexity level */}
                  {complexityLevel === "complex" ? (
                    <pre className="mt-2 p-2 bg-black/40 border border-cyan-400/20 rounded font-mono text-[10px] text-cyan-300/70 overflow-x-auto">
                      {capability.complex}
                    </pre>
                  ) : (
                    <p className="mt-1 font-ubuntu text-xs text-cyan-400/50 leading-relaxed">
                      {complexityLevel === "simple" ? capability.simple : capability.middle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
