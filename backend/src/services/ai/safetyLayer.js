/**
 * TRESK AI — AI Safety Layer
 * =====================================================================
 * Guards all LLM interactions against:
 *   • Prompt injection / jailbreak attempts
 *   • Malicious or malformed user inputs
 *   • Hallucinated / structurally invalid LLM outputs
 *
 * Usage:
 *   const { validateInput, validateOutput } = require('./safetyLayer');
 *   const safeInput = validateInput(userText);
 *   const safeOutput = validateOutput(llmResponse, expectedSchema);
 */

// ─── Injection / Jailbreak Pattern Detection ─────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /you\s+are\s+now\s+(?:a|an|the)/i,
  /act\s+as\s+(?:a|an|the)/i,
  /pretend\s+(?:you\s+are|to\s+be)/i,
  /forget\s+(all\s+)?(?:your\s+)?(?:previous\s+)?instructions?/i,
  /bypass\s+(?:your\s+)?(?:safety|restrictions?|filters?)/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,    // DAN prompt
  /\[?DAN\]?/,
  /<\s*script\s*>/i,         // XSS injection attempt
  /system\s*:\s*you\s+are/i, // Fake system message injection
  /\[\[.*?\]\]/,             // Double-bracket template injection
  /\{\{.*?\}\}/,             // Handlebars injection attempt
];

// Regex to detect SQL injection fragments in text inputs
const SQL_INJECTION_PATTERN = /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bEXEC\b|\bUNION\b|\bSELECT\b).{0,20}(\bFROM\b|\bINTO\b|\bWHERE\b|\bTABLE\b)/i;

// Maximum allowed length for user-provided text
const MAX_INPUT_LENGTH = 8000;

// Minimum expected length for a valid LLM JSON response
const MIN_OUTPUT_LENGTH = 10;

/**
 * Sanitize and validate user-provided text before it reaches the LLM.
 * Returns: { safe: boolean, text: string, reason?: string }
 */
function validateInput(text) {
  if (typeof text !== 'string') {
    return { safe: false, text: '', reason: 'Input must be a string' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { safe: false, text: '', reason: 'Input is empty' };
  }

  if (trimmed.length > MAX_INPUT_LENGTH) {
    // Truncate gracefully rather than reject — interview answers can be long
    return {
      safe: true,
      text: trimmed.slice(0, MAX_INPUT_LENGTH) + '...[truncated]',
      reason: 'Input truncated to maximum length',
    };
  }

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        text: '',
        reason: `Potential prompt injection detected (pattern: ${pattern.source.slice(0, 30)})`,
      };
    }
  }

  // Check for SQL injection
  if (SQL_INJECTION_PATTERN.test(trimmed)) {
    return { safe: false, text: '', reason: 'Potential SQL injection pattern detected' };
  }

  // Strip common HTML tags to prevent XSS leaking through to the LLM response
  const sanitized = trimmed
    .replace(/<[^>]+>/g, '')          // strip HTML tags
    .replace(/[^\x20-\x7E\n\r\t]/g, '') // strip non-printable ASCII (keep normal text)
    .trim();

  return { safe: true, text: sanitized };
}

/**
 * Validate LLM output structure.
 * - If expectedJson = true, parse and check it's a valid object.
 * - If requiredKeys provided, verify all keys exist.
 * Returns: { valid: boolean, data: any, reason?: string }
 */
function validateOutput(rawOutput, { expectedJson = false, requiredKeys = [], maxLength = 50000 } = {}) {
  if (typeof rawOutput !== 'string') {
    return { valid: false, data: null, reason: 'LLM output is not a string' };
  }

  if (rawOutput.trim().length < MIN_OUTPUT_LENGTH) {
    return { valid: false, data: null, reason: 'LLM output is too short — likely a failure or refusal' };
  }

  if (rawOutput.length > maxLength) {
    // Truncate oversized outputs
    rawOutput = rawOutput.slice(0, maxLength);
  }

  // Check for common LLM refusal phrases
  const refusalPhrases = [
    /i cannot.*?(answer|help|provide|assist)/i,
    /i (am|'m) unable to/i,
    /as an (ai|language model|llm)/i,
    /i don't have the ability/i,
  ];
  for (const phrase of refusalPhrases) {
    if (phrase.test(rawOutput) && rawOutput.length < 500) {
      return { valid: false, data: rawOutput, reason: 'LLM response appears to be a refusal' };
    }
  }

  if (!expectedJson) {
    return { valid: true, data: rawOutput };
  }

  // Attempt to extract JSON from markdown code fences or raw
  let jsonStr = rawOutput;
  const fenceMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1];

  try {
    const parsed = JSON.parse(jsonStr);

    if (requiredKeys.length > 0) {
      const missingKeys = requiredKeys.filter(k => !(k in parsed));
      if (missingKeys.length > 0) {
        return {
          valid: false,
          data: parsed,
          reason: `LLM response missing required keys: ${missingKeys.join(', ')}`,
        };
      }
    }

    return { valid: true, data: parsed };
  } catch (e) {
    return { valid: false, data: rawOutput, reason: `JSON parse error: ${e.message}` };
  }
}

/**
 * Express middleware to validate prompt-like inputs on AI endpoints.
 * Checks req.body fields that will be used in LLM prompts.
 */
function promptGuardMiddleware(fieldsToCheck = ['answer', 'question', 'message', 'query']) {
  return (req, res, next) => {
    for (const field of fieldsToCheck) {
      if (req.body && req.body[field] !== undefined) {
        const { safe, text, reason } = validateInput(String(req.body[field]));
        if (!safe) {
          return res.status(400).json({
            error: 'Invalid input detected',
            reason: reason || 'Input failed safety validation',
            field,
          });
        }
        req.body[field] = text; // replace with sanitized version
      }
    }
    next();
  };
}

/**
 * Prompt Sanitization Utility
 * Strips structural characters used in prompt injections and caps lengths.
 */
function sanitizePromptInput(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>{}[\]\\]/g, '')   // remove structural characters
    .replace(/\n{3,}/g, '\n\n')    // collapse excessive newlines
    .trim()
    .slice(0, maxLength);
}

module.exports = { validateInput, validateOutput, promptGuardMiddleware, sanitizePromptInput };
