/**
 * Production Caching Service for DINOX OS
 * Multi-tenant, Versioned, Stampede-Protected Cache-Aside Implementation
 */

import { redisDriver } from './redis'

// Standard TTL Policies (in seconds)
export const CACHE_TTL = {
    STATIC_PROFILE: 900,     // 15 minutes (Restaurant profile, branding, tax settings)
    MENU: 600,               // 10 minutes (Categories, menu items, prices)
    STATS_DASHBOARD: 60,     // 1 minute (Admin dashboard summaries, sales aggregates)
    SHORT_ANALYTICS: 30,     // 30 seconds (Live order counters)
} as const

// Cache Key Version Prefix
export const CACHE_VERSION = 'v1'

/**
 * Builds a strict, tenant-isolated cache key.
 * Format: v1:restaurant:{restaurantId}:{namespace}:{identifier}
 */
export function getCacheKey(
    restaurantId: string,
    namespace: 'profile' | 'settings' | 'categories' | 'menu' | 'dashboard' | 'coupons' | 'tables',
    identifier: string = 'all'
): string {
    if (!restaurantId || !restaurantId.trim()) {
        throw new Error('Tenant restaurantId is strictly required to generate cache keys')
    }
    const cleanRestId = restaurantId.trim()
    const cleanIdent = identifier ? `:${identifier.trim()}` : ''
    return `${CACHE_VERSION}:restaurant:${cleanRestId}:${namespace}${cleanIdent}`
}

// Single-Flight Request Deduplication Map to prevent cache stampedes
const inFlightRequests = new Map<string, Promise<any>>()

/**
 * Retrieves a cached object from Redis.
 */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const start = performance.now()
        const raw = await redisDriver.get(key)
        if (raw === null || raw === undefined) {
            return null
        }
        const parsed = JSON.parse(raw) as T
        const duration = (performance.now() - start).toFixed(1)
        console.log(`⚡ [CACHE HIT] ${key} (${duration}ms)`)
        return parsed
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed parsing cache for ${key}:`, err)
        return null
    }
}

/**
 * Saves an object into Redis with a tenant-isolated TTL.
 */
export async function setCached<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL.MENU): Promise<void> {
    try {
        const start = performance.now()
        const serialized = JSON.stringify(data)
        await redisDriver.set(key, serialized, ttlSeconds)
        const duration = (performance.now() - start).toFixed(1)
        console.log(`💾 [CACHE SET] ${key} [TTL: ${ttlSeconds}s] (${duration}ms)`)
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed setting cache for ${key}:`, err)
    }
}

/**
 * Invalidates a specific cache key.
 */
export async function deleteCached(key: string): Promise<void> {
    try {
        await redisDriver.del(key)
        console.log(`🧹 [CACHE INVALIDATE] ${key}`)
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed deleting cache for ${key}:`, err)
    }
}

/**
 * Invalidates keys matching a pattern (e.g. all menu data for a restaurant).
 */
export async function deleteByPattern(pattern: string): Promise<number> {
    try {
        const count = await redisDriver.delPattern(pattern)
        console.log(`🧹 [CACHE INVALIDATE PATTERN] ${pattern} (${count} keys removed)`)
        return count
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed deleting pattern ${pattern}:`, err)
        return 0
    }
}

/**
 * Cache-aside with Single-Flight Stampede Protection:
 * 1. Checks Redis cache.
 * 2. If HIT -> returns immediately.
 * 3. If MISS -> deduplicates concurrent callers and queries the database fetcher.
 * 4. Stores result in Redis and returns to all concurrent callers.
 */
export async function getOrSetCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MENU
): Promise<T> {
    // 1. Check Cache
    const cached = await getCached<T>(key)
    if (cached !== null) {
        return cached
    }

    console.log(`🔍 [CACHE MISS] ${key} -> Executing database fetch`)

    // 2. Check if this exact key is already being fetched by an ongoing request
    const existingFlight = inFlightRequests.get(key)
    if (existingFlight) {
        console.log(`✈️ [SINGLE-FLIGHT REUSE] Reusing in-flight query for ${key}`)
        return await existingFlight
    }

    // 3. Initiate single-flight fetch
    const fetchPromise = (async () => {
        try {
            const freshData = await fetcher()
            if (freshData !== null && freshData !== undefined) {
                // Populate cache asynchronously
                await setCached(key, freshData, ttlSeconds)
            }
            return freshData
        } finally {
            inFlightRequests.delete(key)
        }
    })()

    inFlightRequests.set(key, fetchPromise)
    return await fetchPromise
}

/**
 * Convenience helper to invalidate all cached datasets for a restaurant.
 */
export async function invalidateRestaurantCache(restaurantId: string, namespace?: string): Promise<void> {
    if (!restaurantId) return
    const pattern = namespace 
        ? `${CACHE_VERSION}:restaurant:${restaurantId}:${namespace}*` 
        : `${CACHE_VERSION}:restaurant:${restaurantId}:*`
    await deleteByPattern(pattern)
}
