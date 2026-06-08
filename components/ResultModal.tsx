"use client";

import { useEffect, useRef } from "react";
import { Song } from "@/data/songs";
import { Stats, GuessResult, buildShareText, getDayNumber } from "@/lib/gameLogic";

interface ResultModalProps {
  won: boolean;
  song: Song;
  guesses: GuessResult[];
  stats: Stats;
  onClose: () => void;
  onNewSong?: () => void;
}

export default function ResultModal({ won, song, guesses, stats, onClose, onNewSong }: ResultModalProps) {
  const shareRef = useRef<HTMLButtonElement>(null);

  const shareText = buildShareText(guesses, won, getDayNumber());

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      if (shareRef.current) {
        shareRef.current.textContent = "Kopiert!";
        setTimeout(() => {
          if (shareRef.current) shareRef.current.textContent = "Teilen";
        }, 2000);
      }
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          {won ? (
            <>
              <div className="text-4xl mb-2">🎸</div>
              <h2 className="text-2xl font-bold text-green-400 tracking-wide">RICHTIG!</h2>
              <p className="text-zinc-400 text-sm mt-1 font-mono">
                In Versuch {guesses.filter(Boolean).length}
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">💀</div>
              <h2 className="text-2xl font-bold text-red-400 tracking-wide">LEIDER NEIN</h2>
              <p className="text-zinc-400 text-sm mt-1 font-mono">Besser beim nächsten Mal!</p>
            </>
          )}
        </div>

        {/* Song info */}
        <div className="bg-zinc-800 rounded-xl p-4 mb-5 border border-zinc-700">
          <div className="text-xs text-zinc-500 font-mono mb-1">Der gesuchte Song:</div>
          <div className="text-white font-bold text-lg">{song.title}</div>
          <div className="text-zinc-400 font-mono text-sm">{song.artist}</div>
          <a
            href={`https://www.youtube.com/watch?v=${song.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-red-400 hover:text-red-300 font-mono underline"
          >
            ▶ Auf YouTube ansehen
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Gespielt", value: stats.gamesPlayed },
            { label: "Gewonnen", value: stats.gamesWon },
            { label: "Streak", value: stats.currentStreak },
            { label: "Max", value: stats.maxStreak },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-zinc-800 rounded-lg p-2">
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-500 font-mono">{label}</div>
            </div>
          ))}
        </div>

        {/* Guess distribution */}
        <div className="mb-5">
          <div className="text-xs text-zinc-500 font-mono mb-2">RATEN-VERTEILUNG</div>
          {stats.guessDistribution.map((count, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className="text-zinc-400 font-mono text-xs w-4">{i + 1}</span>
              <div className="flex-1 h-4 bg-zinc-800 rounded overflow-hidden">
                <div
                  className="h-full bg-red-700 rounded transition-all"
                  style={{
                    width: `${stats.gamesWon > 0 ? (count / Math.max(...stats.guessDistribution, 1)) * 100 : 0}%`,
                    minWidth: count > 0 ? "1.5rem" : 0,
                  }}
                />
              </div>
              <span className="text-zinc-400 font-mono text-xs w-4">{count}</span>
            </div>
          ))}
        </div>

        {/* New Song */}
        {onNewSong && (
          <button
            onClick={onNewSong}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold font-mono text-sm transition-colors mb-2 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Neuer Song
          </button>
        )}

        {/* Share */}
        <div className="flex gap-2">
          <button
            ref={shareRef}
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold font-mono text-sm transition-colors border border-zinc-700"
          >
            Teilen
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-mono transition-colors border border-zinc-700"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
