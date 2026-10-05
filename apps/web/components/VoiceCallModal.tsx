import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff, Mic, MicOff, Volume2, Sparkles, X, RotateCcw,
  Send, Bot as BotIcon, Activity, Check, AlertCircle, Headphones, PhoneCall, RefreshCw
} from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  botName?: string;
  botRole?: string;
  botAvatar?: string;
  botSlug?: string;
}

interface CallMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  audioUrl?: string;
  timestamp: string;
}

export default function VoiceCallModal({
  isOpen,
  onClose,
  botName = 'Sofi',
  botRole = 'Personal Companion & Prep Partner',
  botAvatar = '💖',
  botSlug = 'sofi',
}: VoiceCallModalProps) {
  const [callConnected, setCallConnected] = useState(false);
  const [inputMode, setInputMode] = useState<'open-mic' | 'push-to-talk'>('open-mic');
  const [isListening, setIsListening] = useState(false);
  const [isHoldingToTalk, setIsHoldingToTalk] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio & Hardware Refs
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // VAD & Listening State Refs
  const isSpeakingRef = useRef<boolean>(false);
  const shouldListenRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const vadSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vadSpeechDetectedRef = useRef<boolean>(false);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!isOpen) {
      handleEndCall();
      return;
    }

    setCallConnected(false);
    setCallDuration(0);
    setMicError(null);
    setCurrentTranscript('');
    setAudioLevel(0);
    const newConvId = `voice_call_${Date.now()}`;
    setConversationId(newConvId);
    setMessages([
      {
        id: 'intro',
        sender: 'bot',
        text: `Hey Ilakkiyan! I'm right here with you. Ready for our live session?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    return () => {
      handleEndCall();
    };
  }, [isOpen, botSlug]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isSpeaking, currentTranscript]);

  // Spacebar Push-To-Talk Listener
  useEffect(() => {
    if (!callConnected || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space' && !e.repeat && !isHoldingToTalk) {
        e.preventDefault();
        startPushToTalk();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space' && isHoldingToTalk) {
        e.preventDefault();
        stopPushToTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [callConnected, isOpen, isHoldingToTalk, inputMode]);

  const speakWithBrowserTts = (text: string, onComplete?: () => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes('Natural') ||
            v.name.includes('Female') ||
            v.name.includes('Samantha') ||
            v.name.includes('Ava') ||
            v.name.includes('Google UK English Female') ||
            v.name.includes('Zira')) &&
          v.lang.startsWith('en')
      ) || voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => onComplete?.();
      utterance.onerror = () => onComplete?.();
      window.speechSynthesis.speak(utterance);
    } else {
      onComplete?.();
    }
  };

  /**
   * Initialize microphone stream, AudioContext, and AnalyserNode
   */
  const initMicrophoneStream = async (): Promise<boolean> => {
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      return true;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicError('Microphone audio recording is not supported in this browser.');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // AudioContext + Analyser for visual waveforms and VAD
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyserRef.current = analyser;

        startWaveformLoop(analyser);
      }

      setMicError(null);
      return true;
    } catch (err: any) {
      console.warn('Microphone permission or hardware error:', err);
      setMicError('Microphone permission blocked. Please allow microphone access to talk.');
      return false;
    }
  };

  /**
   * Monitor live audio amplitude and drive Voice Activity Detection (VAD)
   */
  const startWaveformLoop = (analyser: AnalyserNode) => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLoop = () => {
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      setAudioLevel(avg);

      // Open Mic VAD Logic: When user is not in push-to-talk and bot is not speaking
      if (inputMode === 'open-mic' && shouldListenRef.current && !isSpeakingRef.current && !isThinking) {
        const SPEECH_THRESHOLD = 18;

        if (avg > SPEECH_THRESHOLD) {
          // User is speaking
          if (!isRecordingRef.current) {
            startVadRecording();
          }
          vadSpeechDetectedRef.current = true;
          if (vadSilenceTimerRef.current) {
            clearTimeout(vadSilenceTimerRef.current);
            vadSilenceTimerRef.current = null;
          }
        } else if (isRecordingRef.current && vadSpeechDetectedRef.current) {
          // Silence detected while recording
          if (!vadSilenceTimerRef.current) {
            vadSilenceTimerRef.current = setTimeout(() => {
              stopVadRecordingAndSend();
            }, 1400); // 1.4s of silence finishes the turn
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    updateLoop();
  };

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'audio/webm';
  };

  const startVadRecording = () => {
    if (isRecordingRef.current || !mediaStreamRef.current) return;
    try {
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setIsListening(true);
      setCurrentTranscript('Listening to your voice...');
    } catch (err) {
      console.warn('Failed to start VAD recording:', err);
    }
  };

  const stopVadRecordingAndSend = () => {
    if (!isRecordingRef.current || !mediaRecorderRef.current) return;

    if (vadSilenceTimerRef.current) {
      clearTimeout(vadSilenceTimerRef.current);
      vadSilenceTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    isRecordingRef.current = false;
    vadSpeechDetectedRef.current = false;
    setIsListening(false);
    setCurrentTranscript('');

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      if (audioBlob.size > 2000) { // Only send if meaningful audio was captured
        const base64 = await blobToBase64(audioBlob);
        sendAudioTurn(base64, mimeType);
      }
      audioChunksRef.current = [];
    };

    try {
      recorder.stop();
    } catch (_) {}
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startPushToTalk = async () => {
    setIsHoldingToTalk(true);
    setCurrentTranscript('Recording... Release to send');

    const ok = await initMicrophoneStream();
    if (!ok || !mediaStreamRef.current) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
    } catch (err) {
      console.warn('Failed to start push-to-talk recording:', err);
    }
  };

  const stopPushToTalk = () => {
    setIsHoldingToTalk(false);
    setCurrentTranscript('');

    if (!mediaRecorderRef.current || !isRecordingRef.current) return;

    const recorder = mediaRecorderRef.current;
    isRecordingRef.current = false;

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      if (audioBlob.size > 1500) {
        const base64 = await blobToBase64(audioBlob);
        sendAudioTurn(base64, mimeType);
      }
      audioChunksRef.current = [];
    };

    try {
      recorder.stop();
    } catch (_) {}
  };

  const handleStartCall = async () => {
    setCallConnected(true);
    setMicError(null);
    shouldListenRef.current = true;

    // 1. Start Call Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // 2. Initialize microphone stream
    await initMicrophoneStream();

    // 3. Play greeting aloud concurrently
    playVoiceAudio(`Hey Ilakkiyan! I'm right here with you. Ready for our live session?`);
  };

  const handleEndCall = () => {
    shouldListenRef.current = false;
    isRecordingRef.current = false;
    vadSpeechDetectedRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);
    if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }

    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setIsListening(false);
    setIsThinking(false);
    setIsHoldingToTalk(false);
    setCurrentTranscript('');
    setAudioLevel(0);
  };

  const playVoiceAudio = async (text: string, directAudioUrl?: string) => {
    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;

      // Pause recording while bot is speaking so bot doesn't transcribe its own voice
      if (isRecordingRef.current && mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
        isRecordingRef.current = false;
      }

      const onFinish = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      let targetUrl = directAudioUrl;

      if (!targetUrl) {
        try {
          const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          if (res.ok) {
            const data = await res.json();
            targetUrl = data?.data?.audioUrl;
          }
        } catch (_) {}
      }

      if (targetUrl) {
        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${API_BASE_URL}${targetUrl}`;
        const audio = new Audio(fullUrl);
        audioPlayerRef.current = audio;

        audio.onended = onFinish;
        audio.onerror = () => {
          speakWithBrowserTts(text, onFinish);
        };

        try {
          await audio.play();
        } catch (_) {
          speakWithBrowserTts(text, onFinish);
        }
      } else {
        speakWithBrowserTts(text, onFinish);
      }
    } catch (err) {
      console.error('TTS playback error:', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  const sendAudioTurn = async (audioBase64: string, mimeType: string) => {
    if (!audioBase64) return;

    setIsThinking(true);
    setCurrentTranscript('Transcribing & reasoning...');

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/call-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: botSlug,
          persona: botSlug,
          audioBase64,
          mimeType,
          conversationId,
        }),
      });

      const data = await res.json();
      setIsThinking(false);
      setCurrentTranscript('');

      if (data.success && data.data) {
        if (data.data.conversationId) {
          setConversationId(data.data.conversationId);
        }

        // 1. Add user message with actual transcript returned from Gemini
        if (data.data.userMessage) {
          const userMsg: CallMessage = {
            id: `u_${Date.now()}`,
            sender: 'user',
            text: data.data.userMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, userMsg]);
        }

        // 2. Add assistant response
        const botMsg: CallMessage = {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: data.data.spokenText || data.data.replyText,
          audioUrl: data.data.audioUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);

        // 3. Play spoken response aloud
        if (data.data.audioUrl) {
          playVoiceAudio(botMsg.text, data.data.audioUrl);
        } else {
          playVoiceAudio(botMsg.text);
        }
      } else {
        const errorText = data?.error?.message || "I heard your audio, but let's try again in a moment.";
        const botMsg: CallMessage = {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: errorText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        playVoiceAudio(errorText);
      }
    } catch (err: any) {
      console.error('Voice call turn error:', err);
      setIsThinking(false);
      setCurrentTranscript('');
      const fallbackText = "I'm having trouble with the voice channel right now. Please speak again in a moment.";
      const botMsg: CallMessage = {
        id: `b_${Date.now()}`,
        sender: 'bot',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      playVoiceAudio(fallbackText);
    }
  };

  const sendTextTurn = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: CallMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput('');
    setIsThinking(true);

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/call-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: botSlug,
          persona: botSlug,
          message: userText.trim(),
          conversationId,
        }),
      });

      const data = await res.json();
      setIsThinking(false);

      if (data.success && data.data) {
        if (data.data.conversationId) {
          setConversationId(data.data.conversationId);
        }

        const botMsg: CallMessage = {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: data.data.spokenText || data.data.replyText,
          audioUrl: data.data.audioUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);

        if (data.data.audioUrl) {
          playVoiceAudio(botMsg.text, data.data.audioUrl);
        } else {
          playVoiceAudio(botMsg.text);
        }
      }
    } catch (err) {
      console.error('Voice call turn error:', err);
      setIsThinking(false);
    }
  };

  const toggleOpenMic = () => {
    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      setIsListening(false);
      if (isRecordingRef.current && mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
        isRecordingRef.current = false;
      }
    } else {
      shouldListenRef.current = true;
      initMicrophoneStream();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[680px] max-h-[90vh]">
        
        {/* Call Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl shadow-lg border border-indigo-400/30">
                {botAvatar}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${callConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-bold text-lg text-white">{botName}</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {callConnected ? 'LIVE VOICE CALL' : 'READY TO CONNECT'}
                </span>
              </div>
              <p className="text-xs text-indigo-300/80 font-mono">{botRole}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {callConnected && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-slate-200">{formatDuration(callDuration)}</span>
              </div>
            )}
            <button
              onClick={() => { handleEndCall(); onClose(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Call Connection Landing / Waveform Center */}
        {!callConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-gradient-to-b from-indigo-950/30 via-slate-900 to-slate-900">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/30 animate-pulse border-4 border-emerald-400/30">
              <PhoneCall className="w-10 h-10 text-white" />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="font-display font-bold text-2xl text-white">Live Voice Call with {botName}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your microphone to start an authentic spoken session. Sofi will speak aloud in her locked voice with zero markdown artifacts.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartCall}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/30 transition-all cursor-pointer flex items-center space-x-2 scale-105"
            >
              <PhoneCall className="w-5 h-5" />
              <span>Start Voice Call Now</span>
            </button>
          </div>
        ) : (
          <>
            {/* Audio Waveform Visualization Center */}
            <div className="p-5 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 flex flex-col items-center justify-center border-b border-slate-800/80">
              <div className="flex items-center justify-center space-x-1.5 h-14">
                {[...Array(20)].map((_, i) => {
                  const active = isSpeaking || isHoldingToTalk || isListening;
                  const liveWave = audioLevel > 5 ? (audioLevel / 100) * (Math.sin(i * 0.4 + Date.now() * 0.005) * 0.5 + 0.5) : 0.05;
                  const scale = active
                    ? isSpeaking
                      ? Math.sin(i * 0.35 + callDuration * 3) * 0.5 + 0.5
                      : Math.max(0.15, liveWave * 1.5)
                    : 0.1;
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isSpeaking
                          ? 'bg-gradient-to-t from-indigo-500 to-violet-400'
                          : isHoldingToTalk || isListening
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                          : 'bg-slate-700'
                      }`}
                      style={{ height: `${Math.min(52, Math.max(6, scale * 52))}px` }}
                    />
                  );
                })}
              </div>

              <div className="text-xs font-mono font-semibold mt-2.5 text-slate-400 flex flex-col items-center space-y-1">
                {isSpeaking ? (
                  <span className="text-indigo-400 flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    <span>{botName} is speaking aloud...</span>
                  </span>
                ) : isHoldingToTalk ? (
                  <span className="text-emerald-400 flex items-center space-x-1.5 animate-pulse">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Recording your voice... Release button or Spacebar to send</span>
                  </span>
                ) : isListening ? (
                  <span className="text-emerald-400 flex items-center space-x-1.5">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>Open Mic Active — speak naturally...</span>
                  </span>
                ) : isThinking ? (
                  <span className="text-amber-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>{botName} is processing your voice...</span>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {inputMode === 'push-to-talk' ? 'Hold button or Spacebar to speak' : 'Microphone ready — speak anytime'}
                  </span>
                )}

                {/* Live Transcript / Status Preview */}
                {currentTranscript && (
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-sans font-medium animate-in fade-in">
                    🎙️ {currentTranscript}
                  </div>
                )}
              </div>

              {micError && (
                <p className="text-[11px] text-amber-400 font-mono mt-2 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-800/50">
                  ⚠️ {micError}
                </p>
              )}
            </div>

            {/* Live Conversation Transcript Bubbles */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60 shadow-xs'
                    }`}
                  >
                    <p>{m.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono px-1">
                    {m.sender === 'user' ? 'You' : botName} · {m.timestamp}
                  </span>
                </div>
              ))}
              {isThinking && (
                <div className="flex items-start">
                  <div className="rounded-2xl px-4 py-3 bg-slate-800/60 border border-slate-700/40 text-xs text-slate-400 flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>{botName} is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Bottom Call Controls & Mode Switcher */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 space-y-3">
              {/* Input Mode Selector Bar */}
              <div className="flex items-center justify-between">
                <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('open-mic');
                      shouldListenRef.current = true;
                      initMicrophoneStream();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      inputMode === 'open-mic'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎙️ Open Mic (Hands-Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('push-to-talk');
                      shouldListenRef.current = false;
                      setIsListening(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      inputMode === 'push-to-talk'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔘 Hold to Talk
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  {inputMode === 'push-to-talk' ? '💡 Tip: Hold Spacebar or Button to speak' : '💡 Automatically sends when you stop talking'}
                </span>
              </div>

              {/* Text fallback input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textInput.trim()) sendTextTurn(textInput);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type a spoken response or use voice controls below..."
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isThinking}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Interactive Call Action Buttons */}
              <div className="flex items-center justify-center space-x-4 pt-1">
                {inputMode === 'open-mic' ? (
                  /* Open Mic Toggle Button */
                  <button
                    type="button"
                    onClick={toggleOpenMic}
                    className={`px-6 py-3 rounded-2xl transition-all cursor-pointer shadow-lg flex items-center space-x-2 font-bold text-xs ${
                      shouldListenRef.current
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white scale-105 shadow-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title={shouldListenRef.current ? "Listening... Click to pause" : "Click to resume listening"}
                  >
                    {shouldListenRef.current ? (
                      <>
                        <Mic className="w-5 h-5 animate-pulse" />
                        <span>Open Mic Active (Tap to Pause)</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-5 h-5" />
                        <span>Mic Paused (Tap to Speak)</span>
                      </>
                    )}
                  </button>
                ) : (
                  /* Hold to Talk (Push to Talk) Button */
                  <button
                    type="button"
                    onMouseDown={startPushToTalk}
                    onMouseUp={stopPushToTalk}
                    onTouchStart={startPushToTalk}
                    onTouchEnd={stopPushToTalk}
                    className={`px-8 py-3.5 rounded-2xl transition-all select-none cursor-pointer shadow-xl flex items-center space-x-2 font-bold text-xs ${
                      isHoldingToTalk
                        ? 'bg-emerald-600 text-white scale-105 shadow-emerald-500/40 ring-4 ring-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                    }`}
                  >
                    <Mic className={`w-5 h-5 ${isHoldingToTalk ? 'animate-pulse' : ''}`} />
                    <span>{isHoldingToTalk ? 'Recording... Release to Send' : 'Press & Hold to Talk (or Spacebar)'}</span>
                  </button>
                )}

                {/* End Call Button */}
                <button
                  type="button"
                  onClick={() => { handleEndCall(); onClose(); }}
                  className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 text-xs font-bold"
                  title="End Voice Call"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span className="hidden sm:inline">End Call</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
