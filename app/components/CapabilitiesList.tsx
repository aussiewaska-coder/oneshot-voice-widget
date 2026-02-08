"use client";

import { ShimmeringText } from "@/components/ui/shimmering-text";

const CAPABILITIES = [
  "Operator Directory & Lookups",
  "Service Manuals & Technical Guides",
  "Diagnostic Support",
  "Real-time Voice Assistance",
  "Memory-based Conversation",
  "Vehicle Assessment Guidance",
];

export default function CapabilitiesList() {
  return (
    <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-8">
      <div className="space-y-3">
        {CAPABILITIES.map((capability, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex-shrink-0" />
            <ShimmeringText
              text={capability}
              className="text-sm font-light"
              color="rgba(100, 150, 255, 0.4)"
              shimmerColor="rgba(100, 200, 255, 0.7)"
              duration={3}
              spread={1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
