const Redis = require('ioredis');
const config = require('./config');

let redis;

try {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });

  redis.on('connect', () => {
    console.log('Connected to Redis server');
  });

  redis.on('error', (err) => {
    console.warn('Redis connection error (using fallback):', err.message);
  });

  redis.on('close', () => {
    console.warn('Redis connection closed');
  });

} catch (error) {
  console.warn('Redis initialization failed, using in-memory fallback');
  redis = null;
}

// Fallback in-memory cache if Redis is not available
const fallbackCache = new Map();

const redisClient = {
  async get(key) {
    if (redis && redis.status === 'ready') {
      try {
        return await redis.get(key);
      } catch (error) {
        console.warn('Redis get failed, using fallback:', error.message);
        return fallbackCache.get(key);
      }
    }
    return fallbackCache.get(key);
  },

  async set(key, value, ttl = null) {
    if (redis && redis.status === 'ready') {
      try {
        if (ttl) {
          await redis.setex(key, ttl, value);
        } else {
          await redis.set(key, value);
        }
        return;
      } catch (error) {
        console.warn('Redis set failed, using fallback:', error.message);
      }
    }
    fallbackCache.set(key, value);
  },

  async del(key) {
    if (redis && redis.status === 'ready') {
      try {
        await redis.del(key);
        return;
      } catch (error) {
        console.warn('Redis del failed, using fallback:', error.message);
      }
    }
    fallbackCache.delete(key);
  },

  async exists(key) {
    if (redis && redis.status === 'ready') {
      try {
        return await redis.exists(key);
      } catch (error) {
        console.warn('Redis exists failed, using fallback:', error.message);
        return fallbackCache.has(key) ? 1 : 0;
      }
    }
    return fallbackCache.has(key) ? 1 : 0;
  },

  // For compatibility with ioredis
  on(event, callback) {
    if (redis) {
      redis.on(event, callback);
    }
  },

  // Clear fallback cache for testing
  clearCache() {
    fallbackCache.clear();
  }
};

module.exports = redisClient;
