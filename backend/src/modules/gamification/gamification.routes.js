const express = require('express');
const router = express.Router();
const gamificationController = require('./gamification.controller');
const authMiddleware = require('../../middleware/authMiddleware');

// Authenticate all gamification routes
router.use(authMiddleware);

// Progress & Aptitude routes (100% Free)
router.get('/challenges',          gamificationController.getChallenges);
router.post('/complete-challenge', gamificationController.completeChallenge);
router.get('/aptitude',            gamificationController.getAptitudeQuestions);

module.exports = router;

