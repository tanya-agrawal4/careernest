import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

let redisClient: Redis | null = null;

async function initRedis(): Promise<Redis | null> {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy() {
      // Do NOT retry — return null to stop immediately.
      return null;
    },
  });

  // Swallow background errors so ioredis never crashes the process.
  client.on('error', () => {
    /* intentionally silenced */
  });

  try {
    await client.connect();
    console.log('✅ Redis client connected');
    return client;
  } catch {
    console.warn('⚠️  Redis disabled — running without cache');
    // Disconnect the failed client so it doesn't keep its socket open.
    client.disconnect();
    return null;
  }
}

// Eagerly initialise; the promise resolves before the first request
// because server.ts awaits `redisReady` before calling app.listen().
const redisReady: Promise<void> = initRedis().then((c) => {
  redisClient = c;
});

export { redisReady };
export default redisClient;

/**
 * Convenience helpers so callers don't need to null-check everywhere.
 * Each method silently returns null / does nothing when Redis is unavailable.
 */
export async function cacheGet(key: string): Promise<string | null> {
  try {
    return (await redisClient?.get(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  ttl: number,
  value: string,
): Promise<void> {
  try {
    await redisClient?.setex(key, ttl, value);
  } catch {
    /* cache write failure is non-fatal */
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redisClient?.del(key);
  } catch {
    /* cache delete failure is non-fatal */
  }
}
