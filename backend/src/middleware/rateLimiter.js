/**
 * TRESK AI — Configurable Rate Limiter Middleware
 * =====================================================================
 * All thresholds are read from environment variables so they can be
 * tuned per deployment without touching code.
 *
 * Environment variables (all optional — sensible defaults provided):
 *   RATE_GLOBAL_MAX        Max requests per IP per 15 minutes (default: 500)
 *   RATE_AUTH_MAX          Max auth attempts per IP per 15 minutes (default: 15)
 *   RATE_AUTH_WINDOW_MS    Auth window in ms (default: 900000 = 15m)
 *   RATE_RESET_MAX         Max password-reset requests per IP (default: 5)
 *   RATE_RESET_WINDOW_MS   Password-reset window in ms (default: 900000 = 15m)
 *   RATE_AI_MAX            Max AI requests per IP per minute (default: 60)
 *   RATE_AI_WINDOW_MS      AI window in ms (default: 60000 = 1m)
 *   RATE_UPLOAD_MAX        Max file uploads per IP per 15 minutes (default: 20)
 */

const rateLimit = require('express-rate-limit');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse an integer from an env variable, returning `defaultVal` on failure.
 */
function envInt(name, defaultVal) {
  const raw = process.env[name];
  if (!raw) return defaultVal;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultVal;
}

/**
 * Standard JSON response for rate-limited requests.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have made too many requests in a short period. Please wait and try again.',
    retryAfter: Math.ceil(res.getHeader('Retry-After') || 60),
  });
};

/**
 * Global limiter — applied to all routes.
 * Loose limit to stop severe abuse, not to throttle normal use.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: envInt('RATE_GLOBAL_MAX', 500),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Auth limiter — login, register, google OAuth.
 * Counts only failed requests (skipSuccessfulRequests) to avoid punishing
 * users who legitimately log in many times.
 */
const authLimiter = rateLimit({
  windowMs: envInt('RATE_AUTH_WINDOW_MS', 15 * 60 * 1000),
  max: envInt('RATE_AUTH_MAX', 15),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler,
  message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
});

/**
 * Password-reset limiter — tighter than general auth.
 * Prevent enumeration / bulk reset attacks.
 */
const passwordResetLimiter = rateLimit({
  windowMs: envInt('RATE_RESET_WINDOW_MS', 15 * 60 * 1000),
  max: envInt('RATE_RESET_MAX', 5),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  message: 'Too many password reset requests. Please wait 15 minutes and try again.',
});

/**
 * AI limiter — OpenRouter/Tresk endpoints.
 * Moderate limit to prevent prompt-flooding and cost abuse.
 */
const aiLimiter = rateLimit({
  windowMs: envInt('RATE_AI_WINDOW_MS', 60 * 1000),
  max: envInt('RATE_AI_MAX', 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Upload limiter — file upload endpoints.
 * Prevents upload spam.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: envInt('RATE_UPLOAD_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  aiLimiter,
  uploadLimiter,
};
