const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const authMiddleware = require('../../middleware/authMiddleware');

// Protect all notification routes with auth
router.use(authMiddleware);

router.get('/',               notificationController.getNotifications);
router.patch('/:id/read',     notificationController.markAsRead);
router.post('/read-all',      notificationController.markAllAsRead);
router.delete('/:id',         notificationController.deleteNotification);

module.exports = router;
