/**
 * Unit Tests — feedbackEngine.js
 * Run: npx jest --testPathPatterns="feedbackEngine"
 */

jest.mock('../../services/ai/openrouter', () => ({
  callOpenRouter: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock('../../services/ai/recommendationEngine', () => ({
  generateRecommendations: jest.fn(),
}));

jest.mock('../../utils/sanitizePromptInput', () => ({
  sanitizePromptInput: jest.fn((text) => text || ''),
}));

const { callOpenRouter, parseJsonResponse } = require('../../services/ai/openrouter');
const { generateRecommendations } = require('../../services/ai/recommendationEngine');
const { generatePerformanceFeedback } = require('../../services/ai/feedbackEngine');

const MOCK_SCORECARD = {
  overallScore: 85,
  technicalScore: 88,
  communicationScore: 82,
  eyeContactScore: 90,
  averageWpm: 135,
  stressScore: 20,
  totalFillers: 3,
  weakTopics: ['Dynamic Programming', 'SQL Indexing'],
};

const MOCK_FEEDBACK_RESPONSE = {
  overallVerdict: 'Pass',
  hiringLikelihood: 88,
  personalizedFeedback: 'Strong technical foundations and clear communication under pressure.',
  top3Strengths: ['High technical accuracy', 'Structured STAR delivery', 'Low filler word usage'],
  top3Improvements: ['Practice complex tree traversal', 'Elaborate on SQL indexing mechanisms'],
};

const MOCK_RECOMMENDATIONS = {
  studyPlan: ['Review B-Trees and indexing', 'Practice 5 DP medium problems'],
  nextInterviewReady: 'Ready in 1 week',
  recommendedProjects: ['Distributed Key-Value Store'],
  recommendedCertifications: ['AWS Certified Solutions Architect'],
};

beforeEach(() => {
  jest.clearAllMocks();
  callOpenRouter.mockResolvedValue('raw response');
  parseJsonResponse.mockReturnValue(MOCK_FEEDBACK_RESPONSE);
  generateRecommendations.mockResolvedValue(MOCK_RECOMMENDATIONS);
});

describe('generatePerformanceFeedback()', () => {
  test('successfully merges feedback, scoring evaluation, and study recommendations', async () => {
    const result = await generatePerformanceFeedback(MOCK_SCORECARD, 'Full Stack Engineer', 'technical');

    expect(result).toMatchObject({
      overallVerdict: 'Pass',
      hiringLikelihood: 88,
      personalizedFeedback: expect.any(String),
      top3Strengths: expect.arrayContaining(['High technical accuracy']),
      top3Improvements: expect.arrayContaining(['Practice complex tree traversal']),
      studyPlan: expect.arrayContaining(['Review B-Trees and indexing']),
      nextInterviewReady: 'Ready in 1 week',
      recommendedProjects: expect.any(Array),
      recommendedCertifications: expect.any(Array),
    });

    expect(callOpenRouter).toHaveBeenCalledTimes(1);
    expect(generateRecommendations).toHaveBeenCalledWith(MOCK_SCORECARD, 'Full Stack Engineer', 'technical');
  });

  test('falls back to default fallback values when AI response omits properties', async () => {
    parseJsonResponse.mockReturnValue({});
    generateRecommendations.mockResolvedValue({});

    const result = await generatePerformanceFeedback(MOCK_SCORECARD, 'Frontend Developer', 'hr');

    expect(result.overallVerdict).toBe('Borderline');
    expect(result.hiringLikelihood).toBe(50);
    expect(result.personalizedFeedback).toBe('Please continue practicing and refining your answers.');
    expect(result.top3Strengths).toEqual([]);
    expect(result.studyPlan).toEqual([]);
  });

  test('handles and rethrows error if callOpenRouter fails', async () => {
    callOpenRouter.mockRejectedValue(new Error('OpenRouter network failure'));

    await expect(
      generatePerformanceFeedback(MOCK_SCORECARD, 'Backend Engineer', 'system_design')
    ).rejects.toThrow('OpenRouter network failure');
  });
});
