'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Compass,
  Heart,
  ListTodo,
  Trash2,
  Send,
  Brain,
  MessageSquare,
  Plus,
  Search,
  X,
  ShieldCheck,
  Key,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

export type PersonaId = 'sofi' | 'riven' | 'lucifer' | string;

export interface ExecutedAction {
  toolName: string;
  params: any;
  result: any;
}

export interface DeliberationItem {
  persona: string;
  name: string;
  role: string;
  opinion?: string;
  synthesis?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  persona?: string;
  content: string;
  executedActions?: ExecutedAction[];
  deliberation?: DeliberationItem[];
  timestamp: string;
}

export interface SessionSummary {
  sessionId: string;
  personaId?: string;
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

export interface MemoryProfile {
  userId: string;
  userName?: string;
  updatedAt?: string;
  facts: UserFact[];
}

export interface BotItem {
  id: string;
  name: string;
  slug?: string;
  role: string;
  avatar?: string;
  description?: string;
  isDefault?: boolean;
  status?: string;
  systemPrompt?: string;
  modelConfig?: {
    provider?: string;
    model?: string;
    temperature?: number;
    credential?: {
      label?: string;
    };
  };
}

export interface ProviderCredential {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  status: string;
}

export interface CouncilViewProps {
  tasks?: any[];
  events?: any[];
  habits?: any[];
  onRefresh?: () => void;
}

const DEFAULT_PERSONAS: Record<string, { name: string; role: string; avatar: string; color: string; greeting: string; suggestions: string[] }> = {
  sofi: {
    name: 'Sofi',
    role: 'Executive PA & Girlfriend',
    avatar: '💖',
    color: 'bg-rose-500 text-white shadow-xs',
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
    avatar: '🧭',
    color: 'bg-cyan-600 text-white shadow-xs',
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
    avatar: '🔥',
    color: 'bg-amber-600 text-white shadow-xs',
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
  // Bots & Personas
  const [bots, setBots] = useState<BotItem[]>([]);
  const [activeBotId, setActiveBotId] = useState<string>('sofi');

  // BYOK Credentials
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [showCredModal, setShowCredModal] = useState(false);
  const [credProvider, setCredProvider] = useState('gemini');
  const [credLabel, setCredLabel] = useState('');
  const [credKey, setCredKey] = useState('');
  const [savingCred, setSavingCred] = useState(false);

  // Bot Workshop Modal
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [workshopName, setWorkshopName] = useState('');
  const [workshopRole, setWorkshopRole] = useState('');
  const [workshopAvatar, setWorkshopAvatar] = useState('🤖');
  const [workshopDesc, setWorkshopDesc] = useState('');
  const [workshopPrompt, setWorkshopPrompt] = useState('');
  const [workshopProvider, setWorkshopProvider] = useState('gemini');
  const [workshopModel, setWorkshopModel] = useState('');
  const [savingBot, setSavingBot] = useState(false);

  // Chat & Sessions
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Drawers & Deliberation
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [debateTopic, setDebateTopic] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);
  const [memoryProfile, setMemoryProfile] = useState<MemoryProfile | null>(null);
  const [newFact, setNewFact] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<UserFact['category']>('general');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTasksCount = tasks.filter((t: any) => t.status !== 'COMPLETED').length;

  // Active bot resolver
  const activeBot = bots.find((b) => b.id === activeBotId || b.slug === activeBotId);
  const currentBotName = activeBot?.name || DEFAULT_PERSONAS[activeBotId]?.name || 'Council Bot';
  const currentBotRole = activeBot?.role || DEFAULT_PERSONAS[activeBotId]?.role || 'AI Assistant';
  const currentBotAvatar = activeBot?.avatar || DEFAULT_PERSONAS[activeBotId]?.avatar || '🤖';

  useEffect(() => {
    checkCouncilStatus();
    fetchBots();
    fetchCredentials();
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

  const fetchBots = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots`);
      if (res.ok) {
        const json = await res.json();
        const loadedBots = json?.data || [];
        if (loadedBots.length > 0) {
          setBots(loadedBots);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch bots:', err);
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/provider-credentials`);
      if (res.ok) {
        const json = await res.json();
        setCredentials(json?.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch credentials:', err);
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

  const createNewSession = (botId: string = activeBotId, saveToStorage: boolean = true) => {
    const newSid = `session_${Date.now()}`;
    setSessionId(newSid);
    if (saveToStorage && typeof window !== 'undefined') {
      localStorage.setItem('nox_council_active_session', newSid);
    }
    setActiveBotId(botId);

    const greeting =
      DEFAULT_PERSONAS[botId]?.greeting ||
      `Hello! I'm ${currentBotName}, your ${currentBotRole}. How can I assist you with your Nox workspace today?`;

    setMessages([
      {
        id: `init-${botId}-${Date.now()}`,
        sender: 'assistant',
        persona: botId,
        content: greeting,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const loadSessionHistory = async (sid: string) => {
    try {
      setLoading(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions/${encodeURIComponent(sid)}`);
      if (!res.ok) {
        createNewSession(activeBotId, true);
        return;
      }
      const json = await res.json();
      const sessionData = json?.data;
      if (sessionData && Array.isArray(sessionData.messages)) {
        const loadedMsgs: Message[] = sessionData.messages.map((m: any, idx: number) => ({
          id: `hist-${idx}-${Date.now()}`,
          sender: m.role === 'assistant' ? 'assistant' : 'user',
          persona: sessionData.personaId || activeBotId,
          content: m.content || '',
          executedActions: m.toolCalls || [],
          timestamp: m.timestamp || new Date().toISOString(),
        }));
        setMessages(loadedMsgs);
        if (sessionData.personaId) {
          setActiveBotId(sessionData.personaId);
        }
      }
    } catch (err) {
      console.warn('Failed to load session:', err);
      createNewSession(activeBotId, true);
    } finally {
      setLoading(false);
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
          persona: activeBotId,
          botId: activeBot?.id || activeBotId,
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
        persona: activeBotId,
        content: data?.reply || "I'm with you, partner.",
        executedActions: data?.executedActions || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data?.executedActions && data.executedActions.length > 0 && onRefresh) {
        onRefresh();
      }

      fetchSessions();
      fetchMemory();
    } catch (err: any) {
      const errText = err.message || '';
      const content = `**Connection Notice**: Couldn't reach Council server: ${
        errText || 'Check if Council is running on port 4100'
      }.`;

      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        persona: activeBotId,
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

    const callMsg: Message = {
      id: `debate-summon-${Date.now()}`,
      sender: 'user',
      content: `🏛️ **[Summoned Council]**: Multi-Agent Deliberation on:\n> "${topic.trim()}"`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, callMsg]);

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Debate execution failed');
      }

      const data = json?.data;
      const deliberationList: DeliberationItem[] = data?.deliberations || [];

      const resultMsg: Message = {
        id: `debate-res-${Date.now()}`,
        sender: 'assistant',
        content: `### 🏛️ Council Deliberation Complete\n\nThe Council has reviewed your topic with live context across your tasks, roadmaps, and commitments.`,
        deliberation: deliberationList,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, resultMsg]);
      fetchSessions();
      fetchMemory();
    } catch (err: any) {
      const errRes: Message = {
        id: `debate-err-${Date.now()}`,
        sender: 'assistant',
        content: `**Debate Interrupted**: ${err.message || 'Failed to convene Council.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errRes]);
    } finally {
      setDebateLoading(false);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopName.trim()) return;

    setSavingBot(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workshopName.trim(),
          role: workshopRole.trim() || 'AI Assistant',
          avatar: workshopAvatar || '🤖',
          description: workshopDesc.trim(),
          systemPrompt: workshopPrompt.trim(),
          provider: workshopProvider,
          model: workshopModel.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || 'Failed to create bot');
      }

      const created = (await res.json())?.data;
      setShowWorkshopModal(false);
      setWorkshopName('');
      setWorkshopRole('');
      setWorkshopDesc('');
      setWorkshopPrompt('');

      await fetchBots();
      if (created?.id) {
        setActiveBotId(created.id);
        createNewSession(created.id, true);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingBot(false);
    }
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credKey.trim()) return;

    setSavingCred(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/provider-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: credProvider,
          label: credLabel.trim() || `${credProvider.toUpperCase()} Key`,
          apiKey: credKey.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || 'Failed to save credential');
      }

      setShowCredModal(false);
      setCredKey('');
      setCredLabel('');
      await fetchCredentials();
      alert('✓ Credential saved and encrypted securely!');
    } catch (err: any) {
      alert(`Failed to save key: ${err.message}`);
    } finally {
      setSavingCred(false);
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    if (!confirm('Revoke and delete this provider credential?')) return;
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/council/provider-credentials/${credId}`, {
        method: 'DELETE',
      });
      await fetchCredentials();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddFact = async () => {
    if (!newFact.trim()) return;
    setIsAddingFact(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fact: newFact.trim(),
          category: newFactCategory,
          sourcePersona: activeBotId,
        }),
      });

      if (res.ok) {
        setNewFact('');
        await fetchMemory();
      }
    } catch (err) {
      console.warn('Failed to add memory fact:', err);
    } finally {
      setIsAddingFact(false);
    }
  };

  // Compile bot tabs: default bots + custom bots
  const displayedBots = bots.length > 0 ? bots : [
    { id: 'sofi', name: 'Sofi', role: 'Executive PA & Girlfriend', avatar: '💖' },
    { id: 'riven', name: 'Riven', role: 'Chief Architect & Idea Shaper', avatar: '🧭' },
    { id: 'lucifer', name: 'Lucifer', role: 'Partner in Crime & Auditor', avatar: '🔥' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Header & Dynamic Bot Selector */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md gap-3 flex-wrap">
        {/* Dynamic Bot Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {displayedBots.map((b) => {
            const isSelected = activeBotId === b.id || activeBotId === b.slug;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setActiveBotId(b.id);
                  createNewSession(b.id, true);
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all text-xs font-medium shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
                title={`${b.name} (${b.role})`}
              >
                <span>{b.avatar || '🤖'}</span>
                <span>{b.name}</span>
              </button>
            );
          })}

          {/* + Create Bot Workshop Trigger */}
          <button
            onClick={() => setShowWorkshopModal(true)}
            className="px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 text-xs font-medium flex items-center gap-1 shrink-0 transition"
            title="Create Custom AI Bot"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Bot</span>
          </button>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* BYOK Keys Modal Button */}
          <button
            onClick={() => setShowCredModal(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
            title="Manage BYOK AI Provider API Keys"
          >
            <Key size={13} className="text-amber-500" />
            <span className="hidden sm:inline">BYOK Keys</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
              {credentials.length}
            </span>
          </button>

          {/* Summon Council Debate Button */}
          <button
            onClick={() => setShowDebateModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-all"
            title="Summon multi-bot deliberation on a decision"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Summon Debate</span>
          </button>

          {/* Persistent Memory Vault Drawer Button */}
          <button
            onClick={() => setShowMemoryDrawer(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
            title="View & manage long-term persistent memory vault"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Memory</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 font-mono text-[10px]">
              {memoryProfile?.facts?.length || 0}
            </span>
          </button>

          {/* Sessions Drawer Button */}
          <button
            onClick={() => setShowSessionsDrawer(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
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
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Standby'}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <ListTodo className="w-3 h-3 text-indigo-500" />
              <span>{pendingTasksCount} tasks</span>
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => createNewSession(activeBotId, true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm scroll-smooth">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} max-w-3xl ${
              m.sender === 'user' ? 'ml-auto' : 'mr-auto'
            } w-full`}
          >
            <div className="flex items-center space-x-1.5 mb-1 px-1 text-[11px] text-slate-400">
              {m.sender === 'assistant' ? (
                <>
                  <span>{currentBotAvatar}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{currentBotName}</span>
                </>
              ) : (
                <span className="font-semibold text-slate-700 dark:text-slate-300">You</span>
              )}
              <span>•</span>
              <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div
              className={`p-4 rounded-2xl leading-relaxed text-sm ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80'
              }`}
            >
              <MarkdownRenderer content={m.content} />

              {/* Executed Action Cards */}
              {m.executedActions && m.executedActions.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    ⚡ Executed Actions:
                  </div>
                  {m.executedActions.map((act, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    >
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">{act.toolName}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{JSON.stringify(act.params)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Deliberation Results */}
              {m.deliberation && m.deliberation.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                  {m.deliberation.map((delib, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {delib.name} ({delib.role})
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{delib.opinion || delib.synthesis}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>{currentBotName} is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Message ${currentBotName}... (Press Enter to send, Shift+Enter for newline)`}
            rows={2}
            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none resize-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Modal: Bot Workshop (Create Custom Bot) */}
      {showWorkshopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Bot Workshop</h3>
                  <p className="text-xs text-slate-500">Create a personalized AI bot for your workspace</p>
                </div>
              </div>
              <button onClick={() => setShowWorkshopModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-3 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="font-semibold block mb-1">Avatar</label>
                  <input
                    value={workshopAvatar}
                    onChange={(e) => setWorkshopAvatar(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-lg outline-none"
                    placeholder="🤖"
                  />
                </div>
                <div className="col-span-3">
                  <label className="font-semibold block mb-1">Bot Name *</label>
                  <input
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    required
                    placeholder="e.g. Sage, DevCoach, Piper"
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Role / Persona Title</label>
                <input
                  value={workshopRole}
                  onChange={(e) => setWorkshopRole(e.target.value)}
                  placeholder="e.g. Senior Backend Architect & Code Reviewer"
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">AI Provider</label>
                  <select
                    value={workshopProvider}
                    onChange={(e) => setWorkshopProvider(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq Cloud</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Model (Optional)</label>
                  <input
                    value={workshopModel}
                    onChange={(e) => setWorkshopModel(e.target.value)}
                    placeholder="default"
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">System Instructions / Prompt</label>
                <textarea
                  value={workshopPrompt}
                  onChange={(e) => setWorkshopPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe how this bot should speak, reason, and advise you..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWorkshopModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBot}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500"
                >
                  {savingBot ? 'Saving...' : 'Create Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: BYOK Credential Vault */}
      {showCredModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">BYOK Key Vault</h3>
                  <p className="text-xs text-slate-500">AES-256-GCM Encrypted Provider Credentials</p>
                </div>
              </div>
              <button onClick={() => setShowCredModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Existing Keys List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Connected Keys:</span>
              {credentials.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">No custom API keys connected yet. Default keys are being used.</div>
              ) : (
                credentials.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div>
                      <div className="font-bold uppercase text-slate-800 dark:text-slate-200">{c.provider}</div>
                      <div className="text-slate-500 font-mono text-[10px]">{c.maskedKey}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteCredential(c.id)}
                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                      title="Revoke Key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Connect New Key Form */}
            <form onSubmit={handleSaveCredential} className="space-y-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Add / Update Key:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Provider</label>
                  <select
                    value={credProvider}
                    onChange={(e) => setCredProvider(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq Cloud</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Key Label</label>
                  <input
                    value={credLabel}
                    onChange={(e) => setCredLabel(e.target.value)}
                    placeholder="e.g. My Personal Key"
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">API Key *</label>
                <input
                  type="password"
                  value={credKey}
                  onChange={(e) => setCredKey(e.target.value)}
                  required
                  placeholder="sk-... or AIza..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCredModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingCred}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500"
                >
                  {savingCred ? 'Validating...' : 'Encrypt & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Summon Council Debate */}
      {showDebateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Summon Council Deliberation</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Multiple personas deliberate on your decision or deadline sequentially
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDebateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                What project decision or deadline should they debate?
              </label>
              <textarea
                value={debateTopic}
                onChange={(e) => setDebateTopic(e.target.value)}
                placeholder="e.g. Should I rewrite my backend in Go or stick with TypeScript/Node.js?"
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quick Prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {DEBATE_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setDebateTopic(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowDebateModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTriggerDebate()}
                disabled={!debateTopic.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 text-white text-xs font-bold shadow-xs hover:opacity-95 disabled:opacity-50"
              >
                ⚡ Start Deliberation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Sessions */}
      {showSessionsDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 h-full p-4 border-l border-slate-200 dark:border-slate-800 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-500" />
                <h3 className="font-bold text-sm">Chat Sessions</h3>
              </div>
              <button onClick={() => setShowSessionsDrawer(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Search sessions..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {sessions
                .filter((s) => !sessionSearch || (s.lastMessagePreview || '').toLowerCase().includes(sessionSearch.toLowerCase()))
                .map((s) => (
                  <div
                    key={s.sessionId}
                    onClick={() => {
                      setSessionId(s.sessionId);
                      loadSessionHistory(s.sessionId);
                      setShowSessionsDrawer(false);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      s.sessionId === sessionId
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {s.lastMessagePreview || 'Conversation'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(s.updatedAt).toLocaleDateString()} • {s.messageCount} messages
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Memory Vault */}
      {showMemoryDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 h-full p-4 border-l border-slate-200 dark:border-slate-800 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-sm">Persistent Memory</h3>
              </div>
              <button onClick={() => setShowMemoryDrawer(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Add Fact Form */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-[11px] block">Record User Preference / Fact:</span>
              <textarea
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="e.g. Prefers functional TypeScript, dislikes repetitive daily meetings..."
                rows={2}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newFactCategory}
                  onChange={(e) => setNewFactCategory(e.target.value as any)}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]"
                >
                  <option value="general">General</option>
                  <option value="preference">Preference</option>
                  <option value="goal">Goal</option>
                  <option value="tech_stack">Tech Stack</option>
                  <option value="habit">Habit</option>
                </select>
                <button
                  onClick={handleAddFact}
                  disabled={!newFact.trim() || isAddingFact}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-500 disabled:opacity-50"
                >
                  Save Fact
                </button>
              </div>
            </div>

            {/* Facts List */}
            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {memoryProfile?.facts?.map((f) => (
                <div
                  key={f.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <span className="text-[10px] font-bold uppercase text-indigo-500">{f.category}</span>
                  <div className="text-slate-800 dark:text-slate-200 mt-0.5">{f.fact}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
