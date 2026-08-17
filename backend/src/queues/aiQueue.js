/**
 * TRESK AI — BullMQ AI Workload Queues
 * =====================================================================
 * Manages background asynchronous job queues for heavy AI tasks:
 * - Post-interview scorecard compilation & personalized feedback
 * - Resume ATS multi-stage parsing
 */

const { Queue } = require('bullmq');
const { createRedisClient, isRedisReady } = require('../config/redis');

const EVALUATION_QUEUE_NAME = 'ai-evaluation-queue';

let evaluationQueue = null;

/**
 * Get or initialize the evaluation Queue instance
 * @returns {Queue|null}
 */
function getEvaluationQueue() {
  if (!evaluationQueue) {
    try {
      const redisConnection = createRedisClient();
      evaluationQueue = new Queue(EVALUATION_QUEUE_NAME, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: { age: 3600 * 24 }, // keep completed jobs for 24h
          removeOnFail: { age: 3600 * 48 },     // keep failed jobs for 48h
        },
      });
    } catch (err) {
      if (global.logger?.warn) {
        global.logger.warn({ err: err.message }, '⚠️ Failed to initialize BullMQ evaluation queue');
      }
      return null;
    }
  }
  return evaluationQueue;
}

/**
 * Add a post-interview evaluation job to the queue
 * @param {object} data - { sessionId, userId, role, type, scoreCard, transcriptList }
 * @returns {Promise<{ jobId: string, status: string }|null>}
 */
async function addEvaluationJob(data) {
  const queue = getEvaluationQueue();
  if (!queue) return null;

  try {
    const job = await queue.add('evaluate-session', data, {
      jobId: `eval_${data.sessionId}_${Date.now()}`,
    });
    return {
      jobId: job.id,
      status: 'queued',
    };
  } catch (err) {
    if (global.logger?.warn) {
      global.logger.warn({ err: err.message, sessionId: data.sessionId }, '⚠️ Could not enqueue evaluation job');
    }
    return null;
  }
}

/**
 * Retrieve status and result of a queued job by ID
 * @param {string} jobId
 * @returns {Promise<{ status: string, progress?: any, result?: any, error?: string }>}
 */
async function getJobStatus(jobId) {
  const queue = getEvaluationQueue();
  if (!queue) {
    return { status: 'unavailable', error: 'Queue service offline' };
  }

  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const result = job.returnvalue || null;
    const failedReason = job.failedReason || null;

    return {
      jobId: job.id,
      status: state, // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
      result,
      error: failedReason,
    };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

/**
 * Close queue connections gracefully
 */
async function closeQueues() {
  if (evaluationQueue) {
    try {
      await evaluationQueue.close();
    } catch (_) {}
    evaluationQueue = null;
  }
}

module.exports = {
  EVALUATION_QUEUE_NAME,
  getEvaluationQueue,
  addEvaluationJob,
  getJobStatus,
  closeQueues,
};
