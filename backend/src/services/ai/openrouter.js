const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const { LRUCache } = require('lru-cache');

// In-memory response cache
const responseCache = new LRUCache({
  max: 200,                  // max 200 entries
  ttl: 1000 * 60 * 30,      // 30-minute TTL
  maxSize: 10 * 1024 * 1024, // 10 MB total
  sizeCalculation: (v) => v.length,
});

/**
 * Parse JSON from AI response safely, stripping thinking tags and markdown fences
 */
function parseJsonResponse(text) {
  if (!text) throw new Error('Empty text content');
  // Remove thinking blocks <think>...</think>
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Try to extract JSON array
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { 
        return JSON.parse(arrMatch[0].replace(/,\s*([\]}])/g, '$1')); 
      } catch (_) {}
    }
    // If it is an array of strings, extract all completed quoted strings
    if (cleaned.includes('[')) {
      const stringMatches = [...cleaned.matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m => m[1].replace(/\\"/g, '"'));
      if (stringMatches.length >= 2) {
        return stringMatches;
      }
    }
    // Try to extract JSON object
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { 
        return JSON.parse(objMatch[0].replace(/,\s*([\]}])/g, '$1')); 
      } catch (_) {}
    }
    throw new Error(`Could not parse JSON from AI response: ${cleaned.slice(0, 150)}`);
  }
}


// Verified working active free-tier models on OpenRouter
const MODELS = {
  primary: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free',
  fast:    'google/gemma-4-31b-it:free',
  code:    'openai/gpt-oss-20b:free',
  free:    'nvidia/nemotron-3-super-120b-a12b:free',
};

// Failover chain — tried in order when a model is unavailable
const MODEL_FAILOVER = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'poolside/laguna-s-2.1:free',
];



/**
 * Call OpenRouter with automatic model failover, retry logic, and caching.
 */
async function callOpenRouter(messages, optionsOrModel = {}, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  let preferredModel = MODELS.primary;
  let actualOptions = options;

  if (typeof optionsOrModel === 'string') {
    preferredModel = optionsOrModel;
  } else {
    actualOptions = optionsOrModel;
  }

  const timeoutMs = actualOptions.timeout ?? 30000;

  // Dedup failover list: put preferred model first
  const modelsToTry = [preferredModel, ...MODEL_FAILOVER.filter(m => m !== preferredModel)];

  const logDebug = (msg) => global.logger?.debug ? global.logger.debug(msg) : console.log(msg);
  const logInfo  = (msg) => global.logger?.info ? global.logger.info(msg) : console.log(msg);

  // 1. Check in-memory L1 cache
  const cacheKey = JSON.stringify({ messages, model: preferredModel, options: actualOptions });
  if (responseCache.has(cacheKey)) {
    logDebug('[OpenRouter L1 Cache] Hit');
    return responseCache.get(cacheKey);
  }

  // 2. Check Redis L2 cache
  const { getCached, setCached, createCacheKey, DEFAULT_TTLS } = require('../cache/redisCache');
  const redisKey = createCacheKey('openrouter', { messages, model: preferredModel, options: actualOptions });
  const redisCached = await getCached(redisKey);
  if (redisCached) {
    logDebug('[OpenRouter L2 Redis Cache] Hit');
    responseCache.set(cacheKey, redisCached);
    return redisCached;
  }

  let lastError = null;

  for (const model of modelsToTry) {
    const body = {
      model,
      messages,
      temperature: actualOptions.temperature ?? 0.7,
      max_tokens: actualOptions.max_tokens ?? 1500,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logDebug(`[OpenRouter] Trying ${model}`);
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://tresk-ai.platform',
          'X-Title': 'TRESK AI Interview Platform',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response content from OpenRouter');

        const trimmed = text.trim();
        responseCache.set(cacheKey, trimmed);
        setCached(redisKey, trimmed, DEFAULT_TTLS.LLM_RESPONSE).catch(() => {});
        logInfo(`[OpenRouter] ✅ Success with ${model}`);
        return trimmed;
      }

      const errText = await response.text();

      // Rate limited — wait and retry same model
      if (response.status === 429) {
        const wait = 5000;
        console.warn(`[OpenRouter] Rate limited on ${model}, waiting ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      // Model unavailable (404) — try next in failover list
      if (response.status === 404 || response.status === 400) {
        console.warn(`[OpenRouter] Model ${model} unavailable (${response.status}), trying next...`);
        lastError = new Error(`Model ${model} unavailable: ${errText}`);
        continue;
      }

      throw new Error(`OpenRouter error ${response.status}: ${errText}`);

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`[OpenRouter] ${model} timed out after ${timeoutMs}ms, trying next...`);
        lastError = err;
        continue;
      }
      // Only continue to next model on network/availability errors
      if (err.message.includes('unavailable') || err.message.includes('404')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All OpenRouter models exhausted without a successful response');
}

module.exports = { callOpenRouter, parseJsonResponse, requestCache: responseCache, MODELS };
