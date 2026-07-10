const { callOpenRouter, parseJsonResponse } = require('./openrouter');
const { sanitizePromptInput } = require('../../utils/sanitizePromptInput');

const isRubbishResponse = (text) => {
  if (!text) return true;
  const clean = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  
  if (words.length === 0) return true;
  
  // Rule 1: Very short response (less than 4 words)
  if (words.length < 4) {
    const commonGreetings = ['hi', 'hii', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'skip', 'nothing', 'dont know', 'i dont know', 'test', 'demo', 'asdf', 'yo', 'hii software engineer', 'hello interviewer'];
    const sentence = words.join(' ');
    if (words.length === 1 || commonGreetings.includes(sentence) || words.every(w => commonGreetings.includes(w))) {
      return true;
    }
  }

  // Rule 2: Repetitive keyboard smash or single character repetition
  const firstWord = words[0] || '';
  if (firstWord.length > 15 && !firstWord.includes('-') && !firstWord.includes('_')) {
    return true; // Keyboard smash like "asdfasdfasdfasdfasdf"
  }
  
  // Rule 3: Single-character loops like "aaaaaa"
  if (/^(.)\1{4,}$/.test(clean.replace(/\s+/g, ""))) {
    return true;
  }

  return false;
};

/**
 * AI-powered deep evaluation of a candidate's answer.
 * @param {string} question - The interview question asked
 * @param {string} answer - The candidate's response
 * @param {string} type - HR | Technical | Behavioral | Aptitude | Coding
 * @param {string} role - Target job role
 * @returns {Promise<object>} Evaluation object containing rubrics, scores, and feedback
 */
async function evaluateAnswer(question, answer, type, role) {
  if (isRubbishResponse(answer)) {
    return {
      technicalScore: 0,
      communicationScore: 10,
      completenessScore: 0,
      overallScore: 5,
      strengths: ["None"],
      improvements: [
        "Provide a professional, detailed answer instead of brief greetings or irrelevant input.",
        "Ensure your response is directly relevant to the interview question."
      ],
      idealAnswerHints: "An ideal answer should address the question systematically with examples and explanations.",
      keyMissingPoints: ["Comprehensive response to the question", "Professional explanation and detail"]
    };
  }

  const safeRole = sanitizePromptInput(role, 100);
  const safeType = sanitizePromptInput(type, 100);
  const safeQuestion = sanitizePromptInput(question, 500);
  const safeAnswer = sanitizePromptInput(answer, 2000);

  const systemPrompt = `You are an elite, demanding tech interviewer evaluating interview answers. 
Be highly analytical, fair, and extremely specific. Grade strictly but provide constructive feedback.`;

  const userPrompt = `Evaluate this mock interview answer for a ${safeRole} position.
Question Type: ${safeType}
Question: ${safeQuestion}
Candidate's Answer: ${safeAnswer}

Evaluate and return ONLY a valid JSON object matching the exact structure below (no markdown fences, no extra text):
{
  "technicalScore": 80, // score from 0-100 evaluating depth, correctness, and accuracy
  "communicationScore": 85, // score from 0-100 evaluating clarity, professionalism, structure, and pacing
  "completenessScore": 75, // score from 0-100 evaluating how thoroughly the question was answered
  "overallScore": 80, // weighted average score 0-100
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "idealAnswerHints": "A 2-3 sentence explanation of what an ideal answer would include",
  "keyMissingPoints": ["missing point 1", "missing point 2"]
}`;

  try {
    const text = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.3, max_tokens: 800 });

    return parseJsonResponse(text);
  } catch (error) {
    console.error('[scoringEngine] Error evaluating answer:', error.message);
    throw error;
  }
}

/**
 * AI-powered software engineering code review.
 * @param {string} code - Submitted code solution
 * @param {string} language - Programming language used
 * @param {string} challengeTitle - Name of the DSA challenge
 * @param {string} challengeDesc - Description of the problem
 * @param {boolean} allPassed - True if all test cases passed in code runner
 * @returns {Promise<object>} Code review feedback
 */
async function reviewCode(code, language, challengeTitle, challengeDesc, allPassed) {
  const safeLanguage = sanitizePromptInput(language, 50);
  const safeTitle = sanitizePromptInput(challengeTitle, 100);
  const safeDesc = sanitizePromptInput(challengeDesc, 1000);

  const systemPrompt = `You are a principal software engineer conducting a detailed technical code review. 
Evaluate algorithmic complexity, code quality, readability, edge-case coverage, and best practices.`;

  const userPrompt = `Review this solution written in ${safeLanguage} for the coding challenge "${safeTitle}".
Problem Description:
${safeDesc}

Submitted Code:
\`\`\`${safeLanguage}
${code}
\`\`\`

Test Cases Execution Result: ${allPassed ? 'PASSED ALL TEST CASES ✅' : 'FAILED TEST CASES ❌'}

Evaluate and return ONLY a valid JSON object matching the exact structure below (no markdown fences, no extra text):
{
  "overallRating": 8, // rating from 1-10
  "timeComplexity": "O(N) with explanation",
  "spaceComplexity": "O(1) with explanation",
  "codeQuality": 85, // score from 0-100
  "strengths": ["strength 1", "strength 2"],
  "issues": ["issue 1", "issue 2"],
  "optimizationTip": "One key tip to optimize time/space or readability",
  "hint": "${allPassed ? 'Suggestion for further micro-optimizations or refactorings' : 'Constructive hint to fix failing test cases without writing the actual code for them'}",
  "interviewReadiness": "Short assessment of whether this code would pass a FAANG whiteboard or technical interview"
}`;

  try {
    const text = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.3, max_tokens: 900 });

    return parseJsonResponse(text);
  } catch (error) {
    console.error('[scoringEngine] Error reviewing code:', error.message);
    throw error;
  }
}

module.exports = {
  evaluateAnswer,
  reviewCode,
};
