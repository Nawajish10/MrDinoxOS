/**
 * Production Caching Service for DINOX OS
 * Multi-tenant, Versioned, Stampede-Protected Cache-Aside Implementation
 */

const { redisDriver } = require('./redis');

const CACHE_TTL = {
    STATIC_PROFILE: 900,     // 15 minutes
    MENU: 600,               // 10 minutes
    STATS_DASHBOARD: 60,     // 1 minute
    SHORT_ANALYTICS: 30,     // 30 seconds
};

const CACHE_VERSION = 'v1';

function getCacheKey(restaurantId, namespace, identifier = 'all') {
    if (!restaurantId || !restaurantId.trim()) {
        throw new Error('Tenant restaurantId is strictly required to generate cache keys');
    }
    const cleanRestId = restaurantId.trim();
    const cleanIdent = identifier ? `:${identifier.trim()}` : '';
    return `${CACHE_VERSION}:restaurant:${cleanRestId}:${namespace}${cleanIdent}`;
}

const inFlightRequests = new Map();

async function getCached(key) {
    try {
        const start = performance.now();
        const raw = await redisDriver.get(key);
        if (raw === null || raw === undefined) {
            return null;
        }
        const parsed = JSON.parse(raw);
        const duration = (performance.now() - start).toFixed(1);
        console.log(`⚡ [CACHE HIT] ${key} (${duration}ms)`);
        return parsed;
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed parsing cache for ${key}:`, err);
        return null;
    }
}

async function setCached(key, data, ttlSeconds = CACHE_TTL.MENU) {
    try {
        const start = performance.now();
        const serialized = JSON.stringify(data);
        await redisDriver.set(key, serialized, ttlSeconds);
        const duration = (performance.now() - start).toFixed(1);
        console.log(`💾 [CACHE SET] ${key} [TTL: ${ttlSeconds}s] (${duration}ms)`);
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed setting cache for ${key}:`, err);
    }
}

async function deleteCached(key) {
    try {
        await redisDriver.del(key);
        console.log(`🧹 [CACHE INVALIDATE] ${key}`);
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed deleting cache for ${key}:`, err);
    }
}

async function deleteByPattern(pattern) {
    try {
        const count = await redisDriver.delPattern(pattern);
        console.log(`🧹 [CACHE INVALIDATE PATTERN] ${pattern} (${count} keys removed)`);
        return count;
    } catch (err) {
        console.warn(`⚠️ [CACHE ERROR] Failed deleting pattern ${pattern}:`, err);
        return 0;
    }
}

async function getOrSetCached(key, fetcher, ttlSeconds = CACHE_TTL.MENU) {
    const cached = await getCached(key);
    if (cached !== null) {
        return cached;
    }

    console.log(`🔍 [CACHE MISS] ${key} -> Executing database fetch`);

    const existingFlight = inFlightRequests.get(key);
    if (existingFlight) {
        console.log(`✈️ [SINGLE-FLIGHT REUSE] Reusing in-flight query for ${key}`);
        return await existingFlight;
    }

    const fetchPromise = (async () => {
        try {
            const freshData = await fetcher();
            if (freshData !== null && freshData !== undefined) {
                await setCached(key, freshData, ttlSeconds);
            }
            return freshData;
        } finally {
            inFlightRequests.delete(key);
        }
    })();

    inFlightRequests.set(key, fetchPromise);
    return await fetchPromise;
}

async function invalidateRestaurantCache(restaurantId, namespace) {
    if (!restaurantId) return;
    const pattern = namespace 
        ? `${CACHE_VERSION}:restaurant:${restaurantId}:${namespace}*` 
        : `${CACHE_VERSION}:restaurant:${restaurantId}:*`;
    await deleteByPattern(pattern);
}

module.exports = {
    CACHE_TTL,
    CACHE_VERSION,
    getCacheKey,
    getCached,
    setCached,
    deleteCached,
    deleteByPattern,
    getOrSetCached,
    invalidateRestaurantCache,
};
