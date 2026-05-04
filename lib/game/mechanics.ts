import {
  MAX_DEPTH,
  DEPTH_PER_MEANINGFUL_MSG,
  DEPTH_DECAY_GRACE_DAYS,
  MAX_DEPTH_DECAY_PER_DAY,
  DEPTH_PER_LEVEL_ADJ,
} from '@/src/config/gameplayConfig';

export function calculateDepth(
  currentDiveDepth: number,
  lastActiveAt: Date | null,
  now: Date,
  isMeaningfulTracker: boolean,
  levelAdjustment: number
): { finalDepth: number; depthDelta: number } {
  const lastActive = lastActiveAt ? new Date(lastActiveAt) : new Date(0);
  const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);

  let currentDepth = currentDiveDepth;

  // Decay logic
  if (diffDays === 0 || diffDays <= DEPTH_DECAY_GRACE_DAYS) {
    if (isMeaningfulTracker) currentDepth = Math.min(currentDepth + DEPTH_PER_MEANINGFUL_MSG, MAX_DEPTH);
  } else {
    const decayDays = diffDays - DEPTH_DECAY_GRACE_DAYS;
    currentDepth = Math.max(0, currentDepth - Math.min(decayDays, MAX_DEPTH_DECAY_PER_DAY));
    if (isMeaningfulTracker) currentDepth = Math.min(currentDepth + DEPTH_PER_MEANINGFUL_MSG, MAX_DEPTH);
  }

  // LLM AI adjustment based on context
  if (levelAdjustment !== 0) {
    currentDepth = Math.max(0, Math.min(MAX_DEPTH, currentDepth + levelAdjustment * DEPTH_PER_LEVEL_ADJ));
  }

  const finalDepth = Math.min(MAX_DEPTH, Math.max(0, currentDepth));
  return { finalDepth, depthDelta: finalDepth - currentDiveDepth };
}

export function calculateStreak(
  currentStreak: number,
  lastStreakAt: Date | null,
  now: Date
): { newStreak: number; newLastStreakAt: Date | undefined } {
  const todayISO = now.toISOString().split('T')[0];
  const lastStreakISO = lastStreakAt
    ? new Date(lastStreakAt).toISOString().split('T')[0]
    : null;

  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayISO = yesterdayDate.toISOString().split('T')[0];

  let newStreak = currentStreak;
  let newLastStreakAt: Date | undefined;

  if (lastStreakISO !== todayISO) {
    if (lastStreakISO === yesterdayISO) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
    newLastStreakAt = now;
  }

  return { newStreak, newLastStreakAt };
}
