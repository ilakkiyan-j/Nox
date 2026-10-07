'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Share2,
  Plus,
  Search,
  Star,
  Archive,
  Trash2,
  CheckSquare,
  StickyNote,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  Globe,
  Filter,
  ArrowRight,
  Sparkles,
  X,
  Send,
  Zap,
  Link2,
  Bot,
  Settings,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { TelegramIcon, WhatsAppIcon, ShortcutsIcon, WebhookIcon } from './ui/BrandIcons';
import ConfirmModal from './ConfirmModal';
import ApiErrorNotice from './ui/ApiErrorNotice';
import { API_BASE_URL, assertApiSuccess, fetchWithUser } from '../lib/api';

interface MessageItem {
  id: string;
  userId: string;
  source: string;
  sender?: string | null;
  content: string;
  url?: string | null;
  metadata: string;
  isArchived: boolean;
  isStarred: boolean;
  convertedType?: string | null;
  convertedId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessagesViewProps {
  onNavigate?: (tab: any) => void;
  currentUser?: any;
}

interface ForwarderBotStatus {
  isConfigured: boolean;
  botUsername: string | null;
  telegramBotTokenMasked: string | null;
  webhookUrl: string | null;
  telegramUrl: string | null;
}

// Utility: Safely decode URL-encoded strings (e.g. https%3A%2F%2F... -> https://...)
function safeDecodeUri(text: string): string {
  if (!text) return '';
  try {
    if (/%[0-9A-Fa-f]{2}/.test(text)) {
      return decodeURIComponent(text);
    }
    return text;
  } catch {
    return text;
  }
}

// Utility: Extract domain from URL
function extractDomain(url: string): string {
  try {
    const raw = safeDecodeUri(url);
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}

// Utility: Extract all URLs from text
function extractUrls(text: string): string[] {
  const decoded = safeDecodeUri(text);
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = decoded.match(regex);
  return matches ? Array.from(new Set(matches)) : [];
}

export default function MessagesView({ onNavigate, currentUser }: MessagesViewProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [allMessagesRaw, setAllMessagesRaw] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    message: string;
    navigateTo?: string;
    actionLabel?: string;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WHATSAPP' | 'TELEGRAM' | 'STARRED' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showForwarderModal, setShowForwarderModal] = useState(false);
  const [showDirectSend, setShowDirectSend] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Forwarder Bot State
  const [forwarderStatus, setForwarderStatus] = useState<ForwarderBotStatus>({
    isConfigured: false,
    botUsername: null,
    telegramBotTokenMasked: null,
    webhookUrl: null,
    telegramUrl: null,
  });
  const [forwarderToken, setForwarderToken] = useState('');
  const [showTokenSecret, setShowTokenSecret] = useState(false);
  const [isConnectingForwarder, setIsConnectingForwarder] = useState(false);
  const [forwarderSuccessMsg, setForwarderSuccessMsg] = useState<string | null>(null);
  const [forwarderErrorMsg, setForwarderErrorMsg] = useState<string | null>(null);

  // New Direct Message State
  const [manualText, setManualText] = useState('');
  const [manualSource, setManualSource] = useState('WHATSAPP');
  const [manualSender, setManualSender] = useState('WhatsApp Direct');
  const [sending, setSending] = useState(false);

  // Confirm delete modal
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const loadMessages = async () => {
    try {
      setLoading(true);
      const isArchivedParam = activeFilter === 'ARCHIVED' ? 'true' : 'false';
      let url = `${API_BASE_URL}/api/v1/messages?isArchived=${isArchivedParam}`;

      if (activeFilter === 'WHATSAPP' || activeFilter === 'TELEGRAM') {
        url += `&source=${activeFilter}`;
      } else if (activeFilter === 'STARRED') {
        url += `&isStarred=true`;
      }

      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetchWithUser(url);
      await assertApiSuccess(res, 'Could not load messages');
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.data || []);
      }

      // Fetch all for tab counts
      const countRes = await fetchWithUser(`${API_BASE_URL}/api/v1/messages?isArchived=false`);
      await assertApiSuccess(countRes, 'Could not load message counts');
      const countData = await countRes.json();
      if (countRes.ok && countData.success) {
        setAllMessagesRaw(countData.data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setActionError(err instanceof Error ? err.message : 'Could not load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadForwarderStatus = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/telegram/forwarder/status`);
      await assertApiSuccess(res, 'Could not load Telegram Forwarder status');
      const data = await res.json();
      if (data.data && typeof data.data === 'object') {
        setForwarderStatus(data.data);
      } else {
        throw new Error('Telegram Forwarder returned an invalid status');
      }
    } catch (err) {
      console.warn('Could not load forwarder status:', err);
      setActionError(err instanceof Error ? err.message : 'Could not load Telegram Forwarder status');
    }
  };

  useEffect(() => {
    loadMessages();
    loadForwarderStatus();
  }, [activeFilter, searchQuery]);

  const handleConnectForwarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwarderToken.trim()) return;

    try {
      setIsConnectingForwarder(true);
      setForwarderSuccessMsg(null);
      setForwarderErrorMsg(null);

      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/telegram/forwarder/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: forwarderToken.trim() }),
      });

      await assertApiSuccess(res, 'Failed to connect Telegram Forwarder Bot');
      const data = await res.json();
      if (res.ok && data.success) {
        setForwarderSuccessMsg(`Connected successfully to @${data.data.botUsername}! Webhook is active.`);
        setForwarderToken('');
        loadForwarderStatus();
      } else {
        setForwarderErrorMsg(data.error?.message || 'Failed to connect Telegram Forwarder Bot.');
      }
    } catch (err: any) {
      setForwarderErrorMsg(err?.message || 'Network error while connecting bot.');
    } finally {
      setIsConnectingForwarder(false);
    }
  };

  const handleDisconnectForwarder = async () => {
    setForwarderErrorMsg(null);
    setForwarderSuccessMsg(null);
    try {
      setIsConnectingForwarder(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/telegram/forwarder/disconnect`, {
        method: 'POST',
      });
      await assertApiSuccess(res, 'Failed to disconnect Telegram Forwarder Bot');
      await res.json();
      setForwarderSuccessMsg('Forwarder Bot disconnected.');
      setForwarderErrorMsg(null);
      await loadForwarderStatus();
    } catch (err) {
      setForwarderErrorMsg(err instanceof Error ? err.message : 'Failed to disconnect bot');
    } finally {
      setIsConnectingForwarder(false);
    }
  };

  const requestDisconnectForwarder = () => {
    setConfirmState({
      isOpen: true,
      title: 'Disconnect Telegram Forwarder',
      message: 'The connected Telegram bot will stop forwarding new messages into Nox.',
      confirmText: 'Disconnect bot',
      onConfirm: handleDisconnectForwarder,
    });
  };

  const counts = useMemo(() => {
    const raw = allMessagesRaw || [];
    return {
      ALL: raw.length,
      WHATSAPP: raw.filter((m) => m.source.toUpperCase() === 'WHATSAPP').length,
      TELEGRAM: raw.filter((m) => m.source.toUpperCase() === 'TELEGRAM').length,
      STARRED: raw.filter((m) => m.isStarred).length,
    };
  }, [allMessagesRaw]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    try {
      setSending(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: manualText.trim(),
          source: manualSource,
          sender: manualSender,
        }),
      });

      await assertApiSuccess(res, 'Failed to send message');
      const data = await res.json();
      if (res.ok && data.success) {
        setManualText('');
        setShowDirectSend(false);
        loadMessages();
      } else {
        setActionError(data.error?.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleToggleStar = async (id: string, current: boolean) => {
    try {
      const response = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !current }),
      });
      await assertApiSuccess(response, 'Could not update message star');
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isStarred: !current } : m)));
    } catch (err) {
      console.error('Failed to update message star:', err);
      setActionError(err instanceof Error ? err.message : 'Could not update message star');
    }
  };

  const handleToggleArchive = async (id: string, current: boolean) => {
    try {
      const response = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !current }),
      });
      await assertApiSuccess(response, 'Could not update message archive');
      loadMessages();
    } catch (err) {
      console.error('Failed to update message archive:', err);
      setActionError(err instanceof Error ? err.message : 'Could not update message archive');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Shared Message',
      message: 'Are you sure you want to permanently delete this message?',
      confirmText: 'Delete message',
      onConfirm: async () => {
        try {
          const response = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${id}`, { method: 'DELETE' });
          await assertApiSuccess(response, 'Could not delete message');
          setMessages((prev) => prev.filter((m) => m.id !== id));
        } catch (err) {
          console.error('Failed to delete message:', err);
          setActionError(err instanceof Error ? err.message : 'Could not delete message');
        }
      },
    });
  };

  const handleConvertToTask = async (msg: MessageItem) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${msg.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'TASK' }),
      });
      await assertApiSuccess(res, 'Could not convert message to task');
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, convertedType: 'TASK', convertedId: data.data.createdEntity.id } : m))
        );
        setActionNotice({
          message: 'Message converted to a task.',
          navigateTo: onNavigate ? 'tasks' : undefined,
          actionLabel: 'View tasks',
        });
      }
    } catch (err) {
      console.error('Failed to convert message to task:', err);
      setActionError(err instanceof Error ? err.message : 'Could not convert message to task');
    }
  };

  const handleConvertToNote = async (msg: MessageItem) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${msg.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'NOTE' }),
      });
      await assertApiSuccess(res, 'Could not convert message to note');
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, convertedType: 'NOTE', convertedId: data.data.createdEntity.id } : m))
        );
        setActionNotice({
          message: 'Message converted to a note.',
          navigateTo: onNavigate ? 'notes' : undefined,
          actionLabel: 'View notes',
        });
      }
    } catch (err) {
      console.error('Failed to convert message to note:', err);
      setActionError(err instanceof Error ? err.message : 'Could not convert message to note');
    }
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('nox_token') || 'YOUR_NOX_TOKEN' : 'YOUR_NOX_TOKEN';
  const apiEndpointUrl = `${API_BASE_URL || 'http://localhost:4000'}/api/v1/messages`;
  const forwarderWebhookUrl = `${API_BASE_URL || 'https://nox-a1nr.onrender.com'}/api/v1/messages/telegram?mode=forwarder`;

  const getSourceBadge = (source: string) => {
    switch (source.toUpperCase()) {
      case 'WHATSAPP':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 flex items-center space-x-1.5 shadow-2xs">
            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>WhatsApp</span>
          </span>
        );
      case 'TELEGRAM':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 flex items-center space-x-1.5 shadow-2xs">
            <TelegramIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>Telegram</span>
          </span>
        );
      case 'SHORTCUT':
      case 'IOS_SHORTCUT':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 flex items-center space-x-1.5 shadow-2xs">
            <ShortcutsIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Phone Shortcut</span>
          </span>
        );
      case 'WEBHOOK':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 flex items-center space-x-1.5 shadow-2xs">
            <WebhookIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Webhook Ingest</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
            <Share2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{source}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <ApiErrorNotice message={actionError} onDismiss={() => setActionError(null)} />
      {actionNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <span>{actionNotice.message}</span>
          <div className="flex items-center gap-2">
            {actionNotice.navigateTo && onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onNavigate(actionNotice.navigateTo);
                  setActionNotice(null);
                }}
                className="rounded-lg px-2.5 py-1.5 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900"
              >
                {actionNotice.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Messages & Share Ingest</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Forward messages, links, and job postings from Telegram or WhatsApp directly into your NOX workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dedicated Telegram Forwarder Bot Settings Button */}
          <button
            onClick={() => {
              setShowForwarderModal(true);
              loadForwarderStatus();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all cursor-pointer shadow-2xs ${
              forwarderStatus.isConfigured
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <TelegramIcon className="w-4 h-4 text-sky-500" />
            <span>Forwarder Bot</span>
            {forwarderStatus.isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                Setup
              </span>
            )}
          </button>

          <button
            onClick={() => setShowDirectSend(!showDirectSend)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Quick Ingest</span>
          </button>

          <button
            onClick={() => setShowSetupModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Phone Shortcuts</span>
          </button>
        </div>
      </div>

      {/* Manual Quick Ingest Simulation Box */}
      {showDirectSend && (
        <form
          onSubmit={handleSendMessage}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 shadow-md space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Simulate / Send Direct Message to NOX</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowDirectSend(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Paste forwarded WhatsApp chat snippet, article link, or job posting..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            required
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <select
                value={manualSource}
                onChange={(e) => setManualSource(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="WHATSAPP">Source: WhatsApp</option>
                <option value="TELEGRAM">Source: Telegram</option>
                <option value="SHORTCUT">Source: Shortcut</option>
                <option value="DIRECT">Source: Direct Note</option>
              </select>

              <input
                type="text"
                placeholder="Sender name (e.g. Alex)"
                value={manualSender}
                onChange={(e) => setManualSender(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 w-36"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowDirectSend(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Sending...' : 'Save to Messages'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>All Stream</span>
            {counts.ALL > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 font-mono">
                {counts.ALL}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('WHATSAPP')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFilter === 'WHATSAPP'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>WhatsApp</span>
            {counts.WHATSAPP > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                {counts.WHATSAPP}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('TELEGRAM')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFilter === 'TELEGRAM'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TelegramIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>Telegram</span>
            {counts.TELEGRAM > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                {counts.TELEGRAM}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('STARRED')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeFilter === 'STARRED'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>Starred</span>
            {counts.STARRED > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                {counts.STARRED}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('ARCHIVED')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'ARCHIVED'
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Archived
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search messages, links, or senders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Messages Stream Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Assembling message stream...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
              No Messages Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {activeFilter === 'ARCHIVED'
                ? 'You do not have any archived messages.'
                : 'Forward messages, job links, or notes directly to your Telegram forwarder bot or WhatsApp share shortcut.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setShowForwarderModal(true);
                loadForwarderStatus();
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <TelegramIcon className="w-4 h-4 text-white" />
              <span>Configure Telegram Forwarder Bot</span>
            </button>
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>View Shortcuts Setup</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messages.map((msg) => {
            const decodedContent = safeDecodeUri(msg.content);
            const urls = extractUrls(msg.content);
            const isPureUrl = urls.length === 1 && decodedContent.trim() === urls[0];

            return (
              <div
                key={msg.id}
                className={`p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border shadow-xs space-y-4 relative transition-all flex flex-col justify-between ${
                  msg.isStarred
                    ? 'border-amber-300 dark:border-amber-600/80 ring-2 ring-amber-400/20'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header: Source, Sender, Timestamp, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      {getSourceBadge(msg.source)}
                      {msg.sender && (
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {msg.sender}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleToggleStar(msg.id, msg.isStarred)}
                        className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          msg.isStarred
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-500'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
                        }`}
                        title={msg.isStarred ? 'Starred' : 'Star message'}
                      >
                        <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleToggleArchive(msg.id, msg.isArchived)}
                        className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs cursor-pointer"
                        title={msg.isArchived ? 'Unarchive' : 'Archive'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Message Content Body */}
                  {!isPureUrl && (
                    <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed space-y-1 font-normal select-text">
                      {decodedContent}
                    </div>
                  )}

                  {/* Interactive Smart Link Cards if URLs are detected */}
                  {urls.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-3 group transition-colors hover:border-indigo-400 dark:hover:border-indigo-600"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                            {extractDomain(link)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {link}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(link, `link-${msg.id}-${idx}`)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedKey === `link-${msg.id}-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs flex items-center justify-center"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer: Timestamp & 1-Click Action Conversions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(msg.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <div className="flex items-center space-x-2">
                    {msg.convertedType ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1.5">
                        <Check className="w-3 h-3" />
                        <span>Converted to {msg.convertedType}</span>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleConvertToTask(msg)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer transition-all shadow-2xs"
                          title="Create an actionable task from this message"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>+ Task</span>
                        </button>

                        <button
                          onClick={() => handleConvertToNote(msg)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center space-x-1.5 cursor-pointer transition-all shadow-2xs"
                          title="Save as permanent note"
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                          <span>+ Note</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DEDICATED TELEGRAM FORWARDER BOT SETTINGS MODAL */}
      {showForwarderModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800/80">
                  <TelegramIcon className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Telegram Message Forwarder Bot
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connect a dedicated Telegram bot to ingest forwarded chats, links, and job postings into NOX.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForwarderModal(false);
                  setForwarderSuccessMsg(null);
                  setForwarderErrorMsg(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                forwarderStatus.isConfigured
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <div className="flex items-start space-x-3">
                {forwarderStatus.isConfigured ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {forwarderStatus.isConfigured
                      ? `Active & Connected as @${forwarderStatus.botUsername}`
                      : 'No Telegram Forwarder Bot Configured'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {forwarderStatus.isConfigured
                      ? 'Forwarded messages and links sent to this bot will save directly to your NOX inbox without Sofi interruption.'
                      : 'Create a free bot with @BotFather on Telegram and paste the token below.'}
                  </div>
                  {forwarderStatus.telegramUrl && (
                    <a
                      href={forwarderStatus.telegramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline mt-2"
                    >
                      <span>Open @{forwarderStatus.botUsername} in Telegram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {forwarderStatus.isConfigured && (
                <button
                  type="button"
                  onClick={requestDisconnectForwarder}
                  disabled={isConnectingForwarder}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer shrink-0"
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* Success & Error Feedbacks */}
            {forwarderSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{forwarderSuccessMsg}</span>
              </div>
            )}
            {forwarderErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{forwarderErrorMsg}</span>
              </div>
            )}

            {/* Token Connection Form */}
            <form onSubmit={handleConnectForwarder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Telegram Bot Token (from @BotFather)
                </label>
                <div className="relative">
                  <input
                    type={showTokenSecret ? 'text' : 'password'}
                    value={forwarderToken}
                    onChange={(e) => setForwarderToken(e.target.value)}
                    placeholder={
                      forwarderStatus.telegramBotTokenMasked
                        ? `Configured (${forwarderStatus.telegramBotTokenMasked}) — Paste new token to update`
                        : 'e.g. 8921805890:AAGX-kfGVB-_...'
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenSecret(!showTokenSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showTokenSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook Endpoint Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                    Forwarder Webhook URL (Auto-Registered):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(forwarderWebhookUrl, 'fwd-url')}
                    className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === 'fwd-url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'fwd-url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-800 dark:text-slate-300 truncate">
                  {forwarderWebhookUrl}
                </code>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-2 text-xs">
                <div className="font-bold text-sky-900 dark:text-sky-200">How to Setup in 1 Minute:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  <li>Open Telegram and search for <b>@BotFather</b>.</li>
                  <li>Send <code>/newbot</code> and follow the prompts to name your Forwarder bot.</li>
                  <li>Copy the HTTP API Token provided by BotFather.</li>
                  <li>Paste the token above and click <b>Connect & Register Webhook</b>.</li>
                  <li>Forward any text, link, or media to your bot — it will instantly save to NOX!</li>
                </ol>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForwarderModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingForwarder}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnectingForwarder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying & Connecting...</span>
                    </>
                  ) : (
                    <>
                      <TelegramIcon className="w-4 h-4 text-white" />
                      <span>Save & Connect Webhook</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE SETUP MODAL HELPER */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Phone & Telegram Direct Ingest Setup
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Share text, links, job postings, or notes directly to NOX with 1 tap.
                </p>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Credentials Info Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Your NOX Ingest API URL:</span>
                  <button
                    onClick={() => handleCopy(apiEndpointUrl, 'url')}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'url' ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
                <code className="block p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                  {apiEndpointUrl}
                </code>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Your Authorization Header:</span>
                  <button
                    onClick={() => handleCopy(`Bearer ${token}`, 'auth')}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedKey === 'auth' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'auth' ? 'Copied!' : 'Copy Header'}</span>
                  </button>
                </div>
                <code className="block p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
                  Bearer {token.slice(0, 25)}...
                </code>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 space-y-2">
                <h4 className="font-bold text-sm text-sky-900 dark:text-sky-200 flex items-center space-x-2">
                  <span>✈️ Telegram Forwarder Bot (Automatic & Realtime)</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your Telegram Bot is active! Forward any job posting, link, or message in Telegram to your bot. It will be instantly ingested into NOX and reply with a confirmation.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <span>🤖 Android (HTTP Shortcuts App)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>In HTTP Shortcuts, set Method to <code>POST</code> and URL to <code>{apiEndpointUrl}</code>.</li>
                  <li>In Request Headers, add <code>Authorization: Bearer &lt;token&gt;</code> and <code>Content-Type: application/json</code>.</li>
                  <li>In Request Body, select <strong>Custom Text</strong>, content-type <code>application/json</code>, body <code>&#123;"content": "&#123;text&#125;", "source": "WHATSAPP"&#125;</code>.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}
