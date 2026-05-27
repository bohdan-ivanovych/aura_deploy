/**
 * Architecture (3-tier waterfall):
 *  Tier 1 — Cerebras   (Fastest inference)
 *  Tier 2 — Groq       (multi-key round-robin, streaming supported)
 *  Tier 3 — Gemini     (OpenAI-compatible fallback)
 *
 * Circuit Breaker per tier:
 *  CLOSED    → normal traffic
 *  OPEN      → CB tripped; route to next tier, wait CB_OPEN_DURATION_MS
 *  HALF_OPEN → cooldown elapsed, allow 1 probe; success → CLOSED, fail → OPEN
 *
 * Per-key state within Tier 1:
 *  Each Groq key has independent failure tracking with rolling CB_FAILURE_WINDOW_MS.
 *  When ALL keys are OPEN the tier-level CB trips.
 *
 * Export surface (backward-compatible):
 *  makeAICompletion()       — non-streaming, returns string
 *  makeAIJsonCompletion()   — non-streaming, returns parsed JSON
 *  makeAIStream()           — streaming; returns an async iterator of tokens + done events
 *  GROQ_MODEL               — re-exported for routes that reference it
 */

import Groq from 'groq-sdk';
import { env } from '../env';
import { getGroqApiKeys } from './groq';
import { callCerebras } from './providers/cerebras';
import { callGemini } from './providers/gemini';
import {
  CB_FAILURE_THRESHOLD,
  CB_FAILURE_WINDOW_MS,
  CB_OPEN_DURATION_MS,
  AI_TIMEOUT_MS,
} from '@/src/config/gameplayConfig';

export const GROQ_MODEL = env.GROQ_MODEL;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletionOptions {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
  timeoutMs?: number;
}

/** Stream event emitted by makeAIStream() */
export type StreamEvent =
  | { type: 'provider'; name: 'cerebras' | 'groq' | 'gemini' }
  | { type: 'token'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; error: string };

// ─── Circuit Breaker State ────────────────────────────────────────────────────

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreaker {
  state: CBState;
  failures: number;
  /** Timestamps (ms) of recent failures within the rolling window */
  failureWindow: number[];
  openUntil: number;
  probeInFlight: boolean;
}

function makeCB(): CircuitBreaker {
  return { state: 'CLOSED', failures: 0, failureWindow: [], openUntil: 0, probeInFlight: false };
}

// One CB per provider tier (module-level singletons — survive across requests)
const cbCerebras = makeCB();
const cbGemini = makeCB();

function pruneFW(cb: CircuitBreaker): void {
  const cutoff = Date.now() - CB_FAILURE_WINDOW_MS;
  cb.failureWindow = cb.failureWindow.filter(t => t > cutoff);
}

function recordFailure(cb: CircuitBreaker): void {
  const now = Date.now();
  cb.failureWindow.push(now);
  pruneFW(cb);
  cb.failures = cb.failureWindow.length;

  if (cb.failures >= CB_FAILURE_THRESHOLD && cb.state !== 'OPEN') {
    cb.state = 'OPEN';
    cb.openUntil = now + CB_OPEN_DURATION_MS;
    console.warn(`[circuit-breaker] Circuit OPENED. Cooling for ${CB_OPEN_DURATION_MS / 1000}s`);
  }
}

function recordSuccess(cb: CircuitBreaker): void {
  cb.failures = 0;
  cb.failureWindow = [];
  cb.state = 'CLOSED';
  cb.probeInFlight = false;
}

function canAttempt(cb: CircuitBreaker): boolean {
  if (cb.state === 'CLOSED') return true;

  const now = Date.now();
  if (cb.state === 'OPEN') {
    if (now >= cb.openUntil) {
      if (!cb.probeInFlight) {
        cb.state = 'HALF_OPEN';
        cb.probeInFlight = true;
        console.info('[circuit-breaker] Entering HALF_OPEN — sending probe request');
        return true;
      }
      return false; // probe already in-flight
    }
    return false; // still cooling down
  }

  // HALF_OPEN — probe allowed only once
  return cb.probeInFlight;
}

// ─── Groq Key Pool ────────────────────────────────────────────────────────────

interface KeyEntry {
  key: string;
  cb: CircuitBreaker;
}

function buildKeyPool(): KeyEntry[] {
  const keys = getGroqApiKeys();
  return keys.map(key => ({ key, cb: makeCB() }));
}

const keyPool: KeyEntry[] = buildKeyPool();
let rrIndex = 0;

const clientCache = new Map<string, Groq>();
function getClient(key: string): Groq {
  if (!clientCache.has(key)) {
    clientCache.set(key, new Groq({ apiKey: key }));
  }
  return clientCache.get(key)!;
}

function getNextAvailableKey(): KeyEntry | null {
  const len = keyPool.length;
  for (let i = 0; i < len; i++) {
    const entry = keyPool[(rrIndex + i) % len];
    if (canAttempt(entry.cb)) {
      rrIndex = (rrIndex + i + 1) % len;
      return entry;
    }
  }
  return null;
}

// ─── Retryable error detection ────────────────────────────────────────────────

function isRetryable(err: Error): boolean {
  const msg = err.message;
  return (
    msg.includes('429') ||
    msg.includes('rate_limit') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  );
}

/**
 * Detects degenerate model responses — e.g. when the model echoes the
 * JSON schema (`{"type":"object"}`) instead of producing real content,
 * or returns an extremely short string that can't possibly be valid.
 * These are treated as provider failures so the waterfall continues.
 */
function isDegenerateResponse(content: string): boolean {
  const trimmed = content.trim();
  // Too short to be a valid JSON chat response
  if (trimmed.length < 20) return true;
  // Model literally echoed the response_format schema back
  if (trimmed === '{"type": "object"}' || trimmed === '{"type":"object"}') return true;
  // Model returned a schema description without any bubbles/reply
  try {
    const parsed = JSON.parse(trimmed);
    // Valid JSON but has no content fields — just schema metadata
    const hasContent = parsed.bubbles || parsed.reply || parsed.response || parsed.message;
    if (!hasContent && (parsed.type || parsed.properties || parsed.schema)) return true;
  } catch {
    // Not JSON — that's fine, not degenerate for text mode
  }
  return false;
}

// ─── makeAICompletion (non-streaming) ─────────────────────────────────────────

/**
 * Make an AI completion with circuit-breaker key rotation and 3-tier fallback.
 * Cerebras → Groq → Gemini
 */
export async function makeAICompletion(opts: CompletionOptions): Promise<string> {
  const {
    model = GROQ_MODEL,
    messages,
    temperature = 0.85,
    maxTokens = 600,
    responseFormat,
    timeoutMs = AI_TIMEOUT_MS,
  } = opts;

  let lastError: Error | null = null;

  // ── Tier 1: Cerebras ──────────────────────────────────────────────────────
  if (canAttempt(cbCerebras)) {
    try {
      const result = await Promise.race([
        callCerebras(messages as any, maxTokens, temperature, responseFormat),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Cerebras request timed out')), timeoutMs)
        ),
      ]);
      if (isDegenerateResponse(result)) {
        throw new Error(`Cerebras returned degenerate response: ${result.slice(0, 80)}`);
      }
      recordSuccess(cbCerebras);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn('[circuit-breaker] Cerebras failed:', lastError.message);
      if (isRetryable(lastError) || lastError.message.includes('degenerate')) recordFailure(cbCerebras);
      // else: let it throw if it's a structural error, but we usually want to waterfall
    }
  }

  // ── Tier 2: Groq keys ──────────────────────────────────────────────────────
  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    const entry = getNextAvailableKey();
    if (!entry) break;

    try {
      const client = getClient(entry.key);
      const completion = await Promise.race([
        client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          stream: false,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        } as Parameters<typeof client.chat.completions.create>[0]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Groq request timed out')), timeoutMs)
        ),
      ]);

      const groqContent = (completion as any).choices[0]?.message?.content ?? '';
      if (isDegenerateResponse(groqContent)) {
        throw new Error(`Groq returned degenerate response: ${groqContent.slice(0, 80)}`);
      }
      recordSuccess(entry.cb);
      return groqContent;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[circuit-breaker] Groq key attempt failed:`, lastError.message);
      recordFailure(entry.cb);
    }
  }

  // ── Tier 3: Gemini ────────────────────────────────────────────────────────
  if (canAttempt(cbGemini)) {
    console.warn('[circuit-breaker] Falling back to tier 3: Gemini');
    try {
      const result = await Promise.race([
        callGemini(messages as any, maxTokens, temperature, responseFormat),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs)
        ),
      ]);
      recordSuccess(cbGemini);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error('[circuit-breaker] Gemini failed:', lastError.message);
      if (isRetryable(lastError)) recordFailure(cbGemini);
    }
  }

  throw lastError ?? new Error('All AI provider tiers exhausted');
}

// ─── makeAIJsonCompletion ─────────────────────────────────────────────────────

/**
 * Same as makeAICompletion but always requests JSON object response and parses it.
 */
export async function makeAIJsonCompletion<T = Record<string, unknown>>(
  opts: Omit<CompletionOptions, 'responseFormat'>
): Promise<T> {
  const raw = await makeAICompletion({ ...opts, responseFormat: { type: 'json_object' } });
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}

// ─── makeAIStream ─────────────────────────────────────────────────────────────

/**
 * Streaming AI completion with circuit breaker.
 *
 * Returns an AsyncGenerator that yields StreamEvent objects:
 *  - { type: 'provider', name } — which provider was selected
 *  - { type: 'token', text }    — a streamed text chunk
 *  - { type: 'done', fullText } — stream complete; fullText = entire response
 *  - { type: 'error', error }   — terminal error
 *
 * When Groq is available: yields real streaming tokens.
 * When Cerebras/Groq circuit is OPEN: falls back to Gemini (non-streaming)
 * and synthetically emits tokens in ~4-word chunks with 20ms delay — so the
 * caller's scan loop and UI remain unaffected.
 */
export async function* makeAIStream(
  opts: CompletionOptions & { stream?: boolean },
): AsyncGenerator<StreamEvent> {
  const {
    model = GROQ_MODEL,
    messages,
    temperature = 0.85,
    maxTokens = 600,
    responseFormat,
    timeoutMs = AI_TIMEOUT_MS,
  } = opts;

  // ── Tier 1: Cerebras streaming ────────────────────────────────────────────
  if (canAttempt(cbCerebras)) {
    try {
      yield { type: 'provider', name: 'cerebras' };
      const apiKey = env.CEREBRAS_API_KEY;
      if (!apiKey) throw new Error('Cerebras API key is missing');

      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.CEREBRAS_MODEL,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(`Cerebras stream error ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Cerebras stream body is empty');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            const token = data.choices?.[0]?.delta?.content ?? '';
            if (token) {
              fullText += token;
              yield { type: 'token', text: token };
            }
          } catch (e) {
            // fragment
          }
        }
      }

      recordSuccess(cbCerebras);
      yield { type: 'done', fullText };
      return;
    } catch (err) {
      console.warn('[circuit-breaker] Cerebras stream failed:', err instanceof Error ? err.message : String(err));
      if (isRetryable(err instanceof Error ? err : new Error(String(err)))) recordFailure(cbCerebras);
      // fallback to next tier
    }
  }

  // ── Tier 2: Groq streaming ────────────────────────────────────────────────
  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    const entry = getNextAvailableKey();
    if (!entry) break;

    try {
      yield { type: 'provider', name: 'groq' };

      const client = getClient(entry.key);
      const streamAbort = new AbortController();
      const timer = setTimeout(() => streamAbort.abort(), timeoutMs);

      const groqStream = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.95,
        stream: true,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      } as any);

      let fullText = '';
      for await (const chunk of (groqStream as any)) {
        const token = (chunk as any).choices?.[0]?.delta?.content ?? '';
        if (token) {
          fullText += token;
          yield { type: 'token', text: token };
        }
      }
      clearTimeout(timer);

      recordSuccess(entry.cb);
      yield { type: 'done', fullText };
      return;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn('[circuit-breaker] Groq stream key attempt failed:', error.message);
      recordFailure(entry.cb);
    }
  }

  // ── Fallback: non-streaming → synthetic token emission ────────────────────
  let fallbackText: string | null = null;
  let providerName: 'cerebras' | 'gemini' = 'gemini';

  if (fallbackText === null && canAttempt(cbGemini)) {
    try {
      console.warn('[circuit-breaker] Stream fallback → Gemini');
      providerName = 'gemini';
      fallbackText = await callGemini(messages as any, maxTokens, temperature, responseFormat);
      recordSuccess(cbGemini);
    } catch (err) {
      console.error('[circuit-breaker] Gemini stream fallback failed:', err instanceof Error ? err.message : String(err));
      if (isRetryable(err instanceof Error ? err : new Error(String(err)))) recordFailure(cbGemini);
    }
  }

  if (fallbackText === null) {
    yield { type: 'error', error: 'All AI provider tiers exhausted' };
    return;
  }

  // Emit the provider change so UI can show a subtle indicator
  yield { type: 'provider', name: providerName };

  // Synthetic streaming: split into ~4-word chunks, emit with 20ms delay
  const words = fallbackText.split(' ');
  const CHUNK_SIZE = 4;
  let fullEmitted = '';
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ') + (i + CHUNK_SIZE < words.length ? ' ' : '');
    fullEmitted += chunk;
    yield { type: 'token', text: chunk };
    await new Promise(r => setTimeout(r, 20));
  }
  yield { type: 'done', fullText: fullEmitted };
}

// ─── Circuit breaker status (for health endpoints) ────────────────────────────

export function getCircuitBreakerStatus() {
  return {
    cerebras: {
      state: cbCerebras.state,
      failures: cbCerebras.failures,
      openUntil: cbCerebras.openUntil,
    },
    groq: {
      state: keyPool.every(e => e.cb.state === 'OPEN') ? 'OPEN' : 'CLOSED',
      keys: keyPool.map(e => ({
        keyHint: e.key ? `...${e.key.slice(-6)}` : 'missing',
        state: e.cb.state,
        failures: e.cb.failures,
      })),
    },
    gemini: {
      state: cbGemini.state,
      failures: cbGemini.failures,
      openUntil: cbGemini.openUntil,
    },
  };
}
