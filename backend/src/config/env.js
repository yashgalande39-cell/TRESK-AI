/**
 * TRESK AI — Configuration and Environment Validator
 * Centralizes config parsing and enforces validation checks at startup.
 */
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// 1. JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ai_interview_token';
if (isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'super_secret_ai_interview_token') {
    throw new Error('FATAL: JWT_SECRET must be set and cannot be the default token in production mode.');
  }
} else {
  if (JWT_SECRET === 'super_secret_ai_interview_token') {
    console.warn('⚠️ WARNING: JWT_SECRET is set to the default token. Do not use this in production.');
  }
}

// 2. IS_DEMO_AUTH
const ALLOW_DEMO_AUTH = process.env.ALLOW_DEMO_AUTH === 'true';
const IS_DEMO_AUTH = ALLOW_DEMO_AUTH || process.env.NODE_ENV !== 'production';

// Helper to check and log demo mode usage
const requireDemoMode = (handlerName) => {
  if (!IS_DEMO_AUTH) {
    throw new Error(`Service temporarily unavailable: ${handlerName} offline fallback is disabled in production.`);
  }
  console.warn(`[DEMO MODE] ${handlerName} called. Proceeding with offline fallback.`);
  return true;
};

// 3. CORS_ORIGIN
let CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
if (isProduction) {
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
    throw new Error('FATAL: CORS_ORIGIN must be explicitly set and cannot be "*" in production mode.');
  }
}


// 5. S3 / Object Storage
const S3_ENABLED      = process.env.S3_ENABLED === 'true';
const S3_BUCKET       = process.env.S3_BUCKET || 'tresk-ai-uploads';
const S3_REGION       = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY_ID     = process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || '';

if (isProduction && S3_ENABLED) {
  if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('FATAL: S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set when S3_ENABLED=true in production.');
  }
}

// 6. Email provider
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';  // 'resend' | 'sendgrid' | 'smtp' | 'console'
const EMAIL_FROM     = process.env.EMAIL_FROM || 'TRESK AI <noreply@tresk.ai>';
const APP_BASE_URL   = process.env.APP_BASE_URL || 'http://localhost:5173';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

// 7. Sarvam AI STT
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_MODEL = process.env.SARVAM_MODEL || 'saaras:v3';
if (!SARVAM_API_KEY) {
  console.warn('⚠️ WARNING: SARVAM_API_KEY is not set. Speech-to-text features will be unavailable.');
}

// 8. Optional API keys — warn if missing but do not crash
const OPTIONAL_KEYS = [
  ['GEMINI_API_KEY',    'Gemini AI fallback features'],
  ['RAZORPAY_KEY_ID',  'Razorpay payment processing'],
];
for (const [key, feature] of OPTIONAL_KEYS) {
  if (!process.env[key]) {
    console.warn(`⚠️ WARNING: ${key} is not set. ${feature} will be unavailable.`);
  }
}

module.exports = {
  NODE_ENV,
  JWT_SECRET,
  IS_DEMO_AUTH,
  CORS_ORIGIN,
  requireDemoMode,

  // S3 Object Storage
  S3_ENABLED,
  S3_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  // Email
  EMAIL_PROVIDER,
  EMAIL_FROM,
  APP_BASE_URL,
  RESEND_API_KEY,
  SENDGRID_API_KEY,
  // Sarvam AI
  SARVAM_API_KEY,
  SARVAM_MODEL,
};

