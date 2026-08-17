/**
 * TRESK AI — Sarvam AI Speech-to-Text Service
 * Model: saaras:v3
 * Endpoint: https://api.sarvam.ai/speech-to-text
 */

const { SARVAM_API_KEY, SARVAM_MODEL } = require('../../config/env');

const SARVAM_STT_ENDPOINT = 'https://api.sarvam.ai/speech-to-text';

/**
 * Transcribe an audio buffer using Sarvam AI Saaras:v3 model
 * @param {Buffer} audioBuffer - Audio file buffer (WAV, MP3, AAC, FLAC, OGG)
 * @param {Object} [options]
 * @param {string} [options.filename='audio.wav'] - Filename for multipart form
 * @param {string} [options.mimeType='audio/wav'] - Mime type of the audio
 * @param {string} [options.model] - Model name (default 'saaras:v3')
 * @param {string} [options.mode] - 'transcribe' | 'translate' | 'verbatim' | 'codemix'
 * @param {string} [options.language_code] - e.g. 'en-IN', 'hi-IN', etc.
 * @returns {Promise<{ transcript: string, language_code?: string, request_id?: string, raw?: any }>}
 */
async function transcribeAudio(audioBuffer, options = {}) {
  const apiKey = options.apiKey || SARVAM_API_KEY || process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured.');
  }

  const model = options.model || SARVAM_MODEL || 'saaras:v3';
  const mode = options.mode || 'transcribe';
  const filename = options.filename || 'audio.wav';
  const mimeType = options.mimeType || 'audio/wav';

  const blob = new Blob([audioBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', model);
  formData.append('mode', mode);

  if (options.language_code) {
    formData.append('language_code', options.language_code);
  }
  if (options.with_timestamps) {
    formData.append('with_timestamps', 'true');
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 25000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(SARVAM_STT_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = responseData?.error?.message || responseData?.message || `Sarvam STT failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = responseData;
      throw err;
    }

    return {
      transcript: responseData?.transcript || '',
      language_code: responseData?.language_code || 'en-IN',
      request_id: responseData?.request_id,
      language_probability: responseData?.language_probability,
      timestamps: responseData?.timestamps,
      raw: responseData,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Sarvam STT request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  SARVAM_STT_ENDPOINT,
};
