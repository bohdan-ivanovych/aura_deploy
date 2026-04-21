/**
 * HP Engine — single source of truth for all HP changes in Aura.
 * Every feature that affects HP must go through computeHPDelta().
 * This eliminates hardcoded numbers and guarantees consistency.
 */

import { getHPRegen, getMaxHP } from './levels';
import { HP_PENALTY_MINOR } from '@/src/config/gameplayConfig';

export type HPEvent =
  | 'chat_clean'         // User sent a clean message — reward
  | 'chat_minor_error'   // Minor grammar slip
  | 'chat_major_error'   // Serious grammar error
  | 'call_clean'         // Voice exchange with no errors
  | 'call_error'         // Voice exchange with grammar error detected
  | 'flashcard_correct'  // Correct answer in Learn/Write/Test
  | 'flashcard_wrong'    // Wrong answer in Learn/Write/Test
  | 'learn_complete';    // Finished a full Learn Mode session

/**
 * Returns the signed HP delta for a given event at the user's current depth.
 * Positive = gain, Negative = loss.
 */
export function computeHPDelta(event: HPEvent, depth: number): number {
  const regen = getHPRegen(depth); // 5–8 depending on level

  switch (event) {
    case 'chat_clean':
      return regen;

    case 'chat_minor_error':
      return -HP_PENALTY_MINOR;

    case 'chat_major_error':
      return -regen;

    case 'call_clean':
      return regen;

    case 'call_error':
      // Calls penalize half as much as a major chat error
      return -Math.ceil(regen / 2);

    case 'flashcard_correct':
      // Small regen per card — max per session handled in UI layer
      return Math.ceil(regen / 2);

    case 'flashcard_wrong':
      return -HP_PENALTY_MINOR;

    case 'learn_complete':
      // Bonus for finishing an entire session — 2× regen
      return regen * 2;

    default:
      return 0;
  }
}

/**
 * Clamps and applies an HP delta to the current HP value.
 * Returns the new HP (never below 0, never above maxHP).
 */
export function applyHPDelta(
  currentHP: number,
  delta: number,
  depth: number,
): number {
  const maxHP = getMaxHP(depth);
  return Math.max(0, Math.min(maxHP, currentHP + delta));
}

/**
 * Convenience: compute delta AND apply it in one call.
 */
export function resolveHP(
  event: HPEvent,
  currentHP: number,
  depth: number,
): { newHP: number; delta: number } {
  const delta = computeHPDelta(event, depth);
  const newHP = applyHPDelta(currentHP, delta, depth);
  return { newHP, delta };
}
