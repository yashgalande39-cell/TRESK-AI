const express = require('express');
const router = express.Router();
const interviewController = require('./interview.controller');
const authMiddleware = require('../../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/generate',          interviewController.generateSession);
router.post('/submit-answer',     interviewController.submitAnswer);
router.post('/finish',            interviewController.finishSession);
router.post('/analyze-partial',   interviewController.analyzePartial);
router.get('/history',            interviewController.getHistory);
router.get('/session/:sessionId', interviewController.getSession);

module.exports = router;
