import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import {
  Mic, MicOff, Video, VideoOff,
  Edit3, ArrowRight,
  Phone, PhoneOff, Volume1,
  AlertTriangle, X,
  Send, Square, Eye, Brain
} from 'lucide-react';
import MetricRing from '../components/ui/MetricRing';

export default function InterviewRoom() {
  const { token, updateXp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const resumeId = searchParams.get('resumeId');

  // Config overrides for offline/fallback mode
  const oType = searchParams.get('type') || 'HR';
  const oDiff = searchParams.get('difficulty') || 'Medium';
  const oRole = searchParams.get('role') || 'Software Engineer';
  const oComp = searchParams.get('company') || 'Common';
  const oLang = searchParams.get('language') || 'JavaScript';

  // Active Session states
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("Loading your interview, please wait...");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answerText, setAnswerText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechTimer, setSpeechTimer] = useState(0);
  
  // Interface options
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  // Telephony Simulator states
  const [telephonyMode, setTelephonyMode] = useState(false);
  const [callState, setCallState] = useState('idle'); // 'idle', 'ringing', 'connected'

  // Anti-Cheat Warnings
  const [strikeCount, setStrikeCount] = useState(0);
  const [warnings, setWarnings] = useState([]);

  // Biometric Accumulators for current answer
  const [eyeContactFrames, setEyeContactFrames] = useState(0);
  const [goodEyeContactFrames, setGoodEyeContactFrames] = useState(0);
  const [stressValues, setStressValues] = useState([]);
  const [, setEmotionsList] = useState([]);

  // Dialogue Transcript history list (to display conversation history)
  const [dialogues, setDialogues] = useState([
    {
      time: "00:15",
      sender: "AI Interviewer",
      text: "Tell me about yourself, walk me through your technical background, and explain what draws you to this Software Engineer position."
    }
  ]);

  // Biometric Live states for overlays (dynamically changing slightly)
  const [stressLevelPercent, setStressLevelPercent] = useState(11.2);
  const [pulseBPM, setPulseBPM] = useState(75);
  const [gazeStable, setGazeStable] = useState("Good");

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const whiteboardCanvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [currentTechScore, setCurrentTechScore] = useState(70);
  const [currentCommScore, setCurrentCommScore] = useState(70);

  useEffect(() => {
    if (session) {
      const transcript = session.transcript || [];
      if (transcript.length > 0) {
        const lastTurn = transcript[transcript.length - 1];
        if (lastTurn?.analysis) {
          setCurrentTechScore(lastTurn.analysis.technicalAccuracy || 70);
          setCurrentCommScore(lastTurn.analysis.fluencyScore || 70);
          return;
        }
      }
      if (session.scoreCard?.technicalScore !== undefined) {
        setCurrentTechScore(session.scoreCard.technicalScore);
      }
      if (session.scoreCard?.communicationScore !== undefined) {
        setCurrentCommScore(session.scoreCard.communicationScore);
      }
    }
  }, [session]);

  const boxXRef = useRef(60);
  const boxYRef = useRef(40);

  // Load Session
  useEffect(() => {
    const initSession = async () => {
      try {
        if (sessionId && !sessionId.startsWith('int_mock_') && !sessionId.startsWith('mock_')) {
          const res = await fetch(`${API_BASE}/interviews/session/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
             if (data.session) {
              setSession(data.session);
              const qIndex = data.session.currentQuestionIndex || 0;
              setCurrentIndex(qIndex);

              // Restore dialogues transcript history if it exists
              const transcript = data.session.transcript || [];
              if (transcript.length > 0) {
                const restoredDialogues = [];
                transcript.forEach((t, idx) => {
                  restoredDialogues.push({
                    time: `00:${15 + idx * 40}`,
                    sender: "AI Interviewer",
                    text: t.question
                  });
                  restoredDialogues.push({
                    time: `00:${35 + idx * 40}`,
                    sender: "You",
                    text: t.answer
                  });
                });
                // Add the current question to the dialogue list
                restoredDialogues.push({
                  time: `00:${15 + qIndex * 40}`,
                  sender: "AI Interviewer",
                  text: data.session.questions[qIndex]?.text || data.session.questions[qIndex]?.question || ""
                });
                setDialogues(restoredDialogues);
              }

              setCurrentQuestion(data.session.questions[qIndex]?.text || "Tell me about yourself, walk me through your technical background, and explain what draws you to this Software Engineer position.");
              setTotalQuestions(data.session.questions.length);
              setLoading(false);
              return;
            }
          }
        }

        const res = await fetch(`${API_BASE}/interviews/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: oType,
            difficulty: oDiff,
            role: oRole,
            company: oComp,
            language: oLang,
            resumeId: resumeId
          })
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          setCurrentQuestion(data.session.questions[0]?.text || "Tell me about yourself, walk me through your technical background, and explain what draws you to this Software Engineer position.");
          setTotalQuestions(data.session.questions.length);
        } else {
          throw new Error("Init session failed");
        }
      } catch (err) {
        console.warn("Using local simulator fallback session details", err.message);
        let mockQuestions = [
          "Tell me about yourself, walk me through your technical background, and explain what draws you to this Software Engineer position.",
          "What are your main technical strengths and major programming achievements?",
          "How do you approach team integration and conflict resolutions in project sprints?",
          "Describe a technically demanding project you spearheaded and what metrics determined its success.",
          "Where do you see your technical competencies growing in the next three years?"
        ];

        if (resumeId === "res_mock_1") {
          mockQuestions = [
            "Welcome Rahul Kumar. Explain your core software development philosophy, specifically referencing your IIT B.Tech background.",
            "In your ViteTech Corp internship, you optimized REST APIs by 25%. Walk us through the technical details of that optimization.",
            "You spearheaded 'AI Mock Interview Platform' which handled 10k concurrent WebSockets. How did you design the state clustering to support this scale?",
            "Since you listed Java, Go, and Python, how do you evaluate language trade-offs when building a Distributed Key-Value Store?",
            "If we were to deploy your Raft consensus project to AWS, how would you design the fault-tolerant network topologies?"
          ];
        } else if (resumeId === "res_mock_2") {
          mockQuestions = [
            "Welcome Rahul Kumar. Walk us through your IT B.Tech journey at DTU and what draws you to Web Development.",
            "At PixelPerfect Solutions, you redesigned the landing page to boost engagement by 18%. What specific UX and performance metrics drove this success?",
            "You built an 'Interactive Collaborative Whiteboard' using Socket.IO. How did you handle synchronization conflicts when multiple users drew concurrently?",
            "You listed Redux, Webpack, and Tailwind CSS. How do you optimize bundle size and CSS loading in a Progressive Web App?",
            "What are the major performance advantages of your E-Commerce PWA's offline shopping support compared to a standard web app?"
          ];
        }

        const mockSession = {
          id: sessionId || 'int_mock_' + Date.now(),
          type: oType,
          difficulty: oDiff,
          role: oRole,
          company: oComp,
          questions: mockQuestions.map((q, i) => ({ id: `mq_${i}`, text: q })),
          transcript: []
        };
        setSession(mockSession);
        setCurrentQuestion(mockQuestions[0]);
        setTotalQuestions(mockQuestions.length);
      } finally {
        setLoading(false);
      }
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  // Anti-Cheat: Screen blur warnings (disabled in telephony mode)
  useEffect(() => {
    const handleBlur = () => {
      if (telephonyMode) return;
      setStrikeCount(prev => {
        const next = prev + 1;
        setWarnings(w => [...w, `⚠️ Warning Strike ${next}: Focus lost! Do not change browser tabs.`]);
        if (next >= 3) {
          alert("🚨 Extreme Cheating Warning: Focus limit reached. Submitting remaining session.");
          handleFinishInterview();
        }
        return next;
      });
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, telephonyMode]);

  // Speech Recognition setup (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setAnswerText(prev => prev + ' ' + finalTranscript);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Text-To-Speech: Speak current question aloud
  const speakQuestion = () => {
    if ('speechSynthesis' in window && currentQuestion) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion);
      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => setAiSpeaking(false);
      utterance.onerror = () => setAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (currentQuestion && !loading) {
      speakQuestion();
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, loading]);

  // Simulate dynamically fluctuating biometrics overlays
  useEffect(() => {
    const interval = setInterval(() => {
      setStressLevelPercent(prev => {
        const delta = (Math.random() - 0.5) * 0.4;
        return parseFloat(Math.min(25, Math.max(5, prev + delta)).toFixed(1));
      });
      setPulseBPM(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.min(85, Math.max(65, prev + delta));
      });
      setGazeStable(Math.random() > 0.92 ? "Drifting..." : "Good");
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Webcam access & Face analysis canvas overlay
  useEffect(() => {
    let stream = null;
    let animId = null;

    const startCamera = async () => {
      if (cameraActive && !telephonyMode) {
        try {
          // Request high resolution, colourful video stream
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 640 }, 
              height: { ideal: 480 },
              facingMode: "user"
            } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          
          const ctx = canvasRef.current.getContext('2d');
          
          const drawOverlay = () => {
            if (ctx && canvasRef.current) {
              const now = Date.now();
              const width = canvasRef.current.width;
              const height = canvasRef.current.height;
              
              // Clear previous frames
              ctx.clearRect(0, 0, width, height);

              // Draw tracking bounding bracket box center interpolated
              const boxX = boxXRef.current + Math.sin(now / 1000) * 1.5;
              const boxY = boxYRef.current + Math.cos(now / 1200) * 1.5;
              const boxWidth = 120;
              const boxHeight = 130;

              // Draw tracking box corners
              ctx.strokeStyle = '#06b6d4'; // cyan-500
              ctx.lineWidth = 2.5;
              const size = 12;
              
              // Top-left corner
              ctx.beginPath();
              ctx.moveTo(boxX, boxY + size);
              ctx.lineTo(boxX, boxY);
              ctx.lineTo(boxX + size, boxY);
              ctx.stroke();

              // Top-right corner
              ctx.beginPath();
              ctx.moveTo(boxX + boxWidth - size, boxY);
              ctx.lineTo(boxX + boxWidth, boxY);
              ctx.lineTo(boxX + boxWidth, boxY + size);
              ctx.stroke();

              // Bottom-left corner
              ctx.beginPath();
              ctx.moveTo(boxX, boxY + boxHeight - size);
              ctx.lineTo(boxX, boxY + boxHeight);
              ctx.lineTo(boxX + size, boxY + boxHeight);
              ctx.stroke();

              // Bottom-right corner
              ctx.beginPath();
              ctx.moveTo(boxX + boxWidth - size, boxY + boxHeight);
              ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
              ctx.lineTo(boxX + boxWidth, boxY + boxHeight - size);
              ctx.stroke();

              // Pupil eye tracking circles
              const leftPupilX = boxX + 40 + Math.sin(now / 350) * 0.8;
              const leftPupilY = boxY + 45 + Math.cos(now / 350) * 0.8;
              const rightPupilX = boxX + 80 + Math.sin(now / 350) * 0.8;
              const rightPupilY = boxY + 45 + Math.cos(now / 350) * 0.8;

              ctx.strokeStyle = '#8b5cf6'; // purple-500
              ctx.lineWidth = 1.5;
              
              ctx.beginPath();
              ctx.arc(leftPupilX, leftPupilY, 4, 0, 2 * Math.PI);
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(rightPupilX, rightPupilY, 4, 0, 2 * Math.PI);
              ctx.stroke();

              // Connected horizontal reticle link
              ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
              ctx.beginPath();
              ctx.moveTo(leftPupilX, leftPupilY);
              ctx.lineTo(rightPupilX, rightPupilY);
              ctx.stroke();

              // Accumulate statistics if user is speaking
              if (isListening) {
                setEyeContactFrames(prev => prev + 1);
                setGoodEyeContactFrames(prev => prev + 1);
                setStressValues(prev => [...prev, stressLevelPercent]);
                setEmotionsList(prev => [...prev, "Confident"]);
              }
              
              animId = requestAnimationFrame(drawOverlay);
            }
          };
          animId = requestAnimationFrame(drawOverlay);
        } catch (err) {
          console.warn("Camera blocks in sandbox mode:", err.message);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, telephonyMode, isListening]);

  // Whiteboard drawing engine
  useEffect(() => {
    if (whiteboardOpen && whiteboardCanvasRef.current) {
      const canvas = whiteboardCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      let drawing = false;

      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      };

      const startDraw = (e) => {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      };

      const endDraw = () => {
        drawing = false;
      };

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);

      return () => {
        canvas.removeEventListener('mousedown', startDraw);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', endDraw);
      };
    }
  }, [whiteboardOpen]);

  // Speech Timing Controller
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your answer.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      clearInterval(timerIntervalRef.current);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
      setSpeechTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setSpeechTimer(prev => prev + 1);
      }, 1000);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!answerText.trim()) {
      alert("Please record or write your response first.");
      return;
    }

    if (isListening) {
      toggleListening();
    }

    setLoading(true);

    // Compute average biometric stats
    let avgEyeContactScore = 82;
    if (eyeContactFrames > 0) {
      avgEyeContactScore = Math.round((goodEyeContactFrames / eyeContactFrames) * 100);
    }
    
    let avgStress = Math.round(stressLevelPercent);
    if (stressValues.length > 0) {
      avgStress = Math.round(stressValues.reduce((a, b) => a + b, 0) / stressValues.length);
    }
    
    let dominantEmotion = "Confident";

    // Format current timestamp string
    const formatTime = (secs) => {
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    // Push response to dialogue timeline
    const answerTimestamp = formatTime(15 + speechTimer);
    const newDialoguePair = [
      {
        time: answerTimestamp,
        sender: "You",
        text: answerText
      }
    ];

    try {
      const res = await fetch(`${API_BASE}/interviews/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: session.id,
          answerText,
          speechDurationSeconds: speechTimer || 30,
          tabBlurCount: strikeCount,
          webcamStats: {
            eyeContactScore: avgEyeContactScore,
            stressScore: avgStress,
            emotion: dominantEmotion
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Evaluation failed');

      if (data.analysis) {
        setCurrentTechScore(data.analysis.technicalAccuracy || 70);
        setCurrentCommScore(data.analysis.fluencyScore || 70);
      }

      // Reset biometric accumulators
      setEyeContactFrames(0);
      setGoodEyeContactFrames(0);
      setStressValues([]);
      setEmotionsList([]);

      if (data.isCompleted) {
        handleFinishInterview();
      } else {
        const nextQ = data.nextQuestion.text || data.nextQuestion.question;
        setDialogues(prev => [
          ...prev, 
          ...newDialoguePair,
          {
            time: formatTime(25 + speechTimer),
            sender: "AI Interviewer",
            text: nextQ
          }
        ]);
        setAnswerText("");
        setSpeechTimer(0);
        setCurrentIndex(prev => prev + 1);
        setCurrentQuestion(nextQ);
        setLoading(false);
      }
    } catch (e) {
      console.warn("Answer evaluated offline inside local simulator:", e.message);

      // Local fallback metrics computation
      const wordCount = answerText.split(/\s+/).filter(Boolean).length;
      let mockTech = 75;
      let mockComm = 80;
      if (wordCount < 5) {
        mockTech = 0;
        mockComm = 10;
      } else if (wordCount < 15) {
        mockTech = 45;
        mockComm = 60;
      }
      setCurrentTechScore(mockTech);
      setCurrentCommScore(mockComm);
      
      // Reset biometric accumulators
      setEyeContactFrames(0);
      setGoodEyeContactFrames(0);
      setStressValues([]);
      setEmotionsList([]);

      const nextIdx = currentIndex + 1;
      if (nextIdx >= totalQuestions) {
        handleFinishInterview();
      } else {
        const nextQ = session.questions[nextIdx]?.text || session.questions[nextIdx]?.question || "Answer the following topic:";
        setDialogues(prev => [
          ...prev, 
          ...newDialoguePair,
          {
            time: formatTime(25 + speechTimer),
            sender: "AI Interviewer",
            text: nextQ
          }
        ]);
        setAnswerText("");
        setSpeechTimer(0);
        setCurrentIndex(nextIdx);
        setCurrentQuestion(nextQ);
        setLoading(false);
      }
    }
  };

  const handleFinishInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/interviews/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: session.id })
      });
      await res.json();
      if (res.ok) {
        updateXp(150);
        navigate(`/feedback?sessionId=${session.id}`);
      }
    } catch (err) {
      console.warn("Failed finishing live server session, loading local mock analysis dashboard:", err.message);
      navigate(`/feedback?sessionId=mock_complete`);
    }
  };

  // Telephony controls
  const startPhoneCall = () => {
    setCallState('ringing');
    setTimeout(() => {
      setCallState('connected');
      speakQuestion();
    }, 2000);
  };

  const endPhoneCall = () => {
    setCallState('idle');
    setTelephonyMode(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (isListening) {
      toggleListening();
    }
  };



  if (loading && !session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Structuring Adaptive Room...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg)' }}>
      <div className="px-6 pb-6 pt-4 space-y-4">

        {/* ── Session Header ── */}
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.04) 0%, rgba(139,92,246,0.06) 50%, rgba(59,130,246,0.04) 100%)' }} />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="recording-dot" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-rose-400">Live Session</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {session?.role || oRole} <span className="text-slate-500">·</span> {session?.company || oComp}
              </h2>
              <div className="flex flex-wrap gap-2">
                {[session?.difficulty || oDiff, oLang, session?.type || oType, '2-4 yrs'].map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Progress dots */}
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-semibold">Questions</p>
                <div className="flex gap-1.5 items-center">
                  {Array.from({ length: totalQuestions }).map((_, i) => (
                    <div key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === currentIndex ? 20 : 8, height: 8,
                        background: i < currentIndex ? '#10B981' : i === currentIndex ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-1">{currentIndex + 1} / {totalQuestions}</p>
              </div>

              {/* Timer ring */}
              <div className="flex flex-col items-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-semibold">Elapsed</p>
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 48 48" className="w-full h-full">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#8B5CF6" strokeWidth="3"
                      strokeDasharray={`${Math.min(speechTimer * 2.1, 125)} 125`}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.5))', transition: 'stroke-dasharray 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{speechTimer}s</span>
                  </div>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { if (telephonyMode) { endPhoneCall(); } else { setTelephonyMode(true); startPhoneCall(); } }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: telephonyMode ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', border: telephonyMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)', color: telephonyMode ? '#FCA5A5' : '#94A3B8' }}>
                  {telephonyMode ? <PhoneOff size={14} /> : <Phone size={14} />}
                  {telephonyMode ? 'End Call' : 'Phone Mode'}
                </button>
                <button
                  onClick={() => setWhiteboardOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: whiteboardOpen ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)', border: whiteboardOpen ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)', color: whiteboardOpen ? '#A5B4FC' : '#94A3B8' }}>
                  <Edit3 size={14} />
                  {whiteboardOpen ? 'Hide Board' : 'Whiteboard'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Strike warning */}
        {strikeCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            <AlertTriangle size={15} />
            Anti-cheat: <strong>{strikeCount} strike{strikeCount > 1 ? 's' : ''}</strong>.
            {warnings.length > 0 && <span className="text-rose-500/70 ml-1">{warnings[warnings.length - 1]}</span>}
          </div>
        )}

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Left: Camera + Controls */}
          <div className="flex flex-col gap-4">

            {/* Camera Studio */}
            <div className={`studio-camera-frame ${isListening ? 'active' : ''}`} style={{ aspectRatio: '4/5' }}>
              {cameraActive && !telephonyMode ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #0D1220, #111827)' }}>
                  {telephonyMode ? (
                    <>
                      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
                        <Phone size={32} className="text-white" />
                      </div>
                      <p className="text-white font-semibold">Phone Interview</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {callState === 'ringing' ? 'Calling...' : callState === 'connected' ? 'Connected' : 'Idle'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>Y</div>
                      <p className="text-slate-500 text-sm">Camera is off</p>
                    </>
                  )}
                </div>
              )}

              {/* Overlays */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="recording-indicator">
                  <div className="recording-dot" /> REC
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', color: '#A5B4FC' }}>
                  <Eye size={11} />
                  {Math.round(stressLevelPercent)}%
                </div>
              </div>

              {/* Biometric bottom strip */}
              <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', backdropFilter: 'blur(4px)' }}>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full animate-recording-dot" style={{ background: pulseBPM > 90 ? '#EF4444' : '#10B981' }} />
                  <span className="font-bold" style={{ color: pulseBPM > 90 ? '#FCA5A5' : '#6EE7B7' }}>{pulseBPM} BPM</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{gazeStable}</span>
                </div>
              </div>
            </div>

            {/* Camera Controls */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setCameraActive(c => !c)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: !cameraActive ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)',
                  border: !cameraActive ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: !cameraActive ? '#FCA5A5' : '#94A3B8',
                }}>
                {cameraActive ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button onClick={toggleListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening ? 'mic-pulse' : ''}`}
                style={{
                  background: isListening ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  border: isListening ? '2px solid rgba(239,68,68,0.6)' : '2px solid transparent',
                  boxShadow: isListening ? '0 0 20px rgba(239,68,68,0.4)' : '0 4px 20px rgba(99,102,241,0.4)',
                  color: 'white',
                }}>
                {isListening ? <Square size={20} /> : <Mic size={20} />}
              </button>
              <button onClick={() => setMicActive(m => !m)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: !micActive ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)',
                  border: !micActive ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  color: !micActive ? '#FCA5A5' : '#94A3B8',
                }}>
                {micActive ? <Volume1 size={18} /> : <MicOff size={18} />}
              </button>
            </div>

            {/* Whiteboard */}
            {whiteboardOpen && (
              <div className="rounded-xl overflow-hidden" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs font-semibold text-slate-400">Whiteboard</span>
                  <button onClick={() => setWhiteboardOpen(false)} className="text-slate-600 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <canvas ref={whiteboardCanvasRef} width={360} height={200}
                  className="w-full cursor-crosshair" style={{ touchAction: 'none' }} />
              </div>
            )}
          </div>

          {/* Center: Chat + Question + Answer */}
          <div className="xl:col-span-1 flex flex-col gap-4">

            {/* Current Question */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2 mb-3">
                {aiSpeaking ? (
                  <div className="soundwave flex-shrink-0">
                    {[...Array(6)].map((_,i) => <div key={i} className="bar" />)}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
                    <Brain size={14} className="text-white" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-indigo-400">AI Interviewer</p>
                  {aiSpeaking && <p className="text-[10px] text-slate-600">Speaking...</p>}
                </div>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{currentQuestion}</p>
            </div>

            {/* Dialogue History */}
            <div className="flex-1 rounded-2xl overflow-hidden flex flex-col"
              style={{ background: 'rgba(13,18,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', minHeight: 200 }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversation</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {dialogues.map((d, i) => (
                  <div key={i} className={`flex ${d.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`chat-bubble ${d.sender === 'You' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: d.sender === 'You' ? '#818CF8' : '#6B7280' }}>
                        {d.sender} · {d.time}
                      </p>
                      {d.text}
                    </div>
                  </div>
                ))}
                {aiSpeaking && (
                  <div className="flex justify-start">
                    <div className="chat-bubble chat-bubble-ai">
                      <div className="typing-indicator">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Answer Input */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder={isListening ? 'Listening... speak your answer' : 'Type or speak your answer...'}
                rows={3}
                className="glass-input w-full rounded-xl p-3 text-sm resize-none"
                style={{ borderColor: isListening ? 'rgba(239,68,68,0.4)' : undefined }}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-600">{answerText.length} chars</span>
                <div className="flex items-center gap-2">
                  {currentIndex < totalQuestions - 1 ? (
                    <button onClick={handleAnswerSubmit}
                      disabled={loading || !answerText.trim()}
                      className="btn btn-shimmer text-white font-semibold text-sm px-5 py-2 rounded-xl disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
                      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRight size={14} /> Next</>}
                    </button>
                  ) : (
                    <button onClick={handleAnswerSubmit}
                      disabled={loading || !answerText.trim()}
                      className="btn btn-shimmer text-white font-semibold text-sm px-5 py-2 rounded-xl disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} /> Submit</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Insights */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-white font-semibold text-sm mb-4">AI Insights</h3>
              <div className="grid grid-cols-2 gap-4">
                <MetricRing value={100 - stressLevelPercent} size={76} label="Confidence" color="violet" animate />
                <MetricRing value={Math.round(goodEyeContactFrames / Math.max(1, eyeContactFrames) * 100)} size={76} label="Eye Contact" color="cyan" animate />
                <MetricRing value={currentTechScore} size={76} label="Technical" color="blue" animate />
                <MetricRing value={currentCommScore} size={76} label="Communication" color="emerald" animate />
              </div>
            </div>

            {/* Live stats */}
            <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-white font-semibold text-sm">Live Biometrics</h3>
              {[
                { label: 'Heart Rate', value: `${pulseBPM} BPM`, color: pulseBPM > 90 ? '#EF4444' : '#10B981' },
                { label: 'Stress Level', value: `${Math.round(stressLevelPercent)}%`, color: stressLevelPercent > 30 ? '#F59E0B' : '#10B981' },
                { label: 'Gaze Stability', value: gazeStable, color: gazeStable === 'Good' ? '#10B981' : '#F59E0B' },
                { label: 'Answer Duration', value: `${speechTimer}s`, color: '#6366F1' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* ── Evaluation Confidence Index Gauge ── */}
            {(() => {
              const eyePct   = Math.round(goodEyeContactFrames / Math.max(1, eyeContactFrames) * 100);
              const answerLengthScore = Math.min(100, (answerText.length / 150) * 100);
              const eci = Math.min(100, Math.round(
                (eyePct * 0.25) +
                ((100 - stressLevelPercent) * 0.25) +
                (answerLengthScore * 0.30) +
                ((currentIndex / Math.max(1, totalQuestions - 1)) * 100 * 0.20)
              ));
              const eciColor = eci >= 75 ? '#10B981' : eci >= 50 ? '#F59E0B' : '#EF4444';
              const eciLabel = eci >= 75 ? 'High' : eci >= 50 ? 'Moderate' : 'Low';
              const circumference = 2 * Math.PI * 32;
              const strokeDash = (eci / 100) * circumference;

              return (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold text-sm">Confidence Index</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${eciColor}18`, color: eciColor }}>
                      {eciLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* SVG Arc Gauge */}
                    <div className="relative flex-shrink-0">
                      <svg width="76" height="76" viewBox="0 0 76 76">
                        <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                        <circle
                          cx="38" cy="38" r="32" fill="none"
                          stroke={eciColor} strokeWidth="6"
                          strokeDasharray={`${strokeDash} ${circumference}`}
                          strokeLinecap="round"
                          transform="rotate(-90 38 38)"
                          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 6px ${eciColor}60)` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-white leading-none">{eci}</span>
                        <span className="text-[9px] text-slate-500 font-medium">/ 100</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 text-xs">
                      <p className="text-slate-400 leading-snug">Evaluation reliability based on eye contact, stress, answer depth, and session progress.</p>
                      <div className="flex flex-col gap-1">
                        {[
                          { label: 'Eye Contact', v: eyePct },
                          { label: 'Answer Depth', v: Math.round(answerLengthScore) },
                          { label: 'Composure', v: Math.round(100 - stressLevelPercent) },
                        ].map(f => (
                          <div key={f.label}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-slate-600">{f.label}</span>
                              <span className="text-slate-400 font-semibold">{f.v}%</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.v}%`, background: eciColor }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── STAR Compliance Tracker ── */}
            {(() => {
              const answerLen = answerText.length;
              // Heuristic STAR estimations based on answer structure and length
              const situation  = Math.min(100, answerLen > 30  ? Math.round(25 + (answerLen / 300) * 35) : 0);
              const task       = Math.min(100, answerLen > 80  ? Math.round(20 + (answerLen / 400) * 30) : 0);
              const action     = Math.min(100, answerLen > 150 ? Math.round(30 + (answerLen / 500) * 40) : 0);
              const result     = Math.min(100, answerLen > 250 ? Math.round(15 + (answerLen / 600) * 45) : 0);
              const starAvg    = Math.round((situation + task + action + result) / 4);

              const starItems = [
                { label: 'S — Situation', value: situation, color: '#6366f1' },
                { label: 'T — Task',      value: task,      color: '#8b5cf6' },
                { label: 'A — Action',    value: action,    color: '#3B82F6' },
                { label: 'R — Result',    value: result,    color: '#10B981' },
              ];

              return (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-sm">STAR Compliance</h3>
                    <span className="text-xs font-bold" style={{ color: starAvg >= 70 ? '#10B981' : starAvg >= 40 ? '#F59E0B' : '#EF4444' }}>{starAvg}%</span>
                  </div>
                  <div className="space-y-3">
                    {starItems.map(item => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
                          <span className="text-[11px] font-bold" style={{ color: item.color }}>{item.value}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.value}%`, background: `linear-gradient(90deg, ${item.color}80, ${item.color})` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-3">
                    {starAvg >= 70 ? '✅ Strong STAR structure detected' : starAvg >= 40 ? '⚠️ Include measurable results' : '💡 Use Situation → Task → Action → Result'}
                  </p>
                </div>
              );
            })()}

            {/* ── Pacing Indicator ── */}
            {(() => {
              const wordCount  = answerText.trim().split(/\s+/).filter(w => w).length;
              const wpm        = speechTimer > 5 ? Math.round((wordCount / speechTimer) * 60) : 0;
              const pacingGood = wpm >= 120 && wpm <= 160;
              const pacingColor = pacingGood ? '#10B981' : wpm > 0 && wpm < 120 ? '#3B82F6' : wpm > 160 ? '#F59E0B' : '#475569';
              const pacingLabel = wpm === 0 ? 'Speak to measure' : pacingGood ? 'Ideal pacing' : wpm < 120 ? 'Slightly slow' : 'Slightly fast';

              return (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(13,18,32,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold text-sm">Speaking Pace</h3>
                    <span className="text-[10px] font-semibold" style={{ color: pacingColor }}>{pacingLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <span className="text-2xl font-black" style={{ color: pacingColor }}>{wpm || '—'}</span>
                      <p className="text-[10px] text-slate-600 mt-0.5">WPM</p>
                    </div>
                    <div className="flex-1">
                      {/* WPM Dial — 0 to 200 WPM */}
                      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {/* Target zone highlight: 120-160 WPM */}
                        <div className="absolute top-0 bottom-0 rounded-full" style={{ left: '60%', width: '20%', background: 'rgba(16,185,129,0.2)' }} />
                        {/* Current position */}
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (wpm / 200) * 100)}%`, background: `linear-gradient(90deg, ${pacingColor}60, ${pacingColor})` }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-slate-700">
                        <span>0</span>
                        <span style={{ color: '#10B981' }}>120-160 target</span>
                        <span>200+</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* End session */}
            <button
              onClick={() => navigate('/feedback')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
            >
              End Session
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

