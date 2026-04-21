// Configure Redis lazily — only if env vars are present AND the package is installed.
// This prevents build errors when @upstash/redis is not in node_modules.
let redis: any = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch {
  // @upstash/redis not installed — rate limiting disabled (fail-open)
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!redis) return true; // Fail open

  try {
    const redisKey = `ratelimit:${key}`;
    const result = await Promise.race([
      redis.incr(redisKey),
      new Promise<number>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);

    const requests = result;
    if (requests === 1) {
      await redis.pexpire(redisKey, windowMs);
    }

    return requests <= limit;
  } catch (error) {
    console.error('[rate-limit] Redis error or timeout:', error);
    return true; // Fail open
  }
}

export async function getRateLimitHeaders(
  key: string,
  limit: number,
  windowMs: number,
): Promise<Record<string, string>> {
  if (!redis) {
    return {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(limit),
      'X-RateLimit-Reset': String(Math.ceil((Date.now() + windowMs) / 1000)),
    };
  }

  try {
    const redisKey = `ratelimit:${key}`;
    const [requests, pttl] = await Promise.race([
      Promise.all([
        redis.get(redisKey) as Promise<number | null>,
        redis.pttl(redisKey),
      ]),
      new Promise<[number | null, number]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);

    const count = requests || 0;
    const remaining = Math.max(0, limit - count);
    const msToReset = pttl > 0 ? pttl : windowMs;
    const reset = Math.ceil((Date.now() + msToReset) / 1000);

    return {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    };
  } catch (error) {
    console.error('[rate-limit] Failed to get headers:', error);
    return {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(limit),
      'X-RateLimit-Reset': String(Math.ceil((Date.now() + windowMs) / 1000)),
    };
  }
}
