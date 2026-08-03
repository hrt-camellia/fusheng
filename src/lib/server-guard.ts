type RateBucket = {
  count: number;
  resetAt: number;
};

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type GlobalServerState = typeof globalThis & {
  __fushengRateBuckets?: Map<string, RateBucket>;
  __fushengServerCache?: Map<string, CacheEntry>;
};

const state = globalThis as GlobalServerState;
const rateBuckets = state.__fushengRateBuckets ?? new Map<string, RateBucket>();
const serverCache = state.__fushengServerCache ?? new Map<string, CacheEntry>();

state.__fushengRateBuckets = rateBuckets;
state.__fushengServerCache = serverCache;

export function getClientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "local";
}

export function checkRateLimit(
  request: Request,
  namespace: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const key = `${namespace}:${getClientAddress(request)}`;
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getCachedValue<T>(key: string): T | null {
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    serverCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  serverCache.set(key, { value, expiresAt: Date.now() + ttlMs });

  if (serverCache.size > 500) {
    const now = Date.now();
    for (const [cacheKey, entry] of serverCache) {
      if (entry.expiresAt <= now) serverCache.delete(cacheKey);
    }
  }
}
