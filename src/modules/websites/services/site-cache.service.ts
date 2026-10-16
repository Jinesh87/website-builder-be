import { logger } from "../../../config/logger.js";
import { redis } from "../../../config/redis.js";

export type CachedPagePayload = {
  html: string;
  statusCode: number;
  contentType: string;
  redirectUrl?: string;
  cachedAt: number;
};

type L1CacheEntry = {
  payload: CachedPagePayload;
  expiresAt: number;
};

/**
 * Production-Grade Multi-Tier Caching for Published Websites:
 *
 * Tier 1 (L1): In-Memory LRU Cache (<0.2ms)
 *   - Bounded memory to prevent memory leaks (max 1,000 entries).
 *   - Zero network overhead for hot paths.
 *
 * Tier 2 (L2): Distributed Redis Cache (<3ms)
 *   - Synchronized across all cluster/replica processes.
 *   - Survives node restarts.
 *   - Key-indexed per site (`live_site_keys:<identifier>`) for atomic instant purge.
 *
 * Cache Stampede Protection:
 *   - Single-flight promise coalescing ensures concurrent requests for an uncached
 *     page only trigger a single database query & render.
 *
 * Resilience:
 *   - Fail-open architecture: If Redis is unavailable or times out, seamlessly falls
 *     back to L1 Memory / Database without dropping requests.
 */
export class SiteCacheService {
  private readonly maxL1Entries: number;
  private readonly defaultTtlSeconds: number;

  // L1 In-Memory LRU Map (preserves insertion order; access moves entry to end)
  private readonly l1Cache = new Map<string, L1CacheEntry>();

  // Single-flight promise tracker to prevent cache stampedes
  private readonly inFlightRenders = new Map<string, Promise<CachedPagePayload>>();

  constructor(options: { maxL1Entries?: number; defaultTtlSeconds?: number } = {}) {
    this.maxL1Entries = options.maxL1Entries ?? 1000;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 86400; // 24 hours
  }

  private pageKey(identifier: string, path: string): string {
    const cleanId = identifier.toLowerCase().trim();
    const cleanPath = path.toLowerCase().trim().replace(/\/+$/, "") || "/";
    return `live_page:${cleanId}:${cleanPath}`;
  }

  private siteKeysSetKey(identifier: string): string {
    const cleanId = identifier.toLowerCase().trim();
    return `live_site_keys:${cleanId}`;
  }

  /**
   * Retrieves a cached page from L1 (In-Memory) or L2 (Redis).
   * Returns null on cache miss or expired TTL.
   */
  async getPage(identifier: string, path: string): Promise<CachedPagePayload | null> {
    const key = this.pageKey(identifier, path);
    const now = Date.now();

    // 1. Check L1 Memory (Sub-millisecond)
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry) {
      if (l1Entry.expiresAt > now) {
        // Move to end of Map for LRU maintenance
        this.l1Cache.delete(key);
        this.l1Cache.set(key, l1Entry);
        return l1Entry.payload;
      }
      this.l1Cache.delete(key);
    }

    // 2. Check L2 Redis
    try {
      if (redis.status === "ready" || redis.status === "connecting") {
        const raw = await redis.get(key);
        if (raw) {
          const payload = JSON.parse(raw) as CachedPagePayload;
          // Populate L1 memory
          this.setL1(key, payload, this.defaultTtlSeconds);
          return payload;
        }
      }
    } catch (error) {
      logger.warn({ err: error, key }, "Redis getPage failed, failing open");
    }

    return null;
  }

  /**
   * Caches a rendered page into both L1 (Memory) and L2 (Redis).
   */
  async setPage(
    identifier: string,
    path: string,
    payload: CachedPagePayload,
    ttlSeconds = this.defaultTtlSeconds,
  ): Promise<void> {
    const key = this.pageKey(identifier, path);
    const siteSetKey = this.siteKeysSetKey(identifier);

    // 1. Set in L1 Memory
    this.setL1(key, payload, ttlSeconds);

    // 2. Set in L2 Redis
    try {
      if (redis.status === "ready" || redis.status === "connecting") {
        const serialized = JSON.stringify(payload);
        const pipeline = redis.pipeline();
        pipeline.set(key, serialized, "EX", ttlSeconds);
        // Track key under the site set for instant atomic site-wide purge
        pipeline.sadd(siteSetKey, key);
        // Expire the tracking set after TTL + 1 day
        pipeline.expire(siteSetKey, ttlSeconds + 86400);
        await pipeline.exec();
      }
    } catch (error) {
      logger.warn({ err: error, key }, "Redis setPage failed, failing open");
    }
  }

  /**
   * Single-flight execution: Ensures only ONE render function executes concurrently
   * for the given identifier & path. Sibling requests wait for the same render promise.
   */
  async getOrRender(
    identifier: string,
    path: string,
    renderFn: () => Promise<CachedPagePayload>,
    ttlSeconds = this.defaultTtlSeconds,
  ): Promise<CachedPagePayload> {
    // 1. Fast cache check
    const existing = await this.getPage(identifier, path);
    if (existing) {
      return existing;
    }

    const key = this.pageKey(identifier, path);

    // 2. Coalesce concurrent renders (Single-Flight)
    const inFlight = this.inFlightRenders.get(key);
    if (inFlight) {
      return inFlight;
    }

    const renderPromise = (async () => {
      try {
        const payload = await renderFn();
        // Only cache successful or legitimate redirects/not-founds
        if (payload.statusCode < 500) {
          // If status is 404, cache for shorter TTL (e.g. 60 seconds) to prevent stampedes on dead links
          const effectiveTtl = payload.statusCode === 404 ? Math.min(ttlSeconds, 60) : ttlSeconds;
          await this.setPage(identifier, path, payload, effectiveTtl);
        }
        return payload;
      } finally {
        this.inFlightRenders.delete(key);
      }
    })();

    this.inFlightRenders.set(key, renderPromise);
    return renderPromise;
  }

  /**
   * Instantly purges all cached pages for a specific identifier (subdomain or custom domain).
   */
  async purgeSite(identifier?: string | null): Promise<void> {
    if (!identifier) {
      this.clearL1();
      return;
    }

    const cleanId = identifier.toLowerCase().trim();
    const prefix = `live_page:${cleanId}:`;
    const siteSetKey = this.siteKeysSetKey(cleanId);

    // 1. Purge matching keys from L1 Memory
    for (const key of this.l1Cache.keys()) {
      if (key.startsWith(prefix)) {
        this.l1Cache.delete(key);
      }
    }

    // 2. Purge tracked keys from L2 Redis
    try {
      if (redis.status === "ready" || redis.status === "connecting") {
        const keys = await redis.smembers(siteSetKey);
        if (keys && keys.length > 0) {
          const pipeline = redis.pipeline();
          pipeline.del(...keys);
          pipeline.del(siteSetKey);
          await pipeline.exec();
        } else {
          // Fallback if set was empty or missing: delete the tracking set itself
          await redis.del(siteSetKey);
        }
      }
    } catch (error) {
      logger.warn({ err: error, identifier: cleanId }, "Redis purgeSite failed, failing open");
    }
  }

  /**
   * Purges cache for the primary subdomain and all configured custom domains simultaneously.
   */
  async purgeWebsite(subdomain: string, hostnames: string[] = []): Promise<void> {
    const targets = [subdomain, ...hostnames].filter(Boolean);
    await Promise.allSettled(targets.map((target) => this.purgeSite(target)));
  }

  /**
   * Clears the entire L1 memory cache.
   */
  clearL1(): void {
    this.l1Cache.clear();
  }

  private setL1(key: string, payload: CachedPagePayload, ttlSeconds: number): void {
    // Evict oldest entry if size exceeds capacity
    if (this.l1Cache.size >= this.maxL1Entries && !this.l1Cache.has(key)) {
      const oldestKey = this.l1Cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.l1Cache.delete(oldestKey);
      }
    }

    this.l1Cache.set(key, {
      payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

export const siteCacheService = new SiteCacheService();
