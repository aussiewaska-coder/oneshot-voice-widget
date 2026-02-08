"use client";

import React, { useMemo, useEffect, useState } from "react";

export type Frame = number[][];

// Pre-defined animation frames
export const loader: Frame[] = [
  [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]],
  [[0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0]],
  [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
];

export const pulse: Frame[] = [
  [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
];

export const wave: Frame[] = Array.from({ length: 8 }, (_, i) => {
  const frame: Frame = [];
  for (let row = 0; row < 7; row++) {
    const cols: number[] = [];
    for (let col = 0; col < 7; col++) {
      const dist = Math.abs(col - i);
      cols.push(Math.max(0, 1 - dist * 0.2));
    }
    frame.push(cols);
  }
  return frame;
});

interface MatrixProps {
  rows: number;
  cols: number;
  pattern?: Frame;
  frames?: Frame[];
  fps?: number;
  loop?: boolean;
  mode?: "static" | "animated" | "vu";
  size?: number;
  gap?: number;
  levels?: number[];
  palette?: {
    on: string;
    off: string;
  };
  ariaLabel?: string;
}

export function Matrix({
  rows,
  cols,
  pattern,
  frames,
  fps = 12,
  loop = false,
  mode = "static",
  size = 10,
  gap = 2,
  levels,
  palette = { on: "#22d3ee", off: "#0f172a" },
  ariaLabel,
}: MatrixProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (!frames || frames.length === 0 || mode !== "animated") return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (loop) return next % frames.length;
        return Math.min(next, frames.length - 1);
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [frames, fps, loop, mode]);

  const frameData = useMemo(() => {
    if (mode === "static" && pattern) return pattern;
    if (mode === "animated" && frames && frames.length > 0) return frames[currentFrame];
    if (mode === "vu" && levels) {
      const frame: Frame = [];
      for (let row = 0; row < rows; row++) {
        const rowData: number[] = [];
        for (let col = 0; col < Math.min(levels.length, cols); col++) {
          const normalizedRow = row / rows;
          rowData.push(levels[col] >= normalizedRow ? 1 : 0);
        }
        // Pad with zeros if needed
        while (rowData.length < cols) {
          rowData.push(0);
        }
        frame.push(rowData);
      }
      return frame;
    }
    return Array(rows).fill(Array(cols).fill(0));
  }, [pattern, frames, currentFrame, mode, rows, cols, levels]);

  const totalWidth = cols * size + (cols - 1) * gap;
  const totalHeight = rows * size + (rows - 1) * gap;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      aria-label={ariaLabel}
      role="img"
    >
      {frameData.map((row, rowIndex) =>
        row.map((cell: number, colIndex: number) => {
          const x = colIndex * (size + gap);
          const y = rowIndex * (size + gap);
          const opacity = typeof cell === "number" ? cell : cell ? 1 : 0;

          return (
            <circle
              key={`${rowIndex}-${colIndex}`}
              cx={x + size / 2}
              cy={y + size / 2}
              r={size / 2}
              fill={palette.on}
              opacity={opacity}
              style={{ transition: `opacity 100ms ease-out` }}
            />
          );
        })
      )}
    </svg>
  );
}
