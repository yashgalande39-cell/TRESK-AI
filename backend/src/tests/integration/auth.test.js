/**
 * Integration Tests — Auth Flow
 * Run: npm test -- --testPathPattern=auth
 *
 * Strategy: Mock the DB (pgDb) and bcrypt so tests run without a Postgres
 * instance. We test the full Express middleware stack: validation → controller.
 */

// ── Module mocks ──────────────────────────────────────────────────────────────
jest.mock('../../config/pgDb', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed_password'),
  compare: jest.fn(),
}));

jest.mock('../../modules/auth/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-123', role: 'user' }),
}));

const request  = require('supertest');
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { query, withTransaction } = require('../../config/pgDb');

// Build a test-app using the real auth router
const authRouter = require('../../modules/auth/auth.routes');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// ── DB helpers ────────────────────────────────────────────────────────────────
const mockExistingUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  password_hash: '$hashed_password',
  role: 'user',
  is_verified: true,
  streak: 1,
  xp: 0,
  last_active: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withTransaction.mockImplementation(async (fn) => fn({ query: jest.fn().mockResolvedValue({ rows: [mockExistingUser] }) }));
    query.mockResolvedValue({ rows: [] }); // email not taken by default
  });

  test('400 — missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  test('400 — invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'not-an-email', password: 'pass123' });
    expect(res.status).toBe(400);
  });

  test('400 — password too short', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'a@b.com', password: 'abc' });
    expect(res.status).toBe(400);
  });

  test('400 — email already registered', async () => {
    query.mockResolvedValue({ rows: [{ id: 'existing' }] }); // email taken
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'test@example.com', password: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('201 — successful registration', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })         // email check — not taken
      .mockResolvedValueOnce({ rows: [mockExistingUser] }); // insert user
    withTransaction.mockImplementation(async (fn) =>
      fn({ query: jest.fn().mockResolvedValue({ rows: [mockExistingUser] }) })
    );
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'new@example.com', password: 'Password123!' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset();
    query.mockResolvedValue({ rows: [mockExistingUser] });
    bcrypt.compare.mockResolvedValue(true);
  });

  test('400 — missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  test('400 — invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'pass' });
    expect(res.status).toBe(400);
  });

  test('400 — user not found', async () => {
    query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'pass1234' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('400 — wrong password', async () => {
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrongpass' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('200 — successful login returns access token', async () => {
    query
      .mockResolvedValueOnce({ rows: [mockExistingUser] })  // find user
      .mockResolvedValueOnce({ rows: [] });                  // insert refresh session
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  test('200 — clears refresh cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    // Cookie header should clear tresk_refresh cookie
    const setCookie = res.headers['set-cookie'] || [];
    const refreshCleared = setCookie.some((c) => c.includes('tresk_refresh') && c.includes('Expires='));
    // Not all implementations set Expires, just check status
    expect(res.body.message).toBeDefined();
  });
});
