import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Award, Flame, Mic, Sparkles, Trash2, Info } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '../services/api';

export default function NotificationPanel({ isOpen, onClose, user, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'welcome':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      case 'streak':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'badge':
      case 'badge_unlocked':
        return <Award className="w-4 h-4 text-yellow-500" />;
      case 'interview':
      case 'interview_completed':
        return <Mic className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await apiGet('/notifications');
      const list = data.notifications || [];
      setNotifications(list);
      if (onUnreadCountChange) {
        onUnreadCountChange(data.unreadCount ?? list.filter(n => !n.read).length);
      }
    } catch (err) {
      console.warn('[Notifications] Could not fetch from server, using local fallback:', err.message);
      // Fallback local notifications
      const localList = [
        {
          id: 'welcome',
          type: 'welcome',
          title: 'Welcome to TRESK AI!',
          desc: 'Get started by exploring the AI Interview Lobby and trying a practice round.',
          read: false,
          link: '/lobby',
          createdAt: new Date().toISOString(),
        }
      ];
      if (user.streak > 1) {
        localList.push({
          id: 'streak',
          type: 'streak',
          title: 'Streak Active! 🔥',
          desc: `You are on a ${user.streak}-day practice streak. Keep it going!`,
          read: false,
          link: '/dashboard',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        });
      }
      setNotifications(localList);
      if (onUnreadCountChange) {
        onUnreadCountChange(localList.filter(n => !n.read).length);
      }
    } finally {
      setLoading(false);
    }
  }, [user, onUnreadCountChange]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);
    try {
      await apiPost('/notifications/read-all', {});
    } catch (err) {
      console.warn('[Notifications] Failed to sync mark-all-read:', err.message);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
      if (onUnreadCountChange) {
        onUnreadCountChange(prev => Math.max(0, prev - 1));
      }
      try {
        await apiPatch(`/notifications/${n.id}/read`, {});
      } catch (err) {
        console.warn('[Notifications] Failed to sync mark-as-read:', err.message);
      }
    }

    if (n.link) {
      onClose();
      navigate(n.link);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const item = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (item && !item.read && onUnreadCountChange) {
      onUnreadCountChange(prev => Math.max(0, prev - 1));
    }
    try {
      await apiDelete(`/notifications/${id}`);
    } catch (err) {
      console.warn('[Notifications] Failed to delete notification:', err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute right-0 top-14 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200"
      style={{
        background: 'rgba(10, 15, 30, 0.98)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-white text-sm">Activity Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllRead} 
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Check className="w-3 h-3" /> Mark all read
          </button>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
        {loading && notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Loading alerts...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No recent activity alerts.
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group relative ${
                n.read 
                  ? 'bg-white/[0.01] border-slate-900/40 text-slate-400' 
                  : 'bg-white/[0.04] border-slate-800/80 text-slate-200 hover:border-indigo-500/40'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0 pr-5">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-bold leading-tight ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                  <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">{formatTime(n.createdAt)}</span>
                </div>
                <p className="text-[11px] mt-1 leading-normal text-slate-400">{n.desc}</p>
              </div>

              <button
                onClick={(e) => handleDelete(e, n.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-400 transition-opacity absolute top-2 right-2 rounded hover:bg-white/5 cursor-pointer"
                title="Delete alert"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
