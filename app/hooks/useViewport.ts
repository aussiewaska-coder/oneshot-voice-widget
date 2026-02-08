"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to detect viewport size for responsive rendering.
 * Returns isMobile (true when < 1024px, the lg: breakpoint).
 *
 * SSR-safe: Checks typeof window before accessing globals.
 * Avoids duplicate resize listeners by managing single listener in useEffect.
 *
 * @returns { isMobile: boolean, isDesktop: boolean }
 */
export function useViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") {
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg: breakpoint
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return { isMobile, isDesktop: !isMobile };
}
