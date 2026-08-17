const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbFilePath = path.join(__dirname, '..', '..', 'data', 'local_db.json');

const initDb = () => {
  if (!fs.existsSync(dbFilePath)) {
    const initialData = {
      users: [],
      resumes: [],
      interview_sessions: [],
      coding_submissions: [],
      refresh_sessions: []
    };
    fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
};

const readDb = () => {
  initDb();
  try {
    return JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
  } catch (err) {
    console.error('[localDb] Error reading JSON DB:', err.message);
    return {
      users: [],
      resumes: [],
      interview_sessions: [],
      coding_submissions: [],
      refresh_sessions: []
    };
  }
};

const writeDb = (data) => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[localDb] Error writing to JSON DB:', err.message);
  }
};

// Helper to parse INSERT statements
const parseInsert = (sql, params) => {
  const sqlNormalized = sql.toLowerCase();

  if (sqlNormalized.includes('insert into users')) {
    return {
      table: 'users',
      row: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name: params[0],
        email: params[1],
        password_hash: params[2],
        college_name: params[3],
        branch: params[4],
        graduation_year: params[5],
        xp: 100,
        streak: 1,
        badges: ["Novice Prep"],
        plan: "free",
        role: "user",
        auth_provider: "local",
        last_active: new Date().toISOString()
      }
    };
  }

  if (sqlNormalized.includes('insert into interview_sessions')) {
    return {
      table: 'interview_sessions',
      row: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: params[0],
        company: params[1] || 'Common',
        role: params[2],
        type: params[3],
        status: 'ongoing',
        started_at: new Date().toISOString(),
        score_card: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
        transcript: [],
        score_overall: 0
      }
    };
  }

  if (sqlNormalized.includes('insert into resumes')) {
    return {
      table: 'resumes',
      row: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: params[0],
        file_name: params[1],
        file_url: params[2],
        raw_text: params[3],
        target_role: params[4],
        ats_score: params[5],
        ats_analysis: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6],
        keywords: params[7] || []
      }
    };
  }

  if (sqlNormalized.includes('insert into coding_submissions')) {
    return {
      table: 'coding_submissions',
      row: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        user_id: params[0],
        problem_id: params[1],
        problem_title: params[2],
        language: params[3],
        code: params[4],
        status: params[5],
        test_cases_total: params[6],
        test_cases_passed: params[7],
        xp_awarded: params[8]
      }
    };
  }

  if (sqlNormalized.includes('insert into refresh_sessions')) {
    return {
      table: 'refresh_sessions',
      row: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: params[0],
        token_hash: params[1],
        expires_at: params[2]
      }
    };
  }

  return null;
};


const query = async (text, params = []) => {
  const db = readDb();
  const sql = text.trim().replace(/\s+/g, ' ');

  // === SELECT queries ===

  // SELECT * FROM users WHERE email = $1
  if (sql.match(/SELECT\s+\*\s+FROM\s+users\s+WHERE\s+email\s*=\s*\$1/i)) {
    const email = params[0];
    const rows = db.users.filter(u => u.email === email);
    return { rows };
  }

  // SELECT ... FROM users WHERE id = $1 (generic regex)
  const selectUserMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+users\s+WHERE\s+id\s*=\s*\$1/i);
  if (selectUserMatch && !sql.toLowerCase().includes('count(')) {
    const fieldsStr = selectUserMatch[1].trim();
    const id = params[0];
    const user = db.users.find(u => u.id === id);
    if (!user) return { rows: [] };

    if (fieldsStr === '*') {
      return { rows: [user] };
    }

    const fields = fieldsStr.split(',').map(f => {
      return f.trim().replace(/"/g, '').split(/\s+/)[0];
    });

    const row = {};
    fields.forEach(field => {
      row[field] = user[field] !== undefined ? user[field] : null;
    });
    return { rows: [row] };
  }

  // SELECT COUNT(*) FROM users
  if (sql.match(/SELECT\s+COUNT\(\*\)\s+FROM\s+users/i)) {
    return { rows: [{ count: String(db.users.length) }] };
  }

  // SELECT COUNT(*) + 1 as rank FROM users WHERE xp > (SELECT xp FROM users WHERE id = $1)
  if (sql.match(/SELECT\s+COUNT\(\*\)\s*\+\s*1\s+as\s+rank\s+FROM\s+users\s+WHERE\s+xp\s*>/i)) {
    const userId = params[0];
    const user = db.users.find(u => u.id === userId);
    const userXp = user ? user.xp : 0;
    const rank = db.users.filter(u => u.xp > userXp).length + 1;
    return { rows: [{ rank: String(rank) }] };
  }

  // SELECT id, name, xp, streak, badges, avatar FROM users ORDER BY xp DESC LIMIT X
  if (sql.match(/SELECT\s+id,\s*name,\s*xp,\s*streak,\s*badges,\s*avatar\s+FROM\s+users\s+ORDER\s+BY\s+xp\s+DESC/i)) {
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 10;
    const rows = db.users
      .map(u => ({ id: u.id, name: u.name, xp: u.xp, streak: u.streak, badges: u.badges, avatar: u.avatar }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
    return { rows };
  }

  // SELECT id, name, xp, streak, badges, avatar FROM users WHERE id = ANY($1) ORDER BY xp DESC LIMIT 10
  if (sql.match(/SELECT\s+id,\s*name,\s*xp,\s*streak,\s*badges,\s*avatar\s+FROM\s+users\s+WHERE\s+id\s*=\s*ANY\(\$1\)/i)) {
    const friendIds = params[0] || [];
    const rows = db.users
      .filter(u => friendIds.includes(u.id))
      .map(u => ({ id: u.id, name: u.name, xp: u.xp, streak: u.streak, badges: u.badges, avatar: u.avatar }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);
    return { rows };
  }

  // SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC
  if (sql.match(/SELECT\s+\*\s+FROM\s+resumes\s+WHERE\s+user_id\s*=\s*\$1/i)) {
    const userId = params[0];
    const rows = db.resumes
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { rows };
  }

  // SELECT * FROM resumes WHERE id = $1 AND user_id = $2
  if (sql.match(/SELECT\s+\*\s+FROM\s+resumes\s+WHERE\s+id\s*=\s*\$1\s+AND\s+user_id\s*=\s*\$2/i)) {
    const id = params[0];
    const userId = params[1];
    const rows = db.resumes.filter(r => r.id === id && r.user_id === userId);
    return { rows };
  }

  // SELECT ats_score FROM resumes WHERE user_id = $1 AND ats_score IS NOT NULL ORDER BY created_at DESC LIMIT 1
  if (sql.match(/SELECT\s+ats_score\s+FROM\s+resumes\s+WHERE\s+user_id\s*=\s*\$1\s+AND\s+ats_score\s+IS\s+NOT\s+NULL/i)) {
    const userId = params[0];
    const userResumes = db.resumes
      .filter(r => r.user_id === userId && r.ats_score !== null && r.ats_score !== undefined)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const rows = userResumes.length > 0 ? [{ ats_score: userResumes[0].ats_score }] : [];
    return { rows };
  }

  // SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY started_at DESC
  if (sql.match(/SELECT\s+\*\s+FROM\s+interview_sessions\s+WHERE\s+user_id\s*=\s*\$1/i)) {
    const userId = params[0];
    const rows = db.interview_sessions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    return { rows };
  }

  // SELECT * FROM interview_sessions WHERE id = $1
  if (sql.match(/SELECT\s+\*\s+FROM\s+interview_sessions\s+WHERE\s+id\s*=\s*\$1/i)) {
    const id = params[0];
    const rows = db.interview_sessions.filter(s => s.id === id);
    return { rows };
  }

  // SELECT COUNT(*) FROM interview_sessions WHERE user_id = $1 AND started_at >= NOW() - INTERVAL '30 days'
  if (sql.match(/SELECT\s+COUNT\(\*\)\s+FROM\s+interview_sessions\s+WHERE\s+user_id\s*=\s*\$1\s+AND\s+started_at\s*>=/i)) {
    const userId = params[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = db.interview_sessions.filter(s => s.user_id === userId && new Date(s.started_at) >= thirtyDaysAgo).length;
    return { rows: [{ count: String(count) }] };
  }

  // SELECT COUNT(*) FILTER (WHERE status = 'accepted') AS accepted, COUNT(*) AS total, AVG(...) FROM coding_submissions WHERE user_id = $1
  if (sql.match(/FROM\s+coding_submissions\s+WHERE\s+user_id\s*=\s*\$1/i)) {
    const userId = params[0];
    const userSubmissions = db.coding_submissions.filter(s => s.user_id === userId);
    const accepted = userSubmissions.filter(s => s.status === 'accepted');
    const total = userSubmissions.length;
    let avg_pass_rate = 0;
    if (accepted.length > 0) {
      const sumPassRate = accepted.reduce((sum, s) => {
        const passed = s.test_cases_passed || 0;
        const totalCases = s.test_cases_total || 1;
        return sum + (100.0 * passed / totalCases);
      }, 0);
      avg_pass_rate = sumPassRate / accepted.length;
    }
    return {
      rows: [{
        accepted: String(accepted.length),
        total: String(total),
        avg_pass_rate: String(avg_pass_rate)
      }]
    };
  }

  // SELECT COUNT(*) AS session_count, AVG(score_overall) AS avg_overall, ... FROM interview_sessions WHERE user_id = $1 AND status = 'completed'
  if (sql.match(/SELECT\s+COUNT\(\*\)\s+AS\s+session_count/i) && sql.includes('interview_sessions')) {
    const userId = params[0];
    const completedSessions = db.interview_sessions.filter(s => s.user_id === userId && s.status === 'completed');
    const count = completedSessions.length;

    let avg_overall = 0;
    let avg_technical = 0;
    let avg_problem_solving = 0;

    if (count > 0) {
      avg_overall = completedSessions.reduce((sum, s) => sum + (s.score_overall || s.scoreCard?.overallScore || 0), 0) / count;
      avg_technical = completedSessions.reduce((sum, s) => sum + (s.score_technical || s.scoreCard?.technicalScore || 0), 0) / count;
      avg_problem_solving = completedSessions.reduce((sum, s) => sum + (s.score_problem_solving || s.scoreCard?.completenessScore || 0), 0) / count;
    }

    return {
      rows: [{
        session_count: String(count),
        avg_overall: String(avg_overall),
        avg_technical: String(avg_technical),
        avg_problem_solving: String(avg_problem_solving)
      }]
    };
  }

  // SELECT AVG(score_communication) AS avg_comm, AVG(score_confidence) AS avg_conf FROM interview_sessions WHERE user_id = $1 AND status = 'completed'
  if (sql.match(/SELECT\s+AVG\(score_communication\)\s+AS\s+avg_comm/i) && sql.includes('interview_sessions')) {
    const userId = params[0];
    const completedSessions = db.interview_sessions.filter(s => s.user_id === userId && s.status === 'completed');
    const count = completedSessions.length;

    let avg_comm = 0;
    let avg_conf = 0;

    if (count > 0) {
      avg_comm = completedSessions.reduce((sum, s) => sum + (s.score_communication || s.scoreCard?.communicationScore || 0), 0) / count;
      avg_conf = completedSessions.reduce((sum, s) => sum + (s.score_confidence || s.scoreCard?.eyeContactScore || 0), 0) / count;
    }

    return {
      rows: [{
        avg_comm: String(avg_comm),
        avg_conf: String(avg_conf)
      }]
    };
  }

  // === INSERT queries ===
  if (sql.startsWith('INSERT ')) {
    const parsed = parseInsert(sql, params);
    if (parsed) {
      if (!db[parsed.table]) {
        db[parsed.table] = [];
      }

      // Check duplicate emails for users
      if (parsed.table === 'users') {
        const existing = db.users.find(u => u.email === parsed.row.email);
        if (existing) return { rows: [existing] };
      }

      db[parsed.table].push(parsed.row);

      writeDb(db);
      return { rows: [parsed.row] };
    }
  }

  // === UPDATE queries ===
  if (sql.startsWith('UPDATE ')) {
    const updateRegex = /UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i;
    const match = sql.match(updateRegex);
    if (match) {
      const table = match[1].toLowerCase();
      const assignmentsRaw = match[2];
      const conditionsRaw = match[3];

      // Extract target ID from WHERE id = $X (or other conditions like WHERE user_id = $X)
      const idMatch = conditionsRaw.match(/id\s*=\s*\$(\d+)/i);
      let targetId;
      if (idMatch) {
        targetId = params[parseInt(idMatch[1], 10) - 1];
      }

      const records = db[table] && db[table].filter(r => {
        if (targetId) return r.id === targetId;
        return true;
      });

      if (records && records.length > 0) {
        const assignments = assignmentsRaw.split(',').map(a => a.trim());

        records.forEach(record => {
          assignments.forEach(assign => {
            const parts = assign.split('=');
            if (parts.length < 2) return;
            const colRaw = parts[0].trim().replace(/"/g, '');
            const valRaw = parts.slice(1).join('=').trim().replace(/"/g, '');

            let val;
            let cleanValRaw = valRaw.replace(/::\w+$/, '');

            if (cleanValRaw.includes('+')) {
              const addParts = cleanValRaw.split('+').map(p => p.trim());
              const colName = addParts[0];
              const incrementParam = addParts[1].match(/\$(\d+)/);
              if (incrementParam) {
                const incrementVal = Number(params[parseInt(incrementParam[1], 10) - 1]);
                val = Number(record[colName] || 0) + incrementVal;
              }
            } else {
              const paramMatch = cleanValRaw.match(/\$(\d+)/);
              if (paramMatch) {
                val = params[parseInt(paramMatch[1], 10) - 1];
              } else if (cleanValRaw === 'NOW()' || cleanValRaw === 'CURRENT_TIMESTAMP') {
                val = new Date().toISOString();
              } else if (cleanValRaw.startsWith("'") && cleanValRaw.endsWith("'")) {
                val = cleanValRaw.slice(1, -1);
              } else if (cleanValRaw.toLowerCase() === 'true') {
                val = true;
              } else if (cleanValRaw.toLowerCase() === 'false') {
                val = false;
              } else if (cleanValRaw.toLowerCase() === 'null') {
                val = null;
              } else if (!isNaN(cleanValRaw)) {
                val = Number(cleanValRaw);
              } else {
                val = cleanValRaw;
              }
            }

            // Parse JSON objects or arrays
            if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{')) && !val.startsWith('{Novice')) {
              try {
                val = JSON.parse(val);
              } catch (e) {}
            }

            record[colRaw] = val;
          });
        });

        writeDb(db);
        return { rows: records };
      }
    }
  }

  // === DELETE queries ===
  if (sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+user_id\s*=\s*\$1/i)) {
    const table = sql.match(/DELETE\s+FROM\s+(\w+)/i)[1].toLowerCase();
    const userId = params[0];
    if (db[table]) {
      db[table] = db[table].filter(r => r.user_id !== userId);
      writeDb(db);
    }
    return { rows: [] };
  }

  return { rows: [] };
};

const withTransaction = async (callback) => {
  const client = {
    query: async (text, params) => {
      return query(text, params);
    }
  };
  return callback(client);
};

module.exports = { query, withTransaction };
