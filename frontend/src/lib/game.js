export const CLIP_DURATIONS = [1, 2, 4, 7, 11, 16];
export const MAX_ATTEMPTS = 6;
export const WAVEFORM_TOTAL_SECONDS = 16;

// Points earned for solving on a given attempt (1-indexed).
export const ATTEMPT_POINTS = [1000, 800, 600, 400, 200, 100];
export const STREAK_BONUS_PER_DAY = 50;

export function baseScoreForAttempt(attempt) {
  // attempt is 1-indexed
  return ATTEMPT_POINTS[attempt - 1] ?? 0;
}

// Deterministic bar heights for a puzzle's waveform (0.15 - 1.0)
export function waveformBars(seed, count = 72) {
  let s = 0;
  for (let i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) % 233280;
  const bars = [];
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    // shape it so the middle is a bit fuller, like a real clip
    const env = 0.55 + 0.45 * Math.sin((i / count) * Math.PI);
    bars.push(0.18 + r * 0.82 * env);
  }
  return bars;
}
