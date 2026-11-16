import { randomInt } from "node:crypto";

export const MIN_DRAW_PARTICIPANTS = 3;

/**
 * Shuffles participants (crypto-secure Fisher–Yates) and links them into a
 * single cycle: each person gives to the next one, the last gives to the
 * first. Nobody gets themselves; everyone gives and receives exactly once.
 */
export function drawCycle<T>(ids: readonly T[]): Array<{ giver: T; receiver: T }> {
  if (ids.length < MIN_DRAW_PARTICIPANTS)
    throw new Error(`Need at least ${MIN_DRAW_PARTICIPANTS} participants`);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate participants");
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.map((giver, i) => ({ giver, receiver: a[(i + 1) % a.length] }));
}
