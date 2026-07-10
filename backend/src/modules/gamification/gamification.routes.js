const express = require('express');
const router = express.Router();
const gamificationController = require('./gamification.controller');
const authMiddleware = require('../../middleware/authMiddleware');
const { requirePlan } = require('../../middleware/planMiddleware');

// Authenticate all gamification routes
router.use(authMiddleware);

// Free-accessible progress routes
router.get('/challenges',          gamificationController.getChallenges);
router.post('/complete-challenge', gamificationController.completeChallenge);

// Pro-gated features
router.get('/aptitude',    requirePlan('pro'), gamificationController.getAptitudeQuestions);

module.exports = router;
