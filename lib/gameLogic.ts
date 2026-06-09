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

export interface CategoryStat {
  played: number;
  won: number;
  totalWinGuesses: number; // sum of attempts used in won games (for avg)
}

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  lastPlayedDate: string | null;
  categoryStats?: Record<string, CategoryStat>;
}

// Which category the player performs best in: highest win rate among
// categories with enough games; ties broken by fewer avg guesses.
export function getBestCategory(
  stats: Stats,
  minGames = 3
): { category: string; winRate: number; played: number; avgGuesses: number } | null {
  const cs = stats.categoryStats;
  if (!cs) return null;
  let best: { category: string; winRate: number; played: number; avgGuesses: number } | null = null;
  for (const [category, s] of Object.entries(cs)) {
    if (s.played < minGames) continue;
    const winRate = s.won / s.played;
    const avgGuesses = s.won > 0 ? s.totalWinGuesses / s.won : 99;
    if (
      !best ||
      winRate > best.winRate ||
      (winRate === best.winRate && avgGuesses < best.avgGuesses)
    ) {
      best = { category, winRate, played: s.played, avgGuesses };
    }
  }
  return best;
}

// Record a finished game against each of the song's categories.
export function recordCategoryResult(
  stats: Stats,
  categories: string[],
  won: boolean,
  winGuesses: number
): Stats {
  const cs: Record<string, CategoryStat> = { ...(stats.categoryStats ?? {}) };
  for (const c of categories) {
    const prev = cs[c] ?? { played: 0, won: 0, totalWinGuesses: 0 };
    cs[c] = {
      played: prev.played + 1,
      won: prev.won + (won ? 1 : 0),
      totalWinGuesses: prev.totalWinGuesses + (won ? winGuesses : 0),
    };
  }
  return { ...stats, categoryStats: cs };
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

// Stats are stored per identity: a logged-in Discord user gets their own
// stats keyed by id; otherwise the shared "guest" stats are used.
function statsKey(userId?: string | null): string {
  return userId ? `songWordle_stats_${userId}` : "songWordle_stats";
}

export function loadStats(userId?: string | null): Stats {
  if (typeof window === "undefined") {
    return defaultStats();
  }
  try {
    const raw = localStorage.getItem(statsKey(userId));
    return raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats();
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
    categoryStats: {},
  };
}

export function saveStats(stats: Stats, userId?: string | null): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(statsKey(userId), JSON.stringify(stats));
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
