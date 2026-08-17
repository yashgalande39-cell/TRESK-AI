/**
 * TRESK AI — Gamification & Learning Controller (PostgreSQL)
 * =====================================================================
 * Handles gamification features including Leaderboard, Daily Challenges,
 * and Aptitude tests.
 */

const fs = require('fs');
const path = require('path');
const { query } = require('../../config/pgDb');

// ── Structured Logger proxy ────────────────────────────────────────────────────────
const log = {
  info:  (...a) => (global.logger ? global.logger.info(...a)  : console.log('[INFO]',  ...a)),
  warn:  (...a) => (global.logger ? global.logger.warn(...a)  : console.warn('[WARN]',  ...a)),
  error: (...a) => (global.logger ? global.logger.error(...a) : console.error('[ERROR]', ...a)),
  debug: (...a) => (global.logger ? global.logger.debug?.(...a) : null),
};

const APTITUDE_PATH = path.join(__dirname, '../../../data/aptitude_questions.json');
let fileAptitudePool = [];

function getFileAptitudePool() {
  if (fileAptitudePool.length > 0) return fileAptitudePool;
  try {
    const candidates = [
      APTITUDE_PATH,
      path.join(__dirname, '../../data/aptitude_questions.json'),
      path.join(process.cwd(), 'data/aptitude_questions.json'),
      path.join(process.cwd(), 'backend/data/aptitude_questions.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        fileAptitudePool = JSON.parse(fs.readFileSync(p, 'utf-8'));
        log.info(`[GamificationController] Loaded ${fileAptitudePool.length} aptitude questions from ${p}`);
        break;
      }
    }
  } catch (err) {
    log.error({ err }, '[GamificationController] Error loading aptitude questions from file');
  }
  return fileAptitudePool;
}

getFileAptitudePool();


/**
 * Get daily challenges.
 */
exports.getChallenges = async (req, res) => {
  try {
    // Check daily_challenges table first
    let challenges = [];
    try {
      const cResult = await query(
        "SELECT id, problem_id, problem_title, difficulty, xp_reward, tags FROM daily_challenges WHERE active = true LIMIT 5"
      );
      challenges = cResult.rows.map(row => ({
        id: row.id,
        problemId: row.problem_id,
        title: row.problem_title,
        difficulty: row.difficulty,
        xp: row.xp_reward,
        tags: row.tags || []
      }));
    } catch (dbErr) {
      log.warn({ err: dbErr }, 'DB query for daily challenges failed, falling back to static challenges');
    }

    if (challenges.length === 0) {
      // Fallback
      challenges = [
        { id: "c_daily_1", problemId: "q_code_dsa_1", title: "Reverse a String", difficulty: "easy", xp: 150, tags: ["Strings", "Algorithms"] },
        { id: "c_daily_2", problemId: "q_code_dsa_2", title: "Is Palindrome Check", difficulty: "easy", xp: 150, tags: ["Strings"] }
      ];
    }

    return res.status(200).json({ challenges });
  } catch (err) {
    log.error({ err }, 'Challenges Error');
    return res.status(500).json({ message: "Failed to load daily challenges" });
  }
};


/**
 * Complete a daily challenge and award user XP.
 */
exports.completeChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user.userId;

    let xpReward = 150;
    let updatedXP = 1350; // mock default xp plus reward

    let dbOffline = false;
    try {
      // Determine XP award amount
      try {
        const cResult = await query("SELECT id, xp_reward FROM daily_challenges WHERE id = $1", [challengeId]);
        if (cResult.rows.length > 0) {
          xpReward = cResult.rows[0].xp_reward;
          
          // Log completion
          await query(
            "INSERT INTO daily_challenge_completions (challenge_id, user_id, completed_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING",
            [challengeId, userId]
          );
        }
      } catch (dbErr) {
        log.warn({ err: dbErr }, 'DB query/logging for daily challenges failed');
      }

      const updateResult = await query("UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp", [xpReward, userId]);
      if (updateResult.rows.length > 0) {
        updatedXP = updateResult.rows[0].xp;
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } catch (err) {
      dbOffline = true;
      log.warn({ err }, 'Database offline during completeChallenge');
    }

    const { IS_DEMO_AUTH, requireDemoMode } = require('../../config/env');
    if (dbOffline) {
      if (!IS_DEMO_AUTH) {
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
      requireDemoMode('gamification.completeChallenge');
    }

    return res.status(200).json({
      message: `Challenge completed! +${xpReward} XP awarded. (offline mode)`,
      xp: updatedXP
    });
  } catch (err) {
    log.error({ err }, 'Complete Challenge Error');
    return res.status(500).json({ message: "Failed to complete challenge" });
  }
};


/**
 * Fetch aptitude questions.
 */
exports.getAptitudeQuestions = async (req, res) => {
  try {
    const setNum = parseInt(req.query.set, 10);
    const difficulty = req.query.difficulty || 'All';
    const section = req.query.section || 'All';
    const limit = parseInt(req.query.limit, 10) || 10;

    let pool = [];
    let dbSuccess = false;

    // Check DB first for aptitude questions if seeded under type 'Aptitude'
    try {
      const qResult = await query(`
        SELECT id, question, templates, description, difficulty, role, test_cases 
        FROM questions 
        WHERE type = 'Aptitude' 
          AND is_active = true
          AND ($1 = 'All' OR LOWER(difficulty) = LOWER($1))
          AND ($2 = 'All' OR LOWER(role) = LOWER($2))
      `, [difficulty, section]);
      
      if (qResult.rows.length > 0) {
        pool = qResult.rows.map((row, idx) => {
          let opts = [];
          try {
            opts = typeof row.templates === 'string' ? JSON.parse(row.templates) : (row.templates || []);
          } catch (pe) {
            opts = row.templates || [];
          }
          
          let tc = {};
          try {
            tc = typeof row.test_cases === 'string' ? JSON.parse(row.test_cases) : (row.test_cases || {});
          } catch (pe) {
            tc = row.test_cases || {};
          }
          
          return {
            id: row.id || `apt_${idx}`,
            question: row.question,
            options: opts,
            correctIndex: tc.correctIndex !== undefined ? tc.correctIndex : 0,
            explanation: row.description,
            difficulty: row.difficulty,
            section: row.role || 'General',
            set: tc.set !== undefined ? tc.set : 1
          };
        });
        dbSuccess = true;
      }
    } catch (e) {
      log.warn({ err: e }, 'DB query for aptitude failed');
    }

    if (!dbSuccess || pool.length === 0) {
      pool = getFileAptitudePool();
      if (difficulty && difficulty !== 'All') {
        pool = pool.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
      }
      if (section && section !== 'All') {
        pool = pool.filter(q => q.section.toLowerCase() === section.toLowerCase());
      }
    }

    if (!isNaN(setNum)) {
      pool = pool.filter(q => q.set === setNum);
    }

    pool = [...pool].sort(() => 0.5 - Math.random());
    const subset = pool.slice(0, limit);

    return res.status(200).json({
      questions: subset,
      totalCount: pool.length
    });
  } catch (err) {
    log.error({ err }, 'Aptitude Fetch Error');
    return res.status(500).json({ message: "Failed to load aptitude test" });
  }
};

