/**
 * TRESK AI — Interview Session Controller (PostgreSQL)
 * =====================================================================
 * Handles mock interview sessions lifecycle, adaptive questioning, and
 * final evaluations. Replaces mockDb with PostgreSQL.
 */

const { query, withTransaction } = require('../../config/pgDb');
const { generateInterviewQuestions, generateFollowUp } = require('../../services/ai/interviewAgent');
const { evaluateAnswer } = require('../../services/ai/scoringEngine');
const { generatePerformanceFeedback } = require('../../services/ai/feedbackEngine');
const { addEvaluationJob, getJobStatus: checkJobStatus } = require('../../queues/aiQueue');
const { cachedQuery, DEFAULT_TTLS } = require('../../services/cache/redisCache');

// Structured Logger reference (Pino via global.logger with console fallback)
const logger = {
  info:  (...args) => (global.logger ? global.logger.info(...args)  : console.log(...args)),
  warn:  (...args) => (global.logger ? global.logger.warn(...args)  : console.warn(...args)),
  error: (...args) => (global.logger ? global.logger.error(...args) : console.error(...args)),
  debug: (...args) => (global.logger ? global.logger.debug(...args) : console.log(...args)),
};

// In-memory fallback for active sessions when PostgreSQL is offline
const offlineSessions = new Map();

// Rules-based questions synthesizer when AI APIs fail
const synthesizeResumeQuestions = (type, difficulty, role, company, resume) => {
  const questions = [];
  const name = resume.name || "Rahul Kumar";
  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  const projects = Array.isArray(resume.projects) ? resume.projects : [];
  const experience = Array.isArray(resume.experience) ? resume.experience : [];
  
  const skill1 = skills.length > 0 ? skills[0] : (role === "Web Developer" ? "React" : "Software Engineering");
  const skill2 = skills.length > 1 ? skills[1] : (role === "Web Developer" ? "CSS3/HTML5" : "System Design");
  const skill3 = skills.length > 2 ? skills[2] : (role === "Web Developer" ? "Node.js" : "Data Structures");
  
  const proj1 = projects.length > 0 ? projects[0] : { title: "AI Interview Platform", desc: "built real-time interaction" };
  const exp1 = experience.length > 0 ? experience[0] : { company: "ViteTech Corp", role: "Software Engineer Intern" };

  if (type === "HR") {
    questions.push(
      `Hello ${name}. Welcome to your virtual interview. Let's start by walking through your resume, specifically explaining your journey toward becoming a senior-level ${role}.`,
      experience.length > 0 ? 
        `I see that you did an internship at ${exp1.company} as a ${exp1.role || 'intern'}. What was the biggest behavioral or cultural challenge you faced there?` :
        `Tell me about a time when you had to adapt to a brand new environment or a fast-changing team project. What was your strategy?`,
      `You worked on the project "${proj1.title}". How did you manage your timeline, prioritize core features, and ensure the project succeeded?`,
      `If you are selected for this ${role} position at ${company && company !== "Common" ? company : "our company"}, how do you plan to leverage your background in ${skill1} and ${skill2} to make an immediate impact on our deliverables?`,
      `Where do you see your technical competencies growing in the next three years, and how does this role align with your personal goals?`
    );
  } else if (type === "Technical") {
    questions.push(
      `Since you listed ${skill1} in your skills, could you walk me through its core architectural concepts and how you have practically optimized it in a production scenario?`,
      `Let's discuss "${proj1.title}". What were the most critical database or state management bottlenecks you faced during its implementation, and how did you resolve them?`,
      `During your work at ${exp1.company || 'your previous work'} as a ${exp1.role || 'engineer'}, what was the most demanding feature or system optimization you owned?`,
      `How do you decide between building a relational SQL schema versus a NoSQL document store? What would be the scalability trade-offs?`,
      `If you had to scale your "${proj1.title}" system to handle 10,000 active concurrent connections, how would you design the horizontal clustering and message queuing system?`
    );
  } else if (type === "Behavioral") {
    questions.push(
      `Tell me about a time at ${experience.length > 0 ? exp1.company : 'your previous team'} when you had a strong disagreement with a peer or stakeholder regarding a technical choice. How did you resolve the conflict?`,
      `While engineering "${proj1.title}", did you ever encounter an unexpected technical roadblock or critical API failure? How did you pivot your strategy?`,
      `Describe a scenario where you received critical or direct feedback on your system design or code quality. How did you handle that feedback?`,
      `Did you ever have to work on a task under an extremely tight deadline where you had to compromise on technical debt to deliver on time? What was the outcome?`,
      `Walk me through the single most challenging milestone on your resume that you are proud of. What quantitative metrics did you achieve?`
    );
  } else {
    questions.push(
      `Hello ${name}, explain your philosophy on writing clean, scalable, and maintainable code in ${difficulty} level environments.`,
      `In ${role} workflows, how do you approach integration testing, automated CI/CD checks, and Git branching strategies?`,
      `Explain the differences between asynchronous execution and multi-threaded processing. When is each optimal?`,
      `How do you keep your skills in ${skill1} and ${skill2} up-to-date with the latest industry trends?`,
      `What are the most critical factors you look for during a technical code review of a teammate's pull request?`
    );
  }

  return questions;
};

// Generates questions using OpenRouter, Gemini fallback, or rule-based synthesizer
const generateAIQuestions = async (type, difficulty, role, company, language, resumeText, resumeObj) => {
  try {
    const questions = await generateInterviewQuestions(type, difficulty, role, company, language, resumeText);
    if (Array.isArray(questions) && questions.length >= 3) {
      logger.info({ count: questions.length, type, role }, `✅ OpenRouter generated ${questions.length} ${type} questions for ${role}`);
      return questions;
    }
  } catch (e) {
    logger.warn({ err: e.message }, 'OpenRouter question generation failed, trying Gemini fallback');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an elite senior technical interviewer. Generate exactly 5 ${difficulty} level ${type} interview questions for a ${role} position at ${company || 'a top tech company'}. Language: ${language || 'General'}. ${resumeText ? 'Resume: ' + resumeText : ''} Return STRICTLY a JSON array: ["q1","q2","q3","q4","q5"]`
            }]
          }]
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        const cleanedText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanedText);
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Gemini fallback also failed, using rule-based synthesizer');
    }
  }

  // Rule-based fallback
  if (resumeObj) {
    return synthesizeResumeQuestions(type, difficulty, role, company, resumeObj);
  }

  const questions = [];
  if (type === 'HR') {
    questions.push(
      `Tell me about yourself and what draws you to this ${role} position.`,
      `Why are you interested in working at ${company || 'a top-tier company'}?`,
      `How do you handle high-pressure environments and tight sprint deadlines?`,
      `Tell me about a time you had a communication conflict with a team member. How did you resolve it?`,
      `What are your long-term career aspirations, and how does this role help you achieve them?`
    );
  } else if (type === 'Technical') {
    questions.push(
      `What software design patterns do you consider most critical when building a scalable ${role} application?`,
      `Explain the difference between synchronous and asynchronous architectures.`,
      `How do you ensure data integrity and query performance for high-traffic workloads?`,
      `How do you handle API security, authorization scopes, and rate-limiting?`,
      `Walk me through your CI/CD pipeline and production deployment strategy.`
    );
  } else if (type === 'Behavioral') {
    questions.push(
      `Describe a technically complex challenge you faced. How did you implement the solution?`,
      `Tell me about a project that missed its deadline. What were the root causes?`,
      `Give an example of making a critical technical decision with limited information.`,
      `Describe a time you proposed a new framework or methodology to your team.`,
      `Walk me through acquiring a new technical skill to solve an urgent blocker.`
    );
  } else {
    // Check if questions are seeded in PG questions table
    try {
      const qResult = await query(
        "SELECT question FROM questions WHERE type = $1 AND difficulty = $2 AND is_active = true LIMIT 5",
        [type, difficulty]
      );
      if (qResult.rows.length > 0) {
        return qResult.rows.map(row => row.question);
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'DB query for fallback questions failed');
    }

    questions.push(
      `Explain your approach to resolving technical debt.`,
      `How do you optimize system performance under load?`,
      `What is your standard debugging process when diagnosing production exceptions?`,
      `Explain the differences between REST and GraphQL.`,
      `How do you maintain software quality throughout the software development life cycle?`
    );
  }
  return questions.slice(0, 5);
};

/**
 * Generate a new interview session.
 */
exports.generateSession = async (req, res) => {
  try {
    const { type, difficulty, role, company, language, resumeId } = req.body;
    const userId = req.user.userId;

    if (!type || !difficulty || !role) {
      return res.status(400).json({ message: "Type, difficulty and role are required fields" });
    }

    // Plan Enforcement — disabled (everything is free & unlocked)
    let userPlan = 'teams';

    // Retrieve resume if attached
    let resumeObj = null;
    let resumeText = "";
    if (resumeId) {
      try {
        const rResult = await query("SELECT * FROM resumes WHERE id = $1 AND user_id = $2", [resumeId, userId]);
        if (rResult.rows.length > 0) {
          const row = rResult.rows[0];
          let analysisData = {};
          try {
            analysisData = typeof row.ats_analysis === 'string' ? JSON.parse(row.ats_analysis) : row.ats_analysis;
          } catch (e) {
            analysisData = {};
          }
          resumeObj = {
            id: row.id,
            name: analysisData.name || "Candidate",
            role: row.target_role || role,
            skills: analysisData.skills || row.keywords || [],
            projects: analysisData.projects || [],
            experience: analysisData.experience || [],
            education: analysisData.education || [],
            text: row.raw_text || ""
          };
          
          resumeText = row.raw_text || "";
          if (!resumeText || resumeText.length < 60) {
            const skillsStr = (resumeObj.skills || []).join(', ');
            const projStr = (resumeObj.projects || []).map(p => `${p.title || 'Project'}: ${p.desc || p.tech || ''}`).join('; ');
            const expStr = (resumeObj.experience || []).map(e => `${e.company || 'Company'} (${e.role || 'Role'}): ${e.desc || ''}`).join('; ');
            const eduStr = (resumeObj.education || []).map(ed => `${ed.school || 'University'} - ${ed.degree || 'Degree'}`).join('; ');
            resumeText = `Candidate Name: ${resumeObj.name}\nTarget Role: ${resumeObj.role}\nSkills: ${skillsStr}\nProjects: ${projStr}\nWork Experience: ${expStr}\nEducation: ${eduStr}`;
          }
        }
      } catch (e) {
        logger.warn({ err: e.message }, "Database offline during resume retrieval, skipping resume context");
      }
    }


    logger.info({ difficulty, type, role, company: company || 'Common' }, `Generating a ${difficulty} ${type} session for role: ${role} at ${company || 'Common'}`);
    
    // Generate questions
    let questions = [];
    if (type.toLowerCase() === "coding") {
      // Fetch coding challenges
      try {
        const qResult = await query(
          "SELECT id, title, description, test_cases FROM questions WHERE type = 'Coding' AND difficulty = $1 LIMIT 2",
          [difficulty]
        );
        if (qResult.rows.length > 0) {
          questions = qResult.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            testCases: row.test_cases
          }));
        }
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, 'DB query for coding questions failed');
      }
      if (questions.length === 0) {
        // Fallback to json questions
        try {
          const dsaPath = [
            path.join(__dirname, '../../../data/dsa_questions.json'),
            path.join(__dirname, '../../data/dsa_questions.json'),
            path.join(process.cwd(), 'data/dsa_questions.json'),
            path.join(process.cwd(), 'backend/data/dsa_questions.json'),
          ].find(p => fs.existsSync(p));
          if (dsaPath) {
            const fileQuestions = JSON.parse(fs.readFileSync(dsaPath, 'utf-8'));
            const filtered = fileQuestions.filter(q => q.difficulty === difficulty);
            questions = filtered.slice(0, 2);
          }
        } catch (_) { /* ignore */ }
      }
    } else {
      const generated = await generateAIQuestions(type, difficulty, role, company, language, resumeText, resumeObj);
      questions = generated.map((q, idx) => ({ id: `sq_${idx + 1}`, text: q }));
    }

    // Save session to PostgreSQL
    const ongoingMetadata = {
      questions,
      currentQuestionIndex: 0,
      difficulty,
      language: language || "JavaScript",
      resumeId: resumeId || null
    };

    let session;
    try {
      const sResult = await query(`
        INSERT INTO interview_sessions (user_id, company, role, type, status, started_at, score_card, transcript, score_overall)
        VALUES ($1, $2, $3, $4, 'ongoing', NOW(), $5, '[]'::jsonb, 0)
        RETURNING *
      `, [userId, company || "Common", role, type.toLowerCase(), JSON.stringify(ongoingMetadata)]);

      const dbSession = sResult.rows[0];

      session = {
        id: dbSession.id,
        userId: dbSession.user_id,
        type: dbSession.type.toUpperCase(),
        difficulty,
        role: dbSession.role,
        company: dbSession.company,
        language: language || "JavaScript",
        questions,
        currentQuestionIndex: 0,
        transcript: [],
        scoreCard: null
      };
    } catch (dbErr) {
      const { IS_DEMO_AUTH, requireDemoMode } = require('../../config/env');
      if (IS_DEMO_AUTH) {
        requireDemoMode('interview.generateSession.dbFallback');
        const crypto = require('crypto');
        session = {
          id: crypto.randomUUID(),
          userId: userId,
          type: type.toUpperCase(),
          difficulty,
          role,
          company: company || "Common",
          language: language || "JavaScript",
          questions,
          currentQuestionIndex: 0,
          transcript: [],
          scoreCard: null
        };
        offlineSessions.set(session.id, session);
      } else {
        logger.error({ err: dbErr }, '[generateSession] Database error');
        return res.status(503).json({ message: "Service temporarily unavailable" });
      }
    }

    return res.status(200).json({
      message: "Session generated successfully",
      session
    });
  } catch (err) {
    const { IS_DEMO_AUTH, requireDemoMode } = require('../../config/env');
    if (IS_DEMO_AUTH) {
      requireDemoMode('interview.generateSession.overallFallback');
      const crypto = require('crypto');
      const mockSession = {
        id: crypto.randomUUID(),
        userId: req.user?.userId || "mock_user",
        type: (req.body.type || "HR").toUpperCase(),
        difficulty: req.body.difficulty || "Medium",
        role: req.body.role || "Software Engineer",
        company: req.body.company || "Common",
        language: req.body.language || "JavaScript",
        questions: [
          { id: "sq_1", text: "Explain your journey toward becoming a senior-level Software Engineer." },
          { id: "sq_2", text: "How do you decide between building a relational SQL schema versus a NoSQL document store?" },
          { id: "sq_3", text: "Walk me through the single most challenging milestone on your resume that you are proud of." }
        ],
        currentQuestionIndex: 0,
        transcript: [],
        scoreCard: null
      };
      offlineSessions.set(mockSession.id, mockSession);
      return res.status(200).json({
        message: "Session generated successfully (offline mode)",
        session: mockSession
      });
    }
    logger.error({ err }, '[generateSession] Overall error');
    return res.status(503).json({ message: "Service temporarily unavailable" });
  }
};

/**
 * Submit candidate answer, evaluate using metrics and AI, adjust difficulty.
 */
exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId, answerText, speechDurationSeconds, tabBlurCount, webcamStats } = req.body;

    let dbSession;
    let ongoingMetadata = {};
    let usingFallback = false;
    let isOfflineSession = false;

    if (offlineSessions.has(sessionId)) {
      dbSession = offlineSessions.get(sessionId);
      isOfflineSession = true;
      ongoingMetadata = {
        questions: dbSession.questions,
        currentQuestionIndex: dbSession.currentQuestionIndex,
        difficulty: dbSession.difficulty,
        language: dbSession.language,
        resumeId: dbSession.resumeId
      };
    } else {
      try {
        const sResult = await query("SELECT * FROM interview_sessions WHERE id = $1", [sessionId]);
        if (sResult.rows.length === 0) {
          usingFallback = true;
        } else {
          dbSession = sResult.rows[0];
          try {
            ongoingMetadata = typeof dbSession.score_card === 'string' ? JSON.parse(dbSession.score_card) : dbSession.score_card;
          } catch (e) {
            ongoingMetadata = {};
          }
        }
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, "Database offline during submitAnswer query, using offline fallback mode");
        usingFallback = true;
      }
    }

    if (usingFallback) {
      // Offline fallback processing
      const nextQNum = Math.floor(Math.random() * 100) + 3;
      const isCompleted = Math.random() > 0.6;
      return res.status(200).json({
        message: 'Answer submitted successfully (offline mode)',
        isCompleted,
        analysis: {
          score: 80,
          technicalAccuracy: 80,
          fluencyScore: 85,
          wpm: 120,
          fillerCount: 1,
          stressScore: 25,
          eyeContactScore: 92,
          emotion: 'Confident',
          aiStrengths: ['Expressed thoughts clearly', 'Direct answers'],
          aiImprovements: ['Elaborate slightly more on structural tradeoffs'],
          idealAnswerHints: 'Start with high-level architecture before diving into specific details.',
          keyMissingPoints: ['Mentioning horizontal scaling']
        },
        nextQuestion: isCompleted ? null : { id: `sq_${nextQNum}`, text: "What is your standard debugging process when diagnosing production exceptions?" }
      });
    }

    const currentIdx = ongoingMetadata.currentQuestionIndex || 0;
    const questions = ongoingMetadata.questions || [];
    const currentQ = questions[currentIdx];
    
    if (!currentQ) {
      return res.status(400).json({ message: "No active question found at index" });
    }

    const qText = currentQ.text || currentQ.question || currentQ.description || "Question details missing";

    // --- Communication Fluency & Speaking Pace Analysis ---
    const wordCount = answerText.trim().split(/\s+/).length;
    const durationMin = (speechDurationSeconds || 30) / 60;
    const wpm = Math.round(wordCount / durationMin) || 110;

    // Detect Filler Words
    const fillers = ["um", "uh", "like", "so", "basically", "you know", "actually"];
    let fillerCount = 0;
    const lowerText = answerText.toLowerCase();
    fillers.forEach(word => {
      const matches = lowerText.match(new RegExp(`\\b${word}\\b`, 'g'));
      if (matches) fillerCount += matches.length;
    });

    const isRubbish = (text) => {
      if (!text) return true;
      const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length === 0) return true;
      if (words.length < 4) {
        const commonGreetings = ['hi', 'hii', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'skip', 'nothing', 'dont know', 'i dont know', 'test', 'demo', 'asdf', 'yo'];
        const sentence = words.join(' ');
        if (words.length === 1 || commonGreetings.includes(sentence) || words.every(w => commonGreetings.includes(w))) {
          return true;
        }
      }
      return false;
    };

    // Evaluate response quality based on length
    let technicalAccuracy = 60;
    if (wordCount > 40) technicalAccuracy = 85;
    if (wordCount > 70) technicalAccuracy = 95;
    if (wordCount < 15) technicalAccuracy = 45;

    // Adjust score based on filler word density
    const fillerDensity = fillerCount / wordCount;
    let fluencyScore = 100 - Math.round(fillerDensity * 150);
    fluencyScore = Math.max(40, Math.min(100, fluencyScore));

    if (isRubbish(answerText)) {
      technicalAccuracy = 0;
      fluencyScore = 10;
    }

    // Dynamic Stress Metric
    let speechStress = Math.min(100, Math.max(10, Math.round((fillerCount * 12) + (wpm > 150 || wpm < 85 ? 30 : 10))));
    let stressScore = (webcamStats && typeof webcamStats.stressScore === 'number')
      ? Math.round((speechStress + webcamStats.stressScore) / 2)
      : speechStress;

    const answerScore = Math.round((technicalAccuracy * 0.6) + (fluencyScore * 0.4));

    // === AI-Powered Answer Evaluation (OpenRouter) ===
    let aiEvaluation = null;
    try {
      aiEvaluation = await evaluateAnswer(
        qText,
        answerText,
        dbSession.type,
        dbSession.role || 'Software Engineer'
      );
      logger.info({ score: aiEvaluation.overallScore }, `✅ AI evaluated answer with score: ${aiEvaluation.overallScore}`);
    } catch (aiErr) {
      logger.warn({ err: aiErr.message }, 'AI answer evaluation unavailable, using metric-based scoring');
    }

    const finalTechnicalAccuracy = aiEvaluation ? aiEvaluation.technicalScore : technicalAccuracy;
    const finalFluencyScore = aiEvaluation ? aiEvaluation.communicationScore : fluencyScore;
    const finalAnswerScore = aiEvaluation
      ? Math.round((aiEvaluation.overallScore * 0.7) + (answerScore * 0.3))
      : answerScore;

    // Record turn to transcript
    const turnData = {
      question: qText,
      answer: answerText,
      analysis: {
        score: finalAnswerScore,
        technicalAccuracy: finalTechnicalAccuracy,
        fluencyScore: finalFluencyScore,
        completenessScore: aiEvaluation ? aiEvaluation.completenessScore : technicalAccuracy,
        wpm,
        fillerCount,
        stressScore,
        eyeContactScore: webcamStats?.eyeContactScore || 90,
        emotion: webcamStats?.emotion || 'Confident',
        aiStrengths: aiEvaluation?.strengths || [],
        aiImprovements: aiEvaluation?.improvements || [],
        idealAnswerHints: aiEvaluation?.idealAnswerHints || null,
        keyMissingPoints: aiEvaluation?.keyMissingPoints || []
      }
    };

    // Parse existing transcript
    let transcriptList = [];
    try {
      transcriptList = typeof dbSession.transcript === 'string' ? JSON.parse(dbSession.transcript) : dbSession.transcript;
      if (!Array.isArray(transcriptList)) transcriptList = [];
    } catch (e) {
      transcriptList = [];
    }

    const newTranscript = [...transcriptList, turnData];
    const nextIdx = currentIdx + 1;
    const isCompleted = nextIdx >= questions.length;

    // Adaptive Questioning
    let nextDifficulty = ongoingMetadata.difficulty || 'Medium';
    if (finalAnswerScore >= 85 && nextDifficulty === 'Easy') nextDifficulty = 'Medium';
    if (finalAnswerScore >= 88 && nextDifficulty === 'Medium') nextDifficulty = 'Hard';
    if (finalAnswerScore < 50 && nextDifficulty === 'Hard') nextDifficulty = 'Medium';
    if (finalAnswerScore < 45 && nextDifficulty === 'Medium') nextDifficulty = 'Easy';

    // Optional follow-up
    let aiFollowUp = null;
    if (!isCompleted && finalAnswerScore > 0) {
      try {
        aiFollowUp = await generateFollowUp(
          qText, answerText, finalAnswerScore, dbSession.role || 'Software Engineer'
        );
      } catch (_) { /* optional */ }
    }

    let updatedQuestions = [...questions];
    if (!isCompleted && nextDifficulty !== ongoingMetadata.difficulty && !ongoingMetadata.resumeId) {
      logger.info({ nextDifficulty }, `⚡ Adaptive AI Triggered: Changing difficulty to: ${nextDifficulty}`);
      try {
        const qResult = await query(
          "SELECT question FROM questions WHERE type = $1 AND difficulty = $2 AND is_active = true LIMIT 5",
          [dbSession.type, nextDifficulty]
        );
        if (qResult.rows.length > 0) {
          const selectedRep = qResult.rows[Math.floor(Math.random() * qResult.rows.length)].question;
          updatedQuestions[nextIdx] = { id: `adaptive_${nextIdx}`, text: selectedRep };
        }
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, 'Adaptive query failed');
      }
    }


    // Save back to ongoing metadata
    const updatedMetadata = {
      ...ongoingMetadata,
      currentQuestionIndex: nextIdx,
      difficulty: nextDifficulty,
      questions: updatedQuestions
    };

    const statusLabel = isCompleted ? "completed" : "ongoing";

    if (isOfflineSession) {
      dbSession.transcript = newTranscript;
      dbSession.questions = updatedQuestions;
      dbSession.currentQuestionIndex = nextIdx;
      dbSession.difficulty = nextDifficulty;
      dbSession.status = statusLabel;
      offlineSessions.set(sessionId, dbSession);
    } else {
      try {
        await query(`
          UPDATE interview_sessions 
          SET transcript = $1, 
              score_card = $2, 
              status = $3
          WHERE id = $4
        `, [
          JSON.stringify(newTranscript),
          JSON.stringify(updatedMetadata),
          statusLabel,
          sessionId
        ]);
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, "Database offline during submitAnswer update");
      }
    }

    return res.status(200).json({
      message: 'Answer submitted successfully',
      isCompleted,
      analysis: turnData.analysis,
      nextQuestion: isCompleted ? null : updatedQuestions[nextIdx]
    });
  } catch (err) {
    logger.error({ err }, "Answer Submission Error");
    return res.status(500).json({ message: "Failed to evaluate answer" });
  }
};

/**
 * Finish the mock session, run AI feedback evaluation, save scorecard, award XP.
 */
exports.finishSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    let dbSession;
    let usingFallback = false;
    let isOfflineSession = false;

    if (offlineSessions.has(sessionId)) {
      dbSession = offlineSessions.get(sessionId);
      isOfflineSession = true;
    } else {
      try {
        const sResult = await query("SELECT * FROM interview_sessions WHERE id = $1", [sessionId]);
        if (sResult.rows.length === 0) {
          usingFallback = true;
        } else {
          dbSession = sResult.rows[0];
        }
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, "Database offline during finishSession query, using fallback scorecard");
        usingFallback = true;
      }
    }

    if (usingFallback) {
      const mockScoreCard = {
        overallScore: 82,
        technicalScore: 80,
        communicationScore: 85,
        eyeContactScore: 90,
        averageWpm: 115,
        stressScore: 30,
        totalFillers: 3,
        weakTopics: ['System Design', 'Communication Pace'],
        recommendations: ['Practice structural system design models.', 'Take breathing pauses between complex thoughts.'],
        flashcards: [
          { front: "Explain OOP Encapsulation", back: "Encapsulation binds data and code together into a single unit, shielding it from external access." }
        ],
        completedAt: new Date().toISOString(),
        aiVerdict: "Solid performance. Demonstrates technical proficiency and clear articulation of software trade-offs. (offline mode)",
        aiHiringLikelihood: "Highly Likely",
        aiPersonalizedFeedback: "Strong analytical skills were showcased. Work slightly on speed of delivery.",
        aiStrengths: ["Clear terminology", "Structured answers", "Good eye contact"],
        aiImprovements: ["Deepen framework choices explanation", "Reduce fast paced syllables"],
        aiStudyPlan: "Focus on database scaling schemas and system design for the next 2 days.",
        aiNextInterviewReady: "Ready for Technical Stage 2"
      };
      return res.status(200).json({
        message: "Session evaluated successfully (offline mode)",
        scoreCard: mockScoreCard
      });
    }

    let transcriptList = [];
    try {
      transcriptList = typeof dbSession.transcript === 'string' ? JSON.parse(dbSession.transcript) : dbSession.transcript;
      if (!Array.isArray(transcriptList)) transcriptList = [];
    } catch (e) {
      transcriptList = [];
    }

    if (transcriptList.length === 0) {
      const fallbackScore = {
        overallScore: 0,
        technicalScore: 0,
        communicationScore: 0,
        eyeContactScore: 0,
        averageWpm: 0,
        stressScore: 0,
        totalFillers: 0,
        weakTopics: ['Interview Completion', 'Answer Depth'],
        recommendations: ['Complete all interview questions to receive a full performance scorecard.', 'Practice answering at least 3-5 questions per session for meaningful metrics.'],
        flashcards: [],
        completedAt: new Date().toISOString(),
        note: 'Incomplete session — no answers were submitted.'
      };
      try {
        await query(`
          UPDATE interview_sessions
          SET status = 'completed',
              score_card = $1,
              completed_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(fallbackScore), sessionId]);
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, "Database offline during finishSession update (no answers)");
      }

      return res.status(200).json({ message: 'Session ended (no answers)', scoreCard: fallbackScore });
    }

    const totalAnswers = transcriptList.length;
    let avgTechnical = 0;
    let avgFluency = 0;
    let avgWpm = 0;
    let avgStress = 0;
    let totalFillers = 0;
    let avgEyeContact = 0;
    let avgCompleteness = 0;

    transcriptList.forEach(t => {
      avgTechnical += t.analysis.technicalAccuracy || 0;
      avgFluency += t.analysis.fluencyScore || 0;
      avgWpm += t.analysis.wpm || 0;
      avgStress += t.analysis.stressScore || 0;
      totalFillers += t.analysis.fillerCount || 0;
      avgEyeContact += t.analysis.eyeContactScore || 90;
      avgCompleteness += (t.analysis.completenessScore !== undefined) ? (t.analysis.completenessScore || 0) : (t.analysis.technicalAccuracy || 0);
    });

    avgTechnical = Math.round(avgTechnical / totalAnswers);
    avgFluency = Math.round(avgFluency / totalAnswers);
    avgWpm = Math.round(avgWpm / totalAnswers);
    avgStress = Math.round(avgStress / totalAnswers);
    avgEyeContact = Math.round(avgEyeContact / totalAnswers);
    avgCompleteness = Math.round(avgCompleteness / totalAnswers);

    const overallScore = Math.round((avgTechnical * 0.5) + (avgFluency * 0.3) + (avgEyeContact * 0.2));

    const weakTopics = [];
    const recommendations = [];
    const flashcards = [];

    if (avgTechnical < 70) {
      weakTopics.push(`${dbSession.type} Concepts`);
      recommendations.push(`Revise essential ${dbSession.type} concepts on our Study Roadmap.`);
      flashcards.push(
        { front: "Explain OOP Encapsulation", back: "Encapsulation binds data and code together into a single unit, shielding it from external access." },
        { front: "What is an Index in SQL?", back: "A database index is a data structure (like B-Tree) that improves data retrieval speeds." }
      );
    }
    if (avgFluency < 70) {
      weakTopics.push("Speech Pace & Fluency");
      recommendations.push("Practice answering under 120 Words Per Minute. Pause between thoughts instead of saying 'like' or 'um'.");
      flashcards.push(
        { front: "How to eliminate filler words?", back: "Slightly slow down speaking speed and use short pauses (1-2 seconds) instead of filler syllables." }
      );
    }
    if (avgEyeContact < 75) {
      weakTopics.push("Eye Contact & Body Language");
      recommendations.push("Align webcam at eye level. Keep shoulders straight and maintain direct visual contact during key sentences.");
    }

    const scoreCard = {
      overallScore,
      technicalScore: avgTechnical,
      communicationScore: avgFluency,
      eyeContactScore: avgEyeContact,
      averageWpm: avgWpm,
      stressScore: avgStress,
      totalFillers,
      completenessScore: avgCompleteness,
      weakTopics,
      recommendations,
      flashcards,
      completedAt: new Date().toISOString()
    };

    // === AI-Powered Performance Feedback (OpenRouter) ===
    let aiPerformanceFeedback = null;
    try {
      aiPerformanceFeedback = await generatePerformanceFeedback(
        scoreCard, dbSession.role || 'Software Engineer', dbSession.type || 'technical', transcriptList
      );
      logger.info('✅ OpenRouter generated personalized performance feedback');
      scoreCard.aiVerdict = aiPerformanceFeedback.overallVerdict;
      scoreCard.aiHiringLikelihood = aiPerformanceFeedback.hiringLikelihood;
      scoreCard.aiPersonalizedFeedback = aiPerformanceFeedback.personalizedFeedback;
      scoreCard.aiStrengths = aiPerformanceFeedback.top3Strengths;
      scoreCard.aiImprovements = aiPerformanceFeedback.top3Improvements;
      scoreCard.aiStudyPlan = aiPerformanceFeedback.studyPlan;
      scoreCard.aiNextInterviewReady = aiPerformanceFeedback.nextInterviewReady;
    } catch (aiErr) {
      logger.warn({ err: aiErr.message }, 'AI performance feedback unavailable');
    }

    // Write scorecard metrics to PG columns (score_overall, score_technical, score_communication, score_confidence, score_problem_solving)
    // to allow Readiness Engine calculation
    if (isOfflineSession) {
      dbSession.status = 'completed';
      dbSession.scoreCard = scoreCard;
      dbSession.completedAt = new Date().toISOString();
      offlineSessions.set(sessionId, dbSession);
    } else {
      try {
        await query(`
          UPDATE interview_sessions
          SET status = 'completed',
              score_card = $1,
              score_overall = $2,
              score_technical = $3,
              score_communication = $4,
              score_confidence = $5,
              score_problem_solving = $6,
              completed_at = NOW(),
              feedback = $7
          WHERE id = $8
        `, [
          JSON.stringify(scoreCard),
          overallScore,
          avgTechnical,
          avgFluency,
          avgEyeContact,
          avgCompleteness, // Map avgCompleteness to problem solving index
          scoreCard.aiVerdict || "Completed mock interview session.",
          sessionId
        ]);
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, "Database offline during finishSession update");
      }
    }

    // Award Gamification XP points (150 XP for completion!)
    if (dbSession.user_id) {
      try {
        await withTransaction(async (client) => {
          const uResult = await client.query("SELECT xp, badges FROM users WHERE id = $1 FOR UPDATE", [dbSession.user_id]);
          if (uResult.rows.length > 0) {
            const user = uResult.rows[0];
            let xpAward = 150;
            if (overallScore > 85) xpAward += 50;

            const badges = Array.isArray(user.badges) ? [...user.badges] : [];
            if (dbSession.type === "coding" && !badges.includes("Coding Master")) {
              badges.push("Coding Master");
            }
            if (totalAnswers >= 5 && !badges.includes("Experienced Prep")) {
              badges.push("Experienced Prep");
            }

            await client.query("UPDATE users SET xp = xp + $1, badges = $2 WHERE id = $3", [
              xpAward,
              badges,
              dbSession.user_id
            ]);
          }
        });
      } catch (dbErr) {
        logger.warn({ err: dbErr.message }, "Database offline during finishSession XP update");
      }
    }

    return res.status(200).json({
      message: "Session evaluated successfully",
      scoreCard
    });
  } catch (err) {
    logger.error({ err }, "Session Finish Error");
    return res.status(500).json({ message: "Failed to compile session scorecard" });
  }
};

/**
 * Asynchronously queue session finishing and AI feedback compilation via BullMQ
 */
exports.finishSessionAsync = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.userId;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    // Try enqueueing background evaluation job in BullMQ
    const jobResult = await addEvaluationJob({ sessionId, userId });
    if (jobResult) {
      return res.status(202).json({
        message: 'Session evaluation queued in background',
        jobId: jobResult.jobId,
        status: 'queued',
        sessionId,
      });
    }

    // Fall back to synchronous evaluation if Redis/BullMQ is offline
    return exports.finishSession(req, res);
  } catch (err) {
    logger.warn({ err: err.message }, 'finishSessionAsync failed, falling back to sync finish');
    return exports.finishSession(req, res);
  }
};

/**
 * Get status of an asynchronous BullMQ AI evaluation job
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await checkJobStatus(jobId);
    return res.status(200).json(status);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to check job status');
    return res.status(500).json({ message: 'Error checking job status' });
  }
};

/**
 * Get session history for a user.
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      "SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY started_at DESC",
      [userId]
    );

    const history = result.rows.map(row => {
      let scoreCard = null;
      try {
        scoreCard = typeof row.score_card === 'string' ? JSON.parse(row.score_card) : row.score_card;
      } catch (e) {
        scoreCard = row.score_card;
      }
      return {
        id: row.id,
        userId: row.user_id,
        company: row.company,
        role: row.role,
        type: row.type.toUpperCase(),
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        scoreCard
      };
    });

    return res.status(200).json({ history });
  } catch (err) {
    logger.warn({ err: err.message }, "Retrieve History Error, returning mock history fallback");
    const mockHistory = [
      {
        id: "sess_mock_1",
        userId: req.user.userId,
        company: "Google",
        role: "Software Engineer",
        type: "TECHNICAL",
        status: "completed",
        startedAt: new Date(Date.now() - 24*3600*1000).toISOString(),
        completedAt: new Date(Date.now() - 24*3600*1000 + 15*60*1000).toISOString(),
        scoreCard: {
          overallScore: 85,
          technicalScore: 88,
          communicationScore: 82,
          eyeContactScore: 90,
          averageWpm: 120,
          stressScore: 25,
          totalFillers: 2,
          weakTopics: ["Concurrency"],
          recommendations: ["Review mutexes and locks."],
          flashcards: []
        }
      },
      {
        id: "sess_mock_2",
        userId: req.user.userId,
        company: "Meta",
        role: "Frontend Developer",
        type: "HR",
        status: "completed",
        startedAt: new Date(Date.now() - 3*24*3600*1000).toISOString(),
        completedAt: new Date(Date.now() - 3*24*3600*1000 + 10*60*1000).toISOString(),
        scoreCard: {
          overallScore: 90,
          technicalScore: 85,
          communicationScore: 95,
          eyeContactScore: 92,
          averageWpm: 110,
          stressScore: 20,
          totalFillers: 1,
          weakTopics: [],
          recommendations: [],
          flashcards: []
        }
      }
    ];
    return res.status(200).json({ history: mockHistory });
  }
};

/**
 * Get details of a single session.
 */
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (offlineSessions.has(sessionId)) {
      const session = offlineSessions.get(sessionId);
      return res.status(200).json({ session });
    }

    const result = await query("SELECT * FROM interview_sessions WHERE id = $1", [sessionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Mock interview session not found" });
    }

    const row = result.rows[0];
    let scoreCard = null;
    let transcript = [];
    let ongoingMetadata = {};

    try {
      scoreCard = typeof row.score_card === 'string' ? JSON.parse(row.score_card) : row.score_card;
    } catch (e) {
      scoreCard = row.score_card;
    }

    try {
      transcript = typeof row.transcript === 'string' ? JSON.parse(row.transcript) : row.transcript;
    } catch (e) {
      transcript = row.transcript || [];
    }

    // If ongoing, restore details from metadata bag in score_card
    if (row.status === 'ongoing') {
      ongoingMetadata = scoreCard || {};
      scoreCard = null;
    } else {
      ongoingMetadata = scoreCard || {};
    }

    const session = {
      id: row.id,
      userId: row.user_id,
      company: row.company,
      role: row.role,
      type: row.type.toUpperCase(),
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      currentQuestionIndex: ongoingMetadata.currentQuestionIndex || 0,
      questions: ongoingMetadata.questions || [],
      language: ongoingMetadata.language || "JavaScript",
      resumeId: ongoingMetadata.resumeId || null,
      transcript,
      scoreCard
    };

    return res.status(200).json({ session });
  } catch (err) {
    logger.warn({ err: err.message }, "Retrieve Session Error, returning mock session details fallback");
    const mockSession = {
      id: req.params.sessionId || "sess_mock_1",
      userId: req.user.userId,
      company: "Google",
      role: "Software Engineer",
      type: "TECHNICAL",
      status: "completed",
      startedAt: new Date(Date.now() - 24*3600*1000).toISOString(),
      completedAt: new Date(Date.now() - 24*3600*1000 + 15*60*1000).toISOString(),
      currentQuestionIndex: 3,
      questions: [
        { id: "sq_1", text: "Explain your journey toward becoming a senior-level Software Engineer." },
        { id: "sq_2", text: "How do you decide between building a relational SQL schema versus a NoSQL document store?" },
        { id: "sq_3", text: "Walk me through the single most challenging milestone on your resume that you are proud of." }
      ],
      language: "JavaScript",
      resumeId: null,
      transcript: [
        {
          question: "Explain your journey toward becoming a senior-level Software Engineer.",
          answer: "I worked as an intern, built React and Node apps, optimized query speeds and designed relational schemas.",
          analysis: { score: 85, technicalAccuracy: 88, fluencyScore: 82, wpm: 120, fillerCount: 2, stressScore: 25, eyeContactScore: 90, emotion: 'Confident' }
        }
      ],
      scoreCard: {
        overallScore: 85,
        technicalScore: 88,
        communicationScore: 82,
        eyeContactScore: 90,
        averageWpm: 120,
        stressScore: 25,
        totalFillers: 2,
        weakTopics: ["Concurrency"],
        recommendations: ["Review mutexes and locks."],
        flashcards: []
      }
    };
    return res.status(200).json({ session: mockSession });
  }
};

/**
 * Real-time partial answer analysis.
 * Called after each finalized speech sentence to provide live AI feedback.
 * Uses a fast rubbish-check first, then AI if needed.
 */
exports.analyzePartial = async (req, res) => {
  try {
    const { partialAnswer, question, role, type } = req.body;

    if (!partialAnswer || typeof partialAnswer !== 'string') {
      return res.status(400).json({ message: 'partialAnswer is required' });
    }

    const text = partialAnswer.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // ── Fast rubbish check (no AI call needed) ────────────────────────────────
    const isRubbish = (() => {
      if (!text) return true;
      const clean = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length === 0) return true;
      if (words.length < 4) {
        const junk = ['hi', 'hii', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'skip',
          'nothing', 'test', 'demo', 'asdf', 'yo', 'idk', 'i dont know'];
        const sentence = words.join(' ');
        if (words.length === 1 || junk.includes(sentence) || words.every(w => junk.includes(w))) return true;
      }
      const firstWord = words[0] || '';
      if (firstWord.length > 15 && !firstWord.includes('-') && !firstWord.includes('_')) return true;
      if (/^(.)\1{4,}$/.test(clean.replace(/\s+/g, ''))) return true;
      return false;
    })();

    if (isRubbish) {
      return res.status(200).json({
        isRubbish: true,
        techScore: 0,
        commScore: 8,
        feedback: 'Answer is too brief or irrelevant. Please provide a detailed, professional response.',
        feedbackType: 'error',
      });
    }

    // ── Very short but not rubbish — give neutral baseline ────────────────────
    if (wordCount < 10) {
      return res.status(200).json({
        isRubbish: false,
        techScore: 35,
        commScore: 40,
        feedback: 'Getting started — keep elaborating with specific details and examples.',
        feedbackType: 'warn',
      });
    }

    // ── AI evaluation for substantive answers ─────────────────────────────────
    try {
      const { evaluateAnswer } = require('../../services/ai/scoringEngine');
      const evaluation = await evaluateAnswer(
        question || 'Tell me about your experience.',
        text,
        type || 'HR',
        role || 'Software Engineer'
      );

      const techScore = evaluation.technicalScore ?? evaluation.technicalAccuracy ?? 70;
      const commScore = evaluation.communicationScore ?? evaluation.fluencyScore ?? 70;
      const overall = Math.round((techScore + commScore) / 2);

      let feedbackType = 'good';
      let feedback = 'Strong answer — keep going with examples.';
      if (overall < 35) {
        feedbackType = 'error';
        feedback = evaluation.improvements?.[0] || 'Needs more depth and technical substance.';
      } else if (overall < 65) {
        feedbackType = 'warn';
        feedback = evaluation.improvements?.[0] || 'Good start — add specific outcomes and metrics.';
      } else {
        feedback = evaluation.strengths?.[0]
          ? `✅ ${evaluation.strengths[0]}`
          : 'Strong answer — well structured response.';
      }

      return res.status(200).json({
        isRubbish: false,
        techScore,
        commScore,
        feedback,
        feedbackType,
      });
    } catch (aiErr) {
      logger.warn({ err: aiErr.message }, '[analyzePartial] AI evaluation failed, using heuristic');
      // Heuristic scoring fallback
      const wpm = wordCount; // rough proxy
      const techScore = Math.min(90, Math.max(20, 30 + (wordCount / 3)));
      const commScore = Math.min(90, Math.max(20, 35 + (wordCount / 4)));
      return res.status(200).json({
        isRubbish: false,
        techScore: Math.round(techScore),
        commScore: Math.round(commScore),
        feedback: wordCount > 50 ? 'Detailed response — excellent depth.' : 'Add more specifics and examples.',
        feedbackType: wordCount > 50 ? 'good' : 'warn',
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, '[analyzePartial] Error');
    return res.status(500).json({ message: 'Analysis failed', error: err.message });
  }
};
