const { callOpenRouter, parseJsonResponse } = require('./openrouter');
const { generateRecommendations } = require('./recommendationEngine');
const { sanitizePromptInput } = require('../../utils/sanitizePromptInput');

/**
 * Generate deep personalized performance feedback based on scorecard metrics and full Q&A transcript.
 * @param {object} scoreCard - Candidate scores from current session
 * @param {string} role - Target role
 * @param {string} type - Interview type
 * @param {Array} [transcript] - Full Q&A transcript with candidate's spoken answers
 * @returns {Promise<object>} Combined feedback and study recommendations
 */
async function generatePerformanceFeedback(scoreCard, role, type, transcript = []) {
  const safeRole = sanitizePromptInput(role, 100);
  const safeType = sanitizePromptInput(type, 100);

  let transcriptBlock = '';
  if (Array.isArray(transcript) && transcript.length > 0) {
    const transcriptLines = transcript.slice(0, 10).map((t, idx) => {
      const q = sanitizePromptInput(t.question || '', 300);
      const a = sanitizePromptInput(t.answer || '', 1000);
      return `Q${idx + 1}: ${q}\nCandidate Answer: ${a || '[No answer recorded]'}`;
    }).join('\n\n');
    transcriptBlock = `\n\n════════ FULL INTERVIEW TRANSCRIPT (QUESTIONS & CANDIDATE ANSWERS) ════════\n${transcriptLines}\n══════════════════════════════════════════════════════════════════════════`;
  }

  const systemPrompt = `You are an elite talent acquisition partner, senior technical interviewer, and executive career coach. 
Analyze the candidate's actual answers across all interview questions, along with their telemetry scores, to deliver an in-depth, realistic, and highly actionable evaluation in a professional recruiter tone.`;

  const userPrompt = `Generate a comprehensive post-interview performance evaluation for a candidate who completed a ${safeType} mock interview for the role of ${safeRole}.

Performance Metrics:
- Overall Score: ${scoreCard.overallScore}/100
- Technical Accuracy: ${scoreCard.technicalScore}/100
- Communication/Fluency: ${scoreCard.communicationScore}/100
- Eye Contact Quality: ${scoreCard.eyeContactScore}/100
- Speaking Speed: ${scoreCard.averageWpm} WPM
- Stress Telemetry: ${scoreCard.stressScore}/100
- Total Filler Words: ${scoreCard.totalFillers}
- Identified Weak Areas: ${scoreCard.weakTopics?.join(', ') || 'None identified'}${transcriptBlock}

Instructions:
- Carefully evaluate the quality, depth, and relevance of the candidate's spoken answers above.
- Identify their top 3 distinct strengths exhibited in their answers and communication.
- Identify their top 3 specific, constructive areas for improvement (technical gaps, structure, conciseness, or missing details).
- Provide a personalized 3-4 sentence evaluation summary and a hiring readiness verdict.

Return ONLY a valid JSON object matching the exact structure below (no markdown fences, no extra text):
{
  "overallVerdict": "Pass | Borderline | Needs Improvement",
  "hiringLikelihood": 85,
  "personalizedFeedback": "A concise 3-4 sentence paragraph providing realistic coaching feedback on their specific answers.",
  "top3Strengths": ["strength 1", "strength 2", "strength 3"],
  "top3Improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`;

  try {
    // 1. Get feedback and verdict
    const feedbackText = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.5, max_tokens: 1000 });

    const feedbackObj = parseJsonResponse(feedbackText);

    // 2. Fetch study path and certifications from recommendation engine
    const recsObj = await generateRecommendations(scoreCard, role, type);

    // 3. Merge and return the complete AI performance evaluation package
    return {
      overallVerdict: feedbackObj.overallVerdict || 'Borderline',
      hiringLikelihood: feedbackObj.hiringLikelihood ?? 50,
      personalizedFeedback: feedbackObj.personalizedFeedback || 'Please continue practicing and refining your answers.',
      top3Strengths: feedbackObj.top3Strengths || [],
      top3Improvements: feedbackObj.top3Improvements || [],
      studyPlan: recsObj.studyPlan || [],
      nextInterviewReady: recsObj.nextInterviewReady || '2 weeks of prep',
      recommendedProjects: recsObj.recommendedProjects || [],
      recommendedCertifications: recsObj.recommendedCertifications || []
    };

  } catch (error) {
    console.error('[feedbackEngine] Error compiling performance feedback:', error.message);
    throw error;
  }
}

module.exports = {
  generatePerformanceFeedback,
};
