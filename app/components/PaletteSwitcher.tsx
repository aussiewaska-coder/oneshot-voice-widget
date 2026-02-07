"use client";

const palettes = [
  { id: 1, bg0: "#101030", bg1: "#050515" },
  { id: 2, bg0: "#545454", bg1: "#150513" },
  { id: 3, bg0: "#300030", bg1: "#000000" },
  { id: 4, bg0: "#ffffff", bg1: "#d3f7ff" },
  { id: 5, bg0: "#968e85", bg1: "#8cc084" },
  { id: 6, bg0: "#ffffff", bg1: "#4e598c" },
];

interface PaletteSwitcherProps {
  activePalette: number;
  onPaletteChange: (palette: number) => void;
}

export default function PaletteSwitcher({
  activePalette,
  onPaletteChange,
}: PaletteSwitcherProps) {
  return (
    <div className="absolute left-4 top-0 h-screen flex flex-col justify-center gap-4 z-30">
      {palettes.map((p) => (
        <button
          key={p.id}
          onClick={() => onPaletteChange(p.id)}
          className={`w-[min(10vh,3.5rem)] h-[min(10vh,3.5rem)] rounded-lg backdrop-blur-lg border cursor-pointer transition-all ${
            activePalette === p.id
              ? "border-white/60 ring-2 ring-white/40"
              : "border-white/20 hover:border-white/40"
          }`}
          style={{
            background: `radial-gradient(${p.bg0}, ${p.bg1})`,
          }}
          aria-label={`Palette ${p.id}`}
        />
      ))}
    </div>
  );
}
