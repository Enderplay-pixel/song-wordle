import { songs, Song } from "@/data/songs";

export const SNIPPET_DURATIONS = [0.1, 0.5, 2, 4, 8];
export const MAX_ATTEMPTS = 6;

export type GuessResult = "correct" | "skip" | "wrong" | null;

export interface GameState {
  currentAttempt: number;
  guesses: GuessResult[];
  won: boolean;
  lost: boolean;
  song: Song;
  hintsRevealed: boolean;
}

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  lastPlayedDate: string | null;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function dateToSeed(dateStr: string): number {
  return dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function getDailySong(): Song {
  const dateStr = new Date().toDateString();
  const seed = dateToSeed(dateStr);
  const index = Math.floor(seededRandom(seed) * songs.length);
  return songs[index];
}

export function getDayNumber(): number {
  const epoch = new Date("2024-01-01").getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.floor((today - epoch) / (1000 * 60 * 60 * 24));
}

export function getRandomSong(pool: Song[], exclude?: string): Song {
  const candidates = pool.length > 1 && exclude
    ? pool.filter((s) => s.id !== exclude)
    : pool;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

export function loadSelectedBands(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("songWordle_bands");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSelectedBands(bands: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("songWordle_bands", JSON.stringify(bands));
}

export function fuzzySearch(query: string, pool?: Song[]): Song[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return (pool ?? songs).filter((song) => {
    const haystack = [
      song.title.toLowerCase(),
      song.artist.toLowerCase(),
      ...song.searchTerms,
    ].join(" ");
    return haystack.includes(q);
  });
}

export function loadStats(): Stats {
  if (typeof window === "undefined") {
    return defaultStats();
  }
  try {
    const raw = localStorage.getItem("songWordle_stats");
    return raw ? JSON.parse(raw) : defaultStats();
  } catch {
    return defaultStats();
  }
}

function defaultStats(): Stats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    lastPlayedDate: null,
  };
}

export function saveStats(stats: Stats): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("songWordle_stats", JSON.stringify(stats));
}

export function loadGameState(): Partial<GameState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("songWordle_gameState");
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Only restore if saved today
    if (saved.date !== new Date().toDateString()) return null;
    return saved.state;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    "songWordle_gameState",
    JSON.stringify({ date: new Date().toDateString(), state })
  );
}

export function buildShareText(
  guesses: GuessResult[],
  won: boolean,
  dayNumber: number
): string {
  const emojiMap: Record<string, string> = {
    correct: "🟩",
    wrong: "🟥",
    skip: "⬛",
  };
  const grid = guesses
    .map((g) => emojiMap[g ?? "skip"] ?? "⬛")
    .join("");
  const result = won
    ? `${guesses.filter(Boolean).length} / ${MAX_ATTEMPTS}`
    : "X / " + MAX_ATTEMPTS;
  return `🎵 Song Wordle #${dayNumber}\n${grid} — ${result}\nhttps://song-wordle.vercel.app`;
}
