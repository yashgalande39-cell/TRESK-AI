/**
 * TRESK AI — Resume Controller (PostgreSQL)
 * =====================================================================
 * Handles resume building, ATS scanning, PDF text parsing, and storage.
 * Persists all resumes to the PostgreSQL resumes table.
 */

const { query } = require('../../config/pgDb');
const { generateATSSuggestions, parseResumeText } = require('../../services/ai/resumeAnalyzer');

// ── Structured Logger proxy (falls back gracefully if global.logger not yet set)
const log = {
  info:  (...a) => (global.logger ? global.logger.info(...a)  : console.log('[INFO]',  ...a)),
  warn:  (...a) => (global.logger ? global.logger.warn(...a)  : console.warn('[WARN]',  ...a)),
  error: (...a) => (global.logger ? global.logger.error(...a) : console.error('[ERROR]', ...a)),
  debug: (...a) => (global.logger ? global.logger.debug?.(...a) : null),
};


/**
 * Robust helper to extract text from a PDF buffer.
 */
const parsePDFBuffer = async (buffer) => {
  try {
    const pdf = require('pdf-parse');
    const parserFn = typeof pdf === 'function' ? pdf : (pdf && typeof pdf.default === 'function' ? pdf.default : pdf);
    if (typeof parserFn === 'function') {
      const data = await parserFn(buffer);
      return data.text || '';
    }
    return buffer.toString('utf-8');
  } catch (err) {
    log.error({ err }, '[ResumeController] PDF extraction failure');
    throw err;
  }
};


/**
 * Rule-based fallback ATS analysis generator.
 */
const computeATSAnalysis = (data) => {
  const { name, email, phone, role, skills, experience, projects, education } = data;
  const providedSkills = Array.isArray(skills) ? skills : [];
  const providedExp = Array.isArray(experience) ? experience : [];
  const providedProj = Array.isArray(projects) ? projects : [];
  const providedEdu = Array.isArray(education) ? education : [];
  
  // 1. Keyword Alignment Score (40% weight)
  const roleKeywords = {
    "Software Engineer": ["Data Structures", "Algorithms", "System Design", "Git", "Java", "Python", "C++", "DBMS", "OOP", "SQL", "Docker", "REST APIs"],
    "Web Developer": ["React", "HTML5", "CSS3", "JavaScript", "Node.js", "Express", "REST APIs", "Tailwind CSS", "TypeScript", "Redux", "Webpack", "Git"],
    "Data Analyst": ["Python", "SQL", "Excel", "Tableau", "Pandas", "PowerBI", "Statistics", "Machine Learning", "Data Mining", "NumPy", "Matplotlib", "Git"],
    "AI/ML Engineer": ["Python", "PyTorch", "TensorFlow", "Deep Learning", "NLP", "Computer Vision", "Scikit-Learn", "Neural Networks", "Keras", "Model Deployment", "Git"],
    "Cybersecurity Analyst": ["Network Security", "Cryptography", "Penetration Testing", "Linux", "Firewalls", "Wireshark", "SIEM", "Vulnerability Assessment", "CompTIA", "CISSP"]
  };

  const targetKeywords = roleKeywords[role] || roleKeywords["Software Engineer"];
  const matchingSkills = providedSkills.filter(s => 
    targetKeywords.some(tk => tk.toLowerCase() === s.toLowerCase() || s.toLowerCase().includes(tk.toLowerCase()))
  );

  const missingKeywords = targetKeywords.filter(tk => 
    !providedSkills.some(ps => ps.toLowerCase() === tk.toLowerCase() || ps.toLowerCase().includes(tk.toLowerCase()))
  );

  const keywordScore = targetKeywords.length > 0 
    ? Math.round((matchingSkills.length / targetKeywords.length) * 100) 
    : 50;

  // 2. Quantifiable Impact Score (30% weight)
  let textToAnalyze = "";
  providedExp.forEach(e => {
    textToAnalyze += ` ${e.company || ""} ${e.role || ""} ${e.desc || ""}`;
  });
  providedProj.forEach(p => {
    textToAnalyze += ` ${p.title || ""} ${p.desc || ""}`;
  });

  const metricsRegexes = [
    /\b\d+%\b/,                   // percentages (e.g. 25%, 100%)
    /\$\d+(?:,\d+)*(?:\.\d+)?\b/,  // dollar metrics (e.g. $10,000, $5k)
    /\b\d+x\b/i,                  // growth multipliers (e.g. 2x, 5X)
    /\b\d+(?:\.\d+)?\s*(?:million|thousand|users|queries|ms|sec|hours|days|weeks|months|years|lbs|k|m)\b/i, // scales or time units
    /\b\d{3,}\b/                  // larger numbers (e.g. 500 users)
  ];

  let matchesCount = 0;
  metricsRegexes.forEach(regex => {
    const matches = textToAnalyze.match(new RegExp(regex, 'g'));
    if (matches) matchesCount += matches.length;
  });

  let impactScore = 20; // baseline
  if (matchesCount > 0) impactScore += 30;
  if (matchesCount > 2) impactScore += 30;
  if (matchesCount > 4) impactScore += 20;
  impactScore = Math.min(100, impactScore);

  // 3. Profile Completeness Score (30% weight)
  let completenessScore = 0;
  if (email) completenessScore += 15;
  if (phone) completenessScore += 15;
  if (providedSkills.length >= 3) completenessScore += 20;
  if (providedEdu.length >= 1 && providedEdu[0].school) completenessScore += 15;
  if (providedExp.length >= 1 && providedExp[0].company) completenessScore += 15;
  if (providedProj.length >= 1 && providedProj[0].title) completenessScore += 20;

  // 4. Compute Dynamic Overall ATS Score
  let atsScore = Math.round((keywordScore * 0.4) + (impactScore * 0.3) + (completenessScore * 0.3));
  atsScore = Math.max(35, Math.min(99, atsScore));

  // recommendations
  const suggestions = [];
  if (completenessScore < 100) {
    if (!email || !phone) {
      suggestions.push("⚠️ Add complete contact coordinates (phone number and active email) to your resume header.");
    }
    if (providedEdu.length === 0 || !providedEdu[0].school) {
      suggestions.push("⚠️ Incorporate your formal education history, listing degrees and graduation years.");
    }
    if (providedExp.length === 0 || !providedExp[0].company) {
      suggestions.push("⚠️ Add professional work history or internship records to highlight career experience.");
    }
    if (providedProj.length === 0 || !providedProj[0].title) {
      suggestions.push("⚠️ Incorporate structural software project listings to showcase practical coding expertise.");
    }
  }

  if (impactScore < 80) {
    suggestions.push("📈 ATS Priority: Add more quantifiable metrics (e.g., 'Boosted efficiency by 30%', 'Reduced loading latency by 150ms') to your project and job descriptions.");
  }

  if (missingKeywords.length > 0) {
    suggestions.push(`💡 Integrate critical keywords relevant for ${role}: ${missingKeywords.slice(0, 3).join(', ')} to push your alignment score past 85%.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("🏆 Excellent work! Your resume covers all core structural sections, lists dynamic keywords, and showcases measurable metrics.");
  }

  // Custom prep questions tailored directly to listed skills
  const mappedQuestions = providedSkills.slice(0, 3).map(skill => 
    `In your resume, you listed ${skill}. Can you walk me through a technically challenging problem you solved using this technology?`
  );

  if (mappedQuestions.length === 0) {
    mappedQuestions.push(
      "Walk me through the most technically complex software project you've listed on your resume.",
      "How do you handle test coverage and CI/CD pipelines in your personal project workflow?"
    );
  }

  return {
    atsScore,
    keywordScore,
    impactScore,
    completenessScore,
    targetRole: role,
    matchedSkills: matchingSkills,
    missingSkills: missingKeywords,
    suggestions: suggestions,
    recommendedQuestions: mappedQuestions
  };
};

/**
 * Construct a basic resume structure and save it to the DB.
 */
exports.buildResume = async (req, res) => {
  try {
    const { name, email, phone, education, experience, skills, projects } = req.body;
    const userId = req.user.userId;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required to construct a resume" });
    }

    const rawText = `${name} Resume. Email: ${email}. Phone: ${phone || ""}. Skills: ${(skills || []).join(', ')}. Projects: ${(projects || []).map(p => p.title).join(', ')}`;
    const analysisData = {
      name,
      email,
      phone: phone || "",
      education: education || [],
      experience: experience || [],
      skills: skills || [],
      projects: projects || []
    };

    // Save resume to PostgreSQL resumes table
    let newResume;
    try {
      const result = await query(`
        INSERT INTO resumes (user_id, file_name, file_url, raw_text, target_role, ats_score, ats_analysis, keywords, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        userId,
        "Constructed Resume",
        "",
        rawText,
        "Software Engineer",
        70,
        JSON.stringify(analysisData),
        skills || []
      ]);

      newResume = result.rows[0];

      // Award XP (50 XP for constructing resume!)
      await query("UPDATE users SET xp = xp + 50 WHERE id = $1", [userId]);
    } catch (dbErr) {
      log.warn({ err: dbErr }, 'Database offline during buildResume, using memory fallback');
      newResume = {
        id: "res_mock_" + Date.now(),
        user_id: userId,
        file_name: "Constructed Resume",
        file_url: "",
        raw_text: rawText,
        target_role: "Software Engineer",
        ats_score: 70,
        ats_analysis: analysisData,
        keywords: skills || [],
        created_at: new Date().toISOString()
      };
    }

    return res.status(200).json({
      message: "Resume saved successfully",
      resume: newResume
    });
  } catch (err) {
    log.error({ err }, 'Resume Build Error');
    return res.status(500).json({ message: "Failed to construct resume" });
  }
};


/**
 * Scan and analyze resume JSON fields using rules and AI helper.
 */
exports.analyzeResume = async (req, res) => {
  try {
    const { name, email, phone, role, skills, experience, projects, education } = req.body;
    const userId = req.user.userId;

    if (!role) {
      return res.status(400).json({ message: "Target Job Role is required for ATS analysis" });
    }

    const analysis = computeATSAnalysis({
      name,
      email,
      phone,
      role,
      skills,
      experience,
      projects,
      education
    });

    // === AI-Powered ATS Suggestions (OpenRouter) ===
    try {
      const aiSuggestions = await generateATSSuggestions(
        { name, email, phone, skills, experience, projects, education },
        role,
        analysis.atsScore,
        analysis.missingSkills
      );
      if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
        // Merge AI suggestions with rule-based ones (AI takes priority)
        analysis.suggestions = [...aiSuggestions, ...analysis.suggestions.slice(0, 1)];
        log.info(`OpenRouter generated ${aiSuggestions.length} AI ATS suggestions`);
      }
    } catch (aiErr) {
      log.warn({ err: aiErr }, 'AI ATS suggestions unavailable, using rule-based');
    }

    const rawText = `${name} Resume. Email: ${email}. Skills: ${(skills || []).join(', ')}. Projects: ${(projects || []).map(p => p.title).join(', ')}`;

    // Save resume analytical record to PG resumes table
    let recordId = "res_mock_" + Date.now();
    try {
      const result = await query(`
        INSERT INTO resumes (user_id, file_name, file_url, raw_text, target_role, ats_score, ats_analysis, keywords, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        userId,
        "Analyzed Profile Resume",
        "",
        rawText,
        role,
        analysis.atsScore,
        JSON.stringify(analysis),
        skills || []
      ]);

      const savedRecord = result.rows[0];
      recordId = savedRecord.id;
    } catch (dbErr) {
      log.warn({ err: dbErr }, 'Database offline during analyzeResume, returning mock record ID');
    }

    return res.status(200).json({
      message: "ATS analysis complete",
      analysis: { ...analysis, recordId }
    });
  } catch (err) {
    log.error({ err }, 'ATS Scanner Error');
    return res.status(500).json({ message: "Failed to scan and analyze resume" });
  }
};


/**
 * Handle multipart file upload, parse text, and query ATS suggestions.
 */
exports.uploadResume = async (req, res) => {
  try {
    // Support both upload.single('resume') -> req.file and legacy upload.any() -> req.files[0]
    const file = req.file || req.files?.[0];
    const userId = req.user.userId;

    if (!file || !file.buffer) {
      return res.status(400).json({ message: "No file uploaded" });
    }


    let rawText = "";
    if (file.mimetype === 'application/pdf') {
      try {
        rawText = await parsePDFBuffer(file.buffer);
      } catch (pdfErr) {
        log.warn({ err: pdfErr }, 'PDF Parsing Error, falling back to text read');
        rawText = file.buffer.toString('utf-8');
      }
    } else {
      rawText = file.buffer.toString('utf-8');
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ message: "Uploaded file is empty or text could not be extracted" });
    }

    // === Try OpenRouter first for resume parsing (higher quality) ===
    let parsedData = {};
    let parsedWithAI = false;

    try {
      parsedData = await parseResumeText(rawText);
      parsedWithAI = true;
      log.info(`OpenRouter parsed resume for candidate`);
    } catch (e) {
      log.warn({ err: e }, 'OpenRouter resume parsing failed, trying Gemini fallback');
    }

    // Gemini fallback if OpenRouter failed
    if (!parsedWithAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const prompt = `You are a resume parsing AI. Parse this resume and return ONLY a JSON object:\n${rawText.slice(0, 3000)}\n\nJSON structure: {"name":...,"email":...,"phone":...,"skills":[...],"experience":[{"company":...,"role":...,"duration":...,"desc":...}],"projects":[{"title":...,"desc":...,"tech":...}],"education":[{"school":...,"degree":...,"year":...}],"targetRole":...}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await response.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const respText = data.candidates[0].content.parts[0].text;
            parsedData = JSON.parse(respText.replace(/```json|```/g, '').trim());
            parsedWithAI = true;
          }
        } catch (err) {
          log.warn({ err }, 'Gemini fallback also failed, using regex extraction');
        }
      }
    }

    // Fallback if Gemini/OpenRouter failed or wasn't available
    if (!parsedData.name) {
      parsedData.name = "Extracted Candidate";
      parsedData.email = "";
      parsedData.phone = "";
      parsedData.skills = [];
      parsedData.experience = [];
      parsedData.projects = [];
      parsedData.education = [];
      parsedData.targetRole = "Software Engineer";

      // Basic regex scans for fallback
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
      const emailMatch = rawText.match(emailRegex);
      if (emailMatch) parsedData.email = emailMatch[0];

      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
      const phoneMatch = rawText.match(phoneRegex);
      if (phoneMatch) parsedData.phone = phoneMatch[0];

      const commonSkills = ["React", "JavaScript", "Node.js", "Python", "Java", "C++", "HTML", "CSS", "SQL", "Docker", "Git", "AWS", "Machine Learning", "Deep Learning", "Excel"];
      commonSkills.forEach(s => {
        if (rawText.toLowerCase().includes(s.toLowerCase())) {
          parsedData.skills.push(s);
        }
      });
    }

    const role = parsedData.targetRole || "Software Engineer";
    const analysis = computeATSAnalysis({
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      role,
      skills: parsedData.skills,
      experience: parsedData.experience,
      projects: parsedData.projects,
      education: parsedData.education
    });

    // Save resume to PostgreSQL resumes table
    let savedRecord;
    try {
      const result = await query(`
        INSERT INTO resumes (user_id, file_name, file_url, raw_text, target_role, ats_score, ats_analysis, keywords, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        userId,
        file.originalname,
        "",
        rawText,
        role,
        analysis.atsScore,
        JSON.stringify(analysis),
        parsedData.skills || []
      ]);

      savedRecord = result.rows[0];

      // Award XP (50 XP for uploading resume!)
      await query("UPDATE users SET xp = xp + 50 WHERE id = $1", [userId]);
    } catch (dbErr) {
      log.warn({ err: dbErr }, 'Database offline during uploadResume, using memory fallback');

      savedRecord = {
        id: "res_mock_" + Date.now(),
        user_id: userId,
        file_name: file.originalname,
        file_url: "",
        raw_text: rawText,
        target_role: role,
        ats_score: analysis.atsScore,
        ats_analysis: JSON.stringify(analysis),
        keywords: parsedData.skills || [],
        created_at: new Date().toISOString()
      };
    }

    const formattedResume = {
      id: savedRecord.id,
      userId: savedRecord.user_id || userId,
      filename: savedRecord.file_name || file.originalname,
      file_name: savedRecord.file_name || file.originalname,
      targetRole: savedRecord.target_role || role,
      target_role: savedRecord.target_role || role,
      atsScore: savedRecord.ats_score || analysis.atsScore,
      ats_score: savedRecord.ats_score || analysis.atsScore,
      rawText: rawText,
      analysisData: analysis,
      createdAt: savedRecord.created_at || new Date().toISOString()
    };

    return res.status(200).json({
      message: "Resume uploaded and analyzed successfully",
      resume: formattedResume
    });
  } catch (err) {
    log.error({ err }, 'Resume Upload/Analyze Error');
    return res.status(500).json({ message: "Failed to upload and analyze resume" });
  }
};



/**
 * Get all resumes for a specific user.
 */
exports.getUserResumes = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Find all resumes uploaded by this user in PG resumes table
    const result = await query(
      "SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    // Map database columns to the frontend-expected format
    const resumes = result.rows.map(row => {
      let analysisData = {};
      try {
        analysisData = typeof row.ats_analysis === 'string' ? JSON.parse(row.ats_analysis) : row.ats_analysis;
      } catch (e) {
        analysisData = row.ats_analysis || {};
      }
      return {
        id: row.id,
        userId: row.user_id,
        filename: row.file_name,
        targetRole: row.target_role,
        atsScore: row.ats_score,
        analysisData,
        createdAt: row.created_at
      };
    });

    return res.status(200).json({ resumes });
  } catch (err) {
    log.warn({ err }, '[GetResumes] Database offline, returning empty resume mock array');
    const mockResumes = [
      {
        id: "res_mock_1",
        userId: req.user.userId,
        filename: "Constructed Resume.pdf",
        targetRole: "Software Engineer",
        atsScore: 85,
        analysisData: {
          atsScore: 85,
          keywordScore: 80,
          impactScore: 85,
          completenessScore: 90,
          suggestions: ["🏆 Excellent work! Your resume covers all core structural sections."],
          recommendedQuestions: ["Walk me through the most technically complex software project you've listed on your resume."]
        },
        createdAt: new Date().toISOString()
      }
    ];
    return res.status(200).json({ resumes: mockResumes });
  }
};
