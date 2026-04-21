/**
 * Aura — Centralized API Client
 * ─────────────────────────────
 * • No raw fetch() calls outside this module
 * • Retry logic: 3 attempts with exponential backoff on network errors
 * • Normalized error objects: { message, status, code }
 * • Auth token attached from in-memory store (never localStorage)
 * • All mutations return typed results
 */

// ── In-memory auth token store (never persisted to localStorage) ──────────
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}
export function getAuthToken(): string | null {
  return _authToken;
}

// ── Normalized error type ────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface ApiErrorShape {
  message: string;
  status: number;
  code: string;
}

function normalizeError(err: unknown): ApiErrorShape {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, code: err.code };
  }
  if (err instanceof Error) {
    return { message: err.message, status: 0, code: 'NETWORK_ERROR' };
  }
  return { message: 'Unknown error', status: 0, code: 'UNKNOWN' };
}

// ── Retry with exponential backoff ───────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 400; // ms

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
  method: Method,
  url: string,
  body?: unknown,
  options?: RequestInit,
  attempt = 1
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  try {
    const { headers: _omit, ...restOptions } = options ?? {};
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...restOptions,
    });

    // 401 → auth failure (let the caller handle redirect)
    if (res.status === 401) {
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!res.ok) {
      let errorBody: { error?: string; message?: string; code?: string } = {};
      try { errorBody = await res.json(); } catch { /* non-JSON body */ }
      throw new ApiError(
        errorBody.error ?? errorBody.message ?? `HTTP ${res.status}`,
        res.status,
        errorBody.code ?? `HTTP_${res.status}`
      );
    }

    // Handle 204 No Content
    if (res.status === 204) return undefined as unknown as T;

    return res.json() as Promise<T>;
  } catch (err) {
    // Retry only on network errors (fetch threw), not on API errors (HTTP 4xx/5xx)
    const isNetworkError = !(err instanceof ApiError);
    if (isNetworkError && attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return request<T>(method, url, body, options, attempt + 1);
    }
    throw err;
  }
}

// ── Public API surface ────────────────────────────────────────────────────
export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    request<T>('GET', url, undefined, options),

  post: <T>(url: string, body?: unknown, options?: RequestInit) =>
    request<T>('POST', url, body, options),

  put: <T>(url: string, body?: unknown, options?: RequestInit) =>
    request<T>('PUT', url, body, options),

  patch: <T>(url: string, body?: unknown, options?: RequestInit) =>
    request<T>('PATCH', url, body, options),

  delete: <T>(url: string, options?: RequestInit) =>
    request<T>('DELETE', url, undefined, options),
};

// ── Convenience: safe wrapper that returns a Result-style tuple ───────────
export async function apiSafe<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, ApiErrorShape]> {
  try {
    const data = await fn();
    return [data, null];
  } catch (err) {
    return [null, normalizeError(err)];
  }
}

export default api;
