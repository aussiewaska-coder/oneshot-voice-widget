"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Custom hook to monitor FPS and auto-detect low-performance devices.
 * When FPS drops below 45, enables low-performance mode which triggers:
 * - Reduced blur intensity (60px → 30px → 20px)
 * - Reduced blob count (4 → 2)
 * - Simplified SVG animations
 * - Disabled matrix rain in HackerLog
 *
 * @returns { isLowPerformance: boolean }
 */
export function usePerformanceMode() {
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let animationFrameId: number;

    const checkPerformance = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      // Check FPS every second
      if (elapsed >= 1000) {
        const fps = (frameCountRef.current * 1000) / elapsed;

        // If FPS drops below 45, enable low performance mode
        if (fps < 45 && !isLowPerformance) {
          setIsLowPerformance(true);
          const log = (window as any).hackerLog;
          log?.(
            `[PERFORMANCE] Low FPS detected (${fps.toFixed(1)}), enabling optimizations`,
            "warning"
          );
        } else if (fps >= 50 && isLowPerformance) {
          // Recover if FPS improves
          setIsLowPerformance(false);
          const log = (window as any).hackerLog;
          log?.(`[PERFORMANCE] FPS recovered (${fps.toFixed(1)}), disabling optimizations`, "success");
        }

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(checkPerformance);
    };

    animationFrameId = requestAnimationFrame(checkPerformance);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isLowPerformance]);

  return { isLowPerformance };
}
