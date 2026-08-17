/**
 * TRESK AI — Centralised Request Validation
 * =====================================================================
 * All API request bodies are validated here using Joi before they
 * reach any controller. Import `validate` middleware and the relevant
 * schema to protect a route.
 *
 * Usage:
 *   const { validate, schemas } = require('../../utils/validate');
 *   router.post('/register', validate(schemas.auth.register), auth.register);
 */

const Joi = require('joi');

// ── Generic middleware factory ────────────────────────────────────────────────
/**
 * Returns an Express middleware that validates req.body against `schema`.
 * On failure it responds 400 with the first validation error message.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: true,      // stop at the first error
    allowUnknown: false,   // reject unknown keys (prevents mass assignment)
    stripUnknown: true,    // silently remove fields not in schema
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Replace req.body with sanitised, typed values
  req.body = value;
  next();
};

// ── Reusable field definitions ────────────────────────────────────────────────
// Password must be 8–128 chars and contain at least one lowercase letter,
// one uppercase letter, and one digit (no plain-text weak passwords).
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one digit.',
    'string.min': 'Password must be at least 8 characters.',
  });

const email = Joi.string().email().max(254).lowercase().trim().required();

// A valid Supabase/Postgres UUID for session/entity IDs
const uuid = Joi.string().uuid({ version: ['uuidv4'] });

// ── Schema catalogue ──────────────────────────────────────────────────────────
const schemas = {

  auth: {
    register: Joi.object({
      name:           Joi.string().min(2).max(100).trim().required(),
      email,
      password,
      collegeName:    Joi.string().max(150).allow('').optional(),
      branch:         Joi.string().max(100).allow('').optional(),
      graduationYear: Joi.string().max(10).allow('').optional(),
    }),

    login: Joi.object({
      email,
      password: Joi.string().max(128).required(),
    }),

    googleAuth: Joi.object({
      // Must be a JWT-shaped string (3 dot-separated base64url segments)
      idToken: Joi.string()
        .pattern(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
        .required()
        .messages({ 'string.pattern.base': 'idToken must be a valid JWT.' }),
    }),

    changePassword: Joi.object({
      currentPassword: Joi.string().max(128).required(),
      newPassword:     password,
    }),

    updateProfile: Joi.object({
      name:           Joi.string().min(2).max(100).trim().optional(),
      currentRole:    Joi.string().max(100).allow('').optional(),
      location:       Joi.string().max(100).allow('').optional(),
      bio:            Joi.string().max(500).allow('').optional(),
      collegeName:    Joi.string().max(150).allow('').optional(),
      branch:         Joi.string().max(100).allow('').optional(),
      graduationYear: Joi.string().max(10).allow('').optional(),
    }),

    forgotPassword: Joi.object({
      email,
    }),

    resetPassword: Joi.object({
      token:       Joi.string().min(10).max(256).required(),
      newPassword: password,
    }),

    deleteAccount: Joi.object({
      password: Joi.string().max(128).required(),
    }),
  },



  interview: {
    start: Joi.object({
      company:    Joi.string().max(100).allow('').optional(),
      role:       Joi.string().max(100).allow('').optional(),
      type:       Joi.string().valid('hr','technical','behavioral','system_design','aptitude','coding').required(),
    }),

    generate: Joi.object({
      type:       Joi.string().valid('hr','technical','behavioral','system_design','aptitude','coding').required(),
      role:       Joi.string().max(100).allow('').optional(),
      company:    Joi.string().max(100).allow('').optional(),
      difficulty: Joi.string().valid('Easy','Medium','Hard').optional(),
      resumeText: Joi.string().max(20000).allow('').optional(),
    }),

    submitAnswer: Joi.object({
      sessionId: uuid.required(),
      answer:    Joi.string().min(1).max(8000).required(),
      questionIndex: Joi.number().integer().min(0).optional(),
    }),

    finishSession: Joi.object({
      sessionId: uuid.required(),
    }),
  },

  resume: {
    analyze: Joi.object({
      resumeText: Joi.string().min(10).max(50000).optional(),
      resumeData: Joi.object({
        name:           Joi.string().max(200).allow('').optional(),
        email:          Joi.string().email().max(254).allow('').optional(),
        phone:          Joi.string().max(30).allow('').optional(),
        skills:         Joi.array().items(Joi.string().max(100)).max(100).optional(),
        experience:     Joi.array().max(30).optional(),
        projects:       Joi.array().max(30).optional(),
        education:      Joi.array().max(20).optional(),
        targetRole:     Joi.string().max(100).allow('').optional(),
      }).optional(),
    }).or('resumeText', 'resumeData'),
  },

  coding: {
    run: Joi.object({
      code:      Joi.string().max(50000).required(),
      language:  Joi.string().valid('javascript','python','java','cpp','c','typescript','go','rust','ruby').required(),
      problemId: Joi.string().max(100).optional(),
    }),

    submit: Joi.object({
      code:      Joi.string().max(50000).required(),
      language:  Joi.string().valid('javascript','python','java','cpp','c','typescript','go','rust','ruby').required(),
      problemId: Joi.string().max(100).required(),
    }),
  },

  ai: {
    evaluateAnswer: Joi.object({
      question: Joi.string().min(1).max(2000).required(),
      answer:   Joi.string().min(1).max(8000).required(),
      type:     Joi.string().max(100).allow('').optional(),
      role:     Joi.string().max(100).allow('').optional(),
    }),

    analyzeResume: Joi.object({
      resumeText: Joi.string().min(10).max(50000).required(),
      targetRole: Joi.string().max(100).allow('').optional(),
    }),

    analyzeJd: Joi.object({
      jobDescription: Joi.string().min(10).max(20000).required(),
    }),

    generateQuestions: Joi.object({
      type:       Joi.string().valid('hr','technical','behavioral','system_design','aptitude','coding').required(),
      role:       Joi.string().max(100).required(),
      difficulty: Joi.string().valid('Easy','Medium','Hard').optional(),
      company:    Joi.string().max(100).allow('').optional(),
      language:   Joi.string().max(50).allow('').optional(),
      resumeText: Joi.string().max(20000).allow('').optional(),
    }),

    chat: Joi.object({
      message: Joi.string().min(1).max(4000).required(),
      context: Joi.string().max(2000).allow('').optional(),
    }),
  },
};

module.exports = { validate, schemas };
