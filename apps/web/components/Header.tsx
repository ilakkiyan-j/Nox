'use client';

import React, { useState } from 'react';
import { Search, Plus, Bell, Sun, Moon } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';
import { useTheme } from './ThemeContext';

interface HeaderProps {
  activeTabTitle: string;
  onOpenSearch: () => void;
  onOpenQuickCapture: () => void;
  notifications: any[];
  onRefreshNotifications: () => void;
  onBackToLanding?: () => void;
}

export default function Header({
  activeTabTitle,
  onOpenSearch,
  onOpenQuickCapture,
  notifications = [],
  onRefreshNotifications,
  onBackToLanding,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-20 glass-panel bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-3 md:px-8 flex items-center justify-between shadow-xs transition-colors">
      {/* Title */}
      <div>
        <h2 className="font-display text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">{activeTabTitle}</h2>
      </div>

      {/* Action Triggers */}
      <div className="flex items-center space-x-2 md:space-x-3 relative">
        {/* Global Search Trigger (Cmd + K) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-xs transition-all"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline font-medium">Search NOX...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 font-semibold shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Dynamic Light/Dark Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Fast Clipboard Quick Capture Button */}
        <button
          onClick={onOpenQuickCapture}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Capture</span>
        </button>

        {/* Notifications Icon Button with Navbar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <NotificationsDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifications}
            onRefresh={onRefreshNotifications}
          />
        </div>

        {/* Back to Landing Page / Sign Out */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-xs font-medium transition-all"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
