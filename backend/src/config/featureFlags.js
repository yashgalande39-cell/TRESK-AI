/**
 * TRESK AI — Feature Flags Service
 * =====================================================================
 * Database-driven feature flag system for safe, gradual rollout.
 *
 * Usage:
 *   const featureFlags = require('./featureFlags');
 *   if (await featureFlags.isEnabled('multi_agent_evaluation', req.user)) { ... }
 */

const { query } = require('../config/pgDb');

// In-memory cache: flag_name → { is_enabled, rollout_pct, rules, expiresAt }
const flagCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Load all flags from DB and populate the cache.
 */
async function refreshCache() {
  try {
    const result = await query(`SELECT flag_name, is_enabled, rollout_pct, rules FROM feature_flags`);
    result.rows.forEach(row => {
      flagCache.set(row.flag_name, {
        is_enabled: row.is_enabled,
        rollout_pct: row.rollout_pct,
        rules: row.rules || {},
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    });
  } catch (_) {
    // Silently skip — all flags will default to false when DB is offline
  }
}

/**
 * Get a single flag entry (from cache or DB).
 */
async function getFlag(flagName) {
  const cached = flagCache.get(flagName);
  if (cached && cached.expiresAt > Date.now()) return cached;

  await refreshCache();
  return flagCache.get(flagName) || null;
}

/**
 * Check whether a feature is enabled for a given user.
 *
 * Resolution order:
 *  1. Flag globally disabled → false
 *  2. Plan-based rules (if rules.plans defined, user must be in list)
 *  3. Role-based rules (if rules.roles defined, user must be in list)
 *  4. Percentage rollout (deterministic hash of userId)
 */
async function isEnabled(flagName, user = null) {
  const flag = await getFlag(flagName);
  if (!flag) return false;
  if (!flag.is_enabled) return false;

  const { rollout_pct, rules } = flag;

  // Plan-gating
  if (rules.plans && Array.isArray(rules.plans) && user) {
    if (!rules.plans.includes(user.plan)) return false;
  }

  // Role-gating
  if (rules.roles && Array.isArray(rules.roles) && user) {
    if (!rules.roles.includes(user.role)) return false;
  }

  // Full rollout
  if (rollout_pct >= 100) return true;

  // No rollout at all
  if (rollout_pct <= 0) return false;

  // Percentage rollout — deterministic per user
  if (user?.id) {
    const hash = user.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (hash % 100) < rollout_pct;
  }

  // Anonymous users: use global probability
  return Math.random() * 100 < rollout_pct;
}

/**
 * Express middleware: attaches a `flags` helper to req.
 * Usage: req.flags.isEnabled('feature_name')
 */
function flagsMiddleware() {
  return async (req, _res, next) => {
    req.flags = {
      isEnabled: (flagName) => isEnabled(flagName, req.user),
    };
    next();
  };
}

/**
 * Admin: update a feature flag.
 */
async function setFlag(flagName, { is_enabled, rollout_pct, rules, description } = {}) {
  const updates = [];
  const values  = [];
  let idx = 1;

  if (is_enabled !== undefined) { updates.push(`is_enabled = $${idx++}`);  values.push(is_enabled); }
  if (rollout_pct !== undefined){ updates.push(`rollout_pct = $${idx++}`); values.push(rollout_pct); }
  if (rules !== undefined)      { updates.push(`rules = $${idx++}`);       values.push(JSON.stringify(rules)); }
  if (description !== undefined){ updates.push(`description = $${idx++}`); values.push(description); }
  updates.push(`updated_at = NOW()`);

  values.push(flagName);
  await query(
    `UPDATE feature_flags SET ${updates.join(', ')} WHERE flag_name = $${idx}`,
    values
  );

  // Invalidate cache entry
  flagCache.delete(flagName);
}

/**
 * List all feature flags (admin endpoint helper).
 */
async function listFlags() {
  try {
    const result = await query(
      `SELECT flag_name, is_enabled, rollout_pct, rules, description, updated_at FROM feature_flags ORDER BY flag_name`
    );
    return result.rows;
  } catch (_) {
    return [];
  }
}

// Warm up cache at startup (triggered by first middleware request or index.js to prevent migration race condition)
// refreshCache().catch(() => {});

module.exports = { isEnabled, setFlag, listFlags, flagsMiddleware, refreshCache };
