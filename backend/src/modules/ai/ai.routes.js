/**
 * TRESK AI — AI Analysis Routes (PostgreSQL)
 * =====================================================================
 * Replaces the legacy aiRoutes.js with database integration for plan validation.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../../middleware/authMiddleware');
const { validate, schemas } = require('../../utils/validate');
const { callOpenRouter, MODELS } = require('../../services/ai/openrouter');
const { generateInterviewQuestions } = require('../../services/ai/interviewAgent');
const { analyzeResume, analyzeJobDescription } = require('../../services/ai/resumeAnalyzer');
const { evaluateAnswer, reviewCode } = require('../../services/ai/scoringEngine');
const { generatePerformanceFeedback } = require('../../services/ai/feedbackEngine');
const { transcribeAudio } = require('../../services/stt/sarvamSTT');


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

router.use(authMiddleware);

/**
 * POST /api/ai/transcribe
 * Transcribes spoken audio from mock interviews using Sarvam AI saaras:v3
 */
router.post('/transcribe', upload.any(), async (req, res) => {
  try {
    const file = req.files?.[0] || req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const { model, mode, language_code } = req.body || {};
    const result = await transcribeAudio(file.buffer, {
      filename: file.originalname || 'speech.wav',
      mimeType: file.mimetype || 'audio/wav',
      model: model || 'saaras:v3',
      mode: mode || 'transcribe',
      language_code: language_code || 'en-IN',
    });

    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      language_code: result.language_code,
      request_id: result.request_id,
      language_probability: result.language_probability,
    });
  } catch (err) {
    global.logger?.error({ err }, 'Sarvam STT transcribe error');
    return res.status(500).json({
      success: false,
      message: 'Speech transcription failed. Please try again.',
      transcript: '',
    });
  }
});



/**
 * POST /api/ai/evaluate-answer
 */
router.post('/evaluate-answer', validate(schemas.ai.evaluateAnswer), async (req, res) => {
  try {
    const { question, answer, type, role } = req.body;
    const evaluation = await evaluateAnswer(
      question, answer, type || 'Technical', role || 'Software Engineer'
    );
    return res.status(200).json({ evaluation });
  } catch (err) {
    global.logger?.error({ err }, 'AI evaluate-answer error');
    return res.status(500).json({ message: 'AI evaluation failed. Please try again.' });
  }
});


/**
 * POST /api/ai/review-code
 */
router.post('/review-code', async (req, res) => {
  try {
    const { code, language, challengeTitle, challengeDesc, allPassed } = req.body;
    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }
    const review = await reviewCode(
      code, language,
      challengeTitle || 'Coding Challenge',
      challengeDesc || 'Solve the given problem',
      allPassed ?? false
    );
    return res.status(200).json({ review });
  } catch (err) {
    global.logger?.error({ err }, 'AI review-code error');
    return res.status(500).json({ message: 'AI code review failed. Please try again.' });
  }
});


/**
 * POST /api/ai/generate-questions
 */
router.post('/generate-questions', validate(schemas.ai.generateQuestions), async (req, res) => {
  try {
    const { type, difficulty, role, company, language, resumeText } = req.body;
    const questions = await generateInterviewQuestions(
      type, difficulty || 'Medium', role, company || 'Common', language || 'General', resumeText || ''
    );
    return res.status(200).json({ questions });
  } catch (err) {
    global.logger?.error({ err }, 'AI generate-questions error');
    return res.status(500).json({ message: 'Question generation failed. Please try again.' });
  }
});



/**
 * POST /api/ai/analyze-jd
 */
router.post('/analyze-jd', validate(schemas.ai.analyzeJd), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const analysis = await analyzeJobDescription(jobDescription);
    return res.status(200).json({ analysis });
  } catch (err) {
    global.logger?.error({ err }, 'AI analyze-jd error');
    return res.status(500).json({ message: 'Job description analysis failed. Please try again.' });
  }
});


/**
 * POST /api/ai/analyze-resume
 */
router.post('/analyze-resume', validate(schemas.ai.analyzeResume), async (req, res) => {
  try {
    const { resumeText, targetRole } = req.body;
    const analysis = await analyzeResume(
      resumeText,
      targetRole || 'Software Engineer'
    );
    return res.status(200).json({ analysis });
  } catch (err) {
    global.logger?.error({ err }, 'AI analyze-resume error');
    return res.status(500).json({ message: 'Resume analysis failed. Please try again.' });
  }
});



/**
 * POST /api/ai/performance-feedback
 */
router.post('/performance-feedback', async (req, res) => {
  try {
    const { scoreCard, role, type } = req.body;
    if (!scoreCard) {
      return res.status(400).json({ message: 'ScoreCard data is required' });
    }
    const feedback = await generatePerformanceFeedback(
      scoreCard, role || 'Software Engineer', type || 'Technical'
    );
    return res.status(200).json({ feedback });
  } catch (err) {
    global.logger?.error({ err }, 'AI performance-feedback error');
    return res.status(500).json({ message: 'Performance feedback generation failed. Please try again.' });
  }
});


/**
 * GET /api/ai/status
 */
router.get('/status', async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ status: 'unavailable', reason: 'No API key configured' });
    }
    const testText = await callOpenRouter([
      { role: 'user', content: 'Say "OK" in one word.' }
    ], MODELS.fast, { max_tokens: 10 });
    return res.status(200).json({
      status: 'online',
      model: MODELS.primary,
      testResponse: testText,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    global.logger?.error({ err }, 'AI status check failed');
    return res.status(200).json({ status: 'error' });
  }
});


module.exports = router;
