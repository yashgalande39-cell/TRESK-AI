/**
 * Unit Tests — aiQueue.js
 * Run: npx jest --testPathPatterns="aiQueue"
 */

const mockAdd = jest.fn();
const mockGetJob = jest.fn();
const mockClose = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    getJob: mockGetJob,
    close: mockClose,
  })),
}));

jest.mock('../../config/redis', () => ({
  createRedisClient: jest.fn(() => ({})),
  isRedisReady: jest.fn(() => true),
}));

const {
  addEvaluationJob,
  getJobStatus,
  closeQueues,
} = require('../../queues/aiQueue');

describe('aiQueue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeQueues();
  });

  test('addEvaluationJob enqueues job and returns jobId + status', async () => {
    mockAdd.mockResolvedValue({ id: 'eval_123_456' });

    const result = await addEvaluationJob({
      sessionId: 'sess_123',
      userId: 'usr_abc',
      role: 'Full Stack Engineer',
      type: 'technical',
    });

    expect(result).toEqual({
      jobId: 'eval_123_456',
      status: 'queued',
    });
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(
      'evaluate-session',
      expect.objectContaining({ sessionId: 'sess_123' }),
      expect.objectContaining({ jobId: expect.stringContaining('eval_sess_123_') })
    );
  });

  test('getJobStatus returns job state and result for existing job', async () => {
    mockGetJob.mockResolvedValue({
      id: 'eval_123',
      getState: jest.fn().mockResolvedValue('completed'),
      returnvalue: { scoreCard: { overallScore: 90 } },
      failedReason: null,
    });

    const status = await getJobStatus('eval_123');

    expect(status).toEqual({
      jobId: 'eval_123',
      status: 'completed',
      result: { scoreCard: { overallScore: 90 } },
      error: null,
    });
  });

  test('getJobStatus returns not_found when job does not exist', async () => {
    mockGetJob.mockResolvedValue(null);

    const status = await getJobStatus('non_existent');

    expect(status).toEqual({
      status: 'not_found',
    });
  });
});
