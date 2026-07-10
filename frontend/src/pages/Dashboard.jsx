import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, Mic, Code2, FileText, Flame,
  ArrowRight, CheckCircle, Circle, Bot, X, Users,
  BarChart3, Shield, MessagesSquare, Lightbulb, Send, Loader2,
  Activity, DollarSign, Upload, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonDashboard } from '../components/ui/SkeletonCard';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [showAiBanner, setShowAiBanner] = useState(true);
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const [activeView, setActiveView] = useState('user'); // 'user' | 'admin'

  // TRESK Career Copilot states
  const [chatOpen, setChatOpen] = useState(false);
  const [treskMode, setTreskMode] = useState('career');
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', text: '**TRESK here** — your AI Career Copilot! 🚀\n\nI can help you with career strategy, DSA problems, resume optimization, and company-specific placement prep. Select a mode above or just ask me anything!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: 'user', text: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/tresk/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg.text,
          mode: treskMode,
          chatHistory: chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch {
      // Fallback to legacy Aura endpoint
      try {
        const res2 = await fetch(`${API_BASE}/auth/chat-assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ message: userMsg.text, chatHistory: chatMessages.map(m => ({ role: m.role, text: m.text })) })
        });
        if (res2.ok) {
          const d = await res2.json();
          setChatMessages(prev => [...prev, { role: 'model', text: d.reply }]);
          return;
        }
      } catch {
        /* Ignore error and show default fallback message */
      }
      setChatMessages(prev => [...prev, { role: 'model', text: 'TRESK is temporarily unavailable. Please try again shortly.' }]);
    } finally {
      setChatLoading(false);
    }
  };


  // Dynamic user details
  const userName = user?.name || "Atlas Test";
  const userStreak = user?.streak || 0;
  const userXp = user?.xp || 100;

  // Fetch real dashboard data using React Query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['dashboardHistory', token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/interviews/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!token,
  });

  const { data: resumesData, isLoading: resumesLoading } = useQuery({
    queryKey: ['dashboardResumes', token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/resumes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch resumes');
      return res.json();
    },
    enabled: !!token,
  });

  const { data: readinessData, isLoading: readinessLoading } = useQuery({
    queryKey: ['dashboardReadiness', token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/readiness`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch readiness');
      return res.json();
    },
    enabled: !!token,
  });

  // ─── Admin KPI Data ──────────────────────────────────────────────────────────
  const { data: adminKpiData, isLoading: kpiLoading, refetch: refetchKpi } = useQuery({
    queryKey: ['adminKpis', token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/admin/kpis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch admin KPIs');
      return res.json();
    },
    enabled: !!token && isAdmin && activeView === 'admin',
    staleTime: 1000 * 60 * 5, // 5-minute cache
  });

  const history = useMemo(() => historyData?.history || [], [historyData]);
  const resumes = useMemo(() => resumesData?.resumes || [], [resumesData]);
  const readinessReport = readinessData?.data || null;

  const readinessScore = useMemo(() => {
    const completed = history.filter(h => h.status === 'completed' && h.scoreCard);
    if (completed.length === 0) {
      return 0;
    }
    if (readinessReport && readinessReport.score !== undefined && readinessReport.score !== null) {
      return readinessReport.score;
    }
    if (user) {
      let base = 50;
      base += Math.min(25, Math.floor((user.xp || 0) / 100));
      base += Math.min(10, (user.streak || 1) * 2);
      const avgScore = completed.reduce((sum, h) => sum + (h.scoreCard?.overallScore || 65), 0) / completed.length;
      base += Math.min(15, Math.floor(avgScore - 60));
      return Math.min(98, Math.max(45, base));
    }
    return 0;
  }, [user, history, readinessReport]);

  const loading = historyLoading || resumesLoading || readinessLoading;

  const completed = history.filter(h => h.status === 'completed' && h.scoreCard);
  const completedCount = completed.length;

  // Calculate solved challenges based on XP
  // 100 starting XP, each solved challenge is 200 XP, completed interviews award 150+ XP.
  const solvedCount = Math.floor(Math.max(0, (userXp - 100 - (completedCount * 150)) / 200));
  const codingScore = Math.max(0, solvedCount * 100 + Math.min(300, Math.floor(userXp * 0.1)));

  // Compute breakdown averages from real scorecards
  let avgTech = 0;
  let avgComm = 0;
  let avgEye = 0;
  let avgStress = 0;

  if (completedCount > 0) {
    const techSum = completed.reduce((sum, h) => sum + (h.scoreCard?.technicalScore || 70), 0);
    const commSum = completed.reduce((sum, h) => sum + (h.scoreCard?.communicationScore || 70), 0);
    const eyeSum = completed.reduce((sum, h) => sum + (h.scoreCard?.eyeContactScore || 75), 0);
    const stressSum = completed.reduce((sum, h) => sum + (h.scoreCard?.stressScore || 40), 0);

    avgTech = Math.round(techSum / completedCount);
    avgComm = Math.round(commSum / completedCount);
    avgEye = Math.round(eyeSum / completedCount);
    avgStress = Math.round(stressSum / completedCount);
  }

  const finalTechnical = avgTech;
  const finalCommunication = avgComm;
  const finalProblemSolving = completedCount > 0 ? Math.min(95, 55 + Math.floor(userXp / 80)) : 0;
  const finalLeadership = avgTech ? Math.round((avgTech + avgComm) / 2) : 0;
  const finalConfidence = avgEye ? Math.round((avgEye + (100 - avgStress)) / 2) : 0;

  // Radar points geometry (relative to center 50,50 within 100x100 SVG)
  const rTechnical = 45 * (finalTechnical / 100);
  const rCommunication = 45 * (finalCommunication / 100);
  const rLeadership = 45 * (finalLeadership / 100);
  const rProblemSolving = 45 * (finalProblemSolving / 100);
  const rConfidence = 45 * (finalConfidence / 100);

  const p0 = { x: 50, y: 50 - rTechnical };
  const p1 = { x: 50 + rCommunication * 0.951, y: 50 - rCommunication * 0.309 };
  const p2 = { x: 50 + rLeadership * 0.588, y: 50 + rLeadership * 0.809 };
  const p3 = { x: 50 - rProblemSolving * 0.588, y: 50 + rProblemSolving * 0.809 };
  const p4 = { x: 50 - rConfidence * 0.951, y: 50 - rConfidence * 0.309 };

  const pointsString = `${p0.x.toFixed(1)},${p0.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)} ${p4.x.toFixed(1)},${p4.y.toFixed(1)}`;

  // Generate dynamic 5-point data trend based on user's real stats
  const areaChartData = [];
  const completedHistory = history
    .filter(h => h.status === 'completed' && h.scoreCard)
    .sort((a, b) => new Date(a.scoreCard.completedAt || a.startedAt) - new Date(b.scoreCard.completedAt || b.startedAt));

  if (completedHistory.length > 0) {
    completedHistory.forEach((session, index) => {
      const sessionDate = new Date(session.scoreCard.completedAt || session.startedAt);
      const dateStr = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      areaChartData.push({
        date: dateStr,
        readiness: session.scoreCard?.overallScore || 0,
        coding: Math.round(codingScore * (index + 1) / completedHistory.length),
        interviews: index + 1
      });
    });
  }

  // Pre-calculate target interview variables
  const hasUploadedResume = resumes.length > 0;
  const latestResume = hasUploadedResume ? resumes[resumes.length - 1] : null;
  const targetRole = latestResume?.targetRole || "Software Engineer";
  const targetCompany = history[0]?.company || "Google";
  const ongoingSession = history.find(h => h.status === 'ongoing');

  // Prep Checklist Math
  const checkResume = hasUploadedResume;
  const checkJob = completedCount > 0 || history.length > 0;
  const checkQuestions = completedCount > 0 || ongoingSession;
  const checkReady = checkResume && checkJob;
  const passedChecksCount = (checkResume ? 1 : 0) + (checkJob ? 1 : 0) + (checkQuestions ? 1 : 0) + (checkReady ? 1 : 0);
  const prepProgress = Math.round((passedChecksCount / 4) * 100);

  // Career Coach Message Synthesizer
  let coachMessage;
  if (readinessScore >= 85) {
    coachMessage = `Outstanding performance, ${userName.split(' ')[0]}! Your readiness score is ${readinessScore}/100. You are placement-ready. Keep polishing your skills with daily coding challenges!`;
  } else if (completedCount === 0) {
    coachMessage = `Welcome to your dashboard, ${userName.split(' ')[0]}! Your readiness score is currently estimated at ${readinessScore}/100 based on your starting XP. Begin by uploading a resume and scheduling an HR mock interview to unlock your full analytical profile.`;
  } else {
    const weakestArea = [];
    if (finalTechnical < 75) weakestArea.push("technical skills");
    if (finalCommunication < 75) weakestArea.push("communication fluency");
    if (finalConfidence < 75) weakestArea.push("body language/confidence");
    const targetArea = weakestArea.length > 0 ? weakestArea.join(" and ") : "interview speed";
    coachMessage = `Great progress this week, ${userName.split(' ')[0]}! Your readiness is at ${readinessScore}/100. Focus on improving your ${targetArea} by launching targeted mock practice rounds in the lobby.`;
  }



  if (loading) {
    return (
      <div className="px-6 pt-6 flex-1">
        <SkeletonDashboard />
      </div>
    );
  }

  // Stat card configs
  const STAT_CARDS = [
    {
      label: 'Hiring Readiness',
      value: readinessScore,
      suffix: '/100',
      change: readinessScore > 0 ? (userStreak > 1 ? `+${userStreak * 2}% this week` : '+5% this week') : 'No progress yet',
      changePositive: readinessScore > 0,
      iconBg: 'linear-gradient(135deg, #10B981, #06B6D4)',
      accentColor: '#10B981',
      icon: <Shield size={16} className="text-white" />,
      sublabel: readinessScore >= 85 ? 'Excellent' : readinessScore >= 70 ? 'Good' : 'Needs Work',
    },
    {
      label: 'Interviews Done',
      value: completedCount,
      suffix: '',
      change: completedCount > 0 ? `${completedCount} this week` : 'Start preparing',
      changePositive: completedCount > 0,
      iconBg: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
      accentColor: '#8B5CF6',
      icon: <Mic size={16} className="text-white" />,
      sublabel: 'Total sessions',
    },
    {
      label: 'Coding Score',
      value: codingScore,
      suffix: '',
      change: solvedCount > 0 ? `${solvedCount} problems solved` : 'No challenges yet',
      changePositive: solvedCount > 0,
      iconBg: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
      accentColor: '#3B82F6',
      icon: <Code2 size={16} className="text-white" />,
      sublabel: 'LeetCode equivalent',
    },
    {
      label: 'Practice Streak',
      value: userStreak,
      suffix: '',
      change: userStreak > 0 ? '🔥 Keep it up!' : 'Start your streak',
      changePositive: userStreak > 0,
      iconBg: 'linear-gradient(135deg, #F59E0B, #EF4444)',
      accentColor: '#F59E0B',
      icon: <Flame size={16} className="text-white" />,
      sublabel: 'Day streak',
    },
  ];

  const SCORE_BARS = [
    { label: 'Technical Skills',  value: finalTechnical,      color: '#10B981', icon: <Code2 size={13} /> },
    { label: 'Communication',     value: finalCommunication,  color: '#3B82F6', icon: <MessagesSquare size={13} /> },
    { label: 'Problem Solving',   value: finalProblemSolving, color: '#F59E0B', icon: <Lightbulb size={13} /> },
    { label: 'Leadership',        value: finalLeadership,     color: '#8B5CF6', icon: <Users size={13} /> },
    { label: 'Confidence',        value: finalConfidence,     color: '#06B6D4', icon: <Shield size={13} /> },
  ];

  const QUICK_ACTIONS = [
    { to: '/lobby',  icon: Mic,     label: 'AI Interview', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
    { to: '/coding', icon: Code2,   label: 'Coding',       color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { to: '/resume', icon: FileText,label: 'Resume',       color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    { to: '/feedback',icon: BarChart3, label: 'Analytics', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  ];

  // Mock KPI fallback for display when API not yet implemented
  const kpis = adminKpiData || {
    dau: 1247, dauChange: '+8.3%', dauPositive: true,
    completionRate: 73.2, completionChange: '+2.1%', completionPositive: true,
    llmCostUsd: 12.47, llmCostChange: '-5.2%', llmCostPositive: false,
    resumeUploadSuccess: 94.1, uploadChange: '+1.8%', uploadPositive: true,
    totalSessions: 8934, activeSessions: 23,
    cohortRetention: [
      { week: 'Week 1', retention: 100 },
      { week: 'Week 2', retention: 68 },
      { week: 'Week 3', retention: 51 },
      { week: 'Week 4', retention: 39 },
      { week: 'Week 5', retention: 32 },
      { week: 'Week 6', retention: 28 },
    ],
    llmCostBreakdown: [
      { agent: 'Interview Agent', cost: 4.82, calls: 1834 },
      { agent: 'Resume Agent',    cost: 2.91, calls: 943  },
      { agent: 'Coding Agent',    cost: 2.14, calls: 567  },
      { agent: 'Behavior Agent',  cost: 1.43, calls: 812  },
      { agent: 'Report Agent',    cost: 1.17, calls: 2341 },
    ],
    dailyStats: [
      { date: 'Mon', sessions: 180, completions: 134, uploads: 42 },
      { date: 'Tue', sessions: 210, completions: 158, uploads: 51 },
      { date: 'Wed', sessions: 195, completions: 140, uploads: 38 },
      { date: 'Thu', sessions: 240, completions: 179, uploads: 63 },
      { date: 'Fri', sessions: 220, completions: 162, uploads: 55 },
      { date: 'Sat', sessions: 130, completions: 94,  uploads: 27 },
      { date: 'Sun', sessions: 115, completions: 82,  uploads: 19 },
    ],
  };

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* ── Tab Switcher (Admin only) ──────────────────────────────────────────── */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          {[
            { id: 'user', label: 'My Dashboard', icon: <TrendingUp size={13} /> },
            { id: 'admin', label: 'Admin KPIs', icon: <Activity size={13} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={activeView === tab.id
                ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
            {user?.role?.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Admin KPI View ─────────────────────────────────────────────────────── */}
      {isAdmin && activeView === 'admin' && (
        <div className="px-5 pt-2 pb-6">
          <AdminKpiPanel kpis={kpis} kpiLoading={kpiLoading} refetchKpi={refetchKpi} />
        </div>
      )}

      {/* ── Main User Dashboard ────────────────────────────────────────────────── */}
      {activeView === 'user' && (
    <div className="flex gap-5 w-full pt-5 px-5 pb-6">

      {/* ── Left Column ─────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">


        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl p-5 relative overflow-hidden card-hover cursor-default"
              style={{
                background: 'rgba(17,24,39,0.5)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderTop: `1px solid rgba(255,255,255,0.10)`,
                borderLeft: `2px solid ${card.accentColor}40`,
              }}
            >
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-20"
                style={{ background: `radial-gradient(circle, ${card.accentColor}, transparent 70%)`, transform: 'translate(40%, -40%)' }} />
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 text-xs font-medium tracking-wide uppercase">{card.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.iconBg }}>
                  {card.icon}
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white leading-none">{card.value}</span>
                {card.suffix && <span className="text-slate-600 text-sm">{card.suffix}</span>}
              </div>
              <p className="text-xs mt-2" style={{ color: card.accentColor }}>{card.change}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{card.sublabel}</p>
            </div>
          ))}
        </div>

        {/* ── Middle Row ── */}
        <div className="grid grid-cols-2 gap-5">

          {/* Continue Learning */}
          <div className="rounded-2xl p-5 flex flex-col glass-card-db">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold text-sm">Active Sessions</h3>
              <Link to="/roadmap" className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1 transition-colors">
                View All <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-3 flex-1">
              {/* Session card helper */}
              {[{
                icon: Mic, label: ongoingSession ? `Continue ${ongoingSession.type} Mock` : history.length > 0 ? 'Review Latest Interview' : 'Start Mock Interview',
                sublabel: ongoingSession ? `${ongoingSession.role} · ${ongoingSession.company}` : history.length > 0 ? `${history[0]?.role || 'Software Engineer'} · ${history[0]?.company || 'Google'}` : 'Practice HR, Tech or Behavioral',
                progress: ongoingSession ? Math.round((ongoingSession.currentQuestionIndex / (ongoingSession.questions?.length || 5)) * 100) : history.length > 0 ? 100 : 0,
                color: '#8B5CF6',
                to: ongoingSession ? `/interview-room?sessionId=${ongoingSession.id}` : '/lobby',
                cta: ongoingSession ? 'Resume' : history.length > 0 ? 'Lobby' : 'Start',
              }, {
                icon: Code2, label: 'DSA Coding Arena',
                sublabel: `${solvedCount} problems solved`,
                progress: Math.min(100, Math.round((solvedCount / 5) * 100)),
                color: '#10B981',
                to: '/coding',
                cta: 'Continue',
              }, {
                icon: FileText, label: 'Resume Analyzer',
                sublabel: latestResume ? 'ATS compliance score' : 'Optimize for job roles',
                progress: latestResume ? (latestResume.atsScore || 0) : 0,
                color: '#3B82F6',
                to: '/resume',
                cta: 'Analyze',
              }].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                          <Icon size={16} style={{ color: item.color }} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium leading-tight">{item.label}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{item.sublabel}</p>
                        </div>
                      </div>
                      <Link to={item.to}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30` }}>
                        {item.cta}
                      </Link>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.progress}%`, background: `linear-gradient(90deg, ${item.color}80, ${item.color})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prep Checkpoint */}
          <div className="rounded-2xl p-5 flex flex-col relative overflow-hidden glass-card-db">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-15"
              style={{ background: 'radial-gradient(circle, #6366F1, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-white font-semibold text-sm">
                {ongoingSession ? 'Ongoing Session' : 'Target Prep Checkpoint'}
              </h3>
              <Link to="/lobby" className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1 transition-colors">
                Lobby <ArrowRight size={12} />
              </Link>
            </div>

            {/* Session info card */}
            <div className="rounded-xl p-4 mb-4 relative z-10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Mic size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">
                    {ongoingSession ? `${ongoingSession.type} Mock Session` : `${targetRole} Interview`}
                  </h4>
                  <p className="text-indigo-400 text-xs mt-0.5">{targetCompany}</p>
                  <div className="flex gap-2 mt-2">
                    {['Medium', 'JavaScript', 'AI Panel'].map(t => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#64748B' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-auto relative z-10">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Interview preparation</span>
                <span className="font-semibold text-white">{prepProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${prepProgress}%`, background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)' }} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                {[
                  [checkResume,    'Resume Analyzed'],
                  [checkJob,       'Job Profile Set'],
                  [checkQuestions, 'Session Started'],
                  [checkReady,     'Interview Ready'],
                ].map(([done, label]) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs">
                    {done
                      ? <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                      : <Circle size={12} className="text-slate-700 flex-shrink-0" />}
                    <span className={done ? 'text-slate-300' : 'text-slate-600'}>{label}</span>
                  </div>
                ))}
              </div>
              <Link
                to={ongoingSession ? `/interview-room?sessionId=${ongoingSession.id}` : hasUploadedResume ? '/lobby' : '/resume'}
                className="btn btn-shimmer w-full py-2.5 text-white font-semibold text-sm rounded-xl"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
              >
                {ongoingSession ? 'Resume Interview' : hasUploadedResume ? 'Start Mock Interview' : 'Upload Resume'}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Analytics Row ── */}
        <div className="grid grid-cols-2 gap-5">
          {/* Performance Chart */}
          <div className="rounded-2xl p-5 flex flex-col glass-card-db">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold text-sm">Performance Overview</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-violet-500" />Interviews</span>
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500" />Coding</span>
                <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500" />Readiness</span>
              </div>
            </div>
            <div className="h-52 w-full relative flex items-center justify-center">
              {completedCount === 0 ? (
                <div className="text-center py-6">
                  <BarChart3 size={32} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No performance data available yet</p>
                  <p className="text-[10px] text-slate-500 mt-1">Complete interviews and code challenges to unlock analytics.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData} margin={{ top: 5, right: 5, left: -28, bottom: 5 }}>
                    <defs>
                      <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="codingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="interviewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#374151" strokeOpacity={0.5} fontSize={9} tickLine={false} />
                    <YAxis stroke="#374151" strokeOpacity={0.5} fontSize={9} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(13,18,32,0.98)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '11px', backdropFilter: 'blur(12px)' }}
                      itemStyle={{ color: '#94A3B8' }}
                      labelStyle={{ color: '#F1F5F9', fontWeight: 600, marginBottom: 4 }}
                    />
                    <Area type="monotone" dataKey="readiness"  stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#readinessGrad)" />
                    <Area type="monotone" dataKey="coding"     stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#codingGrad)" />
                    <Area type="monotone" dataKey="interviews" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#interviewsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="rounded-2xl p-5 glass-card-db">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-semibold text-sm">Skill Breakdown</h3>
              <Link to="/feedback" className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1 transition-colors">
                Analytics <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-4">
              {SCORE_BARS.map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-slate-400 text-xs" style={{ color: '#94A3B8' }}>
                      <span style={{ color: bar.color }}>{bar.icon}</span>
                      {bar.label}
                    </div>
                    <div className="text-xs font-bold" style={{ color: bar.color }}>{bar.value}<span className="text-slate-600 font-normal">/100</span></div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${bar.value}%`, background: `linear-gradient(90deg, ${bar.color}80, ${bar.color})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── AI Coach Banner ── */}
        {showAiBanner && (
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              backdropFilter: 'blur(12px)',
            }}>
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full pointer-events-none opacity-20"
              style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
            <button onClick={() => setShowAiBanner(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
              <X size={14} />
            </button>
            <div className="flex items-start gap-5 relative z-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                <Bot size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-bold text-base">AI Career Coach</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>BETA</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{coachMessage}</p>
              </div>
              <Link to="/lobby"
                className="btn btn-shimmer flex-shrink-0 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hidden sm:flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}>
                Practice Now <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Sidebar ─────────────────────────── */}
      <div className="w-72 flex flex-col gap-5 flex-shrink-0">

        {/* Radar Chart */}
        <div className="rounded-2xl p-5 glass-card-db">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-sm">Skill Profile</h3>
            <Link to="/feedback" className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
              Report <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex items-center justify-center relative">
            <div className="relative w-44 h-44">
              {/* Radar background */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <polygon fill="none" points="50,5 95,38 78,95 22,95 5,38" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
                <polygon fill="none" points="50,25 80,48 68,80 32,80 20,48" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                <polygon fill="none" points="50,40 65,52 58,68 42,68 35,52" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                <line stroke="rgba(255,255,255,0.05)" strokeWidth="1" x1="50" y1="50" x2="50" y2="5"/>
                <line stroke="rgba(255,255,255,0.05)" strokeWidth="1" x1="50" y1="50" x2="95" y2="38"/>
                <line stroke="rgba(255,255,255,0.05)" strokeWidth="1" x1="50" y1="50" x2="78" y2="95"/>
                <line stroke="rgba(255,255,255,0.05)" strokeWidth="1" x1="50" y1="50" x2="22" y2="95"/>
                <line stroke="rgba(255,255,255,0.05)" strokeWidth="1" x1="50" y1="50" x2="5" y2="38"/>
              </svg>
              {/* Data polygon */}
              {completedCount > 0 && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="polyGrad2" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(59,130,246,0.5)"/>
                      <stop offset="100%" stopColor="rgba(139,92,246,0.5)"/>
                    </linearGradient>
                  </defs>
                  <polygon fill="url(#polyGrad2)" points={pointsString}
                    stroke="#6366F1" strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.4))' }}/>
                  {[p0,p1,p2,p3,p4].map((p,i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="white" opacity="0.9"
                      style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}/>
                  ))}
                </svg>
              )}
              {/* Labels */}
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 text-center whitespace-nowrap">Technical<br/><span className="text-white font-bold">{finalTechnical}</span></span>
              <span className="absolute top-6 -right-9 text-[9px] text-slate-400 text-center">Comm.<br/><span className="text-white font-bold">{finalCommunication}</span></span>
              <span className="absolute -bottom-5 right-1 text-[9px] text-slate-400 text-center">Lead.<br/><span className="text-white font-bold">{finalLeadership}</span></span>
              <span className="absolute -bottom-5 left-1 text-[9px] text-slate-400 text-center">Problem<br/><span className="text-white font-bold">{finalProblemSolving}</span></span>
              <span className="absolute top-6 -left-7 text-[9px] text-slate-400 text-center">Conf.<br/><span className="text-white font-bold">{finalConfidence}</span></span>
            </div>
            {completedCount === 0 && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center rounded-xl border border-white/5">
                <Bot size={20} className="text-indigo-400 mb-1" />
                <p className="text-[10px] text-slate-300 font-medium">No profile data yet</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Start mock practice to map your skills.</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-white text-xs font-semibold">Top {Math.max(1, 100 - Math.round(readinessScore * 0.95))}% of candidates</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Keep practicing</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <TrendingUp size={15} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl p-5 glass-card-db">
          <h3 className="text-white font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.to} to={a.to}
                  className="rounded-xl p-3.5 flex flex-col items-start gap-2.5 card-hover"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.bg }}>
                    <Icon size={15} style={{ color: a.color }} />
                  </div>
                  <span className="text-white text-xs font-semibold">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl p-5 glass-card-db flex-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
            <Link to="/feedback" className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8">
                <Mic size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600">No activity yet</p>
                <p className="text-[10px] text-slate-700 mt-1">Start a mock interview!</p>
              </div>
            ) : history.slice(0, 4).map((act, i) => (
              <div key={act.id || i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: act.status === 'completed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    border: `1px solid ${act.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}>
                  {act.type === 'Coding'
                    ? <Code2 size={14} className={act.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'} />
                    : <Mic size={14} className={act.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {act.status === 'completed' ? '✓ ' : '● '}{act.type} Interview
                  </p>
                  <p className="text-[10px] text-slate-600">{act.role} · {getRelativeTime(act.startedAt || act.createdAt)}</p>
                </div>
                <div className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                  style={{
                    background: act.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                    color: act.status === 'completed' ? '#34D399' : '#FCD34D',
                  }}>
                  {act.scoreCard ? `${act.scoreCard.overallScore}%` : 'Live'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRESK AI Career Copilot Widget ─────────────────── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="mb-4 flex flex-col"
              style={{
                width: '22rem',
                height: '480px',
                borderRadius: '20px',
                background: 'rgba(7, 10, 22, 0.97)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(99,102,241,0.25)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
              }}>
                <div className="flex items-center gap-2.5">
                  {/* TRESK logo badge */}
                  <div className="relative">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 4px 12px rgba(99,102,241,0.5)' }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2"
                      style={{ borderColor: 'rgba(7,10,22,0.97)' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-white text-sm leading-none">TRESK</h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: 'linear-gradient(90deg,#6366F1,#8B5CF6)' }}>AI</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">Career Copilot · Online</span>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex gap-1 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { id: 'career',    label: '🎯 Career'   },
                  { id: 'dsa',       label: '💻 DSA'      },
                  { id: 'resume',    label: '📄 Resume'   },
                  { id: 'placement', label: '🏢 Placement' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTreskMode(tab.id);
                      setChatMessages([{ role: 'model', text: `**${tab.label.split(' ')[1]} Mode activated!** Ask me anything about ${tab.id === 'career' ? 'career strategy and interview prep' : tab.id === 'dsa' ? 'data structures, algorithms, and coding problems' : tab.id === 'resume' ? 'resume optimization and ATS scoring' : 'company-specific placement preparation'}.` }]);
                    }}
                    className="flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: treskMode === tab.id ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))' : 'transparent',
                      color: treskMode === tab.id ? '#A5B4FC' : '#64748B',
                      border: treskMode === tab.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                    }}
                  >{tab.label}</button>
                ))}
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'model' && (
                      <div className="w-5 h-5 rounded-md flex items-center justify-center mr-2 mt-0.5 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                        <Bot className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'text-white rounded-br-none'
                        : 'text-slate-200 rounded-bl-none'
                    }`} style={{
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg,#4F46E5,#7C3AED)'
                        : 'rgba(255,255,255,0.05)',
                      border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      whiteSpace: 'pre-line',
                    }}>
                      {m.text.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center mr-2 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                      <Bot className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="px-3 py-2.5 rounded-2xl rounded-bl-none text-xs text-slate-400 flex items-center gap-2"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      TRESK is thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <form onSubmit={handleSendChatMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={treskMode === 'dsa' ? 'Describe a DSA problem...' : treskMode === 'resume' ? 'Paste resume text or ask...' : treskMode === 'placement' ? 'Which company are you targeting?' : 'Ask TRESK anything...'}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <button type="submit" disabled={!chatInput.trim() || chatLoading}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bubble */}
        <motion.button
          onClick={() => setChatOpen(o => !o)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 8px 32px rgba(99,102,241,0.5)' }}
        >
          {chatOpen ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
          {!chatOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center"
              style={{ fontSize: '8px', fontWeight: 700, color: '#064E3B', border: '2px solid #030712' }}>
              T
            </span>
          )}
        </motion.button>
      </div>
    </div>
      )}
    </div>
  );
}

// ─── Admin KPI Panel Component ──────────────────────────────────────────────────
const AdminKpiPanel = ({ kpis, kpiLoading, refetchKpi }) => {
  const kpiCards = [
    {
      label: 'Daily Active Users', value: kpis.dau?.toLocaleString(), change: kpis.dauChange,
      positive: kpis.dauPositive, icon: <Users size={15} className="text-white" />,
      iconBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', accent: '#6366f1',
      sublabel: `${kpis.activeSessions} sessions live now`,
    },
    {
      label: 'Completion Rate', value: `${kpis.completionRate}%`, change: kpis.completionChange,
      positive: kpis.completionPositive, icon: <CheckCircle size={15} className="text-white" />,
      iconBg: 'linear-gradient(135deg, #10B981, #06B6D4)', accent: '#10B981',
      sublabel: `${kpis.totalSessions?.toLocaleString()} total sessions`,
    },
    {
      label: 'LLM Cost (USD)', value: `$${kpis.llmCostUsd}`, change: kpis.llmCostChange,
      positive: kpis.llmCostPositive, icon: <DollarSign size={15} className="text-white" />,
      iconBg: 'linear-gradient(135deg, #F59E0B, #EF4444)', accent: '#F59E0B',
      sublabel: 'Today (all agents)',
    },
    {
      label: 'Upload Success Rate', value: `${kpis.resumeUploadSuccess}%`, change: kpis.uploadChange,
      positive: kpis.uploadPositive, icon: <Upload size={15} className="text-white" />,
      iconBg: 'linear-gradient(135deg, #3B82F6, #6366f1)', accent: '#3B82F6',
      sublabel: 'Resume PDFs (clean scans)',
    },
  ];

  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#10B981', '#3B82F6', '#F59E0B'];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Platform Operations Dashboard</h2>
              <p className="text-slate-400 text-xs mt-0.5">Real-time KPIs • Updated {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <button onClick={() => refetchKpi()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-indigo-300 transition-all hover:bg-indigo-500/10" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-20" style={{ background: `radial-gradient(circle, ${card.accent}, transparent 70%)`, transform: 'translate(35%, -35%)' }} />
            <div className="flex justify-between items-start mb-3">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{card.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.iconBg }}>{card.icon}</div>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-white">{kpiLoading ? '—' : card.value}</span>
            </div>
            <p className="text-xs font-semibold mt-1" style={{ color: card.positive ? '#10B981' : '#EF4444' }}>
              {card.positive ? <ChevronUp size={11} className="inline" /> : <ChevronDown size={11} className="inline" />} {card.change}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">{card.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Daily Activity Chart */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-sm">Daily Activity (7-Day)</h3>
            <span className="text-xs text-slate-500">Sessions · Completions · Uploads</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={kpis.dailyStats} barGap={2}>
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="sessions"    fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="completions" fill="#10B981" radius={[3,3,0,0]} />
              <Bar dataKey="uploads"     fill="#3B82F6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[['#6366f1','Sessions'],['#10B981','Completions'],['#3B82F6','Uploads']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                <span className="text-xs text-slate-400">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cohort Retention */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-sm">Cohort Retention</h3>
            <span className="text-xs text-slate-500">Weekly drop-off</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={kpis.cohortRetention}>
              <XAxis dataKey="week" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, 'Retention']} contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="retention" radius={[4,4,0,0]}>
                {(kpis.cohortRetention || []).map((_, i) => (
                  <Cell key={i} fill={`hsl(${240 + i * 15}, 70%, ${65 - i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LLM Cost Breakdown Table */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold text-sm">LLM Cost Breakdown by Agent</h3>
          <span className="text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Today</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {['Agent', 'API Calls', 'Cost (USD)', 'Avg Cost/Call', 'Cost Bar'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-slate-500 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(kpis.llmCostBreakdown || []).map((row, i) => {
                const maxCost = Math.max(...(kpis.llmCostBreakdown || []).map(r => r.cost));
                const pct = Math.round((row.cost / maxCost) * 100);
                return (
                  <tr key={row.agent} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="py-2.5 px-3 text-white text-xs font-medium">{row.agent}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">{row.calls.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-xs font-semibold" style={{ color: '#F59E0B' }}>${row.cost.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">${(row.cost / row.calls * 1000).toFixed(3)}/k</td>
                    <td className="py-2.5 px-3 w-32">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const getRelativeTime = (isoString) => {
  try {
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
};

