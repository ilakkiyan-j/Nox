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
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

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

export default function MessagesView({ onNavigate, currentUser }: MessagesViewProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WHATSAPP' | 'TELEGRAM' | 'STARRED' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDirectSend, setShowDirectSend] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [activeFilter, searchQuery]);

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

      const data = await res.json();
      if (res.ok && data.success) {
        setManualText('');
        setShowDirectSend(false);
        loadMessages();
      } else {
        alert(data.error?.message || 'Failed to send message');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleStar = async (id: string, current: boolean) => {
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !current }),
      });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isStarred: !current } : m)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchive = async (id: string, current: boolean) => {
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !current }),
      });
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Shared Message',
      message: 'Are you sure you want to permanently delete this message?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${id}`, { method: 'DELETE' });
          setMessages((prev) => prev.filter((m) => m.id !== id));
        } catch (err) {
          console.error(err);
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
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, convertedType: 'TASK', convertedId: data.data.createdEntity.id } : m))
        );
        if (onNavigate) {
          if (confirm('Created action Task successfully! Would you like to view Tasks now?')) {
            onNavigate('tasks');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToNote = async (msg: MessageItem) => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/messages/${msg.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'NOTE' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, convertedType: 'NOTE', convertedId: data.data.createdEntity.id } : m))
        );
        if (onNavigate) {
          if (confirm('Created Note successfully! Would you like to view Notes now?')) {
            onNavigate('notes');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('nox_token') || 'YOUR_NOX_TOKEN' : 'YOUR_NOX_TOKEN';
  const apiEndpointUrl = `${API_BASE_URL || 'http://localhost:4000'}/api/v1/messages`;

  const getSourceBadge = (source: string) => {
    switch (source.toUpperCase()) {
      case 'WHATSAPP':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
            <span>💬</span>
            <span>WhatsApp</span>
          </span>
        );
      case 'TELEGRAM':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center space-x-1">
            <span>✈️</span>
            <span>Telegram</span>
          </span>
        );
      case 'SHORTCUT':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center space-x-1">
            <span>⚡</span>
            <span>iOS Shortcut</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-1">
            <span>📥</span>
            <span>{source}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Messages & Share Ingest</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Directly receive and organize forwarded messages, links, and text from WhatsApp, Telegram, or phone share shortcuts.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowSetupModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>📱 Mobile Share Setup</span>
          </button>

          <button
            onClick={() => setShowDirectSend(!showDirectSend)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
          >
            {showDirectSend ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showDirectSend ? 'Close' : 'Quick Message'}</span>
          </button>
        </div>
      </div>

      {/* Manual Message Input Drawer */}
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
            placeholder="Paste forwarded WhatsApp chat snippet, article link, or thoughts..."
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
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Stream
          </button>
          <button
            onClick={() => setActiveFilter('WHATSAPP')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'WHATSAPP'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setActiveFilter('TELEGRAM')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'TELEGRAM'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Telegram
          </button>
          <button
            onClick={() => setActiveFilter('STARRED')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'STARRED'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Starred
          </button>
          <button
            onClick={() => setActiveFilter('ARCHIVED')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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
            placeholder="Search messages or senders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Messages Stream Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
            No Messages Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {activeFilter === 'ARCHIVED'
              ? 'No archived messages.'
              : 'Share messages directly from WhatsApp or iOS/Android Shortcuts using your personal API endpoint.'}
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Smartphone className="w-4 h-4" />
              <span>View Mobile Shortcut Guide</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs space-y-3.5 relative transition-all ${
                msg.isStarred
                  ? 'border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-400/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Card Header: Source, Sender, Timestamp, Actions */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getSourceBadge(msg.source)}
                  {msg.sender && (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      {msg.sender}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleStar(msg.id, msg.isStarred)}
                    className={`p-1.5 rounded-lg border text-xs transition-all ${
                      msg.isStarred
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
                    }`}
                    title={msg.isStarred ? 'Starred' : 'Star message'}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => handleToggleArchive(msg.id, msg.isArchived)}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs"
                    title={msg.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Content Body */}
              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>

              {/* URL Attachment if present */}
              {msg.url && (
                <a
                  href={msg.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1.5 font-medium truncate"
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{msg.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
                </a>
              )}

              {/* Footer: Date & 1-Click Conversions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Converted to {msg.convertedType}</span>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleConvertToTask(msg)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-all"
                        title="Create an actionable task from this message"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>+ Task</span>
                      </button>

                      <button
                        onClick={() => handleConvertToNote(msg)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-all"
                        title="Save as permanent note"
                      >
                        <StickyNote className="w-3 h-3" />
                        <span>+ Note</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MOBILE SETUP MODAL HELPER */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Phone "Share Sheet" Shortcut Setup
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Share text, links, or notes directly from WhatsApp, Telegram, or any mobile browser to NOX with 1 tap.
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
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
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
                <code className="block p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
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
                <code className="block p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
                  Bearer {token.slice(0, 20)}...
                </code>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <span>🍏 iPhone (Apple Shortcuts)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>Open the built-in <strong>Shortcuts</strong> app on your iPhone and tap <strong>+</strong>.</li>
                  <li>Name it <strong>"Send to NOX"</strong> and check <strong>"Show in Share Sheet"</strong>.</li>
                  <li>Add action: <strong>Get contents of URL</strong>:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <li>URL: <code className="text-emerald-600 dark:text-emerald-400">{apiEndpointUrl}</code></li>
                      <li>Method: <code>POST</code></li>
                      <li>Header: <code>Authorization</code> = <code>Bearer YOUR_TOKEN</code></li>
                      <li>Request Body: JSON <code>content</code> = <i>Shortcut Input</i>, <code>source</code> = <code>WHATSAPP</code></li>
                    </ul>
                  </li>
                  <li>Add action: <strong>Show Notification</strong> ("Saved to NOX ✅").</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <span>🤖 Android (HTTP Shortcuts App)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>Install free app <strong>HTTP Shortcuts</strong> from Google Play Store.</li>
                  <li>Create a new shortcut named <strong>"Send to NOX"</strong>.</li>
                  <li>Check <strong>"Show in Share Menu"</strong> in shortcut settings.</li>
                  <li>Set Method to <code>POST</code>, URL to <code>{apiEndpointUrl}</code>, add Header <code>Authorization: Bearer &lt;token&gt;</code>, and Body to <code>&#123;"content": "&#123;text&#125;", "source": "WHATSAPP"&#125;</code>.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
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
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}
