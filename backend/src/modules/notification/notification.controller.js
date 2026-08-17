/**
 * TRESK AI — Notifications Controller
 * Handles user activity alerts, evaluation milestones, and streak reminders.
 */

const { query } = require('../../config/pgDb');

/**
 * Helper to programmatically create a notification for a user.
 */
async function createNotification(userId, { type = 'system', title, message, link = null }) {
  if (!userId || !title || !message) return null;
  try {
    const res = await query(
      `INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
       RETURNING *`,
      [userId, type, title, message, link]
    );
    return res.rows[0];
  } catch (err) {
    if (global.logger) global.logger.warn({ err: err.message, userId }, 'Failed to insert notification into DB');
    return null;
  }
}

/**
 * GET /api/notifications
 * Fetch user notifications, unread count, and auto-seed initial activity if none exist.
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Fetch user notifications from DB
    let result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    // 2. If user has no notifications in DB yet, generate initial contextual notifications
    if (result.rows.length === 0) {
      const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];

      const initial = [
        {
          type: 'welcome',
          title: 'Welcome to TRESK AI!',
          message: 'Get started by checking the AI Interview Lobby and practicing your first mock round.',
          link: '/lobby'
        }
      ];

      if (user && user.streak > 1) {
        initial.push({
          type: 'streak',
          title: 'Streak Active! 🔥',
          message: `You are on a ${user.streak}-day practice streak. Keep it going today!`,
          link: '/dashboard'
        });
      }

      for (const item of initial) {
        await createNotification(userId, item);
      }

      result = await query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );
    }

    const notifications = result.rows.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      desc: n.message,
      read: Boolean(n.read),
      link: n.link,
      createdAt: n.created_at,
    }));

    const unreadCount = notifications.filter(n => !n.read).length;

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    if (global.logger) global.logger.error({ err: err.message }, 'Error in getNotifications');
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({
      message: 'Notification marked as read',
      notification: result.rows[0],
    });
  } catch (err) {
    if (global.logger) global.logger.error({ err: err.message }, 'Error in markAsRead');
    return res.status(500).json({ message: 'Failed to update notification' });
  }
};

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user.
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;

    await query(
      `UPDATE notifications 
       SET read = TRUE 
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    if (global.logger) global.logger.error({ err: err.message }, 'Error in markAllAsRead');
    return res.status(500).json({ message: 'Failed to update notifications' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification.
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (err) {
    if (global.logger) global.logger.error({ err: err.message }, 'Error in deleteNotification');
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
};

exports.createNotification = createNotification;
