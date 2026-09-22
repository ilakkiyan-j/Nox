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
  Brain,
  MessageSquare,
  Plus,
  Search,
  X,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

export type PersonaId = 'sofi' | 'riven' | 'lucifer';

export interface ExecutedAction {
  toolName: string;
  params: any;
  result: any;
}

export interface DeliberationItem {
  persona: 'riven' | 'lucifer' | 'sofi';
  name: string;
  role: string;
  opinion?: string;
  synthesis?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  persona?: PersonaId;
  content: string;
  executedActions?: ExecutedAction[];
  deliberation?: DeliberationItem[];
  timestamp: string;
}

export interface SessionSummary {
  sessionId: string;
  personaId?: PersonaId;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview?: string;
}

export interface UserFact {
  id: string;
  category: 'preference' | 'habit' | 'goal' | 'tech_stack' | 'relationship' | 'general';
  fact: string;
  learnedAt: string;
  sourcePersona?: string;
}

export interface PersonaNotes {
  sofiNotes?: string[];
  rivenNotes?: string[];
  luciferNotes?: string[];
}

export interface MemoryProfile {
  userId: string;
  userName?: string;
  updatedAt?: string;
  facts: UserFact[];
  personaNotes: PersonaNotes;
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
      'Ready to build. What architectural bottleneck or technical doubt are we breaking down today? Hand over your schemas, roadmaps, or project ideas.',
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  preference: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900/60' },
  tech_stack: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-900/60' },
  goal: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/60' },
  habit: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/60' },
  relationship: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-900/60' },
  general: { bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
};

const DEBATE_SUGGESTIONS = [
  'Should I migrate my local storage to SQLite or stay with file JSON?',
  'Can I realistically launch my v1 feature set by this weekend?',
  'Monolith vs micro-agents for background task automation',
  'Review my current workload and audit my burnout risk',
];

export default function CouncilView({
  tasks = [],
  events = [],
  habits = [],
  onRefresh,
}: CouncilViewProps) {
  const [activePersona, setActivePersona] = useState<PersonaId>('sofi');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Panels state
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [debateTopic, setDebateTopic] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);

  // Memory Vault state
  const [memoryProfile, setMemoryProfile] = useState<MemoryProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<UserFact['category']>('general');
  const [isAddingFact, setIsAddingFact] = useState(false);

  // Search filter in sessions
  const [sessionSearch, setSessionSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pendingTasksCount = tasks.filter((t: any) => t.status !== 'COMPLETED').length;

  // Initialize or restore session on mount
  useEffect(() => {
    checkCouncilStatus();
    fetchSessions();
    fetchMemory();

    const storedSid = typeof window !== 'undefined' ? localStorage.getItem('nox_council_active_session') : null;
    if (storedSid) {
      setSessionId(storedSid);
      loadSessionHistory(storedSid);
    } else {
      createNewSession('sofi', false);
    }

    const interval = setInterval(checkCouncilStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, debateLoading]);

  const checkCouncilStatus = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/status`);
      const json = await res.json();
      setIsOnline(Boolean(json?.data?.online));
    } catch {
      setIsOnline(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions`);
      if (res.ok) {
        const json = await res.json();
        setSessions(json?.data || []);
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err);
    }
  };

  const fetchMemory = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/memory`);
      if (res.ok) {
        const json = await res.json();
        setMemoryProfile(json?.data || null);
      }
    } catch (err) {
      console.warn('Failed to load memory:', err);
    }
  };

  const createNewSession = (persona: PersonaId = activePersona, saveToStorage: boolean = true) => {
    const newSid = `session_${Date.now()}`;
    setSessionId(newSid);
    if (saveToStorage && typeof window !== 'undefined') {
      localStorage.setItem('nox_council_active_session', newSid);
    }
    setActivePersona(persona);
    setMessages([
      {
        id: `init-${persona}-${Date.now()}`,
        sender: 'assistant',
        persona,
        content: PERSONA_CONFIG[persona].greeting,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const loadSessionHistory = async (sid: string) => {
    try {
      setLoading(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions/${encodeURIComponent(sid)}`);
      if (!res.ok) {
        // If session not found on server, initialize fresh
        createNewSession(activePersona, true);
        return;
      }
      const json = await res.json();
      const sessionData = json?.data;
      if (sessionData && Array.isArray(sessionData.messages)) {
        const loadedMsgs: Message[] = sessionData.messages.map((m: any, idx: number) => ({
          id: `hist-${idx}-${Date.now()}`,
          sender: m.role === 'assistant' ? 'assistant' : 'user',
          persona: sessionData.personaId || activePersona,
          content: m.content,
          executedActions: m.toolCalls?.map((tc: any, tIdx: number) => ({
            toolName: tc.name || tc.toolName || 'action',
            params: tc.params || {},
            result: m.toolResults?.[tIdx] || {},
          })),
          timestamp: m.timestamp || new Date().toISOString(),
        }));

        if (sessionData.personaId && (sessionData.personaId in PERSONA_CONFIG)) {
          setActivePersona(sessionData.personaId as PersonaId);
        }

        if (loadedMsgs.length > 0) {
          setMessages(loadedMsgs);
        } else {
          setMessages([
            {
              id: `init-${sessionData.personaId || activePersona}`,
              sender: 'assistant',
              persona: (sessionData.personaId as PersonaId) || activePersona,
              content: PERSONA_CONFIG[(sessionData.personaId as PersonaId) || activePersona].greeting,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (err) {
      console.warn('Failed to load session history:', err);
      createNewSession(activePersona, true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (sid: string) => {
    setSessionId(sid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nox_council_active_session', sid);
    }
    loadSessionHistory(sid);
    setShowSessionsDrawer(false);
  };

  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions/${encodeURIComponent(sid)}`, {
        method: 'DELETE',
      });
      setSessions((prev) => prev.filter((s) => s.sessionId !== sid));
      if (sessionId === sid) {
        createNewSession(activePersona, true);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

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
          sessionId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to communicate with Council');
      }

      const data = json?.data;
      if (data?.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('nox_council_active_session', data.sessionId);
        }
      }

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

      // Refresh background data
      fetchSessions();
      fetchMemory();
    } catch (err: any) {
      const errText = err.message || '';
      const isHighDemand =
        errText.toLowerCase().includes('high demand') ||
        errText.toLowerCase().includes('temporary') ||
        errText.toLowerCase().includes('rate limit');

      const content = isHighDemand
        ? `**Sofi is catching her breath 💖**: Google Gemini is experiencing a brief high-demand spike on its free tier. Please send your message again in a few seconds, or switch to **Riven** 🧭 or **Lucifer** 🔥 (powered by Groq) in the meantime!`
        : `**Connection Notice**: Couldn't reach Council server: ${
            errText || 'Check if Council is running on port 4100'
          }.`;

      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        persona: activePersona,
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleTriggerDebate = async (topicToDebate?: string) => {
    const topic = topicToDebate || debateTopic;
    if (!topic.trim()) return;

    setShowDebateModal(false);
    setDebateTopic('');
    setDebateLoading(true);

    const userPromptMsg: Message = {
      id: `usr-deb-${Date.now()}`,
      sender: 'user',
      content: `🏛️ **[Summoned Council]**: Multi-Agent Deliberation on:\n> "${topic.trim()}"`,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userPromptMsg]);

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Debate deliberation failed');
      }

      const deliberation: DeliberationItem[] = json?.data?.deliberation || [];

      const debateResultMsg: Message = {
        id: `ast-deb-${Date.now()}`,
        sender: 'assistant',
        persona: 'sofi',
        content: `### 🏛️ Council Deliberation Complete\n\nThe Council has reviewed your topic with live context across your tasks, roadmaps, and commitments.`,
        deliberation,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, debateResultMsg]);
      fetchMemory();
      fetchSessions();
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-deb-${Date.now()}`,
        sender: 'assistant',
        persona: 'lucifer',
        content: `**Debate Interrupted**: ${err.message || 'Failed to convene Council.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setDebateLoading(false);
    }
  };

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;

    try {
      setIsAddingFact(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fact: newFactText.trim(),
          category: newFactCategory,
          sourcePersona: activePersona,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMemoryProfile(json?.data || null);
        setNewFactText('');
      }
    } catch (err) {
      console.error('Failed to add fact:', err);
    } finally {
      setIsAddingFact(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentCfg = PERSONA_CONFIG[activePersona];

  const filteredSessions = sessions.filter((s) => {
    if (!sessionSearch.trim()) return true;
    const query = sessionSearch.toLowerCase();
    return (
      s.sessionId.toLowerCase().includes(query) ||
      (s.lastMessagePreview && s.lastMessagePreview.toLowerCase().includes(query)) ||
      (s.personaId && s.personaId.toLowerCase().includes(query))
    );
  });

  const filteredFacts = (memoryProfile?.facts || []).filter((f) => {
    if (selectedCategory === 'all') return true;
    return f.category === selectedCategory;
  });

  return (
    <div className="relative max-w-5xl mx-auto flex flex-col h-[calc(100vh-130px)] min-h-[580px]">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 px-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-xs">
        {/* Persona Switcher Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-xs font-semibold">
          {(['sofi', 'riven', 'lucifer'] as PersonaId[]).map((pid) => {
            const cfg = PERSONA_CONFIG[pid];
            const isSelected = activePersona === pid;

            return (
              <button
                key={pid}
                onClick={() => {
                  if (activePersona !== pid) {
                    setActivePersona(pid);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs font-medium ${
                  isSelected
                    ? cfg.activeTabClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title={`Switch to ${cfg.name} (${cfg.role})`}
              >
                <span>{cfg.avatarEmoji}</span>
                <span>{cfg.name}</span>
              </button>
            );
          })}
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Summon Council Debate Button */}
          <button
            onClick={() => setShowDebateModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-all"
            title="Summon all three Council personas to debate a decision or deadline"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Summon Debate</span>
          </button>

          {/* Persistent Memory Vault Drawer Button */}
          <button
            onClick={() => setShowMemoryDrawer(true)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
              showMemoryDrawer
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-800/70 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="View & manage long-term persistent memory vault"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Memory</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-300 font-mono text-[10px]">
              {memoryProfile?.facts?.length || 0}
            </span>
          </button>

          {/* Sessions Drawer Button */}
          <button
            onClick={() => setShowSessionsDrawer(true)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
              showSessionsDrawer
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
                : 'bg-slate-100 dark:bg-slate-800/70 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Browse & switch chat sessions"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Sessions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
              {sessions.length}
            </span>
          </button>

          {/* Online Status badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="hidden md:inline">{isOnline ? 'Port 4100' : 'Offline'}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <ListTodo className="w-3 h-3 text-indigo-500" />
              <span>{pendingTasksCount} tasks</span>
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => createNewSession(activePersona, true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 text-sm scroll-smooth">
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
                className={`max-w-[95%] sm:max-w-[85%] p-4 rounded-2xl leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-800 shadow-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownRenderer
                      content={msg.content}
                      accentColor={pCfg.accentName}
                    />

                    {/* Deliberation Debate Cards */}
                    {msg.deliberation && msg.deliberation.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {msg.deliberation.map((d, dIdx) => {
                          const isRiven = d.persona === 'riven';
                          const isLucifer = d.persona === 'lucifer';
                          const isSofi = d.persona === 'sofi';

                          const borderCls = isRiven
                            ? 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/20'
                            : isLucifer
                            ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                            : 'border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20';

                          const titleColor = isRiven
                            ? 'text-cyan-700 dark:text-cyan-300'
                            : isLucifer
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-rose-700 dark:text-rose-300';

                          const emoji = isRiven ? '🧭' : isLucifer ? '🔥' : '💖';

                          return (
                            <div
                              key={dIdx}
                              className={`p-3.5 rounded-xl border ${borderCls} transition-all space-y-1.5`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${titleColor} flex items-center gap-1.5`}>
                                  <span>{emoji}</span>
                                  <span>{d.name}</span>
                                  <span className="text-[10px] font-normal opacity-80">({d.role})</span>
                                </span>
                                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-white/60 dark:bg-slate-800/60 text-slate-500">
                                  {isSofi ? 'Actionable Synthesis' : isLucifer ? 'Auditor Critique' : 'Architecture'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                                <MarkdownRenderer
                                  content={d.opinion || d.synthesis || ''}
                                  accentColor={isRiven ? 'cyan' : isLucifer ? 'amber' : 'rose'}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                  </>
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

        {(loading || debateLoading) && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs p-3 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 w-fit">
            <div className="flex space-x-1">
              <div
                className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                  activePersona === 'sofi'
                    ? 'bg-rose-500'
                    : activePersona === 'riven'
                    ? 'bg-cyan-500'
                    : 'bg-amber-500'
                }`}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${
                  activePersona === 'sofi'
                    ? 'bg-rose-500'
                    : activePersona === 'riven'
                    ? 'bg-cyan-500'
                    : 'bg-amber-500'
                }`}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${
                  activePersona === 'sofi'
                    ? 'bg-rose-500'
                    : activePersona === 'riven'
                    ? 'bg-cyan-500'
                    : 'bg-amber-500'
                }`}
              />
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {debateLoading
                ? 'Council is deliberating (Riven ➔ Lucifer ➔ Sofi)...'
                : `${currentCfg.name} is thinking...`}
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Docked Input Capsule */}
      <div className="pt-2 shrink-0">
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
            disabled={!inputMessage.trim() || loading || debateLoading}
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

      {/* ================= SESSIONS DRAWER ================= */}
      {showSessionsDrawer && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col p-4 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Chat Sessions ({sessions.length})
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    createNewSession(activePersona, true);
                    setShowSessionsDrawer(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>
                <button
                  onClick={() => setShowSessionsDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search sessions */}
            <div className="my-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-transparent focus:border-indigo-500 outline-none text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No sessions found. Start a new conversation!
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isCurrent = s.sessionId === sessionId;
                  const pId = (s.personaId as PersonaId) || 'sofi';
                  const pCfg = PERSONA_CONFIG[pId] || PERSONA_CONFIG.sofi;

                  return (
                    <div
                      key={s.sessionId}
                      onClick={() => handleSelectSession(s.sessionId)}
                      className={`group p-3 rounded-xl border cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{pCfg.avatarEmoji}</span>
                          <span className="capitalize">{pCfg.name} Session</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSession(s.sessionId, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 transition-opacity"
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {s.lastMessagePreview || 'Empty conversation'}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{s.messageCount} turns</span>
                        {isCurrent && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= PERSISTENT MEMORY VAULT DRAWER ================= */}
      {showMemoryDrawer && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col p-4 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Persistent Memory Vault
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Disk-cached long-term profile facts & persona directives
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="py-3 flex flex-wrap gap-1 border-b border-slate-200/70 dark:border-slate-800">
              {['all', 'preference', 'tech_stack', 'goal', 'habit', 'relationship', 'general'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Facts and Persona Directives */}
            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
              {/* Add Fact Form */}
              <form
                onSubmit={handleAddFact}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2"
              >
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                  + Add Fact to Long-Term Memory
                </span>
                <div className="flex gap-2">
                  <select
                    value={newFactCategory}
                    onChange={(e) => setNewFactCategory(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="preference">Preference</option>
                    <option value="tech_stack">Tech Stack</option>
                    <option value="goal">Goal</option>
                    <option value="habit">Habit</option>
                    <option value="relationship">Relationship</option>
                    <option value="general">General</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. Prefers Next.js App Router..."
                    value={newFactText}
                    onChange={(e) => setNewFactText(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newFactText.trim() || isAddingFact}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </form>

              {/* Stored Facts */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Learned Profile Facts ({filteredFacts.length})
                </span>
                {filteredFacts.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No facts found in this category.</div>
                ) : (
                  filteredFacts.map((f) => {
                    const color = CATEGORY_COLORS[f.category] || CATEGORY_COLORS.general;
                    return (
                      <div
                        key={f.id}
                        className={`p-2.5 rounded-xl border ${color.bg} ${color.border} text-xs space-y-1`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${color.text}`}
                          >
                            {f.category.replace('_', ' ')}
                          </span>
                          {f.sourcePersona && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              via {f.sourcePersona}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {f.fact}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Persona Directives Section */}
              {memoryProfile?.personaNotes && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Persona Directives & Notes
                  </span>

                  {/* Sofi Notes */}
                  {memoryProfile.personaNotes.sofiNotes && memoryProfile.personaNotes.sofiNotes.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs space-y-1">
                      <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
                        <span>💖</span>
                        <span>Sofi Nuances & Agreements</span>
                      </span>
                      {memoryProfile.personaNotes.sofiNotes.map((note, nIdx) => (
                        <p key={nIdx} className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          • {note}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Riven Notes */}
                  {memoryProfile.personaNotes.rivenNotes && memoryProfile.personaNotes.rivenNotes.length > 0 && (
                    <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-900/40 text-xs space-y-1">
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 text-[11px]">
                        <span>🧭</span>
                        <span>Riven Architectural Principles</span>
                      </span>
                      {memoryProfile.personaNotes.rivenNotes.map((note, nIdx) => (
                        <p key={nIdx} className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          • {note}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Lucifer Notes */}
                  {memoryProfile.personaNotes.luciferNotes && memoryProfile.personaNotes.luciferNotes.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px]">
                        <span>🔥</span>
                        <span>Lucifer Audit Pledges</span>
                      </span>
                      {memoryProfile.personaNotes.luciferNotes.map((note, nIdx) => (
                        <p key={nIdx} className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          • {note}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SUMMON DEBATE MODAL ================= */}
      {showDebateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Summon the Council Debate
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All 3 personas deliberate on your decision or timeline sequentially
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDebateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Deliberation Workflow Summary */}
            <div className="grid grid-cols-3 gap-2 py-1 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-medium">
                🧭 <strong>1. Riven</strong>
                <div>Architecture & Tech</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                🔥 <strong>2. Lucifer</strong>
                <div>Audits & Blind spots</div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium">
                💖 <strong>3. Sofi</strong>
                <div>Humane Synthesis</div>
              </div>
            </div>

            {/* Topic Input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                What project decision, architecture question, or deadline should they debate?
              </label>
              <textarea
                value={debateTopic}
                onChange={(e) => setDebateTopic(e.target.value)}
                placeholder="e.g. Should I rewrite my backend in Go or stick with TypeScript/Node.js?"
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Or pick a quick dilemma:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEBATE_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setDebateTopic(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-left transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDebateModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTriggerDebate()}
                disabled={!debateTopic.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 text-white text-xs font-bold shadow-xs hover:opacity-95 disabled:opacity-50"
              >
                ⚡ Start Council Debate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
