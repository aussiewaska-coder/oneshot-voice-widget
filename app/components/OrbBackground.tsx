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

  // Device orientation detection
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // beta: tilt forward/backward (-180 to 180, 0 is upright)
      // gamma: tilt left/right (-90 to 90, 0 is upright)
      const beta = event.beta || 0; // -180 to 180
      const gamma = event.gamma || 0; // -90 to 90

      // Convert to offset percentages (more pronounced movement)
      // Clamp values to prevent extreme movement
      const y = Math.max(-15, Math.min(15, beta / 10)); // -15% to 15%
      const x = Math.max(-15, Math.min(15, gamma / 6)); // -15% to 15%

      setOffsetX(x);
      setOffsetY(y);
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== "undefined" && (DeviceOrientationEvent as any).requestPermission) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        })
        .catch(console.error);
    } else {
      // Non-iOS or older iOS
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
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
          transition: "transform 150ms cubic-bezier(0.23, 1, 0.320, 1)",
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
