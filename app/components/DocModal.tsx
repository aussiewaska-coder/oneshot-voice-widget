"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { DOCUMENTATION, type ComplexityLevel, type DocSection } from "@/lib/docs-content";
import HealthDashboard, { type SystemHealth } from "./HealthDashboard";

interface DocModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: SystemHealth;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function DocModal({ isOpen, onClose, health, onConnect, onDisconnect }: DocModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState("overview");
  const [complexityLevel, setComplexityLevel] = useState<ComplexityLevel>("middle");
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useCallback((timeout: NodeJS.Timeout | null) => timeout, []);

  const selectedSection = useMemo(
    () => DOCUMENTATION.find((s) => s.id === selectedSectionId) || DOCUMENTATION[0],
    [selectedSectionId]
  );

  const handleClose = useCallback(() => {
    setIsClosing(true);
    const timeout = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 700);
    closeTimeoutRef(timeout);
  }, [onClose, closeTimeoutRef]);

  // Handle Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 ${
          isClosing ? "animate-[genieOut_0.7s_ease-in-out_forwards] opacity-0" : "animate-[genieIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
        }`}
        onClick={handleClose}
        style={{
          pointerEvents: isClosing ? "none" : "auto",
        }}
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] md:w-[90vw] max-w-[900px] max-h-[80vh] md:max-h-[85vh] bg-gradient-to-br from-blue-950/10 to-purple-950/10 border border-white/12 rounded-xl overflow-hidden flex flex-col z-50 ${
          isClosing ? "animate-[genieOut_0.7s_ease-in-out_forwards]" : "animate-[genieIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
        }`}
        style={{
          backdropFilter: "blur(80px) saturate(1.5) brightness(1.1)",
          WebkitBackdropFilter: "blur(80px) saturate(1.5) brightness(1.1)",
          boxShadow:
            "0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 0 60px -15px rgba(100, 150, 255, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 120px -30px rgba(120, 100, 255, 0.15)",
          pointerEvents: isClosing ? "none" : "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 md:px-4 md:px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <h1 className="text-lg font-bold text-white">TugBot Documentation</h1>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            aria-label="Close documentation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Health Dashboard */}
          <div className="px-4 md:px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white/80 mb-3">System Health</h2>
            <HealthDashboard health={health} onConnect={onConnect} onDisconnect={onDisconnect} />
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar Navigation */}
            <div className="w-48 border-r border-white/10 bg-white/[0.02] overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 flex flex-col">
              <div className="p-3 space-y-1">
                {DOCUMENTATION.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                      selectedSectionId === section.id
                        ? "bg-blue-500/20 border-l-2 border-blue-400 text-blue-300 font-semibold"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 flex flex-col">
              <div className="flex-1 px-6 py-5 space-y-5">
                {/* Section Title */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl">{selectedSection.icon}</span>
                  <h2 className="text-xl font-bold text-white">{selectedSection.title}</h2>
                </div>

                {/* Content */}
                <div className="prose prose-invert max-w-none text-sm leading-relaxed text-white/80 space-y-3">
                  {selectedSection.content[complexityLevel].split("\n\n").map((paragraph, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Complexity Level Selector */}
              <div className="sticky bottom-0 px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center gap-3">
                <span className="text-xs font-semibold text-white/60 uppercase">Explanation Level:</span>
                <div className="flex gap-2">
                  {(["simple", "middle", "complex"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setComplexityLevel(level)}
                      className={`px-3 py-1 rounded text-xs font-ubuntu transition-all ${
                        complexityLevel === level
                          ? "bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-semibold"
                          : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      {level === "simple" ? "Simple" : level === "middle" ? "Middle" : "Complex"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
