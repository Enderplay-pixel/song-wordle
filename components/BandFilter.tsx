"use client";

import { songs, songCategories } from "@/data/songs";

// Deduplicated category list (artist, "Charts", "DÄ - aber richtig" …)
export const ALL_BANDS = Array.from(
  new Set(songs.flatMap(songCategories))
).sort();

interface BandFilterProps {
  selected: string[];
  onChange: (bands: string[]) => void;
  onClose: () => void;
}

const BAND_ICONS: Record<string, string> = {
  "Die Toten Hosen": "🎸",
  "Die Ärzte": "💊",
  "AC/DC": "⚡",
  "Rammstein": "🔥",
  "Metallica": "🤘",
  "Nirvana": "🌀",
  "Green Day": "🟢",
  "Linkin Park": "⬛",
  "Sex Pistols": "🏴",
  "Rage Against the Machine": "✊",
  "Black Sabbath": "🖤",
  "Led Zeppelin": "🛩️",
  "Deep Purple": "🟣",
  "Julien Bam": "🎭",
  "Charts": "📈",
  "DÄ - aber richtig": "💎",
  "Frei.Wild": "🏔️",
  "Pop 2000-2019": "🎧",
  "Schlager": "🍻",
};

export default function BandFilter({ selected, onChange, onClose }: BandFilterProps) {
  const toggle = (band: string) => {
    if (selected.includes(band)) {
      // Don't allow deselecting the last band
      if (selected.length === 1) return;
      onChange(selected.filter((b) => b !== band));
    } else {
      onChange([...selected, band]);
    }
  };

  const selectAll = () => onChange([...ALL_BANDS]);
  const selectNone = () => {
    // Keep at least one
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-bold tracking-widest" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "1.25rem" }}>
            BANDS AUSWÄHLEN
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* All / None buttons */}
        <div className="flex gap-2 px-5 pt-3 pb-1">
          <button
            onClick={selectAll}
            className="flex-1 py-1.5 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
          >
            Alle auswählen
          </button>
          <button
            onClick={() => onChange([ALL_BANDS[0]])}
            className="flex-1 py-1.5 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
          >
            Alle abwählen
          </button>
        </div>

        {/* Band list */}
        <ul className="px-3 py-2 max-h-[60vh] overflow-y-auto">
          {ALL_BANDS.map((band) => {
            const isSelected = selected.includes(band);
            const songCount = songs.filter((s) => songCategories(s).includes(band)).length;
            return (
              <li key={band}>
                <button
                  onClick={() => toggle(band)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left
                    ${isSelected
                      ? "bg-red-950/50 border border-red-800/60 text-white"
                      : "bg-zinc-800/50 border border-transparent text-zinc-400 hover:bg-zinc-800"
                    }
                  `}
                >
                  {/* Checkbox */}
                  <div className={`
                    w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all
                    ${isSelected ? "bg-red-600 border-red-500" : "border-zinc-600 bg-zinc-800"}
                  `}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Icon + Name */}
                  <span className="text-lg flex-shrink-0">{BAND_ICONS[band] ?? "🎵"}</span>
                  <span className="flex-1 font-mono text-sm font-semibold">{band}</span>

                  {/* Song count */}
                  <span className="text-xs font-mono text-zinc-600 flex-shrink-0">{songCount} Songs</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800">
          <div className="text-xs font-mono text-zinc-600 text-center mb-3">
            {selected.length} Band{selected.length !== 1 ? "s" : ""} · {songs.filter(s => songCategories(s).some(c => selected.includes(c))).length} Songs im Pool
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold font-mono text-sm transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
