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
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Check,
  Settings,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { TelegramIcon } from './ui/BrandIcons';
import DialogShell from './ui/Dialog';
import { API_BASE_URL, fetchWithUser } from '../lib/api';
import MarkdownRenderer from './MarkdownRenderer';

export type StudioView = 'chat' | 'deliberate';

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

export interface FallbackItem {
  provider: 'gemini' | 'groq' | 'openai' | 'ollama' | string;
  model?: string;
  enabled: boolean;
}

export interface BotPermissions {
  canAccessNox: boolean;
  canSearchWeb: boolean;
  canAuditCode: boolean;
  canAdaptPersona: boolean;
  canAccessMemory: boolean;
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
  persona?: {
    traits?: {
      permissions?: Partial<BotPermissions>;
      [key: string]: any;
    };
  };
  permissions?: Partial<BotPermissions>;
  instruction?: {
    systemPrompt?: string;
    contextGuidelines?: string;
    safetyRules?: string;
  };
  modelConfig?: {
    provider?: string;
    model?: string;
    temperature?: number;
    customEndpoint?: string;
    fallbackPipeline?: FallbackItem[];
    credential?: {
      id?: string;
      label?: string;
      provider?: string;
    };
  };
  telegramBotToken?: string;
  telegramBotUsername?: string;
  telegramWebhookUrl?: string;
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
  onNavigate?: (tab: string) => void;
  onRefresh?: () => void;
  onOpenSettings?: (section?: 'council' | 'profile' | 'preferences' | 'voice' | 'analytics' | 'data') => void;
}

export const DEFAULT_PERSONAS: Record<string, { name: string; role: string; avatar: string; greeting: string; prompt: string }> = {
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

export const SUGGESTED_EMOJIS = ['💖', '🧭', '🔥', '🤖', '🧠', '⚡', '🚀', '🛡️', '🦉', '🎨', '🧪', '💼'];

export const DEFAULT_FALLBACK_PIPELINE: FallbackItem[] = [
  { provider: 'gemini', model: 'gemini-2.5-flash', enabled: true },
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
  { provider: 'openai', model: 'gpt-4o-mini', enabled: false },
  { provider: 'ollama', model: 'llama3.2', enabled: false },
];

export const DEFAULT_PERMISSIONS_BY_BOT: Record<string, BotPermissions> = {
  sofi: {
    canAccessNox: true,
    canSearchWeb: true,
    canAuditCode: false,
    canAdaptPersona: true,
    canAccessMemory: true,
  },
  riven: {
    canAccessNox: false,
    canSearchWeb: true,
    canAuditCode: true,
    canAdaptPersona: true,
    canAccessMemory: true,
  },
  lucifer: {
    canAccessNox: false,
    canSearchWeb: true,
    canAuditCode: true,
    canAdaptPersona: true,
    canAccessMemory: true,
  },
};

export function BotAvatarDisplay({ avatar, name, className = "w-8 h-8 rounded-xl" }: { avatar?: string; name?: string; className?: string }) {
  const isImageUrl = avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image'));
  if (isImageUrl) {
    return (
      <img
        src={avatar}
        alt={name || 'Avatar'}
        className={`${className} object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs`}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <span className={`inline-flex items-center justify-center select-none ${className} shrink-0`}>
      {avatar || '🤖'}
    </span>
  );
}

const DEBATE_SUGGESTIONS = [
  'Should I migrate my local storage to SQLite or stay with file JSON?',
  'Can I realistically launch my v1 feature set by this weekend?',
  'Monolith vs micro-agents for background task automation',
  'Review my current workload and audit my burnout risk',
];

async function readCouncilData(response: Response, resource: string): Promise<unknown> {
  const payload = await response.json().catch(() => null) as {
    success?: unknown;
    data?: unknown;
    error?: { message?: unknown };
  } | null;
  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string'
      ? payload.error.message
      : `Failed to load ${resource} (HTTP ${response.status})`;
    throw new Error(message);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.success !== true) {
    const message = typeof payload?.error?.message === 'string' ? payload.error.message : null;
    if (message) throw new Error(message);
    throw new Error(`Council returned an invalid ${resource} response`);
  }
  return payload.data;
}

export default function CouncilView({
  currentUser,
  tasks = [],
  events = [],
  habits = [],
  onNavigate,
  onRefresh,
  onOpenSettings,
}: CouncilViewProps) {
  // Mode: 1-on-1 Chat vs Deliberation
  const [isDeliberation, setIsDeliberation] = useState(false);

  // Bots & Active Selection
  const [bots, setBots] = useState<BotItem[]>([]);
  const [activeBotId, setActiveBotId] = useState<string>('sofi');
  const [isBotDropdownOpen, setIsBotDropdownOpen] = useState(false);
  const botDropdownRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [deliberationProgress, setDeliberationProgress] = useState<string | null>(null);

  // Deliberation Mode Input State
  const [deliberationTopic, setDeliberationTopic] = useState('');
  const [deliberationMessages, setDeliberationMessages] = useState<Message[]>([]);

  // Health / Server Ping State
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [wakeSecondsElapsed, setWakeSecondsElapsed] = useState<number>(0);
  const [wakeError, setWakeError] = useState<string | null>(null);
  const [dismissStandbyBanner, setDismissStandbyBanner] = useState(false);

  // Sessions & Memory Drawers
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessionsDrawer, setShowSessionsDrawer] = useState(false);
  const [memoryProfile, setMemoryProfile] = useState<MemoryProfile | null>(null);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [newFact, setNewFact] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<UserFact['category']>('preference');
  const [isAddingFact, setIsAddingFact] = useState(false);

  // Error & Confirmation
  const [actionNotice, setActionNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close bot dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (botDropdownRef.current && !botDropdownRef.current.contains(event.target as Node)) {
        setIsBotDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Bots
  const fetchBots = async (): Promise<boolean> => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots`);
      const data = await readCouncilData(res, 'bots');
      if (Array.isArray(data)) {
        setBots(data);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Could not load bots from Council API, using fallback defaults:', err);
      return false;
    }
  };

  // Fetch Sessions
  const fetchSessions = async (): Promise<boolean> => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions`);
      const data = await readCouncilData(res, 'sessions');
      if (Array.isArray(data)) {
        setSessions(data);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Could not load sessions:', err);
      return false;
    }
  };

  // Fetch Memory
  const fetchMemory = async (): Promise<boolean> => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/memory`);
      const data = await readCouncilData(res, 'memory');
      if (data && typeof data === 'object') {
        setMemoryProfile(data as MemoryProfile);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Could not load memory profile:', err);
      return false;
    }
  };

  // Check Council Server Status / Ping
  const handleWakeOrPingCouncil = async (wake = false) => {
    setIsPinging(true);
    setWakeError(null);
    setWakeSecondsElapsed(0);

    let wakeTimer: NodeJS.Timeout | null = null;
    if (wake) {
      wakeTimer = setInterval(() => {
        setWakeSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/council/status${wake ? '?wake=true' : ''}`);
      const data = await res.json().catch(() => ({}));
      const payload = data.data || data;

      if (res.ok && payload.online) {
        setIsOnline(true);
        setPingLatency(payload.latencyMs || null);
        setActionNotice({
          type: 'success',
          message: wake
            ? `Council container ready! (${payload.latencyMs ? `${Math.round(payload.latencyMs / 1000)}s` : 'online'})`
            : `Council ping: ${payload.latencyMs || 0}ms`,
        });
        setIntegrationError(null);
      } else {
        setIsOnline(false);
        setPingLatency(null);
        if (wake) {
          setWakeError(payload.message || 'Container waking timed out.');
        }
      }
    } catch (err) {
      setIsOnline(false);
      setPingLatency(null);
      if (wake) {
        setWakeError(err instanceof Error ? err.message : 'Wake network error');
      }
    } finally {
      if (wakeTimer) clearInterval(wakeTimer);
      setIsPinging(false);
    }
  };

  // Initial Load
  useEffect(() => {
    handleWakeOrPingCouncil(false);
    Promise.all([fetchBots(), fetchSessions(), fetchMemory()]);
  }, []);

  // Real database bots
  const displayedBots: BotItem[] = bots;

  const activeBot = displayedBots.find(b => b.id === activeBotId || b.slug === activeBotId) || displayedBots[0] || null;

  // Initialize new session for a bot
  const createNewSession = (botId?: string, announceGreeting = true) => {
    const targetBot = displayedBots.find(b => b.id === botId || b.slug === botId) || displayedBots[0];
    if (!targetBot) {
      setMessages([]);
      return;
    }
    const newId = `session_${Date.now()}`;
    setSessionId(newId);
    setActiveBotId(targetBot.id);

    const greetingText = `Hello! I am ${targetBot.name}, your ${targetBot.role}. How can we make progress on your goals today?`;

    if (announceGreeting) {
      setMessages([
        {
          id: `greet_${Date.now()}`,
          sender: 'assistant',
          persona: targetBot.id,
          content: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setMessages([]);
    }
  };

  // Switch Active Bot
  const handleSelectBot = (botId: string) => {
    setActiveBotId(botId);
    setIsBotDropdownOpen(false);
    createNewSession(botId, true);
  };

  // Initial Session setup when bots load
  useEffect(() => {
    if (bots.length > 0 && !activeBotId) {
      setActiveBotId(bots[0].id);
      createNewSession(bots[0].id, true);
    }
  }, [bots]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, deliberationMessages, isThinking]);

  // Send 1-on-1 Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    if (!rawText.trim() || isThinking) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: rawText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsThinking(true);
    setActionNotice(null);

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activeBot.slug || activeBot.id,
          botId: activeBot.id,
          message: userMsg.content,
          sessionId: sessionId || undefined,
        }),
      });

      const data = (await readCouncilData(res, 'chat response')) as {
        sessionId?: string;
        reply?: string;
        executedActions?: ExecutedAction[];
      };

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      const botReply: Message = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        persona: activeBot.slug || activeBot.id,
        content: data.reply || 'Task processed.',
        executedActions: data.executedActions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botReply]);

      // If any actions modified workspace data, trigger dashboard refresh
      if (data.executedActions && data.executedActions.length > 0) {
        onRefresh?.();
      }

      // Re-fetch sessions & memory in background
      fetchSessions();
      fetchMemory();
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        persona: activeBot.slug || activeBot.id,
        content: `Error: ${err instanceof Error ? err.message : 'Could not reach Council assistant.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        failedPrompt: userMsg.content,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Run Multi-Bot Council Deliberation
  const handleRunDeliberation = async (topicToDebate?: string) => {
    const rawTopic = topicToDebate || deliberationTopic;
    if (!rawTopic.trim() || isThinking) return;

    const userDelibMsg: Message = {
      id: `delib_usr_${Date.now()}`,
      sender: 'user',
      content: rawTopic.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDeliberationMessages(prev => [...prev, userDelibMsg]);
    if (!topicToDebate) setDeliberationTopic('');
    setIsThinking(true);
    setDeliberationProgress('Convening Council (Sofi, Riven, Lucifer)...');

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/deliberate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: userDelibMsg.content,
          sessionId: `delib_${Date.now()}`,
        }),
      });

      const data = (await readCouncilData(res, 'deliberation')) as {
        deliberation?: DeliberationItem[];
        synthesis?: string;
      };

      const deliberationReply: Message = {
        id: `delib_res_${Date.now()}`,
        sender: 'assistant',
        content: data.synthesis || 'Council deliberation concluded.',
        deliberation: data.deliberation || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setDeliberationMessages(prev => [...prev, deliberationReply]);
    } catch (err) {
      console.error('Deliberation error:', err);
      const errorMsg: Message = {
        id: `delib_err_${Date.now()}`,
        sender: 'assistant',
        content: `Council Deliberation Error: ${err instanceof Error ? err.message : 'Could not conclude deliberation.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setDeliberationMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      setDeliberationProgress(null);
    }
  };

  // Load an existing session
  const handleLoadSession = async (sessId: string) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions/${sessId}`);
      const data = (await readCouncilData(res, 'session history')) as {
        personaId?: string;
        messages?: Array<{
          id: string;
          sender: 'user' | 'assistant';
          content: string;
          createdAt?: string;
        }>;
      };

      if (data && Array.isArray(data.messages)) {
        setSessionId(sessId);
        if (data.personaId) setActiveBotId(data.personaId);
        setMessages(
          data.messages.map(m => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          }))
        );
        setShowSessionsDrawer(false);
        setActionNotice({ type: 'success', message: 'Chat session restored.' });
      }
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not load session.',
      });
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessId: string) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/sessions/${sessId}`, {
        method: 'DELETE',
      });
      await readCouncilData(res, 'session deletion');
      await fetchSessions();
      if (sessionId === sessId) {
        createNewSession(activeBotId, true);
      }
      setActionNotice({ type: 'success', message: 'Session deleted.' });
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not delete session.',
      });
    }
  };

  // Add Memory Fact
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
        }),
      });
      await readCouncilData(res, 'memory fact addition');
      setNewFact('');
      await fetchMemory();
      setActionNotice({ type: 'success', message: 'Fact stored in long-term memory vault.' });
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not add fact to memory.',
      });
    } finally {
      setIsAddingFact(false);
    }
  };

  // Delete Memory Fact
  const handleDeleteFact = async (factId: string) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/memory/${factId}`, {
        method: 'DELETE',
      });
      await readCouncilData(res, 'memory fact deletion');
      await fetchMemory();
      setActionNotice({ type: 'success', message: 'Fact removed from memory.' });
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not delete fact.',
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[580px] relative transition-colors">
      
      {/* ── TOP MINIMAL COMMAND BAR ── */}
      <header className="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20">
        
        {/* Left: Active Bot Avatar & Selector Dropdown */}
        <div className="flex items-center space-x-3 min-w-0">
          {activeBot ? (
            <>
              {/* Compact 40px Avatar */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-indigo-500/20 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs flex items-center justify-center text-xl shrink-0 overflow-hidden">
                <BotAvatarDisplay avatar={activeBot.avatar} name={activeBot.name} className="w-full h-full text-xl" />
              </div>

              {/* Bot Selector Dropdown */}
              <div className="relative" ref={botDropdownRef}>
                <button
                  onClick={() => setIsBotDropdownOpen(!isBotDropdownOpen)}
                  className="flex items-center space-x-1.5 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 px-2.5 py-1 rounded-xl transition cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {activeBot.name}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 shrink-0 ${isBotDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[160px] sm:max-w-xs">
                      {activeBot.role}
                    </p>
                  </div>
                </button>

                {/* Dropdown Popover Menu */}
                {isBotDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Select Active Bot
                    </div>

                    <div className="max-h-64 overflow-y-auto px-1 space-y-1">
                      {displayedBots.map((b) => {
                        const isSelected = b.id === activeBot.id;
                        return (
                          <button
                            key={b.id}
                            onClick={() => handleSelectBot(b.id)}
                            className={`w-full flex items-center space-x-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                              <BotAvatarDisplay avatar={b.avatar} name={b.name} className="w-full h-full text-lg" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight truncate">{b.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{b.role}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Settings Redirect Footer in Dropdown */}
                    <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-2">
                      <button
                        onClick={() => {
                          setIsBotDropdownOpen(false);
                          onOpenSettings?.('council');
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage Bots & Models in Settings</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">No Bots Configured</h3>
                <button
                  onClick={() => onOpenSettings?.('council')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  + Create your first bot in Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Unified Segmented Mode & Clean Utility Group */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Segmented Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setIsDeliberation(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                !isDeliberation
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1-on-1 Chat</span>
            </button>
            <button
              onClick={() => setIsDeliberation(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                isDeliberation
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deliberation</span>
            </button>
          </div>

          {/* Grouped Secondary Utilities */}
          <div className="flex items-center space-x-1 border-l border-slate-200/80 dark:border-slate-800 pl-1.5">
            {/* Memory Vault Button */}
            <button
              onClick={() => setShowMemoryDrawer(true)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
              title="Open Long-Term Memory Vault"
            >
              <Brain className="w-4 h-4" />
              {memoryProfile?.facts && memoryProfile.facts.length > 0 ? (
                <span className="absolute top-1 right-1 px-1 min-w-[14px] h-3.5 rounded-full bg-indigo-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                  {memoryProfile.facts.length}
                </span>
              ) : null}
            </button>

            {/* Sessions Drawer Button */}
            <button
              onClick={() => setShowSessionsDrawer(true)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
              title="Chat Sessions History"
            >
              <MessageSquare className="w-4 h-4" />
              {sessions.length > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[14px] h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[9px] font-bold flex items-center justify-center">
                  {sessions.length}
                </span>
              )}
            </button>

            {/* Council Server Ping Pill */}
            <button
              onClick={() => handleWakeOrPingCouncil(!isOnline)}
              disabled={isPinging}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition cursor-pointer ${
                isPinging
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-wait'
                  : isOnline
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
              }`}
              title={
                isPinging
                  ? `Waking Council container... (${wakeSecondsElapsed}s)`
                  : isOnline
                  ? `Council is live (${pingLatency ? `${pingLatency}ms` : 'active'}). Click to re-ping.`
                  : 'Council is on Standby. Click to wake.'
              }
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="hidden md:inline">{isOnline ? `Online${pingLatency ? ` (${pingLatency}ms)` : ''}` : 'Standby'}</span>
            </button>

            {/* Dedicated Settings Button */}
            <button
              onClick={() => onOpenSettings?.('council')}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
              title="Configure Bots, Model Pipelines & BYOK in Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Standby Wake Alert Banner if sleeping */}
      {isOnline === false && !dismissStandbyBanner && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Council Standby:</strong> The AI Council service is idling on Render free-tier.
              {wakeError && !isPinging && <span className="ml-1 text-rose-500 font-mono">({wakeError})</span>}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleWakeOrPingCouncil(true)}
              disabled={isPinging}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? `Waking... (${wakeSecondsElapsed}s)` : 'Wake Council Now'}</span>
            </button>
            <button onClick={() => setDismissStandbyBanner(true)} className="p-1 text-amber-700 dark:text-amber-300 rounded cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`flex items-center justify-between px-4 py-2 text-xs border-b ${
            actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionNotice.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE CANVAS ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Empty State when no bots exist */}
        {!activeBot ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Bot className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">No Council Bots Configured</h3>
              <p className="text-xs text-slate-500">Create your custom AI persona in settings to start conversing and delegating tasks.</p>
            </div>
            <button
              onClick={() => onOpenSettings?.('council')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Bot in Settings</span>
            </button>
          </div>
        ) : (
          <>
            {/* ── MODE A: 1-ON-1 BOT CHAT ── */}
            {!isDeliberation && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages Scroll Area - Centered Ergonomic Column */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                        >
                          {!isUser && (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-sm shrink-0 overflow-hidden mt-0.5 shadow-xs">
                              <BotAvatarDisplay avatar={activeBot.avatar} name={activeBot.name} className="w-full h-full text-sm" />
                            </div>
                          )}

                          <div
                            className={`max-w-xl sm:max-w-2xl rounded-2xl p-4 sm:p-4.5 shadow-xs transition-all ${
                              isUser
                                ? 'bg-indigo-600 text-white rounded-tr-xs'
                                : msg.isError
                                ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100 rounded-tl-xs'
                                : 'bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                            }`}
                          >
                            {/* Executed Tools / Actions */}
                            {msg.executedActions && msg.executedActions.length > 0 && (
                              <div className="mb-3 space-y-1.5 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                                {msg.executedActions.map((act, i) => (
                                  <div key={i} className="flex items-center space-x-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Executed: {act.toolName}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                              <MarkdownRenderer content={msg.content} />
                            </div>

                            <div className={`mt-2.5 flex items-center justify-between text-[10px] ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                              <span>{msg.timestamp}</span>
                              {!isUser && !msg.isError && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content);
                                    setActionNotice({ type: 'success', message: 'Copied to clipboard.' });
                                  }}
                                  className="hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                                  title="Copy reply"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {msg.isError && msg.failedPrompt && (
                                <button
                                  onClick={() => handleSendMessage(msg.failedPrompt)}
                                  className="text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {isThinking && (
                      <div className="flex items-center space-x-2.5 animate-pulse">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm">
                          <BotAvatarDisplay avatar={activeBot.avatar} name={activeBot.name} className="w-full h-full text-sm" />
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-mono flex items-center space-x-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          <span>{activeBot.name} is reasoning & drafting plan...</span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Bottom Chat Composer Bar */}
                <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800">
                  <div className="max-w-3xl mx-auto flex items-end space-x-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition shadow-xs">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Message ${activeBot.name}... (Enter to send, Shift+Enter for newline)`}
                      className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none px-2 py-1 max-h-32 leading-relaxed"
                    />

                    <div className="flex items-center space-x-1 shrink-0 pb-0.5">
                      <button
                        onClick={() => createNewSession(activeBot.id, true)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="Clear chat and start fresh session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputMessage.trim() || isThinking}
                        className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* ── MODE B: MULTI-BOT COUNCIL DELIBERATION ── */}
        {isDeliberation && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Deliberation Header Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-indigo-200/50 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Multi-Agent Deliberation Chamber</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Pose strategic dilemmas, technical architecture decisions, or workload prioritization problems. All configured Council bots will debate perspectives and construct a synthesized, actionable consensus.
                  </p>

                  {/* Debate suggestions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DEBATE_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => handleRunDeliberation(sug)}
                        className="text-[11px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer shadow-xs"
                      >
                        💡 {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deliberation Stream */}
                {deliberationMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={msg.id} className="space-y-4">
                      {isUser ? (
                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
                          <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">Deliberation Topic</span>
                          <p className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">{msg.content}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Round table opinions */}
                          {msg.deliberation && msg.deliberation.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {msg.deliberation.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xl">
                                      {item.persona === 'sofi' ? '💖' : item.persona === 'riven' ? '🧭' : '🔥'}
                                    </span>
                                    <div>
                                      <h4 className="font-display font-bold text-xs text-slate-900 dark:text-slate-100">{item.name}</h4>
                                      <p className="text-[10px] text-slate-500">{item.role}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                    "{item.opinion}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Synthesized Consensus */}
                          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-md space-y-3">
                            <div className="flex items-center space-x-2">
                              <Zap className="w-5 h-5 text-amber-500" />
                              <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">Synthesized Council Consensus</h4>
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isThinking && deliberationProgress && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center space-x-3 text-xs font-mono text-amber-800 dark:text-amber-200">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                    <span>{deliberationProgress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deliberation Composer Bar */}
            <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800">
              <div className="max-w-3xl mx-auto flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/20 transition shadow-xs">
                <input
                  type="text"
                  value={deliberationTopic}
                  onChange={(e) => setDeliberationTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunDeliberation();
                  }}
                  placeholder="Ask the Council to deliberate on any strategic choice or roadmap doubt..."
                  className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none px-2"
                />
                <button
                  onClick={() => handleRunDeliberation()}
                  disabled={!deliberationTopic.trim() || isThinking}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600 text-white font-bold text-xs disabled:opacity-40 transition cursor-pointer flex items-center space-x-1.5 shadow-xs active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Deliberate</span>
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* ── MEMORY VAULT SLIDE-OVER DRAWER ── */}
      {showMemoryDrawer && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 space-y-6 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Long-Term Memory Vault</h3>
                    <p className="text-[11px] text-slate-500">{memoryProfile?.facts?.length || 0} Learned facts</p>
                  </div>
                </div>
                <button onClick={() => setShowMemoryDrawer(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add Fact Form */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Store Direct Memory</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g. Preparing for Snowflake architect interview"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <div className="flex items-center space-x-2">
                    <select
                      value={newFactCategory}
                      onChange={(e) => setNewFactCategory(e.target.value as UserFact['category'])}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium"
                    >
                      <option value="preference">Preference</option>
                      <option value="goal">Goal</option>
                      <option value="habit">Habit</option>
                      <option value="tech_stack">Tech Stack</option>
                      <option value="relationship">Relationship</option>
                      <option value="general">General</option>
                    </select>

                    <button
                      onClick={handleAddFact}
                      disabled={isAddingFact || !newFact.trim()}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      {isAddingFact ? 'Storing...' : '+ Add Fact'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Facts List */}
              <div className="space-y-2.5">
                {memoryProfile?.facts && memoryProfile.facts.length > 0 ? (
                  memoryProfile.facts.map((fact) => (
                    <div
                      key={fact.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {fact.category}
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{fact.fact}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteFact(fact.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">Memory vault is empty.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowMemoryDrawer(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Close Memory Vault
            </button>
          </div>
        </div>
      )}

      {/* ── SESSIONS HISTORY SLIDE-OVER DRAWER ── */}
      {showSessionsDrawer && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 space-y-6 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <MessageSquare className="w-5 h-5 text-sky-500" />
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Chat History</h3>
                    <p className="text-[11px] text-slate-500">{sessions.length} Saved sessions</p>
                  </div>
                </div>
                <button onClick={() => setShowSessionsDrawer(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  createNewSession(activeBotId, true);
                  setShowSessionsDrawer(false);
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Conversation</span>
              </button>

              <div className="space-y-2">
                {sessions.map((sess) => {
                  const isCur = sess.sessionId === sessionId;
                  return (
                    <div
                      key={sess.sessionId}
                      onClick={() => handleLoadSession(sess.sessionId)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                        isCur
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {sess.personaId || 'sofi'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sess.updatedAt ? new Date(sess.updatedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium truncate">
                          {sess.lastMessagePreview || 'Conversation'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(sess.sessionId);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowSessionsDrawer(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Shell */}
      {pendingConfirmation && (
        <DialogShell
          isOpen={true}
          label={pendingConfirmation.title}
          onClose={() => setPendingConfirmation(null)}
        >
          <div className="space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">{pendingConfirmation.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">{pendingConfirmation.message}</p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  pendingConfirmation.onConfirm();
                  setPendingConfirmation(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {pendingConfirmation.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </DialogShell>
      )}

    </div>
  );
}
