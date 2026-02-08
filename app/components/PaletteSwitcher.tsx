"use client";

const palettes = [
  { id: 1, name: "Blue Standard", bg0: "#101030", bg1: "#050515" },
  { id: 2, name: "Soul Red Evil", bg0: "#4a1a1a", bg1: "#0a0a0a" },
  { id: 3, name: "Hacker Green", bg0: "#0d2b0d", bg1: "#000a00" },
  { id: 4, name: "Moody Dark", bg0: "#2a1a3a", bg1: "#0f0510" },
  { id: 5, name: "Cyber Cyan", bg0: "#004aad", bg1: "#051c2c" },
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
          title={p.name}
          aria-label={p.name}
        />
      ))}
    </div>
  );
}
