const { redisClient, DEFAULT_CACHE_TTL } = require('../config/redisConfig');
const logger = require('./logger');

class CacheUtils {
    static generateCacheKey(prefix, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {});
        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }

    static async getCache(key) {
        try {
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            return null;
        } catch (error) {
            logger.error(`[CacheUtils] Error getting cache for key ${key}: ${error}`);
            return null;
        }
    }

    static async setCache(key, data, ttl = DEFAULT_CACHE_TTL) {
        try {
            await redisClient.setex(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            logger.error(`[CacheUtils] Error setting cache for key ${key}: ${error}`);
            return false;
        }
    }

    static async invalidateCache(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(...keys);
                logger.info(`[CacheUtils] Invalidated cache for pattern: ${pattern}`);
            }
            return true;
        } catch (error) {
            logger.error(`[CacheUtils] Error invalidating cache for pattern ${pattern}: ${error}`);
            return false;
        }
    }

    static async trackQueryUsage(key) {
        try {
            await redisClient.zincrby('query_usage_tracking', 1, key);
        } catch (error) {
            logger.error(`[CacheUtils] Error tracking query usage: ${error}`);
        }
    }
}

module.exports = CacheUtils;
