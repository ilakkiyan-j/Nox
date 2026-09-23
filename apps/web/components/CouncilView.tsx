'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Heart,
  Compass,
  Flame,
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
  Edit3,
  Copy,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

export type StudioView = 'chat' | 'bots' | 'byok' | 'deliberate';

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
  isError?: boolean;
  failedPrompt?: string;
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
  instruction?: {
    systemPrompt?: string;
    contextGuidelines?: string;
    safetyRules?: string;
  };
  modelConfig?: {
    provider?: string;
    model?: string;
    temperature?: number;
    credential?: {
      id?: string;
      label?: string;
      provider?: string;
    };
  };
}

export interface ProviderCredential {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  status: string;
  activeBotsCount?: number;
}

export interface CouncilViewProps {
  currentUser?: any;
  tasks?: any[];
  events?: any[];
  habits?: any[];
  onRefresh?: () => void;
}

const DEFAULT_PERSONAS: Record<string, { name: string; role: string; avatar: string; greeting: string; prompt: string }> = {
  sofi: {
    name: 'Sofi',
    role: 'Executive PA & Girlfriend',
    avatar: '💖',
    greeting:
      "Hey babe! I have full visibility into your Nox tasks and schedule. How are you holding up? Let's negotiate your plan for today so you crush your goals without burning out. What's on your mind? 💖",
    prompt:
      "You are Sofi, the user's caring, witty Executive PA and Girlfriend. You keep them organized, prioritize ruthlessly, and care about their well-being.",
  },
  riven: {
    name: 'Riven',
    role: 'Chief Architect & Idea Shaper',
    avatar: '🧭',
    greeting:
      'Ready to build. What architectural bottleneck or technical doubt are we breaking down today? Hand over your schemas, roadmaps, or project ideas.',
    prompt:
      'You are Riven, a brilliant Chief Architect and Systems Designer. You think in clean architectures, scalability, and modular software designs.',
  },
  lucifer: {
    name: 'Lucifer',
    role: 'Partner in Crime & Auditor',
    avatar: '🔥',
    greeting:
      "Let's see what you've cooked up. Hand over your timeline or plan so I can tell you where it's going to crash and burn. No excuses.",
    prompt:
      'You are Lucifer, the user\'s brutal auditor and devil\'s advocate. You challenge assumptions, stress-test deadlines, and cut through excuses.',
  },
};

const SUGGESTED_EMOJIS = ['💖', '🧭', '🔥', '🤖', '🧠', '⚡', '🚀', '🛡️', '🦉', '🎨', '🧪', '💼'];

const DEBATE_SUGGESTIONS = [
  'Should I migrate my local storage to SQLite or stay with file JSON?',
  'Can I realistically launch my v1 feature set by this weekend?',
  'Monolith vs micro-agents for background task automation',
  'Review my current workload and audit my burnout risk',
];

export default function CouncilView({
  currentUser,
  tasks = [],
  events = [],
  habits = [],
  onRefresh,
}: CouncilViewProps) {
  // Navigation View Mode
  const [studioView, setStudioView] = useState<StudioView>('chat');

  // Bots & Active Selection
  const [bots, setBots] = useState<BotItem[]>([]);
  const [activeBotId, setActiveBotId] = useState<string>('sofi');

  // BYOK Credentials
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [credProvider, setCredProvider] = useState('gemini');
  const [credLabel, setCredLabel] = useState('');
  const [credKey, setCredKey] = useState('');
  const [savingCred, setSavingCred] = useState(false);

  // Bot Workshop Modal (Create & Edit)
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorRole, setEditorRole] = useState('');
  const [editorAvatar, setEditorAvatar] = useState('🤖');
  const [editorDesc, setEditorDesc] = useState('');
  const [editorPrompt, setEditorPrompt] = useState('');
  const [editorProvider, setEditorProvider] = useState('gemini');
  const [editorModel, setEditorModel] = useState('');
  const [editorTemperature, setEditorTemperature] = useState(0.7);
  const [savingBot, setSavingBot] = useState(false);

  // Chat & Sessions
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [wakeSecondsElapsed, setWakeSecondsElapsed] = useState(0);
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [dismissStandbyBanner, setDismissStandbyBanner] = useState(false);

  // Drawers & Deliberation
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
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

  // Auto-resize textarea on input / paste
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = isInputExpanded ? 380 : 200;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), maxHeight)}px`;
    }
  }, [inputMessage, isInputExpanded]);

  // Active bot resolver
  const activeBot = bots.find((b) => b.id === activeBotId || b.slug === activeBotId);
  const currentBotName = activeBot?.name || DEFAULT_PERSONAS[activeBotId]?.name || 'Council Bot';
  const currentBotRole = activeBot?.role || DEFAULT_PERSONAS[activeBotId]?.role || 'AI Assistant';
  const currentBotAvatar = activeBot?.avatar || DEFAULT_PERSONAS[activeBotId]?.avatar || '🤖';
  const currentBotProvider = activeBot?.modelConfig?.provider || 'gemini';
  const currentBotModel = activeBot?.modelConfig?.model || 'gemini-2.5-flash';

  // Check if provider has connected BYOK key OR any active workspace key (e.g. Gemini)
  const hasExactKey = credentials.some((c) => c.provider === currentBotProvider && c.status === 'ACTIVE');
  const hasActiveKey = credentials.some((c) => c.status === 'ACTIVE');
  const hasKeyForActiveBot = hasExactKey || hasActiveKey;

  useEffect(() => {
    // 1. Instantly restore cached credentials so keys display active without waiting on network
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('nox_council_creds_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCredentials(parsed);
          }
        }
      } catch {}
    }

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

    const interval = setInterval(checkCouncilStatus, 25000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    if (studioView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, debateLoading, studioView]);

  const checkCouncilStatus = async () => {
    try {
      const startTime = Date.now();
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/status`);
      const latency = Date.now() - startTime;
      const json = await res.json();
      const online = Boolean(json?.data?.online);
      setIsOnline(online);
      if (online) {
        setPingLatency(json?.data?.latencyMs || latency);
        // Automatically sync credentials if none loaded yet
        fetchCredentials();
      }
    } catch {
      setIsOnline(false);
    }
  };

  const handleWakeOrPingCouncil = async (isManualWake: boolean = false) => {
    setIsPinging(true);
    setWakeError(null);
    setWakeSecondsElapsed(0);

    const timer = setInterval(() => {
      setWakeSecondsElapsed((prev) => prev + 1);
    }, 1000);

    // 1. Trigger container spin-up immediately
    fetch('https://council-cy4r.onrender.com/health', {
      mode: 'cors',
      signal: AbortSignal.timeout(45000),
    }).catch(() => {});

    if (isManualWake) {
      fetchWithUser(`${API_BASE_URL}/api/v1/council/status?wake=true`).catch(() => {});
    }

    // 2. Active client-side fast polling (checks every 2.5s instead of waiting 60s)
    const startTime = Date.now();
    const maxWaitMs = 50000;
    let isFinished = false;

    const pollOnce = async (): Promise<boolean> => {
      try {
        // Fast direct probe to Council (bypasses proxy delay)
        const directRes = await fetch('https://council-cy4r.onrender.com/health', {
          mode: 'cors',
          signal: AbortSignal.timeout(3500),
        }).catch(() => null);

        if (directRes && directRes.ok) {
          return true;
        }

        // Also check via Nox API ping
        const pingRes = await fetchWithUser(`${API_BASE_URL}/api/v1/council/ping`, {
          signal: AbortSignal.timeout(3500),
        }).catch(() => null);

        if (pingRes && pingRes.ok) {
          const json = await pingRes.json().catch(() => ({}));
          if (json?.data?.online || json?.online) {
            return true;
          }
        }
      } catch {}
      return false;
    };

    while (Date.now() - startTime < maxWaitMs && !isFinished) {
      const up = await pollOnce();
      if (up) {
        isFinished = true;
        const latency = Date.now() - startTime;
        setIsOnline(true);
        setPingLatency(Math.min(latency, 200));

        // Re-sync all state immediately
        await Promise.allSettled([
          fetchBots(),
          fetchCredentials(),
          fetchSessions(),
          fetchMemory(),
        ]);
        break;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }

    clearInterval(timer);
    setIsPinging(false);

    if (!isFinished) {
      setIsOnline(false);
      setWakeError('Council container wake-up timed out. Please click Wake to retry.');
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
        const loaded = json?.data || [];
        if (Array.isArray(loaded) && loaded.length > 0) {
          setCredentials(loaded);
          if (typeof window !== 'undefined') {
            localStorage.setItem('nox_council_creds_cache', JSON.stringify(loaded));
          }
        }
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
          executedActions: Array.isArray(m.toolCalls)
            ? m.toolCalls
                .filter((tc: any) => tc && (tc.toolName || tc.name))
                .map((tc: any) => ({
                  toolName: tc.toolName || tc.name || 'action',
                  params: tc.params || {},
                  result: tc.result || {},
                }))
            : [],
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

      if (data?.executedActions && data.executedActions.length > 0) {
        if (onRefresh) onRefresh();
        if (data.executedActions.some((act: any) => act.toolName === 'adapt_persona')) {
          fetchBots();
        }
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
        isError: true,
        failedPrompt: text.trim(),
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

    setDebateTopic('');
    setDebateLoading(true);
    setStudioView('chat');

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

  // Open modal for Creating a new bot
  const handleOpenCreateBot = () => {
    setEditingBotId(null);
    setEditorName('');
    setEditorRole('');
    setEditorAvatar('🤖');
    setEditorDesc('');
    setEditorPrompt('');
    setEditorProvider('gemini');
    setEditorModel('gemini-2.5-flash');
    setEditorTemperature(0.7);
    setShowEditorModal(true);
  };

  // Open modal for Editing an existing bot (Sofi, Riven, Lucifer, or custom)
  const handleOpenEditBot = async (bot: BotItem) => {
    setEditingBotId(bot.id);
    setEditorName(bot.name || '');
    setEditorRole(bot.role || '');
    setEditorAvatar(bot.avatar || '🤖');
    setEditorDesc(bot.description || '');
    setEditorPrompt(bot.instruction?.systemPrompt || DEFAULT_PERSONAS[bot.id]?.prompt || '');
    setEditorProvider(bot.modelConfig?.provider || 'gemini');
    setEditorModel(bot.modelConfig?.model || '');
    setEditorTemperature(bot.modelConfig?.temperature || 0.7);
    setShowEditorModal(true);

    // Fetch full bot details if instruction wasn't loaded
    if (!bot.instruction?.systemPrompt) {
      try {
        const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${bot.id}`);
        if (res.ok) {
          const json = await res.json();
          const detailed = json?.data;
          if (detailed?.instruction?.systemPrompt) {
            setEditorPrompt(detailed.instruction.systemPrompt);
          }
        }
      } catch (err) {
        console.warn('Could not fetch full bot instructions:', err);
      }
    }
  };

  // Save Bot (Create or Edit)
  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorName.trim()) return;

    setSavingBot(true);
    try {
      const payload = {
        name: editorName.trim(),
        role: editorRole.trim() || 'AI Assistant',
        avatar: editorAvatar || '🤖',
        description: editorDesc.trim(),
        instruction: {
          systemPrompt: editorPrompt.trim(),
        },
        modelConfig: {
          provider: editorProvider,
          model: editorModel.trim() || undefined,
          temperature: editorTemperature,
        },
      };

      if (editingBotId) {
        // PATCH existing bot
        const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${editingBotId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error?.message || 'Failed to update bot');
        }
      } else {
        // POST new bot
        const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error?.message || 'Failed to create bot');
        }

        const created = (await res.json())?.data;
        if (created?.id) {
          setActiveBotId(created.id);
        }
      }

      setShowEditorModal(false);
      await fetchBots();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingBot(false);
    }
  };

  // Duplicate Bot
  const handleDuplicateBot = async (botId: string) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${botId}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || 'Failed to duplicate bot');
      }
      await fetchBots();
      alert('✓ Bot duplicated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Bot
  const handleDeleteBot = async (botId: string, botName: string) => {
    if (!confirm(`Delete "${botName}"? This bot will be removed from your workspace.`)) return;
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${botId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || 'Failed to delete bot');
      }
      await fetchBots();
      if (activeBotId === botId) {
        setActiveBotId('sofi');
        createNewSession('sofi', true);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save BYOK Key
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

      setCredKey('');
      setCredLabel('');
      await fetchCredentials();
      alert('✓ API Key encrypted and linked to all matching bots!');
    } catch (err: any) {
      alert(`Failed to save key: ${err.message}`);
    } finally {
      setSavingCred(false);
    }
  };

  // Delete BYOK Key
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

  // Add Fact to Memory
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

  // Compile bot tabs
  const displayedBots = bots.length > 0 ? bots : [
    { id: 'sofi', name: 'Sofi', role: 'Executive PA & Girlfriend', avatar: '💖', modelConfig: { provider: 'gemini', model: 'gemini-2.5-flash' } },
    { id: 'riven', name: 'Riven', role: 'Chief Architect & Idea Shaper', avatar: '🧭', modelConfig: { provider: 'groq', model: 'llama-3.3-70b-versatile' } },
    { id: 'lucifer', name: 'Lucifer', role: 'Partner in Crime & Auditor', avatar: '🔥', modelConfig: { provider: 'groq', model: 'llama-3.3-70b-versatile' } },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Studio Master Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex-wrap gap-2">
        {/* View Mode Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 text-xs font-semibold">
          <button
            onClick={() => setStudioView('chat')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              studioView === 'chat'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <MessageSquare size={13} />
            <span>Chat Studio</span>
          </button>
          <button
            onClick={() => setStudioView('bots')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              studioView === 'bots'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Bot size={13} />
            <span>My Bots ({displayedBots.length})</span>
          </button>
          <button
            onClick={() => setStudioView('byok')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              studioView === 'byok'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Key size={13} />
            <span>BYOK Vault</span>
          </button>
          <button
            onClick={() => setStudioView('deliberate')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              studioView === 'deliberate'
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles size={13} />
            <span>Deliberation</span>
          </button>
        </div>

        {/* Global Utilities */}
        <div className="flex items-center gap-2 text-xs">
          {/* Memory Vault Button */}
          <button
            onClick={() => setShowMemoryDrawer(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
            title="Memory Vault"
          >
            <Brain size={13} className="text-indigo-500" />
            <span className="hidden sm:inline">Memory</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 font-mono text-[10px]">
              {memoryProfile?.facts?.length || 0}
            </span>
          </button>

          {/* Sessions Drawer Button */}
          <button
            onClick={() => setShowSessionsDrawer(true)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
            title="Chat History"
          >
            <MessageSquare size={13} className="text-cyan-500" />
            <span className="hidden sm:inline">Sessions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
              {sessions.length}
            </span>
          </button>

          {/* Interactive Ping / Wake Controller */}
          <button
            onClick={() => handleWakeOrPingCouncil(!isOnline)}
            disabled={isPinging}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition shadow-xs ${
              isPinging
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 cursor-wait'
                : isOnline
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse'
            }`}
            title={
              isPinging
                ? `Waking Council container... elapsed ${wakeSecondsElapsed}s`
                : isOnline
                ? `Council is live (${pingLatency ? `${pingLatency}ms` : 'active'}). Click to re-ping latency.`
                : 'Council is on Standby (Render free tier). Click to wake container.'
            }
          >
            {isPinging ? (
              <>
                <RefreshCw size={12} className="animate-spin text-amber-500" />
                <span>Waking... ({wakeSecondsElapsed}s)</span>
              </>
            ) : isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online{pingLatency ? ` (${pingLatency}ms)` : ''}</span>
                <RefreshCw size={10} className="opacity-60 hover:opacity-100" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold">Standby • Wake</span>
                <RefreshCw size={10} className="opacity-70" />
              </>
            )}
          </button>

          {/* + Create Bot Trigger */}
          <button
            onClick={handleOpenCreateBot}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 transition"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Create Bot</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CHAT STUDIO */}
      {studioView === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Standby Wake Alert Banner */}
          {isOnline === false && !dismissStandbyBanner && (
            <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500 shrink-0" />
                <span>
                  <strong>Council Standby:</strong>{' '}
                  {isPinging
                    ? wakeSecondsElapsed < 12
                      ? 'Triggering Render container start...'
                      : wakeSecondsElapsed < 28
                      ? 'Render container booting (~25-35s typical for cold start)...'
                      : 'Almost ready, waiting for port to accept traffic...'
                    : 'The AI Council service is sleeping on Render free-tier.'}
                  {wakeError && !isPinging && <span className="ml-1 text-rose-500 font-mono">({wakeError})</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWakeOrPingCouncil(true)}
                  disabled={isPinging}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isPinging ? 'animate-spin' : ''} />
                  <span>{isPinging ? `Waking... (${wakeSecondsElapsed}s)` : 'Wake Council Now'}</span>
                </button>
                <button
                  onClick={() => setDismissStandbyBanner(true)}
                  className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white rounded"
                  title="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          {/* Active Bot Bar & Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Horizontal Bot Switcher */}
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
                    className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition text-xs shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{b.avatar || '🤖'}</span>
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>

            {/* In-Chat Edit Bot Button */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <span>⚙️ {currentBotProvider}</span>
                <span>•</span>
                <span className={hasKeyForActiveBot ? 'text-emerald-500 font-medium' : 'text-amber-500'}>
                  {hasKeyForActiveBot ? '🔑 Key Active' : 'No Key'}
                </span>
              </div>

              <button
                onClick={() => handleOpenEditBot(activeBot || { id: activeBotId, name: currentBotName, role: currentBotRole, avatar: currentBotAvatar })}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition"
                title="Edit this bot's instructions, avatar, or AI model"
              >
                <Edit3 size={13} />
                <span>Edit Bot</span>
              </button>

              <button
                onClick={() => createNewSession(activeBotId, true)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="New Chat Session"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
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
                      ? 'bg-indigo-600 dark:bg-indigo-600 text-white rounded-tr-none shadow-xs font-normal'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  {m.sender === 'user' ? (
                    <div className="whitespace-pre-wrap break-words text-white font-medium text-sm selection:bg-indigo-400 selection:text-white">
                      {m.content}
                    </div>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}

                  {/* Retry & Restore Bar on Error */}
                  {m.isError && m.failedPrompt && (
                    <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        <span>Failed to deliver message</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInputMessage(m.failedPrompt!);
                            setTimeout(() => textareaRef.current?.focus(), 50);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          title="Restore failed message to input box"
                        >
                          Edit / Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessages((prev) => prev.filter((msg) => msg.id !== m.id));
                            handleSendMessage(m.failedPrompt);
                          }}
                          disabled={loading}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                          <span>Retry</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Executed Action Cards */}
                  {m.executedActions && m.executedActions.filter((a: any) => a && (a.toolName || a.name)).length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        ⚡ Executed Actions:
                      </div>
                      {m.executedActions
                        .filter((act: any) => act && (act.toolName || act.name))
                        .map((act: any, i) => {
                          const toolName = act.toolName || act.name || 'action';
                          const isAdaptPersona = toolName === 'adapt_persona';
                          const isWebSearch = toolName === 'web_search';
                          return (
                            <div
                              key={i}
                              className={`p-2.5 rounded-xl border text-xs font-mono ${
                                isAdaptPersona
                                  ? 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 border-purple-200 dark:border-purple-800/60'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`font-bold ${
                                    isAdaptPersona
                                      ? 'text-purple-600 dark:text-purple-400'
                                      : 'text-indigo-600 dark:text-indigo-400'
                                  }`}
                                >
                                  {isAdaptPersona ? '🎭 adapt_persona' : isWebSearch ? '🔍 web_search' : `⚡ ${toolName}`}
                                </span>
                                {isAdaptPersona && (
                                  <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold">
                                    Character & Instructions Adapted
                                  </span>
                                )}
                              </div>
                              {act.params && Object.keys(act.params).length > 0 && (
                                <div className="text-slate-500 text-[10px] mt-1 break-all">
                                  {JSON.stringify(act.params)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Deliberation Items */}
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
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>{currentBotName} is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Container */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            {/* Long message helper bar */}
            {inputMessage.length > 120 && (
              <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 font-mono">
                  <span>{inputMessage.length.toLocaleString()} chars</span>
                  <span>•</span>
                  <span>{inputMessage.split('\n').length} lines</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInputExpanded(!isInputExpanded)}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition"
                    title={isInputExpanded ? 'Collapse Input Box' : 'Expand Input Box'}
                  >
                    {isInputExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    <span>{isInputExpanded ? 'Collapse' : 'Expand'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMessage('')}
                    className="hover:text-rose-500 flex items-center gap-0.5 transition"
                    title="Clear text"
                  >
                    <X size={12} />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative flex items-end">
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
                  rows={1}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-3 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none resize-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto leading-relaxed transition-all"
                  style={{ minHeight: '48px', maxHeight: isInputExpanded ? '380px' : '200px' }}
                />

                <button
                  type="button"
                  onClick={() => setIsInputExpanded(!isInputExpanded)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition"
                  title={isInputExpanded ? 'Collapse Input Box' : 'Expand Input Box for long message'}
                >
                  {isInputExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center justify-center shrink-0 disabled:opacity-50 shadow-xs"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: MY BOTS (GRID & WORKSHOP) */}
      {studioView === 'bots' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI Bot Workshop</h2>
              <p className="text-xs text-slate-500">
                Personal AI assistants configured with your instructions, models, and shared BYOK keys.
              </p>
            </div>
            <button
              onClick={handleOpenCreateBot}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus size={15} />
              <span>Create New Bot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedBots.map((b) => {
              const prov = b.modelConfig?.provider || 'gemini';
              const mod = b.modelConfig?.model || 'default';
              const keyActive = credentials.some((c) => c.provider === prov && c.status === 'ACTIVE');

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500 transition group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shadow-xs">
                        {b.avatar || '🤖'}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {b.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition">
                        {b.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{b.role}</p>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {b.description || b.instruction?.systemPrompt || 'Personalized AI assistant.'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                        ⚙️ {prov} / {mod}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          keyActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {keyActive ? '🔑 Key Active' : 'No Key'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setActiveBotId(b.id);
                        createNewSession(b.id, true);
                        setStudioView('chat');
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition flex items-center justify-center gap-1 shadow-xs"
                    >
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditBot(b)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition"
                      title="Edit Bot Instructions & Model"
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      onClick={() => handleDuplicateBot(b.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition"
                      title="Duplicate Bot"
                    >
                      <Copy size={13} />
                    </button>

                    {!b.isDefault && (
                      <button
                        onClick={() => handleDeleteBot(b.id, b.name)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs transition"
                        title="Delete Bot"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: BYOK KEY VAULT */}
      {studioView === 'byok' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">BYOK Credential Vault</h2>
            <p className="text-xs text-slate-500">
              Bring Your Own Key (BYOK) encrypted with AES-256-GCM. A single key automatically powers all bots using that provider.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add/Update Key Form */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Connect Provider Key</h3>
              </div>

              <form onSubmit={handleSaveCredential} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Provider</label>
                  <select
                    value={credProvider}
                    onChange={(e) => setCredProvider(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="gemini">Google Gemini (Free at aistudio.google.com)</option>
                    <option value="groq">Groq Cloud (Free at console.groq.com)</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Key Label</label>
                  <input
                    value={credLabel}
                    onChange={(e) => setCredLabel(e.target.value)}
                    placeholder="e.g. My Personal Gemini API Key"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">API Key *</label>
                  <input
                    type="password"
                    value={credKey}
                    onChange={(e) => setCredKey(e.target.value)}
                    required
                    placeholder="AIza... or sk-..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div className="text-[11px] text-slate-500">
                  🔒 Keys are validated with the provider, encrypted with AES-256-GCM, and immediately activate across all matching bots.
                </div>

                <button
                  type="submit"
                  disabled={savingCred}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition disabled:opacity-50"
                >
                  {savingCred ? 'Validating Key...' : 'Validate & Save Encrypted Key'}
                </button>
              </form>
            </div>

            {/* Active Keys List */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Configured Credentials</h3>
              {credentials.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  No custom BYOK keys added yet. Add a free Google Gemini key or Groq key to get started!
                </div>
              ) : (
                credentials.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-slate-900 dark:text-slate-100">{c.provider}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                          {c.status}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{c.label}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-1">{c.maskedKey}</div>
                    </div>

                    <button
                      onClick={() => handleDeleteCredential(c.id)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                      title="Revoke and delete key"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: DELIBERATION STUDIO */}
      {studioView === 'deliberate' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Summon Council Deliberation</h2>
            <p className="text-xs text-slate-500">
              Riven, Lucifer, and Sofi convene sequentially to debate your architectural dilemmas, deadlines, and project risks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5">What topic or decision should the Council debate?</label>
              <textarea
                value={debateTopic}
                onChange={(e) => setDebateTopic(e.target.value)}
                placeholder="e.g. Should I stick with a modular monolith or break into microservices for the next milestone?"
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quick Prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {DEBATE_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setDebateTopic(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleTriggerDebate()}
              disabled={!debateTopic.trim() || debateLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 text-white font-bold text-xs shadow-sm hover:opacity-95 transition disabled:opacity-50"
            >
              {debateLoading ? 'Deliberating...' : '⚡ Summon the Council'}
            </button>
          </div>
        </div>
      )}

      {/* UNIVERSAL BOT WORKSHOP MODAL (CREATE & EDIT) */}
      {showEditorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {editingBotId ? `Edit "${editorName || 'Bot'}"` : 'Create Custom AI Bot'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize the personality, system prompt, and model configuration
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditorModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBot} className="space-y-3.5 text-xs">
              {/* Avatar Selector */}
              <div>
                <label className="font-semibold block mb-1">Avatar Emoji</label>
                <div className="flex items-center gap-2">
                  <input
                    value={editorAvatar}
                    onChange={(e) => setEditorAvatar(e.target.value)}
                    className="w-12 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xl outline-none font-bold"
                  />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {SUGGESTED_EMOJIS.map((em) => (
                      <button
                        type="button"
                        key={em}
                        onClick={() => setEditorAvatar(em)}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-base transition"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Bot Name *</label>
                  <input
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    required
                    placeholder="e.g. Sage, DevCoach, Sofi"
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Role / Persona Title *</label>
                  <input
                    value={editorRole}
                    onChange={(e) => setEditorRole(e.target.value)}
                    required
                    placeholder="e.g. Senior Backend Architect"
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <input
                  value={editorDesc}
                  onChange={(e) => setEditorDesc(e.target.value)}
                  placeholder="Short description of what this bot specializes in..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Model Provider & Configuration */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">AI Provider</label>
                    <select
                      value={editorProvider}
                      onChange={(e) => setEditorProvider(e.target.value)}
                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="groq">Groq Cloud</option>
                      <option value="openai">OpenAI</option>
                      <option value="ollama">Ollama (Local)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Model Name (Optional)</label>
                    <input
                      value={editorModel}
                      onChange={(e) => setEditorModel(e.target.value)}
                      placeholder="default (e.g. gemini-2.5-flash)"
                      className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                {/* Key Status Helper */}
                <div className="text-[11px] flex items-center gap-1 text-slate-500">
                  {credentials.some((c) => c.provider === editorProvider && c.status === 'ACTIVE') ? (
                    <span className="text-emerald-500 font-medium">✓ Uses your active {editorProvider.toUpperCase()} BYOK key</span>
                  ) : (
                    <span className="text-amber-500">⚠️ No key configured for {editorProvider}. You can connect one in BYOK Vault.</span>
                  )}
                </div>

                {/* Temperature Slider */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Creativity (Temperature)</span>
                    <span>{editorTemperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editorTemperature}
                    onChange={(e) => setEditorTemperature(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0.0 (Precise & Deterministic)</span>
                    <span>1.0 (Creative & Exploratory)</span>
                  </div>
                </div>
              </div>

              {/* System Instructions / Prompt */}
              <div>
                <label className="font-semibold block mb-1">System Instructions / Prompt</label>
                <textarea
                  value={editorPrompt}
                  onChange={(e) => setEditorPrompt(e.target.value)}
                  rows={5}
                  placeholder="Define this bot's personality, decision-making style, and behavior rules..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none resize-none font-mono text-[11px] leading-relaxed"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBot}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition disabled:opacity-50"
                >
                  {savingBot ? 'Saving...' : editingBotId ? 'Save Changes' : 'Create Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SESSIONS DRAWER */}
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
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl outline-none"
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
                      setStudioView('chat');
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      s.sessionId === sessionId
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
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

      {/* MEMORY VAULT DRAWER */}
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

            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-[11px] block">Record User Preference / Fact:</span>
              <textarea
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="e.g. Prefers functional TypeScript, dislikes repetitive daily meetings..."
                rows={2}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newFactCategory}
                  onChange={(e) => setNewFactCategory(e.target.value as any)}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-[11px]"
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
