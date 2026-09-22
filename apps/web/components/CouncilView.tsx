'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Compass,
  Heart,
  CheckCircle2,
  ListTodo,
  Trash2,
  Send,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

export type PersonaId = 'sofi' | 'riven' | 'lucifer';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  persona?: PersonaId;
  content: string;
  executedActions?: Array<{
    toolName: string;
    params: any;
    result: any;
  }>;
  timestamp: string;
}

interface CouncilViewProps {
  tasks?: any[];
  events?: any[];
  habits?: any[];
  onRefresh?: () => void;
}

const PERSONA_CONFIG: Record<
  PersonaId,
  {
    name: string;
    role: string;
    icon: any;
    color: string;
    activeTabClass: string;
    avatarEmoji: string;
    accentName: 'rose' | 'cyan' | 'amber';
    greeting: string;
    suggestions: string[];
  }
> = {
  sofi: {
    name: 'Sofi',
    role: 'Executive PA & Girlfriend',
    icon: Heart,
    color: 'text-rose-500 dark:text-rose-400',
    activeTabClass: 'bg-rose-500 text-white shadow-xs',
    avatarEmoji: '💖',
    accentName: 'rose',
    greeting:
      "Hey babe! I have full visibility into your Nox tasks and schedule. How are you holding up? Let's negotiate your plan for today so you crush your goals without burning out. What's on your mind? 💖",
    suggestions: [
      'What are my tasks for today? 📋',
      'Help me negotiate my plan for today 💖',
      'I have too much on my plate, help me triage',
      'Add a high priority task for tomorrow',
    ],
  },
  riven: {
    name: 'Riven',
    role: 'Chief Architect & Idea Shaper',
    icon: Compass,
    color: 'text-cyan-600 dark:text-cyan-400',
    activeTabClass: 'bg-cyan-600 text-white shadow-xs',
    avatarEmoji: '🧭',
    accentName: 'cyan',
    greeting:
      "Ready to build. What architectural bottleneck or technical doubt are we breaking down today? Hand over your schemas, roadmaps, or project ideas.",
    suggestions: [
      'Help me shape a new project architecture 🧭',
      'Clear my technical doubts on database design',
      'Break down a large project into phases',
      'Review my API contract and data flow',
    ],
  },
  lucifer: {
    name: 'Lucifer',
    role: 'Partner in Crime & Auditor',
    icon: Flame,
    color: 'text-amber-600 dark:text-amber-400',
    activeTabClass: 'bg-amber-600 text-white shadow-xs',
    avatarEmoji: '🔥',
    accentName: 'amber',
    greeting:
      "Let's see what you've cooked up. Hand over your timeline or plan so I can tell you where it's going to crash and burn. No excuses.",
    suggestions: [
      'Audit my schedule and roast my procrastination 🔥',
      'Stress-test my launch timeline',
      'Tell me the brutal truth about this plan',
      'Why am I avoiding my hardest task?',
    ],
  },
};

export default function CouncilView({
  tasks = [],
  events = [],
  habits = [],
  onRefresh,
}: CouncilViewProps) {
  const [activePersona, setActivePersona] = useState<PersonaId>('sofi');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pendingTasksCount = tasks.filter((t: any) => t.status !== 'COMPLETED').length;

  useEffect(() => {
    checkCouncilStatus();
    const interval = setInterval(checkCouncilStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkCouncilStatus = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/status`);
      const json = await res.json();
      setIsOnline(Boolean(json?.data?.online));
    } catch {
      setIsOnline(false);
    }
  };

  // Seed greeting when persona changes or initially
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: `init-${activePersona}`,
          sender: 'assistant',
          persona: activePersona,
          content: PERSONA_CONFIG[activePersona].greeting,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [activePersona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          message: text.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to communicate with Council');
      }

      const data = json?.data;
      const botMsg: Message = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        persona: activePersona,
        content: data?.reply || "I'm with you, babe.",
        executedActions: data?.executedActions || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data?.executedActions && data.executedActions.length > 0 && onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        persona: activePersona,
        content: `**Connection Notice**: Couldn't reach Council server: ${
          err.message || 'Check if Council is running on port 4100'
        }.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentCfg = PERSONA_CONFIG[activePersona];

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[580px]">
      {/* Minimal Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-slate-200/80 dark:border-slate-800/80 mb-3 shrink-0">
        {/* Sleek Segmented Pill Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
          {(['sofi', 'riven', 'lucifer'] as PersonaId[]).map((pid) => {
            const cfg = PERSONA_CONFIG[pid];
            const isSelected = activePersona === pid;

            return (
              <button
                key={pid}
                onClick={() => {
                  if (activePersona !== pid) {
                    setActivePersona(pid);
                    setMessages([]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-medium ${
                  isSelected
                    ? cfg.activeTabClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>{cfg.avatarEmoji}</span>
                <span>{cfg.name}</span>
              </button>
            );
          })}
        </div>

        {/* Minimal Status & Actions */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Status badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <ListTodo className="w-3 h-3 text-indigo-500" />
              <span>{pendingTasksCount} tasks</span>
            </span>
          </div>

          {/* Clear Feed */}
          <button
            onClick={() => {
              setMessages([
                {
                  id: `init-${activePersona}`,
                  sender: 'assistant',
                  persona: activePersona,
                  content: PERSONA_CONFIG[activePersona].greeting,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conversation Stream */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm scroll-smooth">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const pCfg = PERSONA_CONFIG[msg.persona || activePersona];
          const isInitialGreeting = !isUser && idx === 0 && messages.length === 1;

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}>
              {/* Persona header on bot message */}
              {!isUser && (
                <div className="flex items-center space-x-1.5 px-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>{pCfg.avatarEmoji}</span>
                    <span>{pCfg.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {pCfg.role}
                  </span>
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] p-4 rounded-2xl leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-800 shadow-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                ) : (
                  <MarkdownRenderer
                    content={msg.content}
                    accentColor={pCfg.accentName}
                  />
                )}

                {/* Synced Actions Receipt */}
                {msg.executedActions && msg.executedActions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Action Synced with Nox</span>
                    </div>
                    {msg.executedActions.map((act, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300"
                      >
                        <span className="font-mono font-bold block text-[10px]">{act.toolName}</span>
                        <span className="opacity-95 text-[11px]">
                          {act.params?.title ? `Created "${act.params.title}"` : JSON.stringify(act.params)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggestions chips on initial greeting */}
              {isInitialGreeting && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {pCfg.suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(sug)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 group disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[9px] font-mono text-slate-400 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs p-3 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 w-fit">
            <div className="flex space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${activePersona === 'sofi' ? 'bg-rose-500' : activePersona === 'riven' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${activePersona === 'sofi' ? 'bg-rose-500' : activePersona === 'riven' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${activePersona === 'sofi' ? 'bg-rose-500' : activePersona === 'riven' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {currentCfg.name} is thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Minimalist Docked Input Capsule */}
      <div className="pt-3 shrink-0">
        <div className="flex items-end space-x-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-xs focus-within:border-slate-400 dark:focus-within:border-slate-600 transition-colors">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentCfg.name}...`}
            rows={1}
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none min-h-[36px] max-h-28"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || loading}
            className={`p-2 rounded-xl text-white transition-all disabled:opacity-30 shrink-0 ${
              activePersona === 'sofi'
                ? 'bg-rose-500 hover:bg-rose-600'
                : activePersona === 'riven'
                ? 'bg-cyan-600 hover:bg-cyan-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
            title="Send Message (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
