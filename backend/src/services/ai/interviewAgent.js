const { callOpenRouter, parseJsonResponse } = require('./openrouter');
const { sanitizePromptInput } = require('../../utils/sanitizePromptInput');

/**
 * Generate 5 tailored interview questions based on role, experience, industry, and resume.
 * @param {string} type - HR | Technical | Behavioral | Aptitude | Coding
 * @param {string} difficulty - Beginner | Intermediate | Advanced | Expert
 * @param {string} role - Target job role
 * @param {string} company - Target company
 * @param {string} language - Programming language / domain
 * @param {string} resumeText - Resume context (optional)
 * @returns {Promise<string[]>} Array of 5 question strings
 */
async function generateInterviewQuestions(type, difficulty, role, company, language, resumeText = '') {
  const safeRole = sanitizePromptInput(role, 100);
  const safeCompany = sanitizePromptInput(company, 100);
  const safeResume = sanitizePromptInput(resumeText, 8000);
  const safeType = sanitizePromptInput(type, 100);
  const safeLanguage = sanitizePromptInput(language, 100);
  const safeDifficulty = sanitizePromptInput(difficulty, 100);

  const companyCtx = safeCompany && safeCompany !== 'Common' ? `at ${safeCompany}` : 'at a top technology company';
  const hasResume = Boolean(safeResume && safeResume.trim().length > 30);
  
  const resumeCtx = hasResume
    ? `\n\n════════ CANDIDATE RESUME DETAILS ════════\n${safeResume}\n══════════════════════════════════════════`
    : '';

  const systemPrompt = `You are a world-class senior hiring manager and principal tech interviewer at an elite company. 
You conduct realistic, authentic, and deeply personalized interviews. 
When a candidate's resume is provided, you meticulously analyze their actual projects, tech stack, work experience, metrics, and education to ask customized questions that directly cite their resume details. 
Avoid generic textbook questions. Sound conversational, professional, and insightful.`;

  const userPrompt = `Generate exactly 5 ${safeDifficulty}-level mock interview questions for a ${safeRole} position ${companyCtx}.
Interview Domain: ${safeType}
Programming Language/Domain: ${safeLanguage || 'General'}${resumeCtx}

Instructions:
${hasResume ? `
- MANDATORY RESUME PERSONALIZATION: You MUST reference specific projects, claimed metrics, previous roles, or specific libraries/tools listed in the candidate's resume above.
- Example pattern: "In your resume you noted working on [Project X] using [Tech Y] to [Metric/Goal Z]. Can you walk me through the system architecture and how you handled [technical challenge]?"
- For HR: Probe their career journey, leadership in their listed projects, and team dynamics at past companies/internships.
- For Technical: Deep-dive into architectural choices, scalability, database bottlenecks, and tradeoffs in their actual projects and skill stack.
- For Behavioral: Use the STAR method (Situation, Task, Action, Result) focused on challenges from their actual listed experience.
` : `
- Tailor questions deeply to ${safeRole} expectations in ${safeType} round.
- Focus on real-world engineering scenarios, system design tradeoffs, and team challenges.
`}
- Return ONLY a valid JSON array of exactly 5 strings (no markdown blocks, no commentary):
["question 1", "question 2", "question 3", "question 4", "question 5"]`;


  try {
    const text = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.75, max_tokens: 3000 });

    const questions = parseJsonResponse(text);

    if (Array.isArray(questions) && questions.length > 0) {
      return questions;
    }
    throw new Error('Invalid questions structure returned from OpenRouter');
  } catch (error) {
    console.error('[interviewAgent] Error generating questions:', error.message);
    throw error;
  }
}

/**
 * Generate a contextual follow-up question based on the candidate's previous response.
 * @param {string} originalQuestion - The question that was asked
 * @param {string} answer - The candidate's answer
 * @param {number} answerScore - Score of the answer (0-100)
 * @param {string} role - Target role
 * @returns {Promise<string>} Dynamic follow-up question
 */
async function generateFollowUp(originalQuestion, answer, answerScore, role) {
  const safeRole = sanitizePromptInput(role, 100);
  const safeQuestion = sanitizePromptInput(originalQuestion, 500);
  const safeAnswer = sanitizePromptInput(answer, 2000);

  const depth = answerScore >= 80 ? 'deeper, more challenging and technical' : 'clarifying and supportive to help them elaborate';
  
  const systemPrompt = `You are an adaptive, elite recruiter conducting a conversational live interview. Keep follow-ups natural, professional, and directly linked to what the candidate just said.`;
  
  const userPrompt = `A candidate for a ${safeRole} position has just answered an interview question.
Original Question: ${safeQuestion}
Candidate's Answer: ${safeAnswer}
Answer Quality Score: ${answerScore}/100

Generate ONE direct, conversational, recruiter-style follow-up question that goes ${depth}.
Return ONLY the raw follow-up question text (do not include JSON, quotes, prefix comments, or markdown):`;

  try {
    const text = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.8, max_tokens: 200 });

    return text.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error('[interviewAgent] Error generating follow-up:', error.message);
    throw error;
  }
}

module.exports = {
  generateInterviewQuestions,
  generateFollowUp,
};
