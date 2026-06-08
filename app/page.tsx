"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import GameBoard from "@/components/GameBoard";
import SearchInput from "@/components/SearchInput";
import ResultModal from "@/components/ResultModal";
import BandFilter, { ALL_BANDS } from "@/components/BandFilter";
import {
  getDailySong,
  getDayNumber,
  getRandomSong,
  loadStats,
  saveStats,
  loadGameState,
  saveGameState,
  loadSelectedBands,
  saveSelectedBands,
  MAX_ATTEMPTS,
  GuessResult,
  Stats,
  GameState,
  fuzzySearch,
} from "@/lib/gameLogic";
import { songs, Song, songCategories } from "@/data/songs";

export default function Home() {
  const [song, setSong] = useState<Song | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBandFilter, setShowBandFilter] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats());
  const [hint, setHint] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [selectedBands, setSelectedBands] = useState<string[]>(ALL_BANDS);
  const [roundCount, setRoundCount] = useState(1);
  const [playedCount, setPlayedCount] = useState(0);

  // IDs of songs already played this session — avoids repeats until pool empty
  const playedRef = useRef<string[]>([]);

  // Derive song pool from selected bands
  const songPool = songs.filter((s) => songCategories(s).some((c) => selectedBands.includes(c)));

  // Pick a random song from the pool that hasn't been played yet.
  // When every song in the pool has been played, the pool auto-resets.
  const pickUnplayed = (pool: Song[]): Song => {
    const basePool = pool.length > 0 ? pool : songs;
    let remaining = basePool.filter((s) => !playedRef.current.includes(s.id));
    if (remaining.length === 0) {
      // Pool exhausted → reset and start over
      playedRef.current = [];
      remaining = basePool;
    }
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    playedRef.current = [...playedRef.current, next.id];
    setPlayedCount(playedRef.current.length);
    return next;
  };

  const startNewGame = useCallback((pool: Song[]) => {
    const newSong = pickUnplayed(pool);
    setSong(newSong);
    setCurrentAttempt(0);
    setGuesses([]);
    setWon(false);
    setLost(false);
    setShowModal(false);
    setShowHint(false);
    setHint(null);
    setRoundCount((c) => c + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the pool: every song becomes available again
  const handleResetPool = useCallback(() => {
    playedRef.current = [];
    setPlayedCount(0);
    startNewGame(songPool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songPool]);

  useEffect(() => {
    // Load saved band preferences
    const savedBands = loadSelectedBands();
    const bands = savedBands.length > 0 ? savedBands : ALL_BANDS;
    setSelectedBands(bands);

    const pool = songs.filter((s) => songCategories(s).some((c) => bands.includes(c)));

    // Try to restore today's daily game state first
    const savedState = loadGameState();
    if (savedState && savedState.song) {
      const restored = savedState.song as Song;
      setSong(restored);
      playedRef.current = [restored.id];
      setPlayedCount(1);
      setCurrentAttempt(savedState.currentAttempt ?? 0);
      setGuesses(savedState.guesses ?? []);
      setWon(savedState.won ?? false);
      setLost(savedState.lost ?? false);
      if ((savedState.currentAttempt ?? 0) >= 3) {
        setShowHint(true);
        setHint(restored.artist);
      }
      if (savedState.won || savedState.lost) {
        setTimeout(() => setShowModal(true), 400);
      }
    } else {
      // Start fresh with random song from pool
      const newSong = getRandomSong(pool.length > 0 ? pool : songs);
      setSong(newSong);
      playedRef.current = [newSong.id];
      setPlayedCount(1);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (won || lost)) setShowModal(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [won, lost]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleBandChange = (bands: string[]) => {
    setSelectedBands(bands);
    saveSelectedBands(bands);
  };

  const finishGame = useCallback(
    (didWin: boolean, newGuesses: GuessResult[], attempt: number) => {
      const newStats = { ...stats };
      newStats.gamesPlayed++;
      newStats.lastPlayedDate = new Date().toDateString();

      if (didWin) {
        newStats.gamesWon++;
        newStats.currentStreak++;
        newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
        const dist = [...newStats.guessDistribution];
        dist[attempt] = (dist[attempt] ?? 0) + 1;
        newStats.guessDistribution = dist;
      } else {
        newStats.currentStreak = 0;
      }

      setStats(newStats);
      saveStats(newStats);
      setTimeout(() => setShowModal(true), didWin ? 800 : 400);
    },
    [stats]
  );

  const handleGuess = useCallback(
    (guessedSong: Song | null, value: string) => {
      if (!song || won || lost) return;

      const isCorrect =
        guessedSong?.id === song.id ||
        song.title.toLowerCase() === value.toLowerCase().trim();

      const newGuesses: GuessResult[] = [...guesses, isCorrect ? "correct" : "wrong"];
      const newAttempt = currentAttempt + 1;

      setGuesses(newGuesses);
      setCurrentAttempt(newAttempt);

      if (!isCorrect) triggerShake();

      if (newAttempt >= 3 && !showHint) {
        setShowHint(true);
        setHint(song.artist);
      }

      const gameWon = isCorrect;
      // 6th slot ("Full") is a real guess — only lose after the 6th wrong guess
      const gameLost = !isCorrect && newAttempt >= MAX_ATTEMPTS;

      if (gameWon) setWon(true);
      if (gameLost) setLost(true);

      const state: GameState = {
        currentAttempt: newAttempt,
        guesses: newGuesses,
        won: gameWon,
        lost: gameLost,
        song,
        hintsRevealed: false,
      };
      saveGameState(state);

      if (gameWon || gameLost) finishGame(gameWon, newGuesses, currentAttempt);
    },
    [song, won, lost, guesses, currentAttempt, showHint, finishGame]
  );

  const handleSkip = useCallback(() => {
    if (!song || won || lost) return;

    const newGuesses: GuessResult[] = [...guesses, "skip"];
    const newAttempt = currentAttempt + 1;

    setGuesses(newGuesses);
    setCurrentAttempt(newAttempt);

    if (newAttempt >= 3 && !showHint) {
      setShowHint(true);
      setHint(song.artist);
    }

    const gameLost = newAttempt >= MAX_ATTEMPTS;
    if (gameLost) setLost(true);

    saveGameState({
      currentAttempt: newAttempt,
      guesses: newGuesses,
      won: false,
      lost: gameLost,
      song,
      hintsRevealed: false,
    });

    if (gameLost) finishGame(false, newGuesses, currentAttempt);
  }, [song, won, lost, guesses, currentAttempt, showHint, finishGame]);

  const gameOver = won || lost;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between max-w-lg mx-auto w-full">
        {/* Band filter button */}
        <button
          onClick={() => setShowBandFilter(true)}
          className="w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-white transition-colors"
          title="Bands auswählen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        <div className="text-center">
          <h1
            className="text-2xl tracking-[0.2em] font-black text-white"
            style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif" }}
          >
            SONG WORDLE
          </h1>
          <p className="text-zinc-600 text-xs font-mono">
            Runde {roundCount} · {playedCount}/{songPool.length} gespielt
          </p>
        </div>

        {/* Stats button */}
        <button
          onClick={() => gameOver && setShowModal(true)}
          className={`w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-white transition-colors ${
            !gameOver ? "opacity-30 pointer-events-none" : ""
          }`}
          title="Statistiken"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </header>

      {/* Game */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8 max-w-lg mx-auto w-full">
        <GameBoard guesses={guesses} currentAttempt={currentAttempt} />

        {song && (
          <div className={shake ? "animate-shake" : ""}>
            <AudioPlayer
              youtubeId={song.youtubeId}
              startOffset={song.startOffset}
              attempt={Math.min(currentAttempt, 5)}
              disabled={gameOver}
            />
          </div>
        )}

        {showHint && hint && (
          <div className="text-center animate-fade-in">
            <span className="text-xs font-mono text-zinc-500">TIPP: </span>
            <span className="text-sm font-mono text-yellow-400 font-bold">{hint}</span>
          </div>
        )}

        {!gameOver && song && (
          <SearchInput
            onSubmit={handleGuess}
            onSkip={handleSkip}
            disabled={gameOver}
            songPool={songPool}
          />
        )}

        {/* Reset pool — make every song available again */}
        {playedCount >= songPool.length && songPool.length > 0 ? (
          <button
            onClick={handleResetPool}
            className="text-xs font-mono text-yellow-400 hover:text-yellow-300 underline transition-colors"
          >
            ✓ Alle Songs durch! Pool zurücksetzen
          </button>
        ) : (
          <button
            onClick={handleResetPool}
            className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
            title="Alle Songs wieder verfügbar machen"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Pool zurücksetzen
          </button>
        )}

        {gameOver && song && (
          <div className="text-center space-y-3">
            {won ? (
              <p className="text-green-400 font-bold font-mono text-lg">🎸 RICHTIG!</p>
            ) : (
              <p className="text-red-400 font-bold font-mono text-lg">💀 Verloren</p>
            )}
            <p className="text-zinc-400 font-mono text-sm">
              <span className="text-white font-bold">{song.title}</span>
              <span className="text-zinc-600"> — </span>
              {song.artist}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 justify-center pt-1">
              {/* New Song */}
              <button
                onClick={() => startNewGame(songPool)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold font-mono text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Neuer Song
              </button>

              {/* Stats */}
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-sm transition-colors border border-zinc-700"
              >
                Stats
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Band Filter Modal */}
      {showBandFilter && (
        <BandFilter
          selected={selectedBands}
          onChange={handleBandChange}
          onClose={() => setShowBandFilter(false)}
        />
      )}

      {/* Result Modal */}
      {showModal && song && (
        <ResultModal
          won={won}
          song={song}
          guesses={guesses}
          stats={stats}
          onClose={() => setShowModal(false)}
          onNewSong={() => startNewGame(songPool)}
        />
      )}
    </main>
  );
}
