import React, { useState, useEffect, useRef } from 'react';
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

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const isSpeakingRef = useRef<boolean>(false);
  const shouldListenRef = useRef<boolean>(false);

  // Sync ref with state
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
    accumulatedSpeechRef.current = '';
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
      // Ignore if user is currently typing in an input
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

      utterance.onend = () => {
        onComplete?.();
      };
      utterance.onerror = () => {
        onComplete?.();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      onComplete?.();
    }
  };

  const handleStartCall = async () => {
    setCallConnected(true);
    setMicError(null);
    shouldListenRef.current = true;

    // 1. Unlock Audio context
    try {
      const audio = new Audio();
      audioPlayerRef.current = audio;
    } catch (_) {}

    // 2. Start Call Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // 3. Request microphone & initialize speech recognition immediately
    initSpeechRecognition();

    // 4. Play greeting aloud concurrently (non-blocking)
    playVoiceAudio(`Hey Ilakkiyan! I'm right here with you. Ready for our live session?`);
  };

  const handleEndCall = () => {
    shouldListenRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setIsListening(false);
    setIsThinking(false);
    setIsHoldingToTalk(false);
    setCurrentTranscript('');
  };

  const initSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Web Speech API is not supported in this browser. You can type spoken messages below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalized += transcriptPiece + ' ';
          } else {
            interim += transcriptPiece;
          }
        }

        if (finalized) {
          accumulatedSpeechRef.current = (accumulatedSpeechRef.current + ' ' + finalized).trim();
        }

        const fullDisplay = (accumulatedSpeechRef.current + ' ' + interim).trim();
        setCurrentTranscript(fullDisplay);

        // In Open Mic mode: set a silence timer to automatically send after 1.8 seconds of silence
        if (inputMode === 'open-mic' && shouldListenRef.current && !isSpeakingRef.current) {
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = setTimeout(() => {
            const speechToSend = accumulatedSpeechRef.current.trim() || interim.trim();
            if (speechToSend) {
              accumulatedSpeechRef.current = '';
              setCurrentTranscript('');
              sendVoiceTurn(speechToSend);
            }
          }, 1800);
        }
      };

      recognition.onerror = (err: any) => {
        if (err?.error === 'not-allowed') {
          setMicError('Microphone permission blocked. Please enable microphone permissions in your browser.');
          setIsListening(false);
          shouldListenRef.current = false;
        } else if (err?.error === 'no-speech') {
          // Normal timeout on quiet pauses
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart if we should still be listening and bot is not speaking
        if (shouldListenRef.current && !isSpeakingRef.current && inputMode === 'open-mic') {
          setTimeout(() => {
            if (shouldListenRef.current && !isSpeakingRef.current) {
              try {
                recognition.start();
              } catch (_) {}
            }
          }, 150);
        }
      };

      recognitionRef.current = recognition;

      if (shouldListenRef.current && !isSpeakingRef.current) {
        try {
          recognition.start();
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Failed to init speech recognition:', err);
    }
  };

  const startPushToTalk = () => {
    setIsHoldingToTalk(true);
    accumulatedSpeechRef.current = '';
    setCurrentTranscript('');
    shouldListenRef.current = true;

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    if (!recognitionRef.current) {
      initSpeechRecognition();
    } else {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    }
  };

  const stopPushToTalk = () => {
    setIsHoldingToTalk(false);
    shouldListenRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    setTimeout(() => {
      const speechToSend = accumulatedSpeechRef.current.trim() || currentTranscript.trim();
      if (speechToSend) {
        accumulatedSpeechRef.current = '';
        setCurrentTranscript('');
        sendVoiceTurn(speechToSend);
      }
    }, 250);
  };

  const toggleOpenMic = () => {
    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
    } else {
      shouldListenRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (_) {
          initSpeechRecognition();
        }
      } else {
        initSpeechRecognition();
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playVoiceAudio = async (text: string, directAudioUrl?: string) => {
    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      
      // Pause speech recognition while bot is speaking to avoid feedback loops
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }

      const onFinish = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (shouldListenRef.current && inputMode === 'open-mic' && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (_) {}
        }
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
      if (shouldListenRef.current && inputMode === 'open-mic' && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (_) {}
      }
    }
  };

  const sendVoiceTurn = async (userText: string) => {
    if (!userText.trim()) return;

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    accumulatedSpeechRef.current = '';
    setCurrentTranscript('');

    // Add user message
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

        // Play audio directly with browser TTS fallback
        if (data.data.audioUrl) {
          playVoiceAudio(botMsg.text, data.data.audioUrl);
        } else {
          playVoiceAudio(botMsg.text);
        }
      } else {
        const errorText = data?.error?.message || "I couldn't complete that voice turn. Let's try again.";
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
      const fallbackText = "I'm having trouble connecting to the voice service right now. Please try again in a moment.";
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
                  const active = isSpeaking || isListening || isHoldingToTalk;
                  const scale = active
                    ? Math.sin(i * 0.35 + callDuration * 3) * 0.5 + 0.5
                    : 0.15;
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-150 ${
                        isSpeaking
                          ? 'bg-gradient-to-t from-indigo-500 to-violet-400'
                          : isHoldingToTalk || isListening
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                          : 'bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(8, scale * 52)}px` }}
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
                    <span>Listening... Release button or Spacebar to send</span>
                  </span>
                ) : isListening ? (
                  <span className="text-emerald-400 flex items-center space-x-1.5">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>Open Mic Active — listening naturally...</span>
                  </span>
                ) : isThinking ? (
                  <span className="text-amber-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>{botName} is responding...</span>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {inputMode === 'push-to-talk' ? 'Hold button or Spacebar to speak' : 'Microphone paused — click mic to resume'}
                  </span>
                )}

                {/* Live Speech Recognition Transcript Preview */}
                {currentTranscript && (
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-sans font-medium animate-in fade-in">
                    🗣️ &ldquo;{currentTranscript}&rdquo;
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
                      initSpeechRecognition();
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
                      if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch (_) {}
                      }
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
                  {inputMode === 'push-to-talk' ? '💡 Tip: Hold Spacebar to speak' : '💡 Auto-sends on pause'}
                </span>
              </div>

              {/* Text fallback input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textInput.trim()) sendVoiceTurn(textInput);
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
                      isListening
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white scale-105 shadow-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title={isListening ? "Listening... Click to pause" : "Click to resume listening"}
                  >
                    {isListening ? (
                      <>
                        <Mic className="w-5 h-5 animate-pulse" />
                        <span>Listening (Tap to Pause)</span>
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
                    <span>{isHoldingToTalk ? 'Listening... Release to Send' : 'Press & Hold to Talk (or Spacebar)'}</span>
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
