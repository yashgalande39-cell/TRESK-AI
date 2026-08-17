/**
 * Unit Tests — fileMagic.js (Magic-byte detection)
 * Run: npm test -- --testPathPattern=fileMagic
 */

const { validateFileMagic } = require('../../utils/fileMagic');

describe('validateFileMagic()', () => {
  test('correctly identifies valid PDF file magic bytes (%PDF)', () => {
    const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
    expect(validateFileMagic(validPdfBuffer, 'application/pdf')).toBe(true);
  });

  test('rejects spoofed PDF file (e.g. text or exe disguised with pdf mime)', () => {
    const fakePdfBuffer = Buffer.from('NOT A REAL PDF FILE CONTENT');
    expect(validateFileMagic(fakePdfBuffer, 'application/pdf')).toBe(false);
  });

  test('correctly identifies valid DOCX / Zip file magic bytes (PK..)', () => {
    const validDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    expect(validateFileMagic(validDocxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
  });

  test('correctly identifies valid legacy DOC file magic bytes (OLE2 header)', () => {
    const validDocBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    expect(validateFileMagic(validDocBuffer, 'application/msword')).toBe(true);
  });

  test('allows plain text and markdown without magic byte restriction', () => {
    const textBuffer = Buffer.from('Plain text resume content');
    expect(validateFileMagic(textBuffer, 'text/plain')).toBe(true);
    expect(validateFileMagic(textBuffer, 'text/markdown')).toBe(true);
  });

  test('rejects unsupported or unknown MIME types', () => {
    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ DOS header
    expect(validateFileMagic(exeBuffer, 'application/x-dosexec')).toBe(false);
  });

  test('returns false on empty or short buffer', () => {
    expect(validateFileMagic(Buffer.from([]), 'application/pdf')).toBe(false);
    expect(validateFileMagic(Buffer.from([0x25]), 'application/pdf')).toBe(false);
    expect(validateFileMagic(null, 'application/pdf')).toBe(false);
  });
});
