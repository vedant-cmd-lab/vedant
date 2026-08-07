import { baseScoreForAttempt, STREAK_BONUS_PER_DAY } from "./game";

const PROGRESS_PREFIX = "sd_progress_";
const STATS_KEY = "sd_stats";

const DEFAULT_STATS = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalScore: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  lastFinishedNumber: null,
};

export function getProgress(number) {
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + number);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { guesses: [], solved: false, finished: false, solvedOnAttempt: null, score: 0 };
}

export function saveProgress(number, progress) {
  localStorage.setItem(PROGRESS_PREFIX + number, JSON.stringify(progress));
}

export function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_STATS };
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Called once when a puzzle is finished (won or lost). Returns {score, stats}.
export function recordFinish(number, solved, attempt) {
  const stats = getStats();
  const isConsecutive = stats.lastFinishedNumber === number - 1;

  let currentStreak;
  if (solved) {
    currentStreak = isConsecutive ? stats.currentStreak + 1 : 1;
  } else {
    currentStreak = 0;
  }

  let score = 0;
  if (solved) {
    const base = baseScoreForAttempt(attempt);
    const bonus = currentStreak * STREAK_BONUS_PER_DAY;
    score = base + bonus;
  }

  const distribution = { ...stats.distribution };
  if (solved) distribution[attempt] = (distribution[attempt] || 0) + 1;

  const newStats = {
    played: stats.played + 1,
    wins: stats.wins + (solved ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    totalScore: stats.totalScore + score,
    distribution,
    lastFinishedNumber: number,
  };
  saveStats(newStats);
  return { score, currentStreak };
}
