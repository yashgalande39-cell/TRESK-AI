/**
 * Unit Tests — scoringEngine.js  (internal logic, no AI calls)
 * Run: npm test -- --testPathPattern=scoringEngine
 *
 * Strategy: Mock callOpenRouter so tests never hit the network.
 * We verify:
 *  1. isRubbishResponse detection (via evaluateAnswer rubbish shortcut)
 *  2. evaluateAnswer returns correct shape on valid AI response
 *  3. reviewCode returns correct shape on valid AI response
 *  4. sanitizePromptInput is called (injection defence)
 */

jest.mock('../../services/ai/openrouter', () => ({
  callOpenRouter: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock('../../utils/sanitizePromptInput', () => ({
  sanitizePromptInput: jest.fn((text) => text || ''),
}));

const { callOpenRouter, parseJsonResponse } = require('../../services/ai/openrouter');
const { sanitizePromptInput } = require('../../utils/sanitizePromptInput');
const { evaluateAnswer, reviewCode } = require('../../services/ai/scoringEngine');

// ── Helpers ──────────────────────────────────────────────────────────────────
const VALID_EVAL_RESPONSE = {
  technicalScore: 82,
  communicationScore: 88,
  completenessScore: 78,
  overallScore: 83,
  strengths: ['Clear explanation of closures', 'Used concrete examples'],
  improvements: ['Add edge-case handling', 'Mention prototype chain'],
  idealAnswerHints: 'Top 1% candidates mention IIFE and the event loop relationship.',
  keyMissingPoints: ['Prototype chain', 'Memory implications'],
};

const VALID_CODE_REVIEW = {
  overallRating: 8,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  codeQuality: 85,
  strengths: ['Clean variable names', 'Handles edge cases'],
  issues: ['Could use const', 'Missing input validation'],
  optimizationTip: 'Use two-pointer technique',
  hint: 'Check boundary conditions on empty input.',
  interviewReadiness: 'Would pass most mid-level screens.',
};

beforeEach(() => {
  jest.clearAllMocks();
  parseJsonResponse.mockReturnValue(VALID_EVAL_RESPONSE);
  callOpenRouter.mockResolvedValue('raw ai response text');
});

// ── evaluateAnswer — rubbish detection ───────────────────────────────────────
describe('evaluateAnswer() — rubbish detection (no AI call)', () => {
  const rubbishInputs = [
    ['empty string', ''],
    ['single word', 'ok'],
    ['greeting hi', 'hi'],
    ['greeting hello', 'hello'],
    ['greeting hey', 'hey'],
    ['skip keyword', 'skip'],
    ['keyboard smash', 'asdfghjklzxcvbnm'],
    ['repeated character', 'aaaaaaaaaa'],
    ['test', 'test'],
  ];

  rubbishInputs.forEach(([label, input]) => {
    test(`returns zeroed score for: "${label}"`, async () => {
      const result = await evaluateAnswer('Tell me about closures.', input, 'Technical', 'Software Engineer');
      expect(callOpenRouter).not.toHaveBeenCalled();
      expect(result.overallScore).toBe(5);
      expect(result.technicalScore).toBe(0);
      expect(result.completenessScore).toBe(0);
      expect(result.strengths).toEqual(['None']);
    });
  });

  test('does NOT flag a valid short answer as rubbish', async () => {
    const result = await evaluateAnswer(
      'What is a closure?',
      'A closure is a function that retains its lexical scope.',
      'Technical', 'Software Engineer'
    );
    expect(callOpenRouter).toHaveBeenCalled();
  });
});

// ── evaluateAnswer — happy path ───────────────────────────────────────────────
describe('evaluateAnswer() — valid answer, mocked AI', () => {
  test('returns full evaluation object shape', async () => {
    const result = await evaluateAnswer(
      'Explain closures in JavaScript',
      'A closure is a function that has access to variables from its outer scope even after that scope has returned.',
      'Technical',
      'Frontend Engineer'
    );

    expect(result).toMatchObject({
      technicalScore: expect.any(Number),
      communicationScore: expect.any(Number),
      completenessScore: expect.any(Number),
      overallScore: expect.any(Number),
      strengths: expect.any(Array),
      improvements: expect.any(Array),
      idealAnswerHints: expect.any(String),
      keyMissingPoints: expect.any(Array),
    });
  });

  test('calls sanitizePromptInput for question, answer, type, role', async () => {
    await evaluateAnswer('Explain closures', 'A closure captures its surrounding scope.', 'Technical', 'Engineer');
    expect(sanitizePromptInput).toHaveBeenCalledTimes(4);
  });

  test('calls callOpenRouter with system + user messages', async () => {
    await evaluateAnswer('Explain closures', 'A closure captures its surrounding scope.', 'Technical', 'Engineer');
    expect(callOpenRouter).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user' }),
      ]),
      expect.objectContaining({ temperature: 0.3 })
    );
  });

  test('propagates AI API errors', async () => {
    callOpenRouter.mockRejectedValue(new Error('OpenRouter timeout'));
    await expect(
      evaluateAnswer('A question', 'A solid multi-word answer here.', 'HR', 'Manager')
    ).rejects.toThrow('OpenRouter timeout');
  });
});

// ── reviewCode ────────────────────────────────────────────────────────────────
describe('reviewCode() — mocked AI', () => {
  beforeEach(() => {
    parseJsonResponse.mockReturnValue(VALID_CODE_REVIEW);
  });

  test('returns correct shape', async () => {
    const result = await reviewCode(
      'function twoSum(nums, target) { return []; }',
      'javascript',
      'Two Sum',
      'Given an array of integers, return indices of two numbers that sum to target.',
      false
    );

    expect(result).toMatchObject({
      overallRating: expect.any(Number),
      timeComplexity: expect.any(String),
      spaceComplexity: expect.any(String),
      codeQuality: expect.any(Number),
      strengths: expect.any(Array),
      issues: expect.any(Array),
      optimizationTip: expect.any(String),
      hint: expect.any(String),
      interviewReadiness: expect.any(String),
    });
  });

  test('calls sanitizePromptInput for language, title, description', async () => {
    await reviewCode('const x = 1;', 'javascript', 'Two Sum', 'Find two numbers that add to target.', true);
    expect(sanitizePromptInput).toHaveBeenCalledTimes(3);
  });

  test('includes PASSED/FAILED status in user prompt', async () => {
    await reviewCode('const x = 1;', 'javascript', 'Test', 'Desc', true);
    const [messages] = callOpenRouter.mock.calls[0];
    const userContent = messages.find((m) => m.role === 'user').content;
    expect(userContent).toContain('PASSED');

    callOpenRouter.mockClear();
    await reviewCode('const x = 1;', 'javascript', 'Test', 'Desc', false);
    const [messages2] = callOpenRouter.mock.calls[0];
    const userContent2 = messages2.find((m) => m.role === 'user').content;
    expect(userContent2).toContain('FAILED');
  });

  test('propagates AI API errors', async () => {
    callOpenRouter.mockRejectedValue(new Error('Service unavailable'));
    await expect(
      reviewCode('const x = 1;', 'python', 'FizzBuzz', 'Classic', false)
    ).rejects.toThrow('Service unavailable');
  });
});
