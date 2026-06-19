import type { Score } from "./claude.js";

// Simple in-memory cache keyed by trend id (NO database - see CLAUDE.md).
// Purpose: never re-score the same trend id twice. Survives for the life of
// the process, which is all an overnight demo needs.
const scoreCache = new Map<string, Score>();

export function getCachedScore(id: string): Score | undefined {
  return scoreCache.get(id);
}

export function setCachedScore(id: string, score: Score): void {
  scoreCache.set(id, score);
}

export function cachedScoreCount(): number {
  return scoreCache.size;
}
