export interface CEFRMetrics {
  vocabScore: number | null;
  complexityScore: number | null;
  fluencyScore: number | null;
}

export function calculateCEFRLevel(
  currentDepth: number,
  sessionErrorRate: number, // sessionErrors / totalMsgs
  vocabScore: number,
  complexityScore: number,
  fluencyScore: number
): string | null {
  const MIN_DEPTH_FOR_LEVEL = 12;

  if (currentDepth < MIN_DEPTH_FOR_LEVEL) {
    return null;
  }

  const composite = fluencyScore * 0.45 + vocabScore * 0.35 + complexityScore * 0.20;
  
  // Apply error penalties
  let errorPenalty = 0;
  if (sessionErrorRate > 0.7) errorPenalty = -15;
  else if (sessionErrorRate > 0.4) errorPenalty = -8;
  else if (sessionErrorRate > 0.2) errorPenalty = -3;

  const adjusted = composite + errorPenalty;

  if (adjusted >= 85) return 'C1';
  if (adjusted >= 72) return 'B2';
  if (adjusted >= 56) return 'B1';
  if (adjusted >= 38) return 'A2';
  return 'A1';
}

export function calculateRollingAverage(currentAvg: number | null | undefined, newScore: number | null): number | null {
  if (newScore === null) return currentAvg ?? null;
  if (currentAvg == null) return Math.round(newScore); // first time
  return Math.round(currentAvg * 0.9 + newScore * 0.1);
}

// Ensure the score is within 0-100 logic
export function clampScore(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) {
    return Math.max(0, Math.min(100, Math.round(v)));
  }
  return null;
}
