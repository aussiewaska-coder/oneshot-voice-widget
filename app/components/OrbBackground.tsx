"use client";

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
  // Voice reactivity: scale the blob container based on audio volume
  const volume = isSpeaking ? outputVolume : inputVolume;
  const scale = 1 + volume * 0.3;

  const paletteClass = paletteMap[palette] || paletteMap[1];

  return (
    <div className={`${styles.container} ${paletteClass}`}>
      <div
        className={styles.blobs}
        style={{ transform: `scale(${scale})` }}
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
