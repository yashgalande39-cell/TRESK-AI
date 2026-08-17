/**
 * Integration Tests — Notification System API
 * Run: npx jest --testPathPatterns="notification"
 */

jest.mock('../../config/pgDb', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'usr-abc-123', email: 'test@tresk.ai', role: 'user' };
    next();
  };
});

const request = require('supertest');
const express = require('express');
const { query } = require('../../config/pgDb');
const notificationRoutes = require('../../modules/notification/notification.routes');

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notifications API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/notifications — returns notification list and unread count', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 'notif-1', user_id: 'usr-abc-123', type: 'welcome', title: 'Welcome', message: 'Hello', read: false, created_at: new Date().toISOString() },
        { id: 'notif-2', user_id: 'usr-abc-123', type: 'streak', title: 'Streak', message: 'Streak active', read: true, created_at: new Date().toISOString() },
      ]
    });

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.unreadCount).toBe(1);
  });

  test('PATCH /api/notifications/:id/read — marks notification as read', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'notif-1', user_id: 'usr-abc-123', read: true }]
    });

    const res = await request(app).patch('/api/notifications/notif-1/read');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/marked as read/i);
  });

  test('POST /api/notifications/read-all — marks all user notifications as read', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/notifications/read-all');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/all notifications marked as read/i);
  });

  test('DELETE /api/notifications/:id — deletes a notification', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'notif-1' }] });

    const res = await request(app).delete('/api/notifications/notif-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });
});
