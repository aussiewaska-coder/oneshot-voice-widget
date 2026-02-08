"use client";

import { useRef, useEffect, useCallback } from "react";

export interface TouchGestureConfig {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  velocityThreshold?: number; // pixels/second (default: 200)
  minDistance?: number; // minimum pixels to consider a swipe (default: 20)
}

/**
 * Custom hook to detect touch gestures (swipe up/down, tap).
 * Calculates velocity to determine if a drag is a "swipe" (fast) or "snap" (slow).
 *
 * @param elementRef - React ref to the element to listen for gestures
 * @param config - Gesture handlers and thresholds
 *
 * Usage:
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useTouchGesture(ref, {
 *   onSwipeUp: () => { expand() },
 *   onSwipeDown: () => { collapse() },
 * });
 * return <div ref={ref}>Content</div>
 * ```
 */
export function useTouchGesture(
  elementRef: React.RefObject<HTMLElement | null>,
  config: TouchGestureConfig
) {
  const {
    onSwipeUp,
    onSwipeDown,
    onTap,
    velocityThreshold = 200,
    minDistance = 20,
  } = config;

  const touchStartRef = useRef<{
    y: number;
    time: number;
  } | null>(null);

  const touchPositionsRef = useRef<Array<{ y: number; time: number }>>([]);

  const calculateVelocity = useCallback(() => {
    const positions = touchPositionsRef.current;
    if (positions.length < 2) return 0;

    const recent = positions.slice(-3); // Last 3 positions for smoothness
    const firstPos = recent[0];
    const lastPos = recent[recent.length - 1];

    const distance = Math.abs(lastPos.y - firstPos.y);
    const time = lastPos.time - firstPos.time;

    if (time === 0) return 0;
    return (distance / time) * 1000; // pixels per second
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      time: Date.now(),
    };
    touchPositionsRef.current = [{ y: touch.clientY, time: Date.now() }];
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchPositionsRef.current.push({
      y: touch.clientY,
      time: Date.now(),
    });

    // Keep only last 10 positions for performance
    if (touchPositionsRef.current.length > 10) {
      touchPositionsRef.current.shift();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;

    const startY = touchStartRef.current.y;
    const startTime = touchStartRef.current.time;
    const endY = touchPositionsRef.current[touchPositionsRef.current.length - 1]?.y || startY;
    const endTime = Date.now();

    const distance = startY - endY; // Positive = up, Negative = down
    const time = endTime - startTime;

    // Calculate velocity
    const velocity = calculateVelocity();

    // Determine if it's a swipe (fast) or just a touch
    const isSwipe = Math.abs(velocity) > velocityThreshold && Math.abs(distance) > minDistance;
    const isTap = Math.abs(distance) < minDistance && time < 300;

    if (isTap && onTap) {
      onTap();
    } else if (isSwipe) {
      if (distance > 0 && onSwipeUp) {
        // Swiped up (finger moved upward)
        onSwipeUp();
      } else if (distance < 0 && onSwipeDown) {
        // Swiped down (finger moved downward)
        onSwipeDown();
      }
    }

    // Reset
    touchStartRef.current = null;
    touchPositionsRef.current = [];
  }, [calculateVelocity, onSwipeUp, onSwipeDown, onTap, velocityThreshold, minDistance]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
