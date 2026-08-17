/**
 * TRESK AI — File Magic-Byte Validator
 * =====================================================================
 * Validates uploaded file content by checking the first few bytes (magic
 * numbers) rather than trusting the MIME type or file extension, which
 * are trivially spoofed by an attacker.
 *
 * Usage:
 *   const { validateFileMagic } = require('../../utils/fileMagic');
 *   const isValid = validateFileMagic(buffer, 'application/pdf');
 */

// ── Known file signatures (magic bytes) ──────────────────────────────────────
const SIGNATURES = {
  // PDF: %PDF
  pdf: { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },

  // ZIP / DOCX / XLSX / PPTX (all use ZIP container): PK\x03\x04
  zip: { bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0 },

  // Legacy Office DOC / XLS / PPT (CFBF/OLE2): \xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1
  ole2: { bytes: [0xD0, 0xCF, 0x11, 0xE0], offset: 0 },
};

/**
 * MIME → accepted signatures map.
 * Each MIME type lists which magic-byte signatures are acceptable.
 */
const MIME_SIGNATURES = {
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['zip'],
  'application/msword': ['ole2'],
  'text/plain': null,     // plain text has no magic bytes — skip check
  'text/markdown': null,  // same as plain text
};

/**
 * Checks whether the given buffer starts with an expected magic byte sequence.
 *
 * @param {Buffer} buffer   - The full file buffer (or at least the first 8 bytes).
 * @param {string} mimeType - The declared MIME type of the file.
 * @returns {boolean}       - true if the file content matches the declared type.
 */
function validateFileMagic(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  // If we have no MIME rule for this type, reject it
  if (!(mimeType in MIME_SIGNATURES)) return false;

  const acceptedSigs = MIME_SIGNATURES[mimeType];

  // null means no magic bytes expected (e.g. plain text) — accept any content
  if (acceptedSigs === null) return true;

  // Check each accepted signature
  for (const sigName of acceptedSigs) {
    const sig = SIGNATURES[sigName];
    if (!sig) continue;

    const { bytes, offset } = sig;
    if (buffer.length < offset + bytes.length) continue;

    const matches = bytes.every((byte, i) => buffer[offset + i] === byte);
    if (matches) return true;
  }

  return false;
}

module.exports = { validateFileMagic };
