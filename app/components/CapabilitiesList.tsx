"use client";

import { useState } from "react";

const CAPABILITIES = [
  {
    name: "Operator Lookup",
    description: "Search and retrieve operator information instantly",
    tooltip: "Find operator details, contacts, and availability. Click to interact with this feature.",
  },
  {
    name: "Tug Services",
    description: "Access comprehensive tug service options and schedules",
    tooltip: "Explore available tug services, scheduling, and fleet information. Click to learn more.",
  },
  {
    name: "Tug Manuals",
    description: "Browse technical and operational documentation",
    tooltip: "Access manuals, guides, and technical specifications. Click to view documentation.",
  },
  {
    name: "Tug1300 Integration",
    description: "Direct integration with Tug1300 systems",
    tooltip: "Connect and interact with Tug1300 systems for real-time data. Click to enable.",
  },
  {
    name: "SMS Integration",
    description: "Send and receive SMS messages via the bot",
    tooltip: "Communicate via SMS through the bot interface. Click to activate SMS mode.",
  },
  {
    name: "Conversationalism",
    description: "Natural, human-like dialogue and context awareness",
    tooltip: "Experience natural conversation with contextual understanding. Click to chat.",
  },
];

export default function CapabilitiesList() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

        @keyframes pulseBlip {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
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

        .capability-bullet {
          animation: pulseBlip 2s ease-in-out infinite;
        }

        .capability-item.hovered {
          animation: glow 1.5s ease-in-out infinite;
        }

        .tooltip-scroll {
          max-height: 120px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .tooltip-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .tooltip-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .tooltip-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 200, 255, 0.3);
          border-radius: 2px;
        }

        .tooltip-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 200, 255, 0.5);
        }
      `}</style>

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
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex items-start gap-4 cursor-pointer group">
              {/* Pulsing bullet */}
              <div
                className="capability-bullet w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex-shrink-0 mt-1.5"
                style={{
                  animationDelay: `${index * 0.15}s`,
                }}
              />

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

                {/* Tooltip on hover with scroll */}
                {expandedIndex === index && (
                  <div className="mt-2 p-3 bg-black/60 border border-cyan-400/30 rounded-lg animate-in fade-in duration-200">
                    <div className="tooltip-scroll">
                      <p className="font-ubuntu text-xs text-cyan-300/80 leading-relaxed pr-2">
                        {capability.tooltip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
