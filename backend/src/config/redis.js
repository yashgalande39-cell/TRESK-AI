/**
 * TRESK AI — Redis Connection Manager (ioredis)
 * =====================================================================
 * Centralizes Redis connections for Caching, BullMQ queues, and Socket.IO adapter.
 * Handles auto-reconnect, health status, and graceful degradation when Redis is offline.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const defaultRedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  autoResubscribe: false,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Stop retrying if Redis server is not running
    }
    return 1000;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  lazyConnect: true,
};

// Track all instantiated clients for graceful shutdown
const activeClients = new Set();

let isReady = false;
let defaultClient = null;

/**
 * Factory function to create a new Redis client instance
 * @param {object} overrides - Optional ioredis options
 * @returns {Redis}
 */
function createRedisClient(overrides = {}) {
  const client = new Redis(REDIS_URL, {
    ...defaultRedisOptions,
    ...overrides,
  });

  activeClients.add(client);

  client.on('connect', () => {
    isReady = true;
    if (global.logger?.info) {
      global.logger.info({ redisUrl: REDIS_URL.replace(/:[^:@]+@/, ':***@') }, '🔌 Redis client connected');
    }
  });

  client.on('ready', () => {
    isReady = true;
  });

  client.on('error', () => {
    isReady = false;
  });

  client.on('close', () => {
    isReady = false;
  });

  return client;
}

/**
 * Get or initialize the default shared Redis client
 * @returns {Redis}
 */
function getRedisClient() {
  if (!defaultClient) {
    defaultClient = createRedisClient();
  }
  return defaultClient;
}

/**
 * Check if Redis is currently connected and ready
 * @returns {boolean}
 */
function isRedisReady() {
  return isReady && defaultClient !== null && defaultClient.status === 'ready';
}

/**
 * Connect default Redis client if not already connected
 * @returns {Promise<boolean>}
 */
async function initRedis() {
  try {
    const client = getRedisClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    return isReady;
  } catch (err) {
    if (global.logger?.info) {
      global.logger.info('ℹ️ Redis is offline — backend is running with in-memory fallbacks.');
    }
    return false;
  }
}

/**
 * Gracefully disconnect all active Redis clients
 */
async function closeRedisConnections() {
  const promises = [];
  for (const client of activeClients) {
    try {
      if (client.status !== 'end') {
        promises.push(client.quit().catch(() => client.disconnect()));
      }
    } catch (_) {}
  }
  activeClients.clear();
  isReady = false;
  defaultClient = null;
  await Promise.all(promises);
}

module.exports = {
  REDIS_URL,
  createRedisClient,
  getRedisClient,
  isRedisReady,
  initRedis,
  closeRedisConnections,
};
