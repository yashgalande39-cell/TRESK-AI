import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Compass, Home, ArrowLeft, Mic, Code2, 
  FileText, Map, Search, HelpCircle, 
  Sparkles, AlertCircle, RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleOpenSearch = () => {
    // Dispatch ⌘K event to open command palette
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true }));
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center py-10 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl w-full rounded-3xl p-6 sm:p-10 relative overflow-hidden border shadow-2xl"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 50px -10px rgba(99, 102, 241, 0.15)'
        }}
      >
        {/* Background Ambient Glows */}
        <div 
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
        />
        <div 
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }}
        />

        {/* ── Top Status Pill ── */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
            style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5' }}>
            <AlertCircle size={14} className="text-rose-400 animate-pulse" />
            <span>HTTP 404 — Page Not Found</span>
          </div>

          <div className="text-xs text-slate-400 font-mono bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/50 max-w-xs truncate" title={location.pathname}>
            path: <span className="text-indigo-300">{location.pathname}</span>
          </div>
        </div>

        {/* ── Main Hero Section ── */}
        <div className="text-center sm:text-left sm:flex sm:items-start gap-6 mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 shadow-lg shadow-indigo-500/20"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' }}>
            <Compass size={36} className="text-white animate-spin-slow" />
          </div>

          <div className="mt-4 sm:mt-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Oops! We couldn't find that page
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">
              The address you entered does not match any active route, tool, or interview session on the TRESK AI platform.
            </p>
          </div>
        </div>

        {/* ── Explanation Cards: What & Why ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* What happened */}
          <div className="p-4 rounded-2xl border"
            style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.07)' }}>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles size={14} />
              <span>What Happened?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your browser sent a request to <code className="text-indigo-300 font-mono bg-slate-900/60 px-1 py-0.5 rounded">{location.pathname}</code>, but our routing server could not resolve it to an active component.
            </p>
          </div>

          {/* Why it happened */}
          <div className="p-4 rounded-2xl border"
            style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.07)' }}>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <HelpCircle size={14} />
              <span>Why Did This Happen?</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>The URL may contain a typo or extra character.</li>
              <li>The interview session or test link has ended or expired.</li>
              <li>The page was moved, renamed, or requires logging in.</li>
            </ul>
          </div>
        </div>

        {/* ── Action Section: What to do in brief ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Recommended Next Steps
            </h2>
            <button 
              onClick={handleOpenSearch}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Search size={13} />
              <span>Quick Search (⌘K / Ctrl+K)</span>
            </button>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Action 1: Dashboard or Home */}
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              className="flex items-center gap-3 p-3.5 rounded-xl text-white font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/20"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
            >
              <Home size={18} />
              <div>
                <div className="font-semibold">{isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}</div>
                <div className="text-[11px] text-indigo-200 font-normal">Go to your central workspace</div>
              </div>
            </Link>

            {/* Action 2: Start Mock Interview */}
            <Link
              to="/lobby"
              className="flex items-center gap-3 p-3.5 rounded-xl text-slate-200 font-medium text-sm border hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <Mic size={18} className="text-emerald-400" />
              <div>
                <div className="font-semibold text-white">AI Interviews</div>
                <div className="text-[11px] text-slate-400 font-normal">Start voice or coding prep</div>
              </div>
            </Link>

            {/* Action 3: Coding Editor */}
            <Link
              to="/coding"
              className="flex items-center gap-3 p-3.5 rounded-xl text-slate-200 font-medium text-sm border hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <Code2 size={18} className="text-cyan-400" />
              <div>
                <div className="font-semibold text-white">Coding Arena</div>
                <div className="text-[11px] text-slate-400 font-normal">Practice DSA & live code</div>
              </div>
            </Link>

            {/* Action 4: Resume Analyzer */}
            <Link
              to="/resume"
              className="flex items-center gap-3 p-3.5 rounded-xl text-slate-200 font-medium text-sm border hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <FileText size={18} className="text-amber-400" />
              <div>
                <div className="font-semibold text-white">Resume ATS Scanner</div>
                <div className="text-[11px] text-slate-400 font-normal">Evaluate resume score</div>
              </div>
            </Link>

            {/* Action 5: Career Roadmap */}
            <Link
              to="/roadmap"
              className="flex items-center gap-3 p-3.5 rounded-xl text-slate-200 font-medium text-sm border hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <Map size={18} className="text-purple-400" />
              <div>
                <div className="font-semibold text-white">Career Roadmap</div>
                <div className="text-[11px] text-slate-400 font-normal">Curated learning paths</div>
              </div>
            </Link>

            {/* Action 6: Previous Page */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-3 p-3.5 rounded-xl text-slate-300 font-medium text-sm border hover:border-slate-500/50 hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left"
              style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
            >
              <ArrowLeft size={18} className="text-slate-400" />
              <div>
                <div className="font-semibold text-white">Go Back</div>
                <div className="text-[11px] text-slate-400 font-normal">Return to previous screen</div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Footer Info ── */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <span>Need help finding something? Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">⌘K</kbd> to search everything.</span>
          <button 
            onClick={() => window.location.reload()} 
            className="hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw size={12} />
            <span>Reload Page</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
