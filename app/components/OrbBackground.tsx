"use client";

import { useEffect, useState } from "react";
import styles from "./OrbBackground.module.css";

interface OrbBackgroundProps {
  palette: number;
  inputVolume: number;
  outputVolume: number;
  isSpeaking: boolean;
  isConnected: boolean;
}

const paletteMap: Record<number, string> = {
  1: styles.palette1,
  2: styles.palette2,
  3: styles.palette3,
  4: styles.palette4,
  5: styles.palette5,
  6: styles.palette6,
};

export default function OrbBackground({
  palette,
  inputVolume,
  outputVolume,
  isSpeaking,
}: OrbBackgroundProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Device orientation (mobile) or mouse movement (desktop) detection
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // beta: tilt forward/backward (-180 to 180, 0 is upright)
      // gamma: tilt left/right (-90 to 90, 0 is upright)
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;

      const y = Math.max(-30, Math.min(30, beta / 6));
      const x = Math.max(-30, Math.min(30, gamma / 3));

      setOffsetX(x);
      setOffsetY(y);
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Calculate position relative to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const x = ((event.clientX - centerX) / centerX) * 30;
      const y = ((event.clientY - centerY) / centerY) * 30;

      setOffsetX(Math.max(-30, Math.min(30, x)));
      setOffsetY(Math.max(-30, Math.min(30, y)));
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== "undefined" && (DeviceOrientationEvent as any).requestPermission) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          } else {
            // Fallback to mouse on denied permission
            window.addEventListener("mousemove", handleMouseMove);
          }
        })
        .catch(() => {
          // Fallback to mouse on error
          window.addEventListener("mousemove", handleMouseMove);
        });
    } else {
      // Desktop or non-iOS: use mouse movement
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Voice reactivity: scale the blob container based on audio volume
  const volume = isSpeaking ? outputVolume : inputVolume;
  const scale = 1 + volume * 0.3;

  const paletteClass = paletteMap[palette] || paletteMap[1];

  return (
    <div className={`${styles.container} ${paletteClass}`}>
      <div
        className={styles.blobs}
        style={{
          transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
          transition: "transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <svg viewBox="0 0 1200 1200">
          {/* Primary blobs */}
          <g className={`${styles.blob} ${styles.blob1}`}>
            <path />
          </g>
          <g className={`${styles.blob} ${styles.blob2}`}>
            <path />
          </g>
          <g className={`${styles.blob} ${styles.blob3}`}>
            <path />
          </g>
          <g className={`${styles.blob} ${styles.blob4}`}>
            <path />
          </g>
          {/* Alt blobs (reverse animation direction, lower opacity) */}
          <g className={`${styles.blob} ${styles.blob1} ${styles.blobAlt}`}>
            <path />
          </g>
          <g className={`${styles.blob} ${styles.blob2} ${styles.blobAlt}`}>
            <path />
          </g>
          <g className={`${styles.blob} ${styles.blob3} ${styles.blobAlt}`}>
            <path />
          </g>
          <g className={`${styles.blob} ${styles.blob4} ${styles.blobAlt}`}>
            <path />
          </g>
        </svg>
      </div>
    </div>
  );
}
