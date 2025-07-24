const Redis = require('ioredis');
const config = require('./config');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

redis.on('connect', () => {
  console.log('Connected to Redis server');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = redis;
