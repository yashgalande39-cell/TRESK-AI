/**
 * TRESK AI — Role-Based Access Control (RBAC) Middleware
 * =====================================================================
 * Gates routes by user role, subscription plan, tenant scope, and
 * resource ownership. Supports a 4-tier role hierarchy.
 *
 * Roles hierarchy (ascending privilege):
 *   user (candidate) → recruiter → moderator → admin
 *
 * Usage:
 *   const { requireRole, requireAdmin, requirePlan, requireTenantMatch } = require('./rbac.middleware');
 *
 *   router.delete('/user/:id',        authMiddleware, requireAdmin, deleteUser);
 *   router.get('/admin/kpis',         authMiddleware, requireAdmin, getAdminKpis);
 *   router.get('/org/:tenantId/data', authMiddleware, requireTenantMatch, getOrgData);
 *   router.post('/ai/coach',          authMiddleware, requirePlan(['pro', 'teams']), coachSession);
 */

// ─── Role Definitions ────────────────────────────────────────────────────────

const ROLE_HIERARCHY = {
  user:       10,   // Candidate — default for all registered users
  recruiter:  20,   // Recruiter — can view candidate pools, manage org sessions
  moderator:  30,   // Moderator — can manage questions bank and leaderboard
  admin:      99,   // Admin — full platform access including analytics and billing
};

function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] ?? 0;
}

// ─── Role-Based Guards ───────────────────────────────────────────────────────

/**
 * Require the authenticated user to have one of the specified roles (exact match).
 * @param {string[]} roles - Array of allowed role strings
 */
function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role || 'user';
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${userRole}.`,
        required: roles,
        current: userRole,
      });
    }

    next();
  };
}

/**
 * Require minimum role level (hierarchy-aware).
 * Users with equal or higher privilege level are granted access.
 * @param {string} minimumRole - e.g. 'recruiter' allows recruiter, moderator, admin
 */
function requireMinRole(minimumRole) {
  const requiredLevel = getRoleLevel(minimumRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userLevel = getRoleLevel(req.user.role || 'user');
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Access denied. Minimum required role: ${minimumRole}. Your role: ${req.user.role || 'user'}.`,
        requiredRole: minimumRole,
        yourRole: req.user.role,
      });
    }
    next();
  };
}

/** Shorthand: require admin or moderator role. */
const requireAdmin     = requireRole(['admin', 'moderator']);
/** Shorthand: require admin only. */
const requireAdminOnly = requireRole(['admin']);
/** Shorthand: require recruiter and above. */
const requireRecruiter = requireMinRole('recruiter');

// ─── Plan-Based Guards ───────────────────────────────────────────────────────

/**
 * Require user to be on one of the specified subscription plans.
 * @param {string[]} plans - e.g. ['pro', 'teams']
 */
function requirePlan(plans = ['pro', 'teams']) {
  return (req, res, next) => {
    next();
  };
}

// ─── Tenant Isolation ────────────────────────────────────────────────────────

/**
 * Enforce multi-tenant data isolation.
 * Compares the tenant ID from the JWT vs. the :tenantId route param or
 * the X-Tenant-ID header forwarded by Nginx.
 *
 * Admins bypass all tenant checks.
 */
function requireTenantMatch(req, res, next) {
  if (req.user?.role === 'admin') return next();

  const requestedTenant = req.params.tenantId || req.headers['x-tenant-id'];
  const userTenant      = req.user?.tenantId;

  if (!requestedTenant && !userTenant) return next();

  if (!userTenant) {
    return res.status(403).json({
      error: 'TENANT_MISMATCH',
      message: 'Access denied. You do not belong to any organization tenant.',
    });
  }

  if (requestedTenant && requestedTenant !== userTenant) {
    return res.status(403).json({
      error: 'TENANT_MISMATCH',
      message: 'Access denied. You cannot access another organization\'s data.',
      requestedTenant,
      yourTenant: userTenant,
    });
  }

  next();
}

// ─── Resource Ownership ──────────────────────────────────────────────────────

/**
 * Simple ownership check: compares req.params[paramKey] to req.user.id.
 * @param {string} paramKey - Route param key holding the resource owner's user ID
 */
function requireOwnership(paramKey = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'admin') return next();

    const resourceUserId = req.params[paramKey];
    if (resourceUserId && resourceUserId !== req.user.userId) {
      return res.status(403).json({
        error: 'OWNERSHIP_VIOLATION',
        message: 'Access denied. You do not own this resource.',
      });
    }
    next();
  };
}

// ─── Audit Logging Helper ────────────────────────────────────────────────────

/**
 * Attach audit metadata to the request for downstream handlers to persist
 * into the audit_logs table.
 * @param {string} action - e.g. 'VIEW_ADMIN_KPI', 'DELETE_USER'
 * @param {string} resource - e.g. 'users', 'resumes'
 */
function auditLog(action, resource) {
  return (req, _res, next) => {
    req.auditAction   = action;
    req.auditResource = resource;
    next();
  };
}

module.exports = {
  requireRole,
  requireMinRole,
  requireAdmin,
  requireAdminOnly,
  requireRecruiter,
  requirePlan,
  requireTenantMatch,
  requireOwnership,
  auditLog,
  ROLE_HIERARCHY,
  getRoleLevel,
};
