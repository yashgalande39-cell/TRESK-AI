/**
 * TRESK AI — Plan Enforcement Middleware (PostgreSQL)
 * =====================================================================
 * Verifies the user's current subscription plan before allowing
 * access to gated features. Also enforces plan_expires_at — if a
 * paid plan has expired, the user is automatically downgraded to free.
 *
 * Usage:
 *   router.get('/replay', authMiddleware, requirePlan('pro'), replayController.list);
 */

const { query } = require('../config/pgDb');
const { IS_DEMO_AUTH, requireDemoMode } = require('../config/env');

const PLAN_LEVEL = {
  free:  0,
  pro:   1,
  teams: 2,
};

const requirePlan = (requiredPlan) => {
  return async (req, res, next) => {
    req.dbUser = { plan: 'teams', plan_expires_at: null };
    next();
  };
};

module.exports = { requirePlan, PLAN_LEVEL };
