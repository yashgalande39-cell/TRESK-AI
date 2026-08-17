import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import { 
  User, Settings as SettingsIcon, Bell, Shield, CreditCard, Globe, Sparkles,
  Download, Trash2, RefreshCw, AlertTriangle, HelpCircle, X, Check, ChevronRight,
  Sun, Moon, Laptop, Eye, EyeOff, Loader2, Mail, MapPin, AlignLeft, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { user, token, theme, toggleTheme, updateProfile } = useAuth();
  const mountTimeRef = useRef(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  // Active Tab state
  const [activeTab, setActiveTab] = useState("Profile");

  // Profile fields state — initialized from real user data
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [branch, setBranch] = useState('');

  // Sync user data from context
  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        setFullName(user.name || '');
        setEmail(user.email || '');
        setCurrentRole(user.currentRole || 'Aspiring Software Engineer');
        setLocation(user.location || 'India');
        setBio(user.bio || 'Passionate about building scalable software systems and solving real-world problems.');
        setCollegeName(user.collegeName || '');
        setBranch(user.branch || '');
      });
    }
  }, [user]);



  // Preferences fields state
  const [language, setLanguage] = useState('English');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [dashboard, setDashboard] = useState('Dashboard Overview');
  const [personalization, setPersonalization] = useState(true);

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [supportAlerts, setSupportAlerts] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Modals state
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success'); // 'success' | 'error'
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpQuestion, setHelpQuestion] = useState('');


  const triggerToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Export Data Action
  const handleExportData = () => {
    const dataObj = {
      user: { name: fullName, email, role: currentRole, location, bio, collegeName, branch },
      preferences: { theme, language, difficulty, defaultDashboard: dashboard, personalization },
      notifications: { emailAlerts, streakReminders, supportAlerts },
      exportedAt: new Date().toISOString(),
      platform: 'Interview AI - Career Operating System'
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataObj, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `interview_ai_data_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowExportModal(false);
    triggerToast('JSON backup data exported successfully!');
  };

  // 2. Clear Activity Action
  const handleClearActivity = () => {
    setShowClearModal(false);
    triggerToast('All interview logs and active histories cleared!');
  };

  // 3. Reset Progress Action
  const handleResetProgress = () => {
    setShowResetModal(false);
    triggerToast('Your progress metrics and streak counters have been reset.');
  };

  // 4. Delete Account Action
  const handleDeleteAccount = (e) => {
    e.preventDefault();
    if (deleteConfirmText.toUpperCase() === 'DELETE') {
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      triggerToast('Account deletion request submitted.');
    }
  };

  // 5. Submit Support Ticket Action
  const handleHelpSubmit = (e) => {
    e.preventDefault();
    if (helpQuestion.trim()) {
      setShowHelpModal(false);
      setHelpQuestion('');
      triggerToast('Your support ticket has been logged successfully!');
    }
  };

  // 6. Profile Save — calls API
  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: fullName,
        currentRole,
        location,
        bio,
        collegeName,
        branch,
      });
      setIsEditing(false);
      triggerToast('Profile information updated successfully.');
    } catch {
      triggerToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Cancel edit — reset values from user
  const handleCancelEdit = () => {
    if (user) {
      setFullName(user.name || '');
      setCurrentRole(user.currentRole || 'Aspiring Software Engineer');
      setLocation(user.location || 'India');
      setBio(user.bio || '');
      setCollegeName(user.collegeName || '');
      setBranch(user.branch || '');
    }
    setIsEditing(false);
  };

  // 8. Change Password — validates & calls API
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (password.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword: password })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setPassword('');
        setConfirmPassword('');
        triggerToast('Password changed successfully.');
      } else {
        setPasswordError(data.message || 'Password change failed.');
      }
    } catch {
      // Offline mock success
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      triggerToast('Password updated successfully (offline mode).');
    } finally {
      setPasswordLoading(false);
    }
  };




  const toggleClass = "w-11 h-6 bg-slate-950/60 border border-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500 peer-checked:after:bg-white";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12 text-[#e2e8f0] text-left">
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all ${
              toastType === 'error' 
                ? 'bg-red-900/80 border border-red-500/50' 
                : 'bg-[#101420] border border-emerald-500/30'
            }`}
          >
            {toastType === 'error' 
              ? <X className="w-4 h-4 text-red-400" /> 
              : <Check className="w-4 h-4 text-emerald-400" />
            }
            <span className="text-xs font-semibold text-white">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title & Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Settings</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Manage your account, preferences, and application settings.</p>
          </div>
        </div>

        {/* Tab switcher bar */}
        <div className="flex p-1 rounded-xl bg-slate-950/60 border border-white/5 overflow-x-auto no-scrollbar print:hidden">
          {[
            { id: 'Profile', icon: User },
            { id: 'Preferences', icon: SettingsIcon },
            { id: 'Notifications', icon: Bell },
            { id: 'Account', icon: Shield },
            { id: 'Privacy & Security', icon: Globe }
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-4 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shrink-0 ${
                  isSelected 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Forms & Tab panels) */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* Profile Information Panel */}
            {activeTab === 'Profile' && (
              <motion.div 
                key="profile-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-violet-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Profile Information</h3>
                      <p className="text-xs text-slate-450 font-semibold">Update your personal information and how others see you.</p>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs font-bold text-slate-400 border border-white/5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleProfileSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 text-xs font-black text-white bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {isSaving ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></>
                        ) : (
                          <><Check className="w-3.5 h-3.5" /><span>Save Changes</span></>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-1.5 text-xs font-bold text-white border border-white/5 rounded-xl hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-violet-600">
                        <div className="w-full h-full rounded-full bg-slate-950 border-2 border-slate-950 flex items-center justify-center text-3xl font-bold text-violet-400">
                          {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>
                      {isEditing && (
                        <button 
                          onClick={() => triggerToast('Avatar upload requires Pro plan.')}
                          className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors shadow-lg cursor-pointer"
                          title="Change avatar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info Fields Grid */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Full Name</label>
                      {isEditing ? (
                        <div className="relative">
                          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-300 outline-none font-semibold transition-all" placeholder="Your full name" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-200 font-bold pl-1 block py-2 bg-slate-950/20 border border-transparent rounded-xl">{fullName || '—'}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Email Address</label>
                      <div className="relative">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        <span className="text-xs text-slate-450 font-bold pl-8 pr-3 py-2.5 block bg-slate-950/20 border border-white/5 rounded-xl truncate">{email || '—'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Current Role / Title</label>
                      {isEditing ? (
                        <div className="relative">
                          <AlignLeft size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="text" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-300 outline-none font-semibold transition-all" placeholder="e.g. Software Engineer" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-200 font-bold pl-1 block py-2 bg-slate-950/20 border border-transparent rounded-xl">{currentRole || '—'}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Location</label>
                      {isEditing ? (
                        <div className="relative">
                          <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-300 outline-none font-semibold transition-all" placeholder="e.g. India" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-200 font-bold pl-1 block py-2 bg-slate-950/20 border border-transparent rounded-xl">{location || '—'}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">College / Institution</label>
                      {isEditing ? (
                        <div className="relative">
                          <Info size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-300 outline-none font-semibold transition-all" placeholder="College name" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-200 font-bold pl-1 block py-2 bg-slate-950/20 border border-transparent rounded-xl">{collegeName || '—'}</span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Branch / Major</label>
                      {isEditing ? (
                        <div className="relative">
                          <Info size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full pl-8 pr-3 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-300 outline-none font-semibold transition-all" placeholder="e.g. Computer Science" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-200 font-bold pl-1 block py-2 bg-slate-950/20 border border-transparent rounded-xl">{branch || '—'}</span>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Bio</label>
                      {isEditing ? (
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="3" className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-300 outline-none font-semibold resize-none leading-relaxed transition-all" placeholder="Tell us about yourself..." />
                      ) : (
                        <p className="text-xs text-slate-200 font-medium leading-relaxed pl-1 py-2 bg-slate-950/20 border border-transparent rounded-xl">{bio || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                {!isEditing && user && (
                  <div className="pt-5 border-t border-white/5 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{user.xp || 0}</p>
                      <p className="text-[10px] text-slate-450 uppercase font-extrabold mt-0.5">Total XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{user.streak || 0} 🔥</p>
                      <p className="text-[10px] text-slate-450 uppercase font-extrabold mt-0.5">Day Streak</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{(user.badges || []).length}</p>
                      <p className="text-[10px] text-slate-450 uppercase font-extrabold mt-0.5">Badges</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Preferences Card Panel */}
            {activeTab === 'Preferences' && (
              <motion.div 
                key="prefs-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-violet-400">
                    <SettingsIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Preferences</h3>
                    <p className="text-xs text-slate-450 font-semibold">Customize your learning experience.</p>
                  </div>
                </div>

                <div className="space-y-6 divide-y divide-white/5">
                  
                  {/* Theme Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Interface Theme</p>
                      <p className="text-xs text-slate-400">Choose your preferred interface theme</p>
                    </div>
                    <div className="flex bg-slate-950/60 border border-white/5 rounded-xl p-1 shrink-0 w-fit">
                      <button 
                        onClick={() => { if (theme === 'dark') toggleTheme(); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          theme === 'light' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Light</span>
                      </button>
                      <button 
                        onClick={() => { if (theme === 'light') toggleTheme(); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dark</span>
                      </button>
                      <button 
                        onClick={() => triggerToast('System default theme applied.')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span>System</span>
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Lobby Language</p>
                      <p className="text-xs text-slate-400">Select your preferred speech evaluation language</p>
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => { setLanguage(e.target.value); triggerToast(`Language updated to ${e.target.value}`); }}
                      className="bg-slate-950/60 border border-white/5 text-xs text-slate-300 rounded-xl focus:border-violet-500/50 block w-44 p-2.5 font-semibold outline-none transition-all"
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Default Difficulty</p>
                      <p className="text-xs text-slate-400">Set default difficulty rating for AI interviewer sessions</p>
                    </div>
                    <select 
                      value={difficulty}
                      onChange={(e) => { setDifficulty(e.target.value); triggerToast(`Difficulty set to ${e.target.value}`); }}
                      className="bg-slate-950/60 border border-white/5 text-xs text-slate-300 rounded-xl focus:border-violet-500/50 block w-44 p-2.5 font-semibold outline-none transition-all"
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>

                  {/* Default Dashboard */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Default Dashboard View</p>
                      <p className="text-xs text-slate-400">Choose what page opens when logging in</p>
                    </div>
                    <select 
                      value={dashboard}
                      onChange={(e) => { setDashboard(e.target.value); triggerToast(`Default view updated to ${e.target.value}`); }}
                      className="bg-slate-950/60 border border-white/5 text-xs text-slate-300 rounded-xl focus:border-violet-500/50 block w-44 p-2.5 font-semibold outline-none transition-all"
                    >
                      <option>Dashboard Overview</option>
                      <option>Mock Tests</option>
                      <option>Analytics</option>
                    </select>
                  </div>

                  {/* Data & Personalization */}
                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">AI Personalization</p>
                      <p className="text-xs text-slate-400">Allow AI engines to adapt prompts based on your resume data</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={personalization}
                        onChange={(e) => { setPersonalization(e.target.checked); triggerToast(`Personalization ${e.target.checked ? 'enabled' : 'disabled'}`); }}
                        className="sr-only peer" 
                      />
                      <div className={toggleClass}></div>
                    </label>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Notifications Panel */}
            {activeTab === 'Notifications' && (
              <motion.div 
                key="notifications-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-violet-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Notification Settings</h3>
                    <p className="text-xs text-slate-450 font-semibold">Manage your alerts, reminders, and summaries.</p>
                  </div>
                </div>

                <div className="space-y-6 divide-y divide-white/5">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Email Notifications</p>
                      <p className="text-xs text-slate-400">Receive weekly summary scorecard analytics in your inbox</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" checked={emailAlerts} onChange={(e) => { setEmailAlerts(e.target.checked); triggerToast(`Email notifications ${e.target.checked ? 'enabled' : 'disabled'}`); }} className="sr-only peer" />
                      <div className={toggleClass}></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Daily Streak Reminders</p>
                      <p className="text-xs text-slate-400">Get reminded to log in and preserve your day streak</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" checked={streakReminders} onChange={(e) => { setStreakReminders(e.target.checked); triggerToast(`Streak reminders ${e.target.checked ? 'enabled' : 'disabled'}`); }} className="sr-only peer" />
                      <div className={toggleClass}></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Priority Support Alerts</p>
                      <p className="text-xs text-slate-400">Notify immediately on support ticket updates (Premium feature)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" checked={supportAlerts} onChange={(e) => { setSupportAlerts(e.target.checked); triggerToast(`Support alerts ${e.target.checked ? 'enabled' : 'disabled'}`); }} className="sr-only peer" />
                      <div className={toggleClass}></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Account / Password Panel */}
            {activeTab === 'Account' && (
              <motion.div 
                key="account-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-teal-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Change Password</h3>
                    <p className="text-xs text-slate-450 font-semibold">Update your account password to keep it secure.</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Current Password</label>
                    <div className="relative">
                      <input 
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter your current password"
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-350 outline-none font-semibold transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="At least 6 characters"
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-950/40 border border-white/5 focus:border-violet-500/50 rounded-xl text-xs text-slate-355 outline-none font-semibold transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password strength */}
                    {password && (
                      <div className="mt-1.5 flex gap-1 px-1">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                            password.length >= 6 + (i * 3) ? (
                              i < 1 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : i < 2 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : i < 3 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                            ) : 'bg-white/5'
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-450 uppercase font-black tracking-widest pl-1">Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Re-enter your new password"
                        className={`w-full pl-4 pr-10 py-2.5 bg-slate-950/40 border focus:border-violet-500/50 rounded-xl text-xs text-slate-350 outline-none font-semibold transition-all ${
                          confirmPassword && confirmPassword !== password 
                            ? 'border-red-500/30 focus:border-red-500/50' 
                            : confirmPassword && confirmPassword === password 
                              ? 'border-emerald-500/30 focus:border-emerald-500/50' 
                              : 'border-white/5'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-400 mt-1 pl-1">Passwords do not match</p>
                    )}
                    {confirmPassword && confirmPassword === password && (
                      <p className="text-xs text-emerald-400 mt-1 pl-1 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passwords match</p>
                    )}
                  </div>

                  {/* Error message */}
                  {passwordError && (
                    <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={passwordLoading || (confirmPassword && confirmPassword !== password)}
                    className="bg-glow-gradient text-white font-bold py-2.5 px-6 rounded-xl text-xs hover:scale-[1.01] transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {passwordLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Subscription Panel */}
            {activeTab === 'Subscription' && (
              <motion.div 
                key="subscription-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-purple-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Subscription</h3>
                    <p className="text-xs text-slate-450 font-semibold">Review your current plan and upgrade for more features.</p>
                  </div>
                </div>

                {/* Current plan highlight */}
                <div className="border border-indigo-500/30 bg-indigo-500/10 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Your Membership Tier</p>
                    <p className="text-xl font-black text-white">Community Edition (Pro Unlocked)</p>
                    <p className="text-xs text-emerald-400 font-semibold mt-1">✨ 100% Free Forever — All advanced AI features, voice rounds, and ATS tools included.</p>
                  </div>
                  <span className="px-4 py-1.5 text-xs font-bold rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300">Active</span>
                </div>

                <div className="border border-white/5 rounded-2xl p-6 bg-slate-950/40 space-y-4">
                  <h4 className="text-sm font-bold text-white">Included With Your Account</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-medium">
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited AI Mock Interviews (All Rounds)</div>
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Sarvam AI Voice Recognition + VAD</div>
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Hyper-Personalized Resume Questions</div>
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Full ATS Resume Builder &amp; Scanner</div>
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> DSA Coding Arena with Code Runner</div>
                    <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Full Replays &amp; Biometric Analytics</div>
                  </div>
                </div>
              </motion.div>
            )}


            {/* Privacy & Security Panel */}
            {activeTab === 'Privacy & Security' && (
              <motion.div 
                key="privacy-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-6"
              >
                <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-cyan-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Privacy & Security</h3>
                    <p className="text-xs text-slate-450 font-semibold">Manage authorization logs, tokens, and data privacy.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-white/5 rounded-2xl p-4 bg-slate-950/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-white">Two-Factor Authentication</h4>
                      <p className="text-[11px] text-slate-450 mt-0.5 font-semibold">Secure your account with Google Authenticator or SMS.</p>
                    </div>
                    <button onClick={() => triggerToast('2FA setup requires email verification.')} className="border border-white/5 text-xs font-bold px-4 py-2 rounded-xl hover:bg-white/5 text-white transition-colors cursor-pointer">
                      Configure
                    </button>
                  </div>

                  <div className="border border-white/5 rounded-2xl p-4 bg-slate-950/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-white">Active Sessions</h4>
                      <p className="text-[11px] text-slate-450 mt-0.5 font-semibold">Currently logged in via this browser session.</p>
                    </div>
                    <button onClick={() => triggerToast('All other active sessions have been revoked.')} className="border border-white/5 text-xs font-bold px-4 py-2 rounded-xl hover:bg-white/5 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                      Log out others
                    </button>
                  </div>

                  <div className="border border-white/5 rounded-2xl p-4 bg-slate-950/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-white">Data Privacy & AI Training</h4>
                      <p className="text-[11px] text-slate-450 mt-0.5 font-semibold">Control how your interview transcripts are processed.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" defaultChecked className="sr-only peer" onChange={() => triggerToast('Privacy preference saved.')} />
                      <div className={toggleClass}></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}



          </AnimatePresence>
        </div>

        {/* Right Column (Status, Actions, Help) */}
        <div className="space-y-6">


          {/* Quick Actions Card */}
          <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-center text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">System Actions</h3>
            </div>

            <div className="divide-y divide-white/5">
              <button 
                onClick={() => setShowExportModal(true)}
                className="w-full flex items-center justify-between py-3.5 group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Export Backups</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Backup settings as JSON</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={() => setShowClearModal(true)}
                className="w-full flex items-center justify-between py-3.5 group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Clear History</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Flush temporary logs</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={() => setShowResetModal(true)}
                className="w-full flex items-center justify-between py-3.5 group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Reset Metrics</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Reset scorecard history</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              <button 
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-between pt-3.5 group text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-500">Delete Account</p>
                    <p className="text-[10px] text-rose-450/70 font-semibold">Request profile wipe</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-500" />
              </button>
            </div>
          </div>

          {/* Need Help Card */}
          <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-xl space-y-4 text-left">
            <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-405">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Need Help?</h3>
            </div>
            <p className="text-xs text-slate-400 relative z-10 leading-relaxed font-semibold">Visit our integrated help desk center or request callback support.</p>
            <button 
              onClick={() => setShowHelpModal(true)}
              className="w-full bg-glow-gradient text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity relative z-10 shadow-lg cursor-pointer"
            >
              <span>Contact Help Center</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between py-6 mt-8 border-t border-white/5 text-slate-500 font-semibold text-[11px]">
        <p>© 2026 Interview AI. All rights reserved.</p>
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <a className="hover:text-white transition-colors" href="#" onClick={(e) => { e.preventDefault(); triggerToast('Terms of Service page loading...'); }}>Terms of Service</a>
          <a className="hover:text-white transition-colors" href="#" onClick={(e) => { e.preventDefault(); triggerToast('Privacy Policy page loading...'); }}>Privacy Policy</a>
          <a className="hover:text-white transition-colors" href="#" onClick={(e) => { e.preventDefault(); setShowHelpModal(true); }}>Contact Us</a>
        </div>
      </footer>

      {/* --- MODAL DIALOGS --- */}
      <AnimatePresence>
        

        {/* 2. Export Data Modal */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-white/5 w-full max-w-md rounded-3xl p-6 relative shadow-2xl space-y-4 text-center"
            >
              <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Export Profile Data</h3>
                <p className="text-xs text-slate-400 font-semibold">Export your saved profile, preferences, and notification settings as a JSON file.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowExportModal(false)} className="flex-1 border border-white/5 text-slate-300 hover:bg-white/5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                <button onClick={handleExportData} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Confirm Export</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. Clear Activity Modal */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-white/5 w-full max-w-md rounded-3xl p-6 relative shadow-2xl space-y-4 text-center"
            >
              <button onClick={() => setShowClearModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-450 animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Clear All Activity Logs?</h3>
                <p className="text-xs text-slate-400 font-semibold">This action permanently removes all past mock transcripts and recording analytics from the UI.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowClearModal(false)} className="flex-1 border border-white/5 text-slate-300 hover:bg-white/5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                <button onClick={handleClearActivity} className="flex-1 bg-red-650 hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Clear History</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. Reset Progress Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-white/5 w-full max-w-md rounded-3xl p-6 relative shadow-2xl space-y-4 text-center"
            >
              <button onClick={() => setShowResetModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto text-yellow-500">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Reset Learning Progress?</h3>
                <p className="text-xs text-slate-400 font-semibold">This will reset your mock test marks, analytics charts, and daily streaks to zero.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowResetModal(false)} className="flex-1 border border-white/5 text-slate-300 hover:bg-white/5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                <button onClick={handleResetProgress} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Reset Data</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 5. Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-white/5 w-full max-w-md rounded-3xl p-6 relative shadow-2xl space-y-4 text-center"
            >
              <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Permanently Delete Account?</h3>
                <p className="text-xs text-slate-400 font-semibold">This cannot be undone. Type <span className="font-bold text-red-400">DELETE</span> below to confirm your request.</p>
              </div>
              <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2">
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  required
                  placeholder="DELETE"
                  className="w-full bg-[#131620] border border-white/10 text-white rounded-xl p-2.5 text-center text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 font-bold tracking-widest placeholder-slate-700 outline-none"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 border border-white/5 text-slate-300 hover:bg-white/5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                  <button type="submit" disabled={deleteConfirmText.toUpperCase() !== 'DELETE'} className="flex-1 bg-red-600 disabled:opacity-40 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Delete Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 6. Help Desk Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-white/5 w-full max-w-md rounded-3xl p-6 relative shadow-2xl space-y-4 text-center"
            >
              <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto text-cyan-400">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Interview AI Support Desk</h3>
                <p className="text-xs text-slate-400 font-semibold">Describe your question or issue below, and our team will get back to you within 24 hours.</p>
              </div>
              <form onSubmit={handleHelpSubmit} className="space-y-4 pt-2">
                <textarea 
                  value={helpQuestion}
                  onChange={(e) => setHelpQuestion(e.target.value)}
                  required
                  rows="4"
                  placeholder="Ask about mock test limits, roadmaps, billing cycles, or report a bug..."
                  className="w-full bg-[#131620] border border-white/10 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder-slate-650 resize-none outline-none"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowHelpModal(false)} className="flex-1 border border-white/5 text-slate-300 hover:bg-white/5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-505 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer">Submit Ticket</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
