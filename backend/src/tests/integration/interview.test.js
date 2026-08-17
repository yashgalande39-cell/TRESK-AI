/**
 * Integration Tests — Interview Lifecycle Flow
 * Run: npx jest --testPathPatterns="interview"
 */

jest.mock('../../config/pgDb', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'test-user-123', email: 'test@tresk.ai', role: 'user' };
    next();
  };
});

jest.mock('../../services/ai/interviewAgent', () => ({
  generateAIQuestion: jest.fn().mockResolvedValue({
    question: "Explain the virtual DOM in React and how reconciliation works.",
    expectedKeyPoints: ["Virtual DOM representation", "Diffing algorithm", "Fiber architecture"],
    difficulty: "Medium",
    topic: "React"
  }),
  evaluateInterviewAnswer: jest.fn().mockResolvedValue({
    score: 85,
    technicalAccuracy: 88,
    communicationClarity: 82,
    feedback: "Good explanation of reconciliation.",
    followUpQuestion: "How do React Keys optimize this process?"
  }),
  generateFinalInterviewReport: jest.fn().mockResolvedValue({
    overallScore: 86,
    verdict: "Strong Hire",
    summary: "Solid technical knowledge and clear articulation.",
    strengths: ["Clear analogies", "Technical depth"],
    areasOfImprovement: ["Mention React 18 concurrent mode"]
  })
}));

const request = require('supertest');
const express = require('express');
const { query } = require('../../config/pgDb');
const interviewRoutes = require('../../modules/interview/interview.routes');

const app = express();
app.use(express.json());
app.use('/api/interviews', interviewRoutes);

describe('Interview Session Lifecycle API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/interviews/generate — creates a new session and returns first question', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'resume-1', parsed_content: '{"skills":["React","Node.js"]}' }] }) // resume lookup
      .mockResolvedValueOnce({ rows: [{ id: 'sess-abc-123', role: 'Frontend Engineer', type: 'technical' }] }) // insert session
      .mockResolvedValueOnce({ rows: [{ id: 'q-1', question_text: 'Explain virtual DOM' }] }); // insert question

    const res = await request(app)
      .post('/api/interviews/generate')
      .send({
        role: 'Frontend Engineer',
        type: 'technical',
        difficulty: 'Medium',
        company: 'Meta'
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.session || res.body).toHaveProperty('id');
  });

  test('GET /api/interviews/history — returns interview list for authenticated user', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 'sess-1', role: 'Full Stack', overall_score: 88, created_at: new Date().toISOString() },
        { id: 'sess-2', role: 'Backend Dev', overall_score: 79, created_at: new Date().toISOString() }
      ]
    });

    const res = await request(app).get('/api/interviews/history');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history || res.body.interviews || res.body)).toBe(true);
  });

  test('GET /api/interviews/session/:sessionId — retrieves full session details', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'sess-123',
        user_id: 'test-user-123',
        role: 'Frontend Engineer',
        overall_score: 85,
        questions: [{ question: 'What is React?' }]
      }]
    });

    const res = await request(app).get('/api/interviews/session/sess-123');
    expect(res.status).toBe(200);
  });
});
