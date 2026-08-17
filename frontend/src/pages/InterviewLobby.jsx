import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { BACKEND_URL, API_BASE } from '../config';
import { 
  ShieldCheck, AlertCircle, Sparkles,
  Zap, Loader2, Users, Send, Trash2,
  Check, BookOpen, XCircle, UploadCloud, Video, Mic, Heart, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InterviewLobby() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // Tab State: 'ai' (AI Interview) or 'peer' (Peer Matchmaker)
  const [activeTab, setActiveTab] = useState('ai');

  // Selected configs for AI mock
  const [type, setType] = useState('HR');
  const [difficulty, setDifficulty] = useState('Easy');
  const [role, setRole] = useState('Software Engineer');
  const [company, setCompany] = useState('Common');
  const [language, setLanguage] = useState('JavaScript');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Loaded lists
  const [resumes, setResumes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const coachActive = true;

  // Confidence Checklist
  const [confidenceCheck, setConfidenceCheck] = useState({
    micAccess: false,
    camAccess: false,
    deepBreath: false,
    focusedMind: false
  });

  // P2P Matchmaking states
  const [matchingState, setMatchingState] = useState('idle'); // 'idle', 'searching', 'matched'
  const [targetMatchRole, setTargetMatchRole] = useState('Software Engineer');
  const [matchedPeer, setMatchedPeer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [matchRoomId, setMatchRoomId] = useState('');
  const [roleAssignment, setRoleAssignment] = useState('Interviewer'); // Interviewer / Candidate

  // Canvas Refs for matched whiteboard sync
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const socketRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [drawColor, setDrawColor] = useState('#06b6d4'); // Cyan default for peer board

  useEffect(() => {
    // Connect socket for matching & synchronized peer sessions
    socketRef.current = io(BACKEND_URL, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Peer Matchmaking Socket connected.');
    });

    // Listen for socket relays
    socketRef.current.on('peer_joined', ({ socketId }) => {
      console.log('👤 Another peer joined room:', socketId);
    });

    socketRef.current.on('draw_update', ({ drawData }) => {
      drawPeerPath(drawData);
    });

    socketRef.current.on('canvas_cleared', () => {
      clearLocalCanvas();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Initialize canvas for matched P2P whiteboard when matched
  useEffect(() => {
    if (matchingState === 'matched' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;

      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
    }
  }, [matchingState]);

  // Load Resumes
  useEffect(() => {
    const fetchResumes = async () => {
      let loadedResumes = [];
      try {
        const res = await fetch(`${API_BASE}/resumes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.resumes && Array.isArray(data.resumes)) {
            loadedResumes = data.resumes.map(r => ({
              id: r.id,
              filename: r.filename || `${r.name || 'User'}_Resume_${r.targetRole || 'General'}.pdf`,
              targetRole: r.targetRole || 'Software Engineer',
              atsScore: r.atsScore || 80
            }));
          }
        }
      } catch (e) {
        console.warn("Could not load resumes, using mock resumes list", e.message);
      } finally {
        setResumes([
          ...loadedResumes,
          { id: "res_mock_1", filename: "Rahul_Kumar_CV.pdf", targetRole: "Software Engineer", atsScore: 84 },
          { id: "res_mock_2", filename: "Rahul_Kumar_WebDev.pdf", targetRole: "Web Developer", atsScore: 78 }
        ]);
      }
    };

    fetchResumes();
  }, [token]);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError('');
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch(`${API_BASE}/resumes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload resume');

      const resData = data.resume || data;
      // Add the new resume to the state list
      const newResume = {
        id: resData.id,
        filename: resData.filename || resData.file_name || file.name,
        targetRole: resData.targetRole || resData.target_role || 'Software Engineer',
        atsScore: resData.atsScore || resData.ats_score || 80
      };

      setResumes(prev => [newResume, ...prev.filter(r => r.id !== newResume.id)]);
      setSelectedResumeId(newResume.id);
      setUploadSuccess(true);
      
      // Auto-set the role if detected from resume
      if (newResume.targetRole) {
        setRole(newResume.targetRole);
      }
    } catch (err) {
      console.error("Resume Upload Error:", err);
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };


  const handleStartInterview = async () => {
    const allChecked = Object.values(confidenceCheck).every(v => v === true);
    if (!allChecked && type !== "Coding") {
      alert("Please complete the AI Prep Coach confidence checklist before starting the voice session!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/interviews/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          difficulty,
          role,
          company,
          language,
          resumeId: selectedResumeId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 || res.status === 400) {
          alert(data.message);
          setSubmitting(false);
          return;
        }
        throw new Error(data.message || 'Failed to start interview');
      }
      navigate(`/interview-room?sessionId=${data.session.id}&resumeId=${selectedResumeId}`);
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('fetch failed')) {
        console.warn("Server generation offline, starting mock-backed session:", err.message);
        const mockSessionId = 'int_mock_' + Date.now();
        navigate(`/interview-room?sessionId=${mockSessionId}&type=${type}&difficulty=${difficulty}&role=${role}&company=${company}&language=${language}&resumeId=${selectedResumeId}`);
      } else {
        alert(err.message || "An error occurred starting the interview.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCheck = (key) => {
    setConfidenceCheck(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Peer Matchmaking sequence
  const startPeerSearch = () => {
    setMatchingState('searching');
    setChatMessages([]);
    
    // Simulate real-time matchmaking over Socket.IO after 3 seconds
    setTimeout(() => {
      const mockPeers = [
        { name: "Rahul Sharma", role: "Software Engineer", avatar: "👨‍💻", rating: "4.8★" },
        { name: "Sneha Reddy", role: "Web Developer", avatar: "👩‍💻", rating: "4.9★" },
        { name: "Amit Patel", role: "AI/ML Engineer", avatar: "🤖", rating: "4.7★" }
      ];
      const matched = mockPeers.find(p => p.role === targetMatchRole) || mockPeers[0];
      setMatchedPeer(matched);
      
      const randomRoomKey = 'ROOM-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      setMatchRoomId(randomRoomKey);
      setRoleAssignment(Math.random() > 0.5 ? 'Interviewer' : 'Candidate');
      setMatchingState('matched');

      // Join standard WebSocket room
      socketRef.current.emit('join_room', randomRoomKey);
      
      setChatMessages([
        { sender: "System", text: `Matched with ${matched.name} (${matched.rating}) for ${matched.role}! Secure peer line established.`, avatar: "📢" },
        { sender: matched.name, text: "Hey! Glad to mock code with you. Let's design something cool today!", avatar: matched.avatar }
      ]);
    }, 3000);
  };

  const cancelPeerSearch = () => {
    setMatchingState('idle');
    setMatchedPeer(null);
  };

  const leavePeerSession = () => {
    setMatchingState('idle');
    setMatchedPeer(null);
    setChatMessages([]);
  };

  // Chat methods
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const senderName = user?.name || "You";
    const payload = chatInput.trim();
    setChatInput('');

    // Append locally
    setChatMessages(prev => [...prev, { sender: `You (${senderName})`, text: payload, avatar: "👨‍🎓" }]);

    // Emit socket broadcast
    socketRef.current.emit('gd_message', {
      roomId: matchRoomId,
      sender: senderName,
      text: payload,
      avatar: "👨‍🎓"
    });
  };

  // Whiteboard drawing synchronizations
  function drawPeerPath(drawData) {
    const context = contextRef.current;
    if (!context) return;
    context.beginPath();
    context.strokeStyle = drawData.color;
    context.lineWidth = 3;
    context.moveTo(drawData.x0, drawData.y0);
    context.lineTo(drawData.x1, drawData.y1);
    context.stroke();
    context.closePath();
  }

  const handleCanvasMouseDown = ({ nativeEvent }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;
    lastPosRef.current = { x, y };
    isDrawingRef.current = true;
  };

  const handleCanvasMouseMove = ({ nativeEvent }) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;

    const currentStroke = {
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: x,
      y1: y,
      color: drawColor
    };

    context.beginPath();
    context.strokeStyle = drawColor;
    context.lineWidth = 3;
    context.moveTo(currentStroke.x0, currentStroke.y0);
    context.lineTo(currentStroke.x1, currentStroke.y1);
    context.stroke();
    context.closePath();

    // Broadcast stroke
    socketRef.current.emit('draw_path', {
      roomId: matchRoomId,
      drawData: currentStroke
    });

    lastPosRef.current = { x, y };
  };

  const handleCanvasMouseUp = () => {
    isDrawingRef.current = false;
  };

  function clearLocalCanvas() {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  const handleClearCanvas = () => {
    clearLocalCanvas();
    socketRef.current.emit('clear_canvas', matchRoomId);
  };

  const roles = ["Software Engineer", "Web Developer", "Data Analyst", "AI/ML Engineer", "Cybersecurity Analyst"];
  const companies = ["Common", "Google", "Amazon", "TCS", "Infosys"];
  const languages = ["JavaScript", "Python", "Java", "C++", "DBMS", "OS", "CN"];

  const peerGuidelines = {
    Interviewer: [
      "Ask: 'How do you design a high-availability rate limiter for a multi-tenant API?'",
      "Observe how the candidate structures their components on the whiteboard.",
      "Evaluate: Does the candidate state trade-offs of Token Bucket vs. Leaky Bucket?",
      "Provide constructive, motivational feedback at the end."
    ],
    Candidate: [
      "Task: Design a real-time rate limiting solution on the whiteboard.",
      "First clarify specifications: Read/Write load, latency limits.",
      "Draw the blocks: Client ➔ API Gateway ➔ Redis Cache.",
      "Explain sliding-window algorithm mechanics out loud."
    ]
  };

  return (
    <div className="space-y-6 pt-2 pb-12 w-full text-left">
      


      {matchingState !== 'matched' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              🎙️ Mock Setup Lobby
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Tailor target configurations, connect with adaptive AI engines, or match with active peers for live mock interviews.
            </p>
          </div>

          {/* Navigation tab switchers */}
          <div className="flex p-1 rounded-xl bg-slate-950/60 border border-white/5 max-w-md print:hidden">
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2 px-4 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'ai' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> AI Mock Interview
            </button>
            <button
              onClick={() => setActiveTab('peer')}
              className={`py-2 px-4 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'peer' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Peer Matchmaker
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'ai' && matchingState !== 'matched' && (
          <motion.div 
            key="ai-lobby"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-3xl p-6 sm:p-8 space-y-6 bg-slate-900/20 border border-white/5">
                <h3 className="text-sm font-black text-slate-200 border-b border-white/5 pb-4 uppercase tracking-wider">
                  Configure Target Parameters
                </h3>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Interview Domain Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {['HR', 'Technical', 'Behavioral', 'Aptitude', 'Coding'].map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          type === t 
                            ? 'bg-glow-gradient text-white border-violet-500/25 shadow-lg' 
                            : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-base">
                          {t === 'HR' && '👔'}
                          {t === 'Technical' && '💻'}
                          {t === 'Behavioral' && '🧠'}
                          {t === 'Aptitude' && '📐'}
                          {t === 'Coding' && '⚡'}
                        </span>
                        <span>
                          {t}
                        </span>
                      </button>
                    ))}
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Target Job Role
                    </label>
                    <select 
                      value={role} 
                      onChange={e => setRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-slate-350 text-xs outline-none focus:border-violet-500/50 transition-all font-semibold"
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Target Company Preset
                    </label>
                    <select 
                      value={company} 
                      onChange={e => setCompany(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-slate-355 text-xs outline-none focus:border-violet-500/50 transition-all font-semibold"
                    >
                      {companies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Difficulty Rating
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Easy', 'Medium', 'Hard'].map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            difficulty === d 
                              ? 'bg-slate-800 text-cyan-400 border-cyan-500/30 shadow-md shadow-cyan-500/5' 
                              : 'bg-slate-950/30 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Language / Sub-Domain
                    </label>
                    <select 
                      value={language} 
                      disabled={type === 'HR' || type === 'Behavioral'}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-slate-350 text-xs outline-none focus:border-violet-500/50 transition-all disabled:opacity-40 font-semibold"
                    >
                      {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5 text-left">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Associate ATS Resume (Optional)
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      Tailors AI prompts
                    </span>
                  </div>
                  <select
                    value={selectedResumeId}
                    onChange={e => setSelectedResumeId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-slate-350 text-xs outline-none focus:border-violet-500/50 transition-all font-semibold"
                  >
                    <option value="">Start without resume details (General)</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>
                        📄 {r.filename} (ATS Score: {r.atsScore}%)
                      </option>
                    ))}
                  </select>

                  {/* Resume upload uploader button / drop-zone */}
                  <div className="pt-2">
                    <label className="relative flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-violet-500/40 hover:bg-violet-500/[0.02] transition-all rounded-xl p-4 cursor-pointer group">
                      <input 
                        type="file" 
                        accept=".pdf,.txt" 
                        onChange={handleResumeUpload} 
                        className="hidden" 
                        disabled={uploadingFile}
                      />
                      
                      {uploadingFile ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                          <span className="text-xs text-slate-400 font-semibold">Extracting & analyzing with AI...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-violet-400 group-hover:border-violet-500/20 transition-all">
                            <UploadCloud className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-300">Upload new PDF or TXT Resume</p>
                            <p className="text-[10px] text-slate-500 font-semibold">Let AI automatically analyze your capabilities</p>
                          </div>
                        </div>
                      )}
                    </label>
                    
                    {uploadSuccess && (
                      <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3 animate-pulse" /> Resume uploaded and parsed successfully!
                      </p>
                    )}
                    {uploadError && (
                      <p className="text-[10px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {uploadError}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleStartInterview}
                  disabled={submitting}
                  className="w-full bg-glow-gradient py-4 rounded-xl text-sm font-bold text-white shadow-xl hover:shadow-violet-500/25 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating Adaptive Session...
                    </>
                  ) : (
                    <>
                      🚀 Launch Virtual Interview Room
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {coachActive && (
                <div className="rounded-3xl p-6 border border-violet-500/20 relative overflow-hidden bg-gradient-to-b from-violet-500/5 to-slate-950/40 text-left">
                  <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2 text-violet-400 font-extrabold text-sm mb-4">
                    <Sparkles className="w-5 h-5 fill-current animate-pulse" /> AI Interview Coach
                  </div>

                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 text-slate-300 leading-relaxed text-xs flex gap-2">
                      <HelpCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-200">Coach Tip:</span> In {type} rounds, follow the <span className="font-bold text-cyan-400">STAR Method</span>: Describe the **S**ituation, **T**ask, **A**ction, and **R**esults. Focus heavily on metrics.
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                        Verification Checklist
                      </div>

                      <div className="space-y-2 text-xs">
                        {Object.keys(confidenceCheck).map(key => (
                          <button 
                            key={key}
                            onClick={() => toggleCheck(key)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-950/30 border border-white/5 hover:border-slate-800 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center justify-center w-5 h-5 rounded-lg border border-white/10 shrink-0">
                              {confidenceCheck[key] ? (
                                <Check className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <>
                                  {key === 'micAccess' && <Mic size={12} className="text-slate-500" />}
                                  {key === 'camAccess' && <Video size={12} className="text-slate-500" />}
                                  {key === 'deepBreath' && <Heart size={12} className="text-slate-500" />}
                                  {key === 'focusedMind' && <ShieldCheck size={12} className="text-slate-500" />}
                                </>
                              )}
                            </div>
                            <span className="text-slate-400 font-medium">
                              {key === 'micAccess' && 'Microphone plugged and active'}
                              {key === 'camAccess' && 'Camera access cleared (for eye check)'}
                              {key === 'deepBreath' && 'Took 3 deep breaths (Calms anxiety)'}
                              {key === 'focusedMind' && 'Silence around is verified'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-450" />
                      <span>Compliance checks are secure.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Peer-to-Peer Matchmaking Search view */}
        {activeTab === 'peer' && matchingState !== 'matched' && (
          <motion.div 
            key="peer-lobby"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-3xl p-6 sm:p-8 border border-white/5 bg-slate-900/10 text-center"
          >
            {matchingState === 'idle' ? (
              <div className="max-w-xl mx-auto text-center space-y-6 py-6">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
                  <Users className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-200">Find a Collaborative Peer Partner</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Match with another tech student preparing for similar tracks. Conduct mutual interviews, sync drawing architectures, and improve together!
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 text-left space-y-4 max-w-md mx-auto">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">
                      Choose Target Category
                    </label>
                    <select
                      value={targetMatchRole}
                      onChange={e => setTargetMatchRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/5 text-slate-350 text-xs outline-none focus:border-violet-500/50 transition-all font-semibold"
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={startPeerSearch}
                    className="w-full bg-glow-gradient py-3.5 rounded-xl text-xs font-bold text-white shadow shadow-violet-500/10 transition-all hover:scale-101 cursor-pointer"
                  >
                    Initiate Matchmaking Search
                  </button>
                </div>
              </div>
            ) : (
              /* Searching state radar loader */
              <div className="max-w-xl mx-auto text-center space-y-8 py-10">
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-4 border-4 border-cyan-500/10 border-b-cyan-500 rounded-full animate-spin-reverse"></div>
                  <Users className="w-8 h-8 text-violet-400 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-200 animate-pulse">Scanning for peers...</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Filtering for active candidates in <span className="text-cyan-400">{targetMatchRole}</span> categories.
                  </p>
                </div>

                <button
                  onClick={cancelPeerSearch}
                  className="bg-slate-900 border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-455 px-6 py-3 rounded-xl text-xs font-bold text-slate-400 transition-all cursor-pointer"
                >
                  Cancel Search Queue
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matched Real-Time Collaborative Workspace Panels */}
      {matchingState === 'matched' && matchedPeer && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60 border border-white/5 p-4 rounded-3xl text-left">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 text-xl flex items-center justify-center">
                {matchedPeer.avatar}
              </span>
              <div>
                <span className="text-[9px] text-slate-500 font-black block uppercase tracking-widest">PEER PARTNER</span>
                <span className="font-extrabold text-slate-200 text-sm">{matchedPeer.name} ({matchedPeer.rating})</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-xl font-bold text-violet-400">
                You are: {roleAssignment}
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <button
                onClick={leavePeerSession}
                className="bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold text-rose-400 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> End Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Whiteboard canvas design desk */}
            <div className="xl:col-span-2 space-y-4">
              <div className="rounded-3xl p-3 bg-slate-950 border border-white/5 relative text-left">
                <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl text-xs mb-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={handleClearCanvas}
                      className="px-3 py-1 rounded bg-slate-950 border border-white/5 hover:text-rose-455 text-slate-400 flex items-center gap-1.5 cursor-pointer font-bold text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" /> Reset
                    </button>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {['#06b6d4', '#f43f5e', '#a855f7', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => setDrawColor(c)}
                        className={`w-4 h-4 rounded-full border transition-all ${drawColor === c ? 'scale-125 ring-2 ring-violet-500/40' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <span className="text-[10px] text-slate-500 font-extrabold ml-1 uppercase">Color</span>
                  </div>
                </div>

                <div className="h-[380px] w-full bg-[#090d16] rounded-2xl relative overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="w-full h-full cursor-crosshair bg-transparent"
                  />
                </div>
              </div>

              {/* Guide card based on Role Assignment */}
              <div className="rounded-3xl p-5 border border-cyan-500/10 bg-cyan-950/5 text-left space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Mock Role Guidelines - {roleAssignment}</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-450 font-medium">
                  {peerGuidelines[roleAssignment].map((g, i) => (
                    <li key={i} className="flex gap-2 items-start pl-1">
                      <span className="text-cyan-400 font-bold shrink-0">✓</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Chat discussion feed */}
            <div className="rounded-3xl p-6 bg-slate-900/10 border border-white/5 space-y-4 flex flex-col justify-between h-[520px] text-left">
              <div>
                <h3 className="text-[10px] font-black text-slate-500 border-b border-white/5 pb-3 uppercase tracking-widest">LOBBY CHAT ENGINE</h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-2xl border text-xs space-y-1 ${msg.sender.includes('You') ? 'bg-violet-500/5 border-violet-500/10' : msg.sender.includes('System') ? 'bg-slate-950/40 border-white/5' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-350">{msg.avatar} {msg.sender}</span>
                    </div>
                    <p className="text-slate-400 leading-normal pl-0.5 font-medium">"{msg.text}"</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendChatMessage} className="flex gap-2 border-t border-white/5 pt-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Write message to peer..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-white/5 rounded-xl text-xs text-slate-300 outline-none focus:border-violet-500/50"
                />
                <button type="submit" className="p-2.5 bg-glow-gradient rounded-xl text-white hover:scale-102 transition-all cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
