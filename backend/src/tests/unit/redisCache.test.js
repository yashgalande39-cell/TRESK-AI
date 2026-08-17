/**
 * Unit Tests — redisCache.js
 * Run: npx jest --testPathPatterns="redisCache"
 */

jest.mock('../../config/redis', () => {
  const store = new Map();
  return {
    getRedisClient: jest.fn(() => ({
      get: jest.fn(async (key) => store.get(key) || null),
      set: jest.fn(async (key, val) => {
        store.set(key, val);
        return 'OK';
      }),
      del: jest.fn(async (key) => {
        store.delete(key);
        return 1;
      }),
    })),
    isRedisReady: jest.fn(() => true),
  };
});

const {
  createCacheKey,
  getCached,
  setCached,
  deleteCached,
  cachedQuery,
  DEFAULT_TTLS,
} = require('../../services/cache/redisCache');

describe('redisCache Service', () => {
  test('createCacheKey produces deterministic SHA-256 keys', () => {
    const key1 = createCacheKey('test', { a: 1, b: 2 });
    const key2 = createCacheKey('test', { a: 1, b: 2 });
    const key3 = createCacheKey('test', { a: 1, b: 3 });

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1.startsWith('tresk:test:')).toBe(true);
  });

  test('setCached and getCached correctly serialize and retrieve objects', async () => {
    const key = 'tresk:unit:item1';
    const data = { questions: ['Q1', 'Q2'], count: 2 };

    await setCached(key, data, 60);
    const retrieved = await getCached(key);

    expect(retrieved).toEqual(data);
  });

  test('deleteCached removes item from cache', async () => {
    const key = 'tresk:unit:item2';
    await setCached(key, { temp: true }, 60);
    expect(await getCached(key)).not.toBeNull();

    await deleteCached(key);
    expect(await getCached(key)).toBeNull();
  });

  test('cachedQuery hits fetcher function on cache miss and serves from cache on hit', async () => {
    const fetcherMock = jest.fn().mockResolvedValue(['Fresh Question 1', 'Fresh Question 2']);
    const params = { role: 'DevOps', difficulty: 'Hard' };

    // 1. First call: cache miss, invokes fetcher
    const firstResult = await cachedQuery('questions', params, fetcherMock, DEFAULT_TTLS.QUESTIONS);
    expect(firstResult).toEqual(['Fresh Question 1', 'Fresh Question 2']);
    expect(fetcherMock).toHaveBeenCalledTimes(1);

    // 2. Second call: cache hit, does NOT invoke fetcher
    const secondResult = await cachedQuery('questions', params, fetcherMock, DEFAULT_TTLS.QUESTIONS);
    expect(secondResult).toEqual(['Fresh Question 1', 'Fresh Question 2']);
    expect(fetcherMock).toHaveBeenCalledTimes(1);
  });
});
