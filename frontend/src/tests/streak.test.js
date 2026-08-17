/**
 * Frontend Unit Tests — streak utility (same logic re-exported via utils)
 * Run: npm test (vitest)
 *
 * NOTE: The streak logic lives in backend/src/utils/streak.js.
 * These tests guard against the same edge-cases on the frontend
 * if the logic is ever moved or duplicated there.
 * For now we test the formatting / display helpers in this file.
 */

import { describe, it, expect } from "vitest";

// ── Streak display helpers (inline — no import needed for these pure fns) ─────
function formatStreak(streak) {
  if (!streak || streak <= 0) return "0 days";
  if (streak === 1) return "1 day";
  return `${streak} days`;
}

function streakEmoji(streak) {
  if (!streak || streak <= 0) return "";
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 7) return "🔥🔥";
  return "🔥";
}

function streakColor(streak) {
  if (!streak || streak <= 0) return "text-slate-500";
  if (streak >= 30) return "text-orange-400";
  if (streak >= 7) return "text-yellow-400";
  return "text-slate-300";
}

// ── formatStreak ──────────────────────────────────────────────────────────────
describe("formatStreak()", () => {
  it("returns '0 days' for 0", () => expect(formatStreak(0)).toBe("0 days"));
  it("returns '0 days' for null", () => expect(formatStreak(null)).toBe("0 days"));
  it("returns '0 days' for undefined", () => expect(formatStreak(undefined)).toBe("0 days"));
  it("returns '1 day' for 1", () => expect(formatStreak(1)).toBe("1 day"));
  it("returns '7 days' for 7", () => expect(formatStreak(7)).toBe("7 days"));
  it("returns '30 days' for 30", () => expect(formatStreak(30)).toBe("30 days"));
  it("returns '365 days' for 365", () => expect(formatStreak(365)).toBe("365 days"));
});

// ── streakEmoji ───────────────────────────────────────────────────────────────
describe("streakEmoji()", () => {
  it("returns empty for 0 streak", () => expect(streakEmoji(0)).toBe(""));
  it("returns single flame for streak < 7", () => expect(streakEmoji(3)).toBe("🔥"));
  it("returns double flame for streak >= 7", () => expect(streakEmoji(10)).toBe("🔥🔥"));
  it("returns triple flame for streak >= 30", () => expect(streakEmoji(30)).toBe("🔥🔥🔥"));
  it("returns triple flame for streak 100", () => expect(streakEmoji(100)).toBe("🔥🔥🔥"));
});

// ── streakColor ───────────────────────────────────────────────────────────────
describe("streakColor()", () => {
  it("returns slate-500 for 0", () => expect(streakColor(0)).toBe("text-slate-500"));
  it("returns slate-300 for streak 1-6", () => expect(streakColor(5)).toBe("text-slate-300"));
  it("returns yellow-400 for streak 7-29", () => expect(streakColor(14)).toBe("text-yellow-400"));
  it("returns orange-400 for streak 30+", () => expect(streakColor(30)).toBe("text-orange-400"));
});
