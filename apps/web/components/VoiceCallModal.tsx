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
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleEndCall();
      return;
    }

    setCallConnected(false);
    setCallDuration(0);
    setMicError(null);
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
  }, [messages, isThinking, isSpeaking]);

  const handleStartCall = async () => {
    setCallConnected(true);
    setMicError(null);

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

    // 3. Play greeting aloud
    await playVoiceAudio(`Hey Ilakkiyan! I'm right here with you. Ready for our live session?`);

    // 4. Request microphone & initialize speech recognition
    initSpeechRecognition();
  };

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsSpeaking(false);
    setIsListening(false);
    setIsThinking(false);
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setMicError(null);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            sendVoiceTurn(transcript.trim());
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition warning:', err?.error);
          setIsListening(false);
          if (err?.error === 'not-allowed') {
            setMicError('Microphone permission blocked. Please allow mic in browser or use text below.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (_) {}
      } catch (err) {
        console.warn('Failed to init speech recognition:', err);
      }
    } else {
      setMicError('Web speech API not supported in this browser. You can type messages to talk.');
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
      let targetUrl = directAudioUrl;

      if (!targetUrl) {
        const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        targetUrl = data?.data?.audioUrl;
      }

      if (targetUrl) {
        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${API_BASE_URL}${targetUrl}`;
        const audio = new Audio(fullUrl);
        audioPlayerRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          // Automatically re-listen if call active and not muted
          if (!isMuted && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (_) {}
          }
        };

        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('TTS playback error:', err);
      setIsSpeaking(false);
    }
  };

  const sendVoiceTurn = async (userText: string) => {
    if (!userText.trim()) return;

    // Add user message
    const userMsg: CallMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText,
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
          message: userText,
          conversationId,
        }),
      });
      const data = await res.json();
      setIsThinking(false);

      if (data.success && data.data) {
        const botMsg: CallMessage = {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: data.data.spokenText || data.data.replyText,
          audioUrl: data.data.audioUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);

        // Play audio directly
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

  const toggleMic = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      } else {
        initSpeechRecognition();
      }
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
            <div className="p-6 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 flex flex-col items-center justify-center border-b border-slate-800/80">
              <div className="flex items-center justify-center space-x-1.5 h-16">
                {[...Array(18)].map((_, i) => {
                  const active = isSpeaking || isListening;
                  const scale = active
                    ? Math.sin(i * 0.35 + callDuration * 3) * 0.5 + 0.5
                    : 0.15;
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-150 ${
                        isSpeaking
                          ? 'bg-gradient-to-t from-indigo-500 to-violet-400'
                          : isListening
                          ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                          : 'bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(8, scale * 56)}px` }}
                    />
                  );
                })}
              </div>

              <p className="text-xs font-mono font-semibold mt-3 text-slate-400 flex items-center space-x-2">
                {isSpeaking ? (
                  <span className="text-indigo-400 flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                    <span>{botName} is speaking aloud...</span>
                  </span>
                ) : isListening ? (
                  <span className="text-emerald-400 flex items-center space-x-1.5">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>Listening to your speech...</span>
                  </span>
                ) : isThinking ? (
                  <span className="text-amber-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>Formulating spoken turn...</span>
                  </span>
                ) : (
                  <span>Tap microphone or speak naturally</span>
                )}
              </p>

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

            {/* Bottom Call Controls */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/95 space-y-3">
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
                  placeholder="Type a spoken response or tap mic below..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isThinking}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Interactive Call Buttons */}
              <div className="flex items-center justify-center space-x-6 pt-1">
                {/* Mic Toggle */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-4 rounded-full transition-all cursor-pointer shadow-lg ${
                    isListening
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white scale-110 shadow-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={isListening ? "Listening... Click to pause" : "Click to speak"}
                >
                  {isListening ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6" />}
                </button>

                {/* End Call Button */}
                <button
                  type="button"
                  onClick={() => { handleEndCall(); onClose(); }}
                  className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg shadow-rose-600/30"
                  title="End Voice Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
