/**
 * gameplayConfig.ts — Single source of truth for ALL tunable game constants.
 *
 * Rules:
 *  - Every number that affects HP, depth, streaks, CEFR scoring, or AI behaviour
 *    MUST live here. No magic numbers anywhere else.
 *  - Values are grouped by domain and documented with their unit/range.
 *  - Server-side only (no "use client" import needed — this is pure TypeScript).
 */

// ─── HP ──────────────────────────────────────────────────────────────────────

/** HP a brand-new user starts with. */
export const INITIAL_HP = 100;

/** HP increase per level above level 1 (getMaxHP formula). */
export const HP_PER_LEVEL = 5;

/** Base HP regenerated on a clean message/call exchange (level 1). */
export const BASE_REGEN = 5;

/** Regen increases by 1 for every N levels gained. */
export const REGEN_LEVEL_INTERVAL = 3;

/** HP loss for a major grammar error in chat (depth >= penalty threshold). */
export const HP_PENALTY_MAJOR = 10;

/** HP loss for a minor grammar error (e.g. flashcard wrong). */
export const HP_PENALTY_MINOR = 2;

/**
 *  Below this dive depth AND below this session error count, major errors
 *  are forgiven (hpDelta = 0). Threshold lowered (from 30 to 15) so the
 *  stakes feel real after just ~7 sessions rather than 15.
 */
export const HP_NOVICE_DEPTH_THRESHOLD = 15;
export const HP_NOVICE_ERROR_FORGIVE_COUNT = 2;

// ─── Depth (Progression) ─────────────────────────────────────────────────────

/** Hard ceiling for dive depth. */
export const MAX_DEPTH = 200;

/** Depth gained per meaningful user message (≥2 real words). */
export const DEPTH_PER_MEANINGFUL_MSG = 1;

/** Days of inactivity before depth decay begins. */
export const DEPTH_DECAY_GRACE_DAYS = 7;

/** Maximum depth points lost in a single decay event (per day above grace).
 *  Deliberately gentle: a 2-week break loses ~21 pts, not 110.
 */
export const MAX_DEPTH_DECAY_PER_DAY = 3;

/** Depth shifted per unit of AI level adjustment (-2..+2). */
export const DEPTH_PER_LEVEL_ADJ = 2;

/** Depth awarded per voice call exchange (call/respond). */
export const CALL_DEPTH_PER_EXCHANGE = 1;

// ─── Streak ───────────────────────────────────────────────────────────────────

/**
 * Streak resets if the user misses more than this many hours of activity.
 * Currently enforced via daily (UTC date) checks, so effectively 48h.
 */
export const STREAK_GRACE_HOURS = 48;

// ─── CEFR / Scoring ──────────────────────────────────────────────────────────

/**
 * Minimum depth before the server computes an honest CEFR level.
 * Below this, the AI estimate is used verbatim (too few data points).
 * ~6 meaningful exchanges.
 */
export const MIN_DEPTH_FOR_LEVEL_EVAL = 12;

/** Composite score thresholds for CEFR bands (0–100 scale). */
export const CEFR_C1_THRESHOLD = 85;
export const CEFR_B2_THRESHOLD = 72;
export const CEFR_B1_THRESHOLD = 56;
export const CEFR_A2_THRESHOLD = 38;

/**
 * Error-rate penalty applied before CEFR threshold comparison.
 * errorRate = (AI messages with weakness) / (total AI messages in session).
 */
export const ERROR_PENALTY_HIGH_RATE = 0.7;   // > 70% errors → -15 pts
export const ERROR_PENALTY_MED_RATE  = 0.4;   // > 40% errors → -8 pts
export const ERROR_PENALTY_LOW_RATE  = 0.2;   // > 20% errors → -3 pts
export const ERROR_PENALTY_HIGH_PTS  = -15;
export const ERROR_PENALTY_MED_PTS   = -8;
export const ERROR_PENALTY_LOW_PTS   = -3;

/**
 * EMA (Exponential Moving Average) smoothing factor for rolling skill scores.
 * 0.1 → slow, stable. 0.3 → faster adaptation.
 */
export const EMA_ALPHA = 0.1;

/** Weights for computing CEFR composite score (must sum to 1.0). */
export const SCORE_WEIGHT_FLUENCY    = 0.45;
export const SCORE_WEIGHT_VOCAB      = 0.35;
export const SCORE_WEIGHT_COMPLEXITY = 0.20;

// ─── Rate Limiting (Chat) ────────────────────────────────────────────────────

/** Max chat messages per rate window. */
export const CHAT_RATE_LIMIT = 30;

/** Chat rate limit rolling window in ms (1 hour). */
export const CHAT_RATE_WINDOW_MS = 60 * 60_000;

/** How many recent messages to inject into the LLM context window. */
export const CHAT_MAX_CONTEXT_MESSAGES = 12;

/** Max tokens for a standard chat completion (shorter = more natural texting). */
export const CHAT_MAX_COMPLETION_TOKENS = 500;

// ─── Rate Limiting (Calls) ───────────────────────────────────────────────────

/** Free-tier call minutes per UTC day. */
export const FREE_CALL_MINUTES = 10;

/** Max call-respond requests per rate window. */
export const CALL_RATE_LIMIT = 60;

/** Call rate limit rolling window in ms (1 hour). */
export const CALL_RATE_WINDOW_MS = 3_600_000;

/** Max tokens for a call (voice) AI response — keep short for TTS. */
export const CALL_MAX_COMPLETION_TOKENS = 80;

/** Max recent call messages to include in prompt context. */
export const CALL_MAX_CONTEXT_MESSAGES = 10;

// ─── AI Timeouts ─────────────────────────────────────────────────────────────

/** Non-streaming AI request timeout in ms. */
export const AI_TIMEOUT_MS = 20_000;

/** Voice call AI request timeout in ms (shorter — real-time feel). */
export const CALL_AI_TIMEOUT_MS = 15_000;

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

/** Number of failures within the window before a provider circuit opens. */
export const CB_FAILURE_THRESHOLD = 3;

/** Rolling window (ms) in which failures are counted. */
export const CB_FAILURE_WINDOW_MS = 60_000;

/** How long (ms) a circuit stays OPEN before attempting a HALF_OPEN probe. */
export const CB_OPEN_DURATION_MS = 60_000;
