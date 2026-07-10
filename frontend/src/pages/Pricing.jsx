import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import { Link } from 'react-router-dom';
import {
  Check, Zap, Crown, Users, ArrowRight, Shield,
  Star, Mic, Code2, Bot, BarChart3, Sparkles,
  X, AlertTriangle, Clock, CreditCard, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Calendar, Receipt, ArrowDownCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Plan Definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    priceStr: '₹0',
    per: 'forever',
    tagline: 'Start your placement journey',
    color: '#64748B',
    gradient: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(71,85,105,0.08))',
    borderColor: 'rgba(100,116,139,0.25)',
    icon: Zap,
    features: [
      { label: '5 mock interviews / month', ok: true },
      { label: 'Basic resume scoring', ok: true },
      { label: '10 coding challenges / month', ok: true },
      { label: 'Community leaderboard', ok: true },
      { label: 'TRESK AI Career Copilot', ok: false },
      { label: 'Interview Replay', ok: false },
      { label: 'Company placement insights', ok: false },
      { label: 'Daily challenges + contests', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    priceStr: '₹499',
    per: '/month',
    tagline: 'Everything you need to crack top companies',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.12))',
    borderColor: 'rgba(99,102,241,0.4)',
    icon: Crown,
    badge: '🔥 Most Popular',
    features: [
      { label: 'Unlimited mock interviews', ok: true },
      { label: 'Full ATS resume analysis', ok: true },
      { label: 'Unlimited coding challenges', ok: true },
      { label: 'Company leaderboard + XP', ok: true },
      { label: 'TRESK AI Career Copilot', ok: true },
      { label: 'Interview Replay & analytics', ok: true },
      { label: 'Company placement insights', ok: true },
      { label: 'Daily challenges + weekly contests', ok: true },
    ],
  },
  {
    id: 'teams',
    name: 'Teams',
    price: 1999,
    priceStr: '₹1,999',
    per: '/month',
    tagline: 'For placement cells and coding clubs',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06))',
    borderColor: 'rgba(245,158,11,0.3)',
    icon: Users,
    features: [
      { label: 'Everything in Pro', ok: true },
      { label: 'Up to 25 team members', ok: true },
      { label: 'Admin dashboard & analytics', ok: true },
      { label: 'Custom branding', ok: true },
      { label: 'Priority support (24h SLA)', ok: true },
      { label: 'Bulk interview scheduling', ok: true },
      { label: 'Export reports (PDF/CSV)', ok: true },
      { label: 'Dedicated onboarding', ok: true },
    ],
  },
];

const PLAN_RANK = { free: 0, pro: 1, teams: 2 };

const FAQ = [
  {
    q: 'How does the free plan work?',
    a: "The Starter plan is free forever with no credit card required. You get 5 mock interviews, 10 coding challenges, and basic resume scoring every month.",
  },
  {
    q: 'Can I cancel anytime?',
    a: "Yes! You can cancel your Pro or Teams subscription at any time from this page. You'll retain access until the end of your billing period.",
  },
  {
    q: 'How does the Razorpay payment work?',
    a: "We use Razorpay, India's leading payment gateway. Your payment is secured with 256-bit SSL encryption. We accept UPI, cards, net banking, and wallets.",
  },
  {
    q: 'Is there a student discount?',
    a: 'Yes! Students with a valid college email (.edu or .ac.in) get 30% off the Pro plan. Use code STUDENT30 at checkout.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: 'Your interview history, resume data, and coding submissions are always preserved. Only feature access changes when you downgrade.',
  },
];

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl min-w-[300px] max-w-sm"
            style={{
              background: t.type === 'success'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))'
                : t.type === 'error'
                ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.12))'
                : 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
              border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.35)' : t.type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)'}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />}
            {t.type === 'error' && <XCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />}
            {t.type === 'info' && <Sparkles size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-snug">{t.title}</p>
              {t.desc && <p className="text-slate-400 text-xs mt-0.5">{t.desc}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({ isOpen, onClose, onConfirm, plan, action, currentPlan, loading }) {
  if (!isOpen || !plan) return null;
  const isDowngrade = action === 'cancel';
  const currentPlanData = PLANS.find(p => p.id === currentPlan);
  const PlanIcon = plan.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            style={{ backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-md rounded-3xl p-6 pointer-events-auto relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(15,17,26,0.98), rgba(20,22,35,0.98))',
                border: `1px solid ${isDowngrade ? 'rgba(239,68,68,0.3)' : plan.borderColor}`,
                boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px ${isDowngrade ? 'rgba(239,68,68,0.08)' : plan.color + '18'}`,
              }}
            >
              {/* Glow accent */}
              <div
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: isDowngrade ? '#EF4444' : plan.color }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={15} />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isDowngrade ? 'rgba(239,68,68,0.15)' : `${plan.color}20`,
                    border: `1px solid ${isDowngrade ? 'rgba(239,68,68,0.3)' : plan.color + '40'}`,
                  }}
                >
                  {isDowngrade
                    ? <ArrowDownCircle size={24} className="text-red-400" />
                    : <PlanIcon size={24} style={{ color: plan.color }} />
                  }
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-5">
                <h2 className="text-white font-black text-xl mb-1">
                  {isDowngrade ? 'Cancel Subscription?' : `Upgrade to ${plan.name}`}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isDowngrade
                    ? `You'll lose access to ${currentPlanData?.name} features and revert to the free plan.`
                    : `Switch from ${currentPlanData?.name} to ${plan.name} plan.`
                  }
                </p>
              </div>

              {/* Details card */}
              <div
                className="rounded-2xl p-4 mb-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {isDowngrade ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-semibold">You will lose access to:</span>
                    </div>
                    {currentPlanData?.features.filter(f => f.ok).map(f => (
                      <div key={f.label} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="text-slate-400 text-xs">{f.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-xs">Plan</span>
                      <div className="flex items-center gap-1.5">
                        <PlanIcon size={12} style={{ color: plan.color }} />
                        <span className="text-white text-xs font-bold">{plan.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-xs">Amount</span>
                      <span className="text-white text-sm font-black">{plan.priceStr}<span className="text-slate-500 text-xs font-normal">/month</span></span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-xs">Billing</span>
                      <span className="text-slate-300 text-xs">Monthly · Cancel anytime</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <Shield size={11} className="text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">256-bit SSL · Secured by Razorpay</span>
                    </div>
                  </>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 transition-all hover:text-white hover:bg-white/08"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {isDowngrade ? 'Keep Plan' : 'Cancel'}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: isDowngrade
                      ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                      : `linear-gradient(135deg, ${plan.color}, ${plan.id === 'pro' ? '#8B5CF6' : '#EF4444'})`,
                    boxShadow: isDowngrade ? '0 8px 24px rgba(239,68,68,0.35)' : `0 8px 24px ${plan.color}40`,
                  }}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                  ) : isDowngrade ? (
                    <><ArrowDownCircle size={14} />Downgrade to Free</>
                  ) : (
                    <><CreditCard size={14} />Confirm & Pay</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Subscription Info Panel ──────────────────────────────────────────────────
function SubscriptionPanel({ subscription, onCancel, cancelLoading }) {
  const [expanded, setExpanded] = useState(false);
  const [now] = useState(() => Date.now());
  if (!subscription || subscription.plan === 'free') return null;

  const plan = PLANS.find(p => p.id === subscription.plan);
  const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const activatedAt = subscription.activatedAt ? new Date(subscription.activatedAt) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86400000)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${plan?.color}12, ${plan?.color}06)`,
        border: `1px solid ${plan?.color}35`,
      }}
    >
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${plan?.color}20`, border: `1px solid ${plan?.color}40` }}>
            {plan && <plan.icon size={16} style={{ color: plan.color }} />}
          </div>
          <div>
            <p className="text-white text-sm font-bold">{plan?.name} Plan Active</p>
            <p className="text-slate-500 text-[10px]">
              {daysLeft != null ? `${daysLeft} days remaining` : 'Active subscription'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${plan?.color}20`, color: plan?.color }}
          >
            Active
          </span>
          {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/05">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {activatedAt && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar size={11} className="text-slate-500" />
                      <span className="text-slate-500 text-[10px]">Activated</span>
                    </div>
                    <p className="text-white text-xs font-semibold">{activatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                {expiresAt && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={11} className="text-slate-500" />
                      <span className="text-slate-500 text-[10px]">Renews / Expires</span>
                    </div>
                    <p className="text-white text-xs font-semibold">{expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onCancel}
                disabled={cancelLoading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}
              >
                {cancelLoading
                  ? <><div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />Cancelling...</>
                  : <><X size={12} />Cancel Subscription</>
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Payment History Panel ────────────────────────────────────────────────────
function PaymentHistory({ payments, loading }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="mb-8 rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Receipt size={15} className="text-slate-400" />
          <span className="text-white text-sm font-semibold">Payment History</span>
          {payments.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#A5B4FC' }}>
              {payments.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/05">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="py-8 text-center">
                  <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-xs">No payment records yet</p>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  {payments.map((p, i) => {
                    const plan = PLANS.find(pl => pl.id === p.plan);
                    const date = new Date(p.paid_at || p.created_at);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${plan?.color}15` }}>
                          {plan && <plan.icon size={13} style={{ color: plan.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold capitalize">{p.plan} Plan</p>
                          <p className="text-slate-600 text-[10px]">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-xs font-bold">₹{((p.amount_paise || 0) / 100).toLocaleString('en-IN')}</p>
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: p.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: p.status === 'paid' ? '#34D399' : '#F87171',
                            }}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Pricing() {
  const { user, token, updateUser } = useAuth();
  const [loading, setLoading] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState({ open: false, plan: null, action: null });
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const mountTimeRef = useRef(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const currentPlan = user?.plan || 'free';

  // ── Toast helpers ────────────────────────────────────────────────────────────
  const addToast = useCallback((type, title, desc = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, desc }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Fetch subscription info ──────────────────────────────────────────────────
  const fetchSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch { /* silent */ }
  }, [token]);

  // ── Fetch payment history ────────────────────────────────────────────────────
  const fetchPaymentHistory = useCallback(async () => {
    if (!token) return;
    setPaymentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing/history`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch { /* silent */ }
    finally { setPaymentsLoading(false); }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSubscription();
      fetchPaymentHistory();
    });
  }, [fetchSubscription, fetchPaymentHistory]);

  // ── Determine button action for a plan ──────────────────────────────────────
  const getPlanAction = (planId) => {
    if (planId === 'free') {
      // Free plan: show downgrade if currently on paid
      if (currentPlan !== 'free') return 'cancel';
      return 'current';
    }
    if (planId === currentPlan) return 'current';
    if (PLAN_RANK[planId] > PLAN_RANK[currentPlan]) return 'upgrade';
    return 'downgrade';
  };

  // ── Open confirmation modal ──────────────────────────────────────────────────
  const handlePlanClick = (planId) => {
    const action = getPlanAction(planId);
    if (action === 'current') return;

    const plan = PLANS.find(p => p.id === planId);
    setModal({
      open: true,
      plan,
      action: (action === 'cancel' || action === 'downgrade') ? 'cancel' : 'upgrade',
    });
  };

  // ── Confirm upgrade flow ─────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    const planId = modal.plan?.id;
    if (!planId) return;
    setLoading(planId);

    try {
      // 1. Create a Razorpay order
      const orderRes = await fetch(`${API_BASE}/billing/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ plan: planId }),
      });

      const { order, keyId } = await orderRes.json();
      if (!order) throw new Error('Failed to create order');

      // 2. Demo mode — auto-verify without Razorpay UI
      if (order.demo) {
        await verifyPayment(planId, order.id, 'demo_payment_id', 'demo_signature');
        return;
      }

      // 3. Real Razorpay checkout
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'TRESK AI',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        order_id: order.id,
        image: 'https://i.imgur.com/n5tjHFD.png',
        theme: { color: modal.plan?.color || '#6366F1' },
        handler: async (response) => {
          await verifyPayment(
            planId,
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
          );
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        modal: {
          ondismiss: () => {
            setLoading(null);
            setModal({ open: false, plan: null, action: null });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      // Close our modal — Razorpay handles it now
      setModal({ open: false, plan: null, action: null });
    } catch (err) {
      console.error('Upgrade error:', err);
      // Graceful dev fallback
      await verifyPayment(planId, `order_demo_${planId}_${mountTimeRef.current}`, 'demo_pay', 'demo_sig');
    }
  };

  // ── Verify payment & update user ─────────────────────────────────────────────
  const verifyPayment = async (planId, orderId, paymentId, signature) => {
    try {
      const res = await fetch(`${API_BASE}/billing/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ plan: planId, orderId, paymentId, signature }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user) updateUser(data.user);
        const planData = PLANS.find(p => p.id === planId);
        addToast('success', `🎉 ${planData?.name} plan activated!`, 'All premium features are now unlocked. Enjoy!');
        await fetchSubscription();
        await fetchPaymentHistory();
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify error:', err);
      addToast('error', 'Payment verification failed', err.message || 'Please contact support if you were charged.');
    } finally {
      setLoading(null);
      setModal({ open: false, plan: null, action: null });
    }
  };

  // ── Cancel subscription ──────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelLoading(true);
    setLoading('free');
    try {
      const res = await fetch(`${API_BASE}/billing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        // Optimistically update local state
        updateUser({ ...user, plan: 'free', subscription_id: null, plan_expires_at: null });
        setSubscription(null);
        addToast('info', 'Subscription cancelled', "You've been moved to the free plan. Your data is safe.");
        await fetchSubscription();
        await fetchPaymentHistory();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Cancellation failed');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      addToast('error', 'Cancellation failed', err.message || 'Please try again or contact support.');
    } finally {
      setCancelLoading(false);
      setLoading(null);
      setModal({ open: false, plan: null, action: null });
    }
  };

  // ── Confirm modal action dispatcher ──────────────────────────────────────────
  const handleModalConfirm = async () => {
    if (modal.action === 'cancel') {
      if (modal.plan?.id === 'pro') {
        setLoading('pro');
        try {
          await verifyPayment('pro', `order_demo_pro_${mountTimeRef.current}`, 'demo_pay', 'demo_sig');
        } catch (err) {
          console.error('Downgrade to Pro error:', err);
        }
      } else {
        await handleCancel();
      }
    } else {
      await handleUpgrade();
    }
  };

  // ── Button label helper ───────────────────────────────────────────────────────
  const getButtonLabel = (planId) => {
    const action = getPlanAction(planId);
    const isLoadingThis = loading === planId;
    if (isLoadingThis) return null; // handled inline
    switch (action) {
      case 'current': return <><Check size={14} /> Current Plan</>;
      case 'cancel':  return <><X size={14} /> Downgrade to Free</>;
      case 'upgrade': return <>{PLANS.find(p => p.id === planId)?.name === 'Pro' ? 'Upgrade to Pro' : 'Upgrade to Teams'} <ArrowRight size={14} /></>;
      case 'downgrade': return <><ArrowDownCircle size={14} /> Switch to {PLANS.find(p => p.id === planId)?.name}</>;
      default: return <>{planId} <ArrowRight size={14} /></>;
    }
  };

  const getButtonStyle = (plan) => {
    const action = getPlanAction(plan.id);
    const isCurrent = action === 'current';
    const isCancel = action === 'cancel';
    if (isCurrent) {
      return {
        background: 'rgba(255,255,255,0.06)',
        color: '#64748B',
        border: `1px solid ${plan.color}40`,
        boxShadow: 'none',
        cursor: 'default',
      };
    }
    if (isCancel) {
      return {
        background: 'rgba(239,68,68,0.1)',
        color: '#F87171',
        border: '1px solid rgba(239,68,68,0.3)',
        boxShadow: 'none',
      };
    }
    return {
      background: `linear-gradient(135deg, ${plan.color}, ${plan.id === 'pro' ? '#8B5CF6' : '#EF4444'})`,
      color: '#FFFFFF',
      border: 'none',
      boxShadow: `0 8px 24px ${plan.color}40`,
    };
  };

  return (
    <div className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
      <Toast toasts={toasts} removeToast={removeToast} />

      <ConfirmModal
        isOpen={modal.open}
        onClose={() => { if (!loading) setModal({ open: false, plan: null, action: null }); }}
        onConfirm={handleModalConfirm}
        plan={modal.plan}
        action={modal.action}
        currentPlan={currentPlan}
        loading={!!loading || cancelLoading}
      />

      {/* Hero */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-semibold"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}
        >
          <Sparkles size={12} />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl font-black text-white mb-3">
          Invest in your{' '}
          <span style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dream Job
          </span>
        </h1>
        <p className="text-slate-400 text-base max-w-xl mx-auto">
          Join 10,000+ students who cracked placements at Google, Microsoft, Swiggy, and top product companies using TRESK AI.
        </p>
      </div>

      {/* Social proof */}
      <div className="flex justify-center gap-8 mb-10">
        {[
          { icon: Star, label: '4.9/5 rating', sub: '2,400+ reviews' },
          { icon: Users, label: '10K+ students', sub: 'Placed at top companies' },
          { icon: Shield, label: 'SSL secured', sub: 'Razorpay certified' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="text-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <Icon size={15} className="text-indigo-400" />
            </div>
            <p className="text-white text-xs font-semibold">{label}</p>
            <p className="text-slate-600 text-[10px]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Active subscription panel */}
      <SubscriptionPanel
        subscription={subscription}
        onCancel={() => setModal({ open: true, plan: PLANS.find(p => p.id === 'free'), action: 'cancel' })}
        cancelLoading={cancelLoading}
      />

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const action = getPlanAction(plan.id);
          const isCurrent = action === 'current';
          const isLoadingThis = loading === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
              style={{
                background: plan.gradient,
                border: `1px solid ${isCurrent ? plan.color + '80' : plan.borderColor}`,
                boxShadow: isCurrent
                  ? `0 20px 60px ${plan.color}30, 0 0 0 1px ${plan.color}40`
                  : plan.id === 'pro' ? '0 20px 60px rgba(99,102,241,0.15)' : 'none',
              }}
            >
              {/* Current plan indicator */}
              {isCurrent && (
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }}
                />
              )}

              {/* Popular badge */}
              {plan.badge && !isCurrent && (
                <div
                  className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <div
                  className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: `${plan.color}25`, color: plan.color, border: `1px solid ${plan.color}40` }}
                >
                  <Check size={9} /> Your Plan
                </div>
              )}

              {/* Plan icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${plan.color}20`, border: `1px solid ${plan.color}40` }}
                >
                  <Icon size={18} style={{ color: plan.color }} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{plan.name}</h3>
                  <p className="text-slate-500 text-[10px]">{plan.tagline}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.priceStr}</span>
                  <span className="text-slate-500 text-xs">{plan.per}</span>
                </div>
                {plan.price > 0 && (
                  <p className="text-[10px] text-slate-600 mt-0.5">Billed monthly · Cancel anytime</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(({ label, ok }) => (
                  <li key={label} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? '' : 'opacity-30'}`}
                      style={{ background: ok ? `${plan.color}20` : 'rgba(255,255,255,0.05)' }}
                    >
                      <Check size={9} style={{ color: ok ? plan.color : '#475569' }} />
                    </div>
                    <span className={`text-xs ${ok ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <motion.button
                whileHover={!isCurrent ? { scale: 1.02 } : {}}
                whileTap={!isCurrent ? { scale: 0.98 } : {}}
                onClick={() => handlePlanClick(plan.id)}
                disabled={isCurrent || isLoadingThis}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:cursor-default flex items-center justify-center gap-2"
                style={getButtonStyle(plan)}
              >
                {isLoadingThis ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                ) : (
                  getButtonLabel(plan.id)
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Feature Comparison Strip */}
      <div
        className="mb-10 rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h2 className="text-white font-bold text-base mb-5 text-center">What you unlock with Pro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Bot, label: 'TRESK AI Copilot', desc: '4 specialist modes', color: '#6366F1' },
            { icon: Mic, label: 'Unlimited Interviews', desc: 'No monthly caps', color: '#8B5CF6' },
            { icon: BarChart3, label: 'Interview Replay', desc: 'Full session timeline', color: '#10B981' },
            { icon: Code2, label: 'Daily Challenges', desc: 'XP + leaderboard', color: '#F59E0B' },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: `${color}08`, border: `1px solid ${color}20` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: `${color}18` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <PaymentHistory payments={payments} loading={paymentsLoading} />

      {/* FAQ */}
      <div className="mb-10">
        <h2 className="text-white font-bold text-xl text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {FAQ.map(({ q, a }, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between"
              >
                <span className="text-white text-sm font-medium">{q}</span>
                <span className="text-slate-500 text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 border-t border-white/05 pt-3">
                      <p className="text-slate-400 text-xs leading-relaxed">{a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <h3 className="text-white font-black text-2xl mb-2">Start free. Scale when ready.</h3>
        <p className="text-slate-400 text-sm mb-6">No credit card required for the free plan. Upgrade anytime in seconds.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/lobby"
            className="px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
          >
            <Mic size={14} /> Start Free Mock Interview
          </Link>
          <Link
            to="/"
            className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Go to Dashboard <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
