const Redis = require('ioredis');
const logger = require('../utils/logger');

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Redis event handlers
redisClient.on('connect', () => {
    logger.info('[Redis] Connected to Redis server');
});

redisClient.on('error', (err) => {
    logger.error(`[Redis] Error connecting to Redis: ${err}`);
});

redisClient.on('reconnecting', () => {
    logger.info('[Redis] Reconnecting to Redis server');
});

// Default TTL in seconds (30 minutes)
const DEFAULT_CACHE_TTL = 1800;

module.exports = {
    redisClient,
    DEFAULT_CACHE_TTL
};
