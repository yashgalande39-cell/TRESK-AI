/**
 * TRESK AI — Redis LLM & Data Cache Service
 * =====================================================================
 * Caches OpenRouter / Gemini responses, standard question sets, and ATS suggestions.
 * Uses SHA-256 hashed keys with configurable TTLs and automatic in-memory fallback.
 */

const crypto = require('crypto');
const { getRedisClient, isRedisReady } = require('../../config/redis');

// Default TTLs in seconds
const DEFAULT_TTLS = {
  QUESTIONS: 86400,      // 24 hours
  APTITUDE: 86400,       // 24 hours
  ATS_RULES: 43200,      // 12 hours
  LLM_RESPONSE: 21600,   // 6 hours
  PARTIAL_HINT: 1800,    // 30 minutes
};

/**
 * Generate a deterministic SHA-256 cache key
 * @param {string} prefix - e.g. 'llm:questions'
 * @param {object|string} payload - Input prompt, parameters, or object
 * @returns {string}
 */
function createCacheKey(prefix, payload) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 32);
  return `tresk:${prefix}:${hash}`;
}

/**
 * Get cached item from Redis
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function getCached(key) {
  try {
    const client = getRedisClient();
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null; // Gracefully return null on cache miss / Redis offline
  }
}

/**
 * Set item in Redis cache with TTL
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=21600]
 * @returns {Promise<boolean>}
 */
async function setCached(key, value, ttlSeconds = DEFAULT_TTLS.LLM_RESPONSE) {
  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch (err) {
    return false; // Non-fatal if cache write fails
  }
}

/**
 * Delete a specific key from cache
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function deleteCached(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * High-level wrapper: retrieve from cache or execute fetcher and cache result
 * @param {string} prefix - Key namespace
 * @param {any} params - Input params for key generation
 * @param {Function} fetcherFn - Async function to call on cache miss
 * @param {number} [ttlSeconds] - Expiration in seconds
 * @returns {Promise<any>}
 */
async function cachedQuery(prefix, params, fetcherFn, ttlSeconds = DEFAULT_TTLS.LLM_RESPONSE) {
  const key = createCacheKey(prefix, params);
  
  // 1. Try cache
  const cached = await getCached(key);
  if (cached !== null) {
    if (global.logger?.debug) {
      global.logger.debug({ key }, '🎯 Redis cache hit');
    }
    return cached;
  }

  // 2. Fetch fresh data
  const freshData = await fetcherFn();

  // 3. Cache asynchronously (do not block return)
  if (freshData !== undefined && freshData !== null) {
    setCached(key, freshData, ttlSeconds).catch(() => {});
  }

  return freshData;
}

module.exports = {
  DEFAULT_TTLS,
  createCacheKey,
  getCached,
  setCached,
  deleteCached,
  cachedQuery,
};
