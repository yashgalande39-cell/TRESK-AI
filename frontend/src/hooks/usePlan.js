import { useAuth } from '../context/AuthContext';

/**
 * Plan hierarchy: free < pro < teams
 * Features available per plan:
 *
 * FREE:
 *  - 3 mock interviews / month
 *  - Basic performance report
 *  - HR question bank
 *  - Community support
 *
 * PRO (includes everything in free +):
 *  - Unlimited mock interviews
 *  - Real-time coding evaluation
 *  - Advanced analytics & roadmap
 *  - Resume + JD targeting
 *  - Priority AI feedback
 *
 * TEAMS (includes everything in pro +):
 *  - Up to 25 seats
 *  - Cohort dashboards
 *  - Custom question sets
 *  - Dedicated success manager
 */

const PLAN_LEVEL = { free: 0, pro: 1, teams: 2 };

// Which plan is required per feature key
export const FEATURE_PLAN = {
  // Free features — always accessible
  hrQuestionBank:         'free',
  communitySupport:       'free',
  basicReport:            'free',
  limitedInterviews:      'free',

  // Pro features
  unlimitedInterviews:    'pro',
  codingArena:            'pro',
  advancedAnalytics:      'pro',
  resumeAnalyzer:         'pro',
  jobAnalyzer:            'pro',
  learningRoadmap:        'pro',
  aptitudeTest:           'pro',
  priorityFeedback:       'pro',

  // Teams features
  cohortDashboards:       'teams',
  customQuestions:        'teams',
  multiSeat:              'teams',
  dedicatedManager:       'teams',
};

export function usePlan() {
  const plan = 'teams';
  const selectPlan = async () => {};

  const hasAccess = () => true;
  const canUse = () => true;

  const isFreePlan  = false;
  const isProPlan   = false;
  const isTeamsPlan = true;

  return { plan, hasAccess, canUse, selectPlan, isFreePlan, isProPlan, isTeamsPlan };
}
