/**
 * Unit Tests — streak.js (pure functions, no mocking needed)
 * Run: npm test -- --testPathPattern=streak
 */

const { getLocalDateString, daysDiffWithTimezone, computeStreak } = require('../../utils/streak');

// ── getLocalDateString ────────────────────────────────────────────────────────
describe('getLocalDateString()', () => {
  test('returns a date string in MM/DD/YYYY format', () => {
    const date = new Date('2024-01-15T10:00:00Z');
    const result = getLocalDateString(date, 'UTC');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('falls back to UTC for an invalid timezone', () => {
    const date = new Date('2024-01-15T10:00:00Z');
    const result = getLocalDateString(date, 'Invalid/TZ');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('correctly formats a known date', () => {
    const date = new Date('2024-06-20T12:00:00Z');
    const result = getLocalDateString(date, 'UTC');
    expect(result).toBe('06/20/2024');
  });

  test('handles daylight-saving transition zones without throwing', () => {
    const date = new Date('2024-03-10T10:00:00Z');
    expect(() => getLocalDateString(date, 'America/New_York')).not.toThrow();
  });
});

// ── daysDiffWithTimezone ──────────────────────────────────────────────────────
describe('daysDiffWithTimezone()', () => {
  test('returns 0 when both dates are on the same calendar day', () => {
    const a = new Date('2024-01-15T08:00:00Z');
    const b = new Date('2024-01-15T23:00:00Z');
    expect(daysDiffWithTimezone(a, b, 'UTC')).toBe(0);
  });

  test('returns 1 for consecutive calendar days', () => {
    const a = new Date('2024-01-15T00:00:00Z');
    const b = new Date('2024-01-16T00:00:00Z');
    expect(daysDiffWithTimezone(a, b, 'UTC')).toBe(1);
  });

  test('returns 2 for two days apart', () => {
    const a = new Date('2024-01-15T00:00:00Z');
    const b = new Date('2024-01-17T00:00:00Z');
    expect(daysDiffWithTimezone(a, b, 'UTC')).toBe(2);
  });

  test('returns negative for earlier B than A', () => {
    const a = new Date('2024-01-17T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(daysDiffWithTimezone(a, b, 'UTC')).toBe(-2);
  });

  test('handles month boundaries correctly', () => {
    const a = new Date('2024-01-31T12:00:00Z');
    const b = new Date('2024-02-01T12:00:00Z');
    expect(daysDiffWithTimezone(a, b, 'UTC')).toBe(1);
  });

  test('handles year boundaries correctly', () => {
    const a = new Date('2023-12-31T12:00:00Z');
    const b = new Date('2024-01-01T12:00:00Z');
    expect(daysDiffWithTimezone(a, b, 'UTC')).toBe(1);
  });
});

// ── computeStreak ─────────────────────────────────────────────────────────────
describe('computeStreak()', () => {
  const yesterday = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString();
  };

  const twoDaysAgo = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 2);
    return d.toISOString();
  };

  const today = () => new Date().toISOString();

  test('returns 1 when lastActiveISO is null (new user)', () => {
    expect(computeStreak(null, 1, 'UTC')).toBe(1);
  });

  test('preserves current streak when last active was today', () => {
    expect(computeStreak(today(), 5, 'UTC')).toBe(5);
  });

  test('increments streak by 1 when last active was yesterday', () => {
    expect(computeStreak(yesterday(), 5, 'UTC')).toBe(6);
  });

  test('resets streak to 1 when last active was 2+ days ago', () => {
    expect(computeStreak(twoDaysAgo(), 10, 'UTC')).toBe(1);
  });

  test('starts fresh streak from 1 when currentStreak is 0 and active yesterday', () => {
    expect(computeStreak(yesterday(), 0, 'UTC')).toBe(2);
  });

  test('handles undefined currentStreak gracefully', () => {
    const result = computeStreak(yesterday(), undefined, 'UTC');
    expect(result).toBeGreaterThan(0);
  });
});
