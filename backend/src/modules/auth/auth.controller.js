/**
 * TRESK AI — Auth Controller (PostgreSQL)
 * =====================================================================
 * Phase 2: httpOnly cookie auth + refresh tokens + role in JWT
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../../config/pgDb');
const emailService = require('./email.service');

const { JWT_SECRET, IS_DEMO_AUTH, requireDemoMode } = require('../../config/env');
const FIREBASE_PROJECT_ID = 'ai-interview-auth-530ed';

const { computeStreak } = require('../../utils/streak');

async function updateUserStreak(userId, timeZone = 'UTC', client = null) {
  const q = client ? client.query.bind(client) : query;
  
  // Get existing
  const res = await q('SELECT * FROM users WHERE id = $1', [userId]);
  const user = res.rows[0];
  if (!user) return null;

  const currentStreak = user.streak || 1;
  const lastActive = user.last_active;

  const newStreak = computeStreak(lastActive, currentStreak, timeZone);

  const timeDiffMs = Date.now() - new Date(lastActive).getTime();
  const shouldUpdate = newStreak !== currentStreak || timeDiffMs > 5 * 60 * 1000;

  if (shouldUpdate) {
    const updated = await q(
      'UPDATE users SET last_active = NOW(), streak = $1 WHERE id = $2 RETURNING *',
      [newStreak, userId]
    );
    return updated.rows[0];
  }

  return user;
}

// ── Token config ─────────────────────────────────────────────────────────────
const ACCESS_TOKEN_TTL  = '15m';        // Short-lived access token
const REFRESH_TOKEN_TTL = '30d';        // Long-lived refresh token
const REFRESH_COOKIE    = 'tresk_refresh'; // httpOnly cookie name

// ── Cookie config ─────────────────────────────────────────────────────────────
const cookieOptions = (maxAge) => ({
  httpOnly:  true,
  secure:    process.env.NODE_ENV === 'production',
  sameSite:  'strict',
  maxAge,    // milliseconds
  path:      '/',
});

// ── Helper: issue tokens and set cookie ─────────────────────────────────────
const issueTokens = async (res, user) => {
  // 1. Access token — short lived, carries userId + role
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  // 2. Refresh token — opaque random bytes, stored hashed in DB
  const rawRefresh   = crypto.randomBytes(64).toString('hex');
  const hashedRefresh = crypto.createHash('sha256').update(rawRefresh).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  try {
    await query(
      `INSERT INTO refresh_sessions (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT DO NOTHING`,
      [user.id, hashedRefresh, expiresAt]
    );
  } catch (e) {
    // Non-fatal — refresh session storage is best-effort in demo mode
    console.warn('[issueTokens] Could not persist refresh session:', e.message);
  }

  // 3. Set refresh token as httpOnly cookie
  res.cookie(REFRESH_COOKIE, rawRefresh, cookieOptions(30 * 24 * 60 * 60 * 1000));

  return accessToken;
};

// ── Helper: revoke all refresh sessions for a user ──────────────────────────
const revokeAllSessions = async (userId) => {
  try {
    await query('DELETE FROM refresh_sessions WHERE user_id = $1', [userId]);
  } catch (e) {
    console.warn('[revokeAllSessions] Failed:', e.message);
  }
};

// ── Helper: strip sensitive fields ───────────────────────────────────────────
const sanitize = (user) => {
  const { password_hash, reset_token, email_verify_token, ...safe } = user;
  safe.plan = 'teams';
  return safe;
};

// ── Helper: compute XP badge ─────────────────────────────────────────────────
const computeBadges = (xp, existing = []) => {
  const badges = Array.isArray(existing) ? [...existing] : ['Novice Prep'];
  if (xp >= 500  && !badges.includes('Interview Scholar'))  badges.push('Interview Scholar');
  if (xp >= 1500 && !badges.includes('Coding Master'))     badges.push('Coding Master');
  if (xp >= 3000 && !badges.includes('Placement Ready'))   badges.push('Placement Ready');
  return badges;
};

// ── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, collegeName, branch, graduationYear } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Check for duplicate
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(`
      INSERT INTO users (name, email, password_hash, college_name, branch, graduation_year, xp, streak, badges, plan, role, auth_provider, last_active)
      VALUES ($1, $2, $3, $4, $5, $6, 100, 1, '{"Novice Prep"}', 'free', 'user', 'local', NOW())
      RETURNING *
    `, [name, email, password_hash, collegeName || '', branch || '', graduationYear || '']);

    const newUser = result.rows[0];

    // Send verification email (non-blocking)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyHash  = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await query(
      'UPDATE users SET email_verify_token=$1, email_verify_expiry=$2 WHERE id=$3',
      [verifyHash, verifyExpiry, newUser.id]
    ).catch(() => {});
    emailService.sendVerificationEmail(newUser.email, newUser.name, verifyToken).catch(() => {});

    // Issue tokens + set httpOnly cookie
    const token = await issueTokens(res, newUser);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: sanitize(newUser)
    });
  } catch (err) {
    if (IS_DEMO_AUTH) {
      requireDemoMode('auth.register');
      const { name, email, collegeName, branch, graduationYear } = req.body;
      const mockUser = {
        id: crypto.randomUUID(),
        name: name || "Test User",
        email: email || "user@example.com",
        college_name: collegeName || "",
        branch: branch || "",
        graduation_year: graduationYear || "",
        xp: 100,
        streak: 1,
        badges: ["Novice Prep"],
        plan: "pro",
        role: "user",
        auth_provider: "local",
        last_active: new Date().toISOString()
      };
      const token = jwt.sign({ userId: mockUser.id, role: mockUser.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
      return res.status(201).json({
        message: 'Registration successful (offline mode)',
        token,
        user: mockUser
      });
    }
    console.error('[Register] Database error:', err);
    return res.status(503).json({ message: 'Service temporarily unavailable' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Streak calculation (timezone-aware)
    const timeZone = req.headers['x-timezone'] || 'UTC';
    const freshUser = await updateUserStreak(user.id, timeZone);

    // Issue tokens + set httpOnly cookie
    const token = await issueTokens(res, freshUser);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: sanitize(freshUser)
    });
  } catch (err) {
    if (IS_DEMO_AUTH) {
      requireDemoMode('auth.login');
      const { email } = req.body;
      const mockUser = {
        id: crypto.randomUUID(),
        name: email ? (email.split('@')[0] || "Test User") : "Test User",
        email: email || "user@example.com",
        xp: 1200,
        streak: 3,
        badges: ["Novice Prep", "Interview Scholar", "Placement Ready"],
        plan: "pro",
        role: "user",
        auth_provider: "local",
        last_active: new Date().toISOString()
      };
      const token = jwt.sign({ userId: mockUser.id, role: mockUser.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
      return res.status(200).json({
        message: 'Login successful (offline mode)',
        token,
        user: mockUser
      });
    }
    console.error('[Login] Database error:', err);
    return res.status(503).json({ message: 'Service temporarily unavailable' });
  }
};

// ── Get Profile ───────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const timeZone = req.headers['x-timezone'] || 'UTC';
    const updatedUser = await updateUserStreak(req.user.userId, timeZone);
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    const safeUser = sanitize(updatedUser);

    // Soft email verification enforcement:
    // Include verification status so frontend can show banner.
    // Google OAuth users are always considered verified.
    const requiresVerification = updatedUser.auth_provider === 'local' && !updatedUser.email_verified;

    return res.status(200).json({
      user: safeUser,
      requiresVerification,
    });
  } catch (err) {
    if (IS_DEMO_AUTH) {
      requireDemoMode('auth.getProfile');
      const mockUser = {
        id: req.user.userId || crypto.randomUUID(),
        name: "Atlas Test User",
        email: "admin@example.com",
        avatar: "",
        college_name: "Mock Engineering College",
        branch: "Computer Science",
        graduation_year: "2026",
        xp: 1250,
        streak: 5,
        badges: ["Novice Prep", "Interview Scholar", "Placement Ready"],
        plan: "teams",
        auth_provider: "local",
        last_active: new Date().toISOString()
      };
      return res.status(200).json({ user: mockUser });
    }
    console.error('[GetProfile] Database error:', err);
    return res.status(503).json({ message: 'Service temporarily unavailable' });
  }
};

// ── Update Profile ────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, currentRole, location, bio, collegeName, branch, graduationYear } = req.body;

    const result = await query(`
      UPDATE users
      SET name = COALESCE($1, name),
          "current_role" = COALESCE($2, "current_role"),
          location = COALESCE($3, location),
          bio = COALESCE($4, bio),
          college_name = COALESCE($5, college_name),
          branch = COALESCE($6, branch),
          graduation_year = COALESCE($7, graduation_year)
      WHERE id = $8
      RETURNING *
    `, [name, currentRole, location, bio, collegeName, branch, graduationYear, userId]);

    if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Profile updated', user: sanitize(result.rows[0]) });
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

// ── Update XP & Streak ────────────────────────────────────────────────────────
exports.updateXpAndStreak = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { xpAmount, badgeToEarn } = req.body;

    const result = await withTransaction(async (client) => {
      const timeZone = req.headers['x-timezone'] || 'UTC';
      const updatedUser = await updateUserStreak(userId, timeZone, client);
      if (!updatedUser) return { status: 404, message: 'User not found' };

      const currentXP = updatedUser.xp || 0;
      const newXP = currentXP + (xpAmount || 0);

      let badges = computeBadges(newXP, updatedUser.badges);
      if (badgeToEarn && !badges.includes(badgeToEarn)) badges.push(badgeToEarn);

      const updateRes = await client.query(
        'UPDATE users SET xp = $1, badges = $2 WHERE id = $3 RETURNING *',
        [newXP, badges, userId]
      );
      return { status: 200, user: sanitize(updateRes.rows[0]) };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(200).json({ message: 'Progress updated', user: result.user });
  } catch (err) {
    console.error('XP Update Error:', err);
    return res.status(500).json({ message: 'Server error updating progress' });
  }
};

// ── Update Plan ───────────────────────────────────────────────────────────────
exports.updatePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'pro', 'teams'];
    if (!validPlans.includes(plan)) return res.status(400).json({ message: 'Invalid plan' });

    const result = await query(
      'UPDATE users SET plan = $1, plan_activated_at = NOW() WHERE id = $2 RETURNING *',
      [plan, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Plan updated', user: sanitize(result.rows[0]) });
  } catch (err) {
    console.error('Update Plan Error:', err);
    return res.status(500).json({ message: 'Server error updating plan' });
  }
};

// ── Change Password ───────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash || '');
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change Password Error:', err);
    return res.status(500).json({ message: 'Server error changing password' });
  }
};

// ── Firebase Helpers ──────────────────────────────────────────────────────────
async function getFirebasePublicKeys() {
  const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!res.ok) throw new Error('Failed to fetch Firebase public keys');
  return res.json();
}

async function verifyFirebaseIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) throw new Error('Malformed Firebase ID token');
  const keys = await getFirebasePublicKeys();
  const publicKey = keys[decoded.header.kid];
  if (!publicKey) throw new Error('Unknown Firebase signing key');
  return jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  });
}

// ── Google Auth ───────────────────────────────────────────────────────────────
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required' });

    let firebasePayload;
    try {
      firebasePayload = await verifyFirebaseIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired Google token.' });
    }

    const { uid: googleId, email, name, picture } = firebasePayload;
    if (!email) return res.status(400).json({ message: 'Google account must have an email' });

    let user;
    try {
      const existing = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (existing.rows.length === 0) {
        // New user — auto-register
        const result = await query(`
          INSERT INTO users (name, email, google_id, avatar, xp, streak, badges, plan, auth_provider, last_active)
          VALUES ($1, $2, $3, $4, 100, 1, '{"Novice Prep"}', 'free', 'google', NOW())
          RETURNING *
        `, [name || email.split('@')[0], email, googleId, picture || '']);
        user = result.rows[0];
        console.log(`✅ New Google user registered: ${email}`);
      } else {
        // Returning user — update streak & profile
        const prev = existing.rows[0];
        const timeZone = req.headers['x-timezone'] || 'UTC';
        const updatedUser = await updateUserStreak(prev.id, timeZone);

        const result = await query(
          'UPDATE users SET google_id = $1, avatar = COALESCE($2, avatar) WHERE id = $3 RETURNING *',
          [googleId, picture || null, prev.id]
        );
        user = result.rows[0];
        if (user && updatedUser) {
          user.streak = updatedUser.streak;
          user.last_active = updatedUser.last_active;
        }
        console.log(`✅ Returning Google user: ${email}`);
      }
    } catch (dbErr) {
      if (IS_DEMO_AUTH) {
        requireDemoMode('auth.googleAuth');
        const crypto = require('crypto');
        user = {
          id: crypto.randomUUID(),
          name: name || email.split('@')[0],
          email: email,
          google_id: googleId,
          avatar: picture || '',
          xp: 1200,
          streak: 3,
          badges: ["Novice Prep", "Interview Scholar", "Placement Ready"],
          plan: "pro", // Default to pro to bypass gated sections
          auth_provider: "google",
          last_active: new Date().toISOString()
        };
      } else {
        console.error('[GoogleAuth] Database error:', dbErr);
        return res.status(503).json({ message: 'Service temporarily unavailable' });
      }
    }

    const token = await issueTokens(res, user);
    return res.status(200).json({ message: 'Google authentication successful', token, user: sanitize(user) });
  } catch (err) {
    console.error('Google Auth Error:', err);
    return res.status(500).json({ message: 'Server error during Google authentication' });
  }
};

// ── Legacy Chat Assistant (redirected to TRESK) ───────────────────────────────
exports.chatAssistant = async (req, res) => {
  return res.status(301).json({
    message: 'This endpoint has moved to /api/tresk/chat',
    redirectTo: '/api/tresk/chat'
  });
};

// ── Forgot Password ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  // Always return 200 to prevent email enumeration attacks
  try {
    const { email } = req.body;
    if (!email) return res.status(200).json({ message: 'If this email exists, a reset link has been sent.' });

    const result = await query('SELECT id, name, email, auth_provider FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || user.auth_provider !== 'local') {
      // Return 200 anyway to prevent enumeration
      return res.status(200).json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const { token, expiresAt } = emailService.generateToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [tokenHash, expiresAt.toISOString(), user.id]
    );

    // Fire-and-forget email send (don't await to avoid leaking timing)
    emailService.sendPasswordResetEmail(user.email, user.name, token).catch(err =>
      console.error('[ForgotPassword] Email send failed:', err.message)
    );

    return res.status(200).json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[ForgotPassword] Error:', err.message);
    return res.status(200).json({ message: 'If this email exists, a reset link has been sent.' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [tokenHash]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [password_hash, user.id]
    );

    // ✅ Revoke ALL refresh sessions — password was compromised, invalidate everything
    await revokeAllSessions(user.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });

    return res.status(200).json({ message: 'Password reset successfully. Please log in again.' });
  } catch (err) {
    console.error('[ResetPassword] Error:', err.message);
    return res.status(500).json({ message: 'Server error resetting password' });
  }
};

// ── Verify Email ──────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query(
      'SELECT id FROM users WHERE email_verify_token = $1 AND email_verify_expiry > NOW()',
      [tokenHash]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    await query(
      'UPDATE users SET email_verified = TRUE, email_verify_token = NULL, email_verify_expiry = NULL WHERE id = $1',
      [user.id]
    );

    return res.status(200).json({ message: 'Email verified successfully!' });
  } catch (err) {
    console.error('[VerifyEmail] Error:', err.message);
    return res.status(500).json({ message: 'Server error verifying email' });
  }
};

// ── Resend Verification Email ─────────────────────────────────────────────────
exports.resendVerification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query('SELECT id, name, email, email_verified FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.email_verified) return res.status(400).json({ message: 'Email already verified' });

    const { token, expiresAt } = emailService.generateToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await query(
      'UPDATE users SET email_verify_token = $1, email_verify_expiry = $2 WHERE id = $3',
      [tokenHash, expiresAt.toISOString(), user.id]
    );

    emailService.sendVerificationEmail(user.email, user.name, token).catch(err =>
      console.error('[ResendVerification] Email send failed:', err.message)
    );

    return res.status(200).json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('[ResendVerification] Error:', err.message);
    return res.status(500).json({ message: 'Server error resending verification' });
  }
};

// ── Delete Account (GDPR) ─────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    // For local auth, verify password before deletion
    if (user.auth_provider === 'local') {
      if (!password) return res.status(400).json({ message: 'Password is required to delete account' });
      const isMatch = await bcrypt.compare(password, user.password_hash || '');
      if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });
    }

    // Cascade delete (FK ON DELETE CASCADE handles child records)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    // Clear refresh cookie
    await revokeAllSessions(userId);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });

    return res.status(200).json({ message: 'Account permanently deleted. We\'re sorry to see you go.' });
  } catch (err) {
    console.error('[DeleteAccount] Error:', err.message);
    return res.status(500).json({ message: 'Server error deleting account' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const hashed = crypto.createHash('sha256').update(raw).digest('hex');

    // Look up session in DB
    const result = await query(
      `SELECT rs.*, u.id as uid, u.role, u.plan, u.plan_expires_at
       FROM refresh_sessions rs
       JOIN users u ON u.id = rs.user_id
       WHERE rs.token_hash = $1 AND rs.expires_at > NOW()`,
      [hashed]
    );

    const session = result.rows[0];
    if (!session) {
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      return res.status(401).json({ message: 'Refresh token invalid or expired. Please log in again.' });
    }

    // Rotate: delete old session, issue new pair
    await query('DELETE FROM refresh_sessions WHERE token_hash = $1', [hashed]);

    const user = { id: session.uid, role: session.role };
    const newAccessToken = await issueTokens(res, user);

    return res.status(200).json({ token: newAccessToken });
  } catch (err) {
    console.error('[RefreshToken] Error:', err.message);
    return res.status(500).json({ message: 'Server error refreshing token' });
  }
};

// ── Logout ─────────────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) {
      const hashed = crypto.createHash('sha256').update(raw).digest('hex');
      // Delete only this session (not all — user may be on multiple devices)
      await query('DELETE FROM refresh_sessions WHERE token_hash = $1', [hashed]).catch(() => {});
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    // Clear cookie even if DB fails
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
  }
};
