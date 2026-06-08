"use client";

import { useState, useRef, useEffect } from "react";
import { fuzzySearch } from "@/lib/gameLogic";
import { Song } from "@/data/songs";

interface SearchInputProps {
  onSubmit: (song: Song | null, value: string) => void;
  onSkip: () => void;
  disabled: boolean;
  songPool?: Song[];
}

export default function SearchInput({ onSubmit, onSkip, disabled, songPool }: SearchInputProps) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [selected, setSelected] = useState<Song | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) {
      setValue("");
      setResults([]);
      setSelected(null);
      setOpen(false);
    }
  }, [disabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled]);

  const handleChange = (v: string) => {
    setValue(v);
    setSelected(null);
    if (v.trim()) {
      const r = fuzzySearch(v, songPool);
      setResults(r.slice(0, 8));
      setOpen(true);
      setHighlightIdx(0);
    } else {
      setResults([]);
      setOpen(false);
    }
  };

  const handleSelect = (song: Song) => {
    setSelected(song);
    setValue(`${song.title} — ${song.artist}`);
    setOpen(false);
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(selected, value);
    setValue("");
    setSelected(null);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[highlightIdx]) {
        handleSelect(results[highlightIdx]);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="w-full max-w-md relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            disabled={disabled}
            placeholder="Song oder Band suchen…"
            className={`
              w-full px-4 py-3 rounded-lg font-mono text-sm
              bg-zinc-900 border border-zinc-700
              text-white placeholder-zinc-500
              focus:outline-none focus:border-red-600
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            `}
          />

          {open && results.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl shadow-black/50">
              {results.map((song, i) => (
                <li
                  key={song.id}
                  onMouseDown={() => handleSelect(song)}
                  className={`
                    px-4 py-2.5 cursor-pointer font-mono text-sm
                    flex items-center justify-between
                    ${i === highlightIdx ? "bg-zinc-700 text-white" : "text-zinc-300 hover:bg-zinc-800"}
                  `}
                >
                  <span>{song.title}</span>
                  <span className="text-zinc-500 text-xs ml-2">{song.artist}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-sm font-bold transition-colors"
        >
          Rate
        </button>

        <button
          onClick={onSkip}
          disabled={disabled}
          className="px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-400 font-mono text-sm transition-colors border border-zinc-700"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
