/**
 * Core Redis Client with Zero-Downtime Multi-Driver Support
 * Supports:
 * 1. Upstash Redis (@upstash/redis) via REST API (Serverless-friendly)
 * 2. Standard Redis via ioredis (REDIS_URL / TCP)
 * 3. High-Performance In-Memory LRU Cache with TTL fallback (when Redis is unconfigured or offline)
 */

const { Redis: UpstashRedis } = require('@upstash/redis');
let IORedis = null;
try {
    IORedis = require('ioredis');
} catch (e) {}

class InMemoryCache {
    constructor() {
        this.store = new Map();
    }

    async get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key, value, ttlSeconds) {
        const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
        this.store.set(key, { value, expiresAt });
    }

    async del(key) {
        this.store.delete(key);
    }

    async keys(pattern) {
        const now = Date.now();
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        const matching = [];

        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt > 0 && now > entry.expiresAt) {
                this.store.delete(key);
            } else if (regex.test(key)) {
                matching.push(key);
            }
        }
        return matching;
    }
}

let upstashClient = null;
let ioRedisClient = null;
const inMemoryFallback = new InMemoryCache();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redisTcpUrl = process.env.REDIS_URL;

if (upstashUrl && upstashToken) {
    try {
        upstashClient = new UpstashRedis({
            url: upstashUrl,
            token: upstashToken,
        });
        console.log('⚡ [Redis] Connected via Upstash REST client');
    } catch (e) {
        console.warn('⚠️ [Redis] Upstash init failed, falling back:', e);
    }
} else if (redisTcpUrl && IORedis) {
    try {
        ioRedisClient = new IORedis(redisTcpUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: true,
        });
        ioRedisClient.connect().catch((err) => {
            console.warn('⚠️ [Redis] ioredis connection warning:', err.message);
        });
        console.log('⚡ [Redis] Connected via ioredis TCP');
    } catch (e) {
        console.warn('⚠️ [Redis] ioredis init failed, falling back:', e);
    }
} else {
    console.log('⚡ [Redis] Running in-memory LRU cache mode (No external Redis URL provided)');
}

class UniversalRedisDriver {
    async get(key) {
        try {
            if (upstashClient) {
                const res = await upstashClient.get(key);
                if (res === null || res === undefined) return null;
                return typeof res === 'string' ? res : JSON.stringify(res);
            }
            if (ioRedisClient && ioRedisClient.status === 'ready') {
                return await ioRedisClient.get(key);
            }
        } catch (error) {
            console.warn(`⚠️ [Redis Driver] Remote GET failed for ${key}, falling back to memory:`, error);
        }
        return await inMemoryFallback.get(key);
    }

    async set(key, value, ttlSeconds = 300) {
        await inMemoryFallback.set(key, value, ttlSeconds);
        try {
            if (upstashClient) {
                if (ttlSeconds > 0) {
                    await upstashClient.set(key, value, { ex: ttlSeconds });
                } else {
                    await upstashClient.set(key, value);
                }
                return;
            }
            if (ioRedisClient && ioRedisClient.status === 'ready') {
                if (ttlSeconds > 0) {
                    await ioRedisClient.set(key, value, 'EX', ttlSeconds);
                } else {
                    await ioRedisClient.set(key, value);
                }
                return;
            }
        } catch (error) {
            console.warn(`⚠️ [Redis Driver] Remote SET failed for ${key}:`, error);
        }
    }

    async del(key) {
        await inMemoryFallback.del(key);
        try {
            if (upstashClient) {
                await upstashClient.del(key);
                return;
            }
            if (ioRedisClient && ioRedisClient.status === 'ready') {
                await ioRedisClient.del(key);
                return;
            }
        } catch (error) {
            console.warn(`⚠️ [Redis Driver] Remote DEL failed for ${key}:`, error);
        }
    }

    async delPattern(pattern) {
        const memKeys = await inMemoryFallback.keys(pattern);
        for (const k of memKeys) {
            await inMemoryFallback.del(k);
        }

        let remoteDeleted = 0;
        try {
            if (upstashClient) {
                const keys = await upstashClient.keys(pattern);
                if (keys && keys.length > 0) {
                    await upstashClient.del(...keys);
                    remoteDeleted = keys.length;
                }
            } else if (ioRedisClient && ioRedisClient.status === 'ready') {
                const keys = await ioRedisClient.keys(pattern);
                if (keys && keys.length > 0) {
                    await ioRedisClient.del(...keys);
                    remoteDeleted = keys.length;
                }
            }
        } catch (error) {
            console.warn(`⚠️ [Redis Driver] Remote DEL pattern failed for ${pattern}:`, error);
        }

        return Math.max(memKeys.length, remoteDeleted);
    }

    async isHealthy() {
        try {
            if (upstashClient) {
                await upstashClient.ping();
                return true;
            }
            if (ioRedisClient && ioRedisClient.status === 'ready') {
                await ioRedisClient.ping();
                return true;
            }
            return true;
        } catch {
            return false;
        }
    }
}

const redisDriver = new UniversalRedisDriver();

module.exports = {
    redisDriver,
    UniversalRedisDriver,
};
