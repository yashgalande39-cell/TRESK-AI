const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const resumeController = require('./resume.controller');
const authMiddleware = require('../../middleware/authMiddleware');
const { validateFileMagic } = require('../../utils/fileMagic');

// ── Allowed MIME types for resume uploads ──────────────────────────────────────
// Note: 'application/octet-stream' is intentionally excluded — it is too broad
// and can be used to spoof any file type. Magic-byte validation below handles
// the edge case where a PDF is sent with an incorrect MIME type.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.doc', '.docx']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB cap
    files: 1,                   // Only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();

    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
    const extOk  = ALLOWED_EXTENSIONS.has(ext);

    if (!mimeOk && !extOk) {
      return cb(new Error('Invalid file type. Only PDF, TXT, and Word documents are allowed.'), false);
    }
    cb(null, true);
  },
});

/**
 * Post-upload magic-byte validation middleware.
 * Runs after multer has placed the file in memory, verifying the actual
 * file content matches the declared MIME type.
 */
const validateUpload = (req, res, next) => {
  const file = req.file;
  if (!file) return next();

  // Normalize MIME for files sent as text/plain but having a document extension
  const ext = path.extname(file.originalname || '').toLowerCase();
  const effectiveMime = (file.mimetype === 'text/plain' && (ext === '.doc' || ext === '.docx'))
    ? (ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword')
    : file.mimetype;

  // For text files, skip magic-byte check (no magic bytes for plain text)
  if (effectiveMime === 'text/plain' || effectiveMime === 'text/markdown') {
    return next();
  }

  if (!validateFileMagic(file.buffer, effectiveMime)) {
    return res.status(400).json({
      message: 'File content does not match its declared type. Upload rejected.',
    });
  }

  // Sanitize filename: strip path components and limit length
  file.originalname = path
    .basename(file.originalname || 'upload')
    .replace(/[^a-zA-Z0-9._\-\s]/g, '_')
    .slice(0, 200);

  next();
};

// ── Protect all resume endpoints with authentication ───────────────────────────
router.use(authMiddleware);

router.post('/build',    resumeController.buildResume);
router.post('/analyze',  resumeController.analyzeResume);
router.post('/upload',   upload.single('resume'), validateUpload, resumeController.uploadResume);
router.get('/',          resumeController.getUserResumes);

module.exports = router;


