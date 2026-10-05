import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff, Mic, MicOff, Volume2, Sparkles, X, RotateCcw,
  Send, Bot as BotIcon, Activity, Check, AlertCircle, Headphones
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
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      return;
    }

    // Initialize conversation and call timer
    const newConvId = `voice_call_${Date.now()}`;
    setConversationId(newConvId);
    setCallDuration(0);
    setMessages([
      {
        id: 'intro',
        sender: 'bot',
        text: `Hey Ilakkiyan! I'm right here with you. Ready for our live session?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Initial greeting audio test
    playVoiceSynthesis(`Hey Ilakkiyan! I'm right here with you. Ready for our live session?`);

    // Setup Web Speech Recognition if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          sendVoiceTurn(transcript.trim());
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, botSlug]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isSpeaking]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playVoiceSynthesis = async (text: string) => {
    try {
      setIsSpeaking(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.data?.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(data.data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          // Automatically re-listen if not muted
          if (!isMuted && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
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

        // Play audio directly if audioUrl returned
        if (data.data.audioUrl) {
          setIsSpeaking(true);
          const audio = new Audio(data.data.audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            if (!isMuted && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch (_) {}
            }
          };
          audio.onerror = () => setIsSpeaking(false);
          await audio.play();
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
          setIsListening(true);
        } catch (_) {}
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[680px] max-h-[90vh]">
        
        {/* Call Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl shadow-lg border border-indigo-400/30">
                {botAvatar}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-bold text-lg text-white">{botName}</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE VOICE CALL
                </span>
              </div>
              <p className="text-xs text-indigo-300/80 font-mono">{botRole}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-slate-200">{formatDuration(callDuration)}</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio Waveform Visualization Center */}
        <div className="p-6 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 flex flex-col items-center justify-center border-b border-slate-800/80">
          <div className="flex items-center justify-center space-x-1.5 h-16">
            {[...Array(16)].map((_, i) => {
              const active = isSpeaking || isListening;
              const scale = active
                ? Math.sin(i * 0.4 + callDuration * 2) * 0.5 + 0.5
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
                <span>Listening to you speak...</span>
              </span>
            ) : isThinking ? (
              <span className="text-amber-400 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>Thinking natural response...</span>
              </span>
            ) : (
              <span>Tap microphone or speak naturally</span>
            )}
          </p>
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
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
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
                <span>Generating voice turn...</span>
              </div>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Bottom Call Controls */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/95 space-y-3">
          {/* Text input fallback */}
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
              placeholder={speechSupported ? "Type or use microphone below..." : "Type your spoken message..."}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
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
              onClick={onClose}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              title="End Voice Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
