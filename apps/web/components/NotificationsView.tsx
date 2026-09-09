'use client';

import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Trophy,
  Flame,
  Calendar,
  Plus,
  X,
  Filter,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface NotificationsViewProps {
  notifications: any[];
  onRefresh: () => void;
}

export default function NotificationsView({ notifications, onRefresh }: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'streaks' | 'events'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState('GENERAL');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('http://localhost:4000/api/v1/notifications/mark-all-read', { method: 'PATCH' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification alert?',
      onConfirm: async () => {
        try {
          await fetch(`http://localhost:4000/api/v1/notifications/${id}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleClearAll = () => {
    setConfirmState({
      isOpen: true,
      title: 'Clear All Notifications',
      message: 'Are you sure you want to clear all notification history?',
      onConfirm: async () => {
        try {
          await fetch('http://localhost:4000/api/v1/notifications', { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    try {
      await fetch('http://localhost:4000/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          message: newMessage,
          type: newType,
        }),
      });

      setNewTitle('');
      setNewMessage('');
      setShowCreate(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MILESTONE_ACHIEVED':
        return <Trophy className="w-5 h-5 text-brand-emerald" />;
      case 'HABIT_STREAK':
        return <Flame className="w-5 h-5 text-brand-amber" />;
      case 'EVENT_ALERT':
        return <Calendar className="w-5 h-5 text-brand-rose" />;
      default:
        return <Bell className="w-5 h-5 text-brand-indigo" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'streaks') return n.type === 'HABIT_STREAK';
    if (filter === 'events') return n.type === 'EVENT_ALERT';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Notification Center</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                {unreadCount} unread
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">System alerts, habit milestone streaks, event reminders, and updates.</p>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Alert</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filter === 'all'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filter === 'unread'
              ? 'bg-rose-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('streaks')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filter === 'streaks'
              ? 'bg-amber-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Habit Streaks
        </button>
        <button
          onClick={() => setFilter('events')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            filter === 'events'
              ? 'bg-violet-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Event Alerts
        </button>
      </div>

      {/* Create Notification Form */}
      {showCreate && (
        <form onSubmit={handleCreateNotification} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Custom System Alert</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Notification Title (e.g. System Security Audit Completed)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            required
          />

          <textarea
            rows={2}
            placeholder="Notification Details / Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            required
          />

          <div className="flex items-center justify-between pt-1">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="GENERAL">General Notice</option>
              <option value="HABIT_STREAK">Habit Streak</option>
              <option value="EVENT_ALERT">Event Alert</option>
              <option value="MILESTONE_ACHIEVED">Milestone Achieved</option>
            </select>

            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
              Post Notification
            </button>
          </div>
        </form>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2 shadow-xs">
            <Bell className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No notifications found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your notification inbox is clear.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border flex items-start justify-between space-x-3 transition-all ${
                notif.isRead
                  ? 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                  : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 shadow-xs'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1.5">
                    {new Date(notif.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleDeleteNotification(notif.id)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                  title="Delete Notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
