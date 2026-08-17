import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import EmailVerificationBanner from './components/EmailVerificationBanner';

// UI Components
import CommandPalette from './components/ui/CommandPalette';
import NotificationPanel from './components/NotificationPanel';


// Pages (Landing page static, others lazy loaded)
import LandingPage from './components/LandingPage';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InterviewLobby = lazy(() => import('./pages/InterviewLobby'));
const InterviewRoom = lazy(() => import('./pages/InterviewRoom'));
const CodingEditor = lazy(() => import('./pages/CodingEditor'));
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'));
const JobAnalyzer = lazy(() => import('./pages/JobAnalyzer'));
const AptitudeEngine = lazy(() => import('./pages/AptitudeEngine'));
const CareerRoadmap = lazy(() => import('./pages/CareerRoadmap'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const FeedbackAnalysis = lazy(() => import('./pages/FeedbackAnalysis'));
const Settings = lazy(() => import('./pages/Settings'));
const InterviewReplay = lazy(() => import('./pages/InterviewReplay'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const NotFound = lazy(() => import('./pages/NotFound'));


import {
  LayoutDashboard, Mic, Code2, FileText, Briefcase,
  BarChart3, Map, FlaskConical, Settings2,
  Bell, Search, Flame, Moon, Sun, LogOut,
  ChevronLeft, ChevronRight, Sparkles, Command,
  PlayCircle, PanelLeft, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

// ── Route Guards ────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ── Nav Item ─────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, isActive, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`sidebar-item group ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-3' : ''}`}
    >
      <Icon
        size={18}
        className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`}
      />
      {!collapsed && (
        <span className="sidebar-label flex-1 truncate">{label}</span>
      )}
    </Link>
  );
}

// ── App Layout ────────────────────────────────────────────
const AppLayout = ({ children }) => {
  const { user, isAuthenticated, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const userName = user?.name || 'User';
  const userStreak = user?.streak ?? 0;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ⌘K and ⌘B keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed(c => !c);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = useCallback((path) => location.pathname === path, [location.pathname]);
  const isFullHeight = ['/coding', '/interview-room'].includes(location.pathname);
  const containerClass = isFullHeight
    ? 'flex-1 flex flex-col min-h-0 overflow-hidden'
    : 'flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar';

  // Get current page title
  const PAGE_TITLES = {
    '/dashboard':         'Dashboard',
    '/lobby':             'AI Interviews',
    '/interview-room':    'Interview Room',
    '/coding':            'Coding Arena',
    '/resume':            'Resume Analyzer',
    '/job-analyzer':      'Job Analyzer',
    '/feedback':          'Analytics',
    '/roadmap':           'Learning Roadmap',
    '/aptitude':          'Aptitude Test',
    '/settings':          'Settings',
    '/admin':             'Admin Panel',
    '/replay':            'Interview Replay',
    '/404':               'Page Not Found',
  };

  const pageTitle = PAGE_TITLES[location.pathname] || 'Page Not Found';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: '#F1F5F9' }}>
        <main className="flex-1 flex flex-col min-w-0">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-sm" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={`sidebar-wrapper h-full flex flex-col z-20 border-r relative transition-all duration-300`}
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo & Header Toggle */}
        <div className={`flex items-center justify-between p-3.5 border-b h-16 ${collapsed ? 'justify-center px-2' : ''}`} style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => collapsed && setCollapsed(false)}
              className="w-8 h-8 rounded-xl bg-gradient-blue-violet flex items-center justify-center flex-shrink-0 shadow-glow-blue cursor-pointer"
              title={collapsed ? "Expand sidebar (⌘B)" : undefined}
            >
              <Sparkles size={16} className="text-white" />
            </button>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-base leading-none tracking-tight text-slate-900 dark:text-white">TRESK<span style={{ color: '#6366F1' }}> AI</span></h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Career Copilot</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              title="Collapse sidebar (⌘B)"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 custom-scrollbar ${collapsed ? 'px-2' : 'px-3'}`}>
          {/* MAIN */}
          {!collapsed && <div className="sidebar-section-label">Main</div>}
          <NavItem to="/dashboard"   icon={LayoutDashboard} label="Dashboard"       isActive={isActive('/dashboard')} collapsed={collapsed} />
          <NavItem to="/lobby"       icon={Mic}             label="AI Interviews"   isActive={isActive('/lobby')}     collapsed={collapsed} />

          {/* PRACTICE */}
          {!collapsed && <div className="sidebar-section-label mt-2">Practice</div>}
          <NavItem to="/coding"       icon={Code2}        label="Coding Arena"     isActive={isActive('/coding')}       collapsed={collapsed} />
          <NavItem to="/resume"       icon={FileText}     label="Resume Analyzer"  isActive={isActive('/resume')}       collapsed={collapsed} />
          <NavItem to="/job-analyzer" icon={Briefcase}    label="Job Analyzer"     isActive={isActive('/job-analyzer')} collapsed={collapsed} />
          <NavItem to="/aptitude"     icon={FlaskConical} label="Aptitude Test"    isActive={isActive('/aptitude')}     collapsed={collapsed} />

          {/* INTELLIGENCE */}
          {!collapsed && <div className="sidebar-section-label mt-2">Intelligence</div>}
          <NavItem to="/feedback"  icon={BarChart3}  label="Analytics"        isActive={isActive('/feedback')} collapsed={collapsed} />
          <NavItem to="/replay"    icon={PlayCircle} label="Interview Replay" isActive={isActive('/replay')}   collapsed={collapsed} />
          <NavItem to="/roadmap"   icon={Map}        label="Learning Path"    isActive={isActive('/roadmap')}  collapsed={collapsed} />

          {/* ACCOUNT */}
          {!collapsed && <div className="sidebar-section-label mt-2">Account</div>}
          <NavItem to="/settings" icon={Settings2} label="Settings" isActive={isActive('/settings')} collapsed={collapsed} />
        </nav>

        {/* User profile & Bottom expand toggle */}
        <div className={`border-t p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`} style={{ borderColor: 'var(--border)' }}>
          {collapsed ? (
            <>
              <button
                onClick={logout}
                title={`${userName} — Click to logout`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-80 transition-opacity"
                style={{ background: 'var(--grad-primary)' }}
              >
                {userInitials}
              </button>
              <button
                onClick={() => setCollapsed(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Expand sidebar (⌘B)"
              >
                <ChevronRight size={15} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 group cursor-pointer rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
              onClick={logout} title="Click to logout">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--grad-primary)' }}
              >
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-900 dark:text-white text-sm font-medium truncate leading-none">{userName}</p>
              </div>
              <LogOut size={13} className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 transition-colors flex-shrink-0" />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

        {/* Email verification banner (soft enforcement) */}
        {user && user.auth_provider === 'local' && user.email_verified === false && (
          <EmailVerificationBanner />
        )}

        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-6 flex-shrink-0 border-b transition-colors duration-200"
          style={{ borderColor: 'var(--border)', background: 'var(--header-bg)', backdropFilter: 'blur(12px)' }}
        >
          {/* Left: Sidebar toggle + Page title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
              title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
            >
              {collapsed ? <PanelLeftOpen size={18} className="text-indigo-400" /> : <PanelLeft size={18} />}
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

            <div>
              <h2 className="text-slate-900 dark:text-white font-semibold text-base leading-none">{pageTitle}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">InterviewAI Platform</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Search / Command palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
            >
              <Search size={14} />
              <span className="text-xs">Search...</span>
              <div className="flex items-center gap-1 ml-2">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-slate-600">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-slate-600">K</kbd>
              </div>
            </button>

            {/* Streak indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <Flame size={14} className="text-amber-500" />
              <span className="text-amber-400 font-bold text-sm">{userStreak}</span>
              <span className="text-[10px] text-amber-600 font-medium hidden lg:block">streak</span>
            </div>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[7px] h-[7px] rounded-full bg-indigo-500 ring-2 ring-[#080C14]" />
                )}
              </button>
              <NotificationPanel
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                user={user}
                onUnreadCountChange={setUnreadNotifications}
              />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm hover:shadow"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark'
                ? <Sun size={16} className="text-amber-400 animate-pulse-slow" />
                : <Moon size={16} className="text-indigo-600 animate-pulse-slow" />
              }
            </button>

            {/* Cmd palette mobile trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
            >
              <Command size={16} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={containerClass}>
          {children}
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette key={cmdOpen} open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
};

// ── Root App ──────────────────────────────────────────────────
export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-[#080C14] text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        }>
          <Routes>
            {/* Public */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<AppLayout><Login /></AppLayout>} />
            <Route path="/register" element={<AppLayout><Register /></AppLayout>} />
            <Route path="/privacy"  element={<PrivacyPolicy />} />
            <Route path="/terms"    element={<TermsOfService />} />

            {/* Protected */}
            <Route path="/dashboard"     element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/lobby"         element={<ProtectedRoute><AppLayout><InterviewLobby /></AppLayout></ProtectedRoute>} />
            <Route path="/interview-room"element={<ProtectedRoute><AppLayout><InterviewRoom /></AppLayout></ProtectedRoute>} />
            <Route path="/coding"       element={<ProtectedRoute><AppLayout><CodingEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/resume"       element={<ProtectedRoute><AppLayout><ResumeAnalyzer /></AppLayout></ProtectedRoute>} />
            <Route path="/job-analyzer" element={<ProtectedRoute><AppLayout><JobAnalyzer /></AppLayout></ProtectedRoute>} />
            <Route path="/aptitude"     element={<ProtectedRoute><AppLayout><AptitudeEngine /></AppLayout></ProtectedRoute>} />
            <Route path="/roadmap"      element={<ProtectedRoute><AppLayout><CareerRoadmap /></AppLayout></ProtectedRoute>} />
            <Route path="/admin"        element={<ProtectedRoute><AppLayout><AdminPanel /></AppLayout></ProtectedRoute>} />
            <Route path="/feedback"     element={<ProtectedRoute><AppLayout><FeedbackAnalysis /></AppLayout></ProtectedRoute>} />
            <Route path="/settings"     element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/replay"       element={<ProtectedRoute><AppLayout><InterviewReplay /></AppLayout></ProtectedRoute>} />
            <Route path="/pricing"      element={<Navigate to="/dashboard" replace />} />
            <Route path="/404"          element={<AppLayout><NotFound /></AppLayout>} />

            {/* Catch-all 404 handler */}
            <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}
