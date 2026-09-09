'use client';

import React from 'react';
import { Bell, Trophy, Calendar, Flame, X, Check } from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  onRefresh: () => void;
}

export default function NotificationsDropdown({
  isOpen,
  onClose,
  notifications,
  onRefresh,
}: NotificationsDropdownProps) {
  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MILESTONE_ACHIEVED':
        return <Trophy className="w-4 h-4 text-emerald-600" />;
      case 'HABIT_STREAK':
        return <Flame className="w-4 h-4 text-amber-600" />;
      case 'EVENT_ALERT':
        return <Calendar className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3 transition-colors">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">Notifications Bar</h3>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center font-medium">No notifications right now.</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-xl border flex items-start justify-between space-x-2 transition-all ${
                notif.isRead
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                  : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 shadow-2xs'
              }`}
            >
              <div className="flex items-start space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-0.5 shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{notif.title}</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-1 block">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0"
                  title="Mark as Read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
