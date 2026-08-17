const { CORS_ORIGIN, JWT_SECRET, IS_DEMO_AUTH } = require('./config/env');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { globalLimiter, authLimiter, passwordResetLimiter, aiLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { connectPG, query } = require('./config/pgDb');
const { createRedisClient, initRedis, closeRedisConnections } = require('./config/redis');
const { initAIWorker, closeAIWorker } = require('./workers/aiWorker');
const { closeQueues } = require('./queues/aiQueue');
const jwt = require('jsonwebtoken');
const { promptGuardMiddleware } = require('./services/ai/safetyLayer');

// ── Structured Logger ─────────────────────────────────────────────────────────
// Uses pino when available, falls back to console. Install with: npm install pino
let logger;
try {
  const pino = require('pino');
  logger = pino({ level: process.env.LOG_LEVEL || 'info' });
} catch {
  logger = {
    info:  (...a) => console.log('[INFO]',  ...a),
    warn:  (...a) => console.warn('[WARN]',  ...a),
    error: (...a) => console.error('[ERROR]', ...a),
    debug: (...a) => { if (process.env.LOG_LEVEL === 'debug') console.log('[DEBUG]', ...a); },
  };
}
global.logger = logger;

// ── Modular SaaS Module Routes ────────────────────────────────────────────────
const authRoutes         = require('./modules/auth/auth.routes');
const interviewRoutes    = require('./modules/interview/interview.routes');
const resumeRoutes       = require('./modules/resume/resume.routes');
const gamificationRoutes = require('./modules/gamification/gamification.routes');
const codingRoutes       = require('./modules/coding/coding.routes');
const aiRoutes           = require('./modules/ai/ai.routes');
const adminRoutes        = require('./modules/admin/admin.routes');
const analyticsRoutes    = require('./modules/analytics/analytics.routes');
const treskRoutes        = require('./modules/ai/tresk.routes');
const replayRoutes       = require('./modules/interview/replay.routes');
const notificationRoutes = require('./modules/notification/notification.routes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (typeof CORS_ORIGIN === 'string' ? CORS_ORIGIN : '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
};

// ── Enable CORS (Must be registered first) ─────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy rejection: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-timezone'],
  credentials: true,   // Required for httpOnly cookies to be sent cross-origin
}));

// ── Secure Headers with Helmet ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,  // Allow embedding (for webcam/audio features)
  contentSecurityPolicy: false,       // Managed by frontend
}));

// ── Global Rate Limiter ────────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Stricter Auth Limiters ────────────────────────────────────────────────────
app.use('/api/auth/login',           authLimiter);
app.use('/api/auth/register',        authLimiter);
app.use('/api/auth/google',          authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password',  passwordResetLimiter);
app.use('/api/auth/refresh',         authLimiter); // Prevent refresh token brute-force

// ── AI Limiter ─────────────────────────────────────────────────────────────────
app.use('/api/ai',    aiLimiter);
app.use('/api/tresk', aiLimiter);

// ── Upload Limiter ─────────────────────────────────────────────────────────────
app.use('/api/resumes/upload', uploadLimiter);


// ── Cookie Parser (must be before routes that need cookies) ───────────────────────
app.use(cookieParser());

// ── Body Parsers (after webhook route) ────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));


// ── AI Safety: Prompt Injection Guard on all AI routes ───────────────────────
app.use('/api/ai',    promptGuardMiddleware(['answer', 'question', 'message', 'query', 'prompt']));
app.use('/api/tresk', promptGuardMiddleware(['message', 'query', 'prompt']));

// ── Health Check Endpoints ────────────────────────────────────────────────────
// /health/live — simple liveness probe (always 200 if process is up)
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// /health/ready — readiness probe (checks DB connection)
app.get('/health/ready', async (req, res) => {
  let dbReady = false;
  try {
    await query('SELECT 1');
    dbReady = true;
  } catch { /* ignore */ }

  const ready = dbReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: { database: dbReady ? 'ok' : 'fail' },
    timestamp: new Date().toISOString(),
  });
});

// ── Diagnostic status check ───────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    // Log full error server-side, but don't expose it to the client
    logger.warn({ err }, '[status] Database connectivity check failed');
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    status: 'online',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Register routes ───────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes);
app.use('/api/interviews/replay', replayRoutes);  // more specific first
app.use('/api/interviews',        interviewRoutes);
app.use('/api/resumes',           resumeRoutes);
app.use('/api/gamification',      gamificationRoutes);
app.use('/api/coding',            codingRoutes);
app.use('/api/ai',                aiRoutes);
app.use('/api/admin',             adminRoutes);
app.use('/api/analytics',         analyticsRoutes);
app.use('/api/tresk',             treskRoutes);
app.use('/api/notifications',     notificationRoutes);

// ── Multer Error Handler (file upload validation) ─────────────────────────────
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || err.message?.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// ── 404 Not Found Catch-All for API routes ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    statusCode: 404,
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist.`,
    why: 'The requested resource URL or HTTP method may be incorrect, moved, or deprecated.',
    action: 'Please verify the URL path or check the TRESK AI API documentation.',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  // Always log full error details server-side (including stack)
  logger.error({ err, path: req.path, method: req.method }, `[${status}] ${err.message}`);
  // Never send internal details (stack, raw message) to the client
  const isClientError = status >= 400 && status < 500;
  res.status(status).json({
    error: isClientError ? (err.message || 'Bad Request') : 'Internal Server Error',
    message: isClientError
      ? (err.message || 'The request could not be processed.')
      : 'An unexpected error occurred. Please try again later.',
  });
});


logger.info('🤖 OpenRouter AI service registered on /api/ai');
logger.info('🧠 TRESK Career Copilot registered on /api/tresk');
logger.info('📼 Interview Replay registered on /api/interviews/replay');
logger.info('📈 Analytics Dashboard registered on /api/analytics');

// ── Socket.IO configuration ───────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error('Socket.IO CORS not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Graceful ping timeouts
  pingTimeout:  60000,
  pingInterval: 25000,
});

global.io = io;

// Socket.IO Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    if (IS_DEMO_AUTH) {
      socket.user = { userId: 'guest', email: 'guest@tresk.ai', role: 'user' };
      return next();
    }
    return next(new Error('Authentication error: Token required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    if (IS_DEMO_AUTH) {
      socket.user = { userId: 'guest', email: 'guest@tresk.ai', role: 'user' };
      return next();
    }
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, '🔌 Client connected');

  // Auto-join user-specific notification channel
  if (socket.user?.userId) {
    socket.join(`user_${socket.user.userId}`);
  }

  socket.on('join_session', (sessionId) => {
    socket.join(`session_${sessionId}`);
    logger.debug({ socketId: socket.id, sessionId }, '👥 Client joined session channel');
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    logger.debug({ socketId: socket.id, roomId }, '👤 Client joined room');
    socket.to(roomId).emit('peer_joined', { socketId: socket.id });
  });

  socket.on('code_change', ({ roomId, code, language }) => {
    socket.to(roomId).emit('code_update', { code, language });
  });

  socket.on('draw_path', ({ roomId, drawData }) => {
    socket.to(roomId).emit('draw_update', { drawData });
  });

  socket.on('clear_canvas', (roomId) => {
    socket.to(roomId).emit('canvas_cleared');
  });

  socket.on('signal', ({ roomId, signalData }) => {
    socket.to(roomId).emit('signal_receive', { signalData, senderId: socket.id });
  });

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, '🔌 Client disconnected');
  });
});

// ── Boot Database, Redis, Queues and Listen ───────────────────────────────────
const PORT = process.env.PORT || 5000;

let httpServer = null;

Promise.all([
  connectPG().catch((err) => {
    logger.error({ err }, '❌ Failed to connect to PostgreSQL');
    logger.info('🔄 Starting in offline mode (DB-dependent endpoints will fail)');
  }),
  initRedis().then((connected) => {
    if (connected) {
      try {
        const pubClient = createRedisClient();
        const subClient = createRedisClient();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('🔌 Socket.IO Redis adapter registered for multi-instance clustering');
      } catch (adapterErr) {
        logger.warn({ err: adapterErr.message }, '⚠️ Socket.IO using standard in-memory adapter');
      }
      initAIWorker(io);
      logger.info('⚙️ BullMQ AI background worker initialized');
    }
  }).catch((err) => {
    logger.warn({ err: err.message }, 'Redis init skipped, using in-memory fallback');
  }),
]).finally(() => {
  httpServer = server.listen(PORT, () => {
    logger.info(`🚀 TRESK AI Backend running on http://localhost:${PORT}`);
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info({ signal }, 'Received shutdown signal. Closing server gracefully...');

  try {
    await closeAIWorker();
    await closeQueues();
    await closeRedisConnections();
  } catch (cleanErr) {
    logger.warn({ err: cleanErr.message }, 'Warning during cleanup of Redis/Queues');
  }

  if (httpServer) {
    httpServer.close((err) => {
      if (err) {
        logger.error({ err }, 'Error during server close');
        process.exit(1);
      }
      logger.info('✅ HTTP server closed. Goodbye.');
      process.exit(0);
    });

    // Force exit after 10s if connections don't drain
    setTimeout(() => {
      logger.warn('⚠️  Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled Promise Rejections ──────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '⚠️  Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, '💥 Uncaught Exception — shutting down');
  shutdown('uncaughtException');
});
