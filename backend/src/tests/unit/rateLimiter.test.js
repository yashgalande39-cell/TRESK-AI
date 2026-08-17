/**
 * Unit Tests — rateLimiter.js (Rate Limiter Module)
 * Run: npm test -- --testPathPattern=rateLimiter
 */

const {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  aiLimiter,
  uploadLimiter,
} = require('../../middleware/rateLimiter');

describe('rateLimiter middleware exports', () => {
  test('exports all standard rate limiters as express middlewares', () => {
    expect(typeof globalLimiter).toBe('function');
    expect(typeof authLimiter).toBe('function');
    expect(typeof passwordResetLimiter).toBe('function');
    expect(typeof aiLimiter).toBe('function');
    expect(typeof uploadLimiter).toBe('function');
  });
});
