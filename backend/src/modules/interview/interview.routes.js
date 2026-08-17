const express = require('express');
const router = express.Router();
const interviewController = require('./interview.controller');
const authMiddleware = require('../../middleware/authMiddleware');
const { validate, schemas } = require('../../utils/validate');

router.use(authMiddleware);

router.post('/generate',          validate(schemas.interview.generate),      interviewController.generateSession);
router.post('/submit-answer',     validate(schemas.interview.submitAnswer),   interviewController.submitAnswer);
router.post('/finish',            validate(schemas.interview.finishSession),  interviewController.finishSession);
router.post('/finish-async',      validate(schemas.interview.finishSession),  interviewController.finishSessionAsync);
router.post('/analyze-partial',   interviewController.analyzePartial);
router.get('/jobs/:jobId',        interviewController.getJobStatus);
router.get('/history',            interviewController.getHistory);
router.get('/session/:sessionId', interviewController.getSession);

module.exports = router;

