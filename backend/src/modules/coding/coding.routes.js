const express = require('express');
const router = express.Router();
const codingController = require('./coding.controller');
const authMiddleware = require('../../middleware/authMiddleware');

// Protect all coding endpoints with authentication (100% Free)
router.use(authMiddleware);

router.get('/challenges', codingController.getChallenges);
router.get('/challenges/:id', codingController.getChallengeById);
router.post('/run', codingController.runCode);
router.post('/submit', codingController.submitCode);

module.exports = router;

