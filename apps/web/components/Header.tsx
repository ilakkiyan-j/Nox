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
  onOpenProfile?: () => void;
  currentUser?: any;
}

export default function Header({
  activeTabTitle,
  onOpenSearch,
  onOpenQuickCapture,
  notifications = [],
  onRefreshNotifications,
  onBackToLanding,
  onOpenProfile,
  currentUser,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'NA';

  return (
    <header className="sticky top-0 z-20 glass-panel bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 md:px-8 flex items-center justify-between shadow-xs transition-colors">
      {/* Left: Brand Logo on Mobile & Tab Title */}
      <div className="flex items-center space-x-2.5 min-w-0">
        {/* Mobile Brand Logo */}
        <div className="flex items-center space-x-2 md:hidden shrink-0">
          <img src="/Nox_logo.png" alt="NOX Logo" className="w-7 h-7 object-contain" />
          <h1 className="font-display font-bold text-base tracking-wider text-slate-900 dark:text-slate-100">NOX</h1>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 md:hidden shrink-0" />

        <h2 className="font-display text-sm md:text-xl font-bold text-slate-900 dark:text-slate-100 capitalize truncate">
          {activeTabTitle}
        </h2>
      </div>

      {/* Right: Action Triggers */}
      <div className="flex items-center space-x-1.5 md:space-x-3 relative shrink-0">
        {/* Global Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-xs transition-all"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="hidden sm:inline font-medium">Search NOX...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 font-semibold shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Dynamic Light/Dark Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Fast Clipboard Quick Capture Button */}
        <button
          onClick={onOpenQuickCapture}
          title="Quick Capture"
          aria-label="Quick Capture"
          className="flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Capture</span>
        </button>

        {/* Notifications Icon Button with Navbar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all"
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

        {/* Mobile Profile & Settings Trigger */}
        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className="md:hidden flex items-center justify-center p-0.5 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-xs"
            title="User Control Center & Settings"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900/10 flex items-center justify-center font-bold text-[11px] text-white">
              {initials}
            </div>
          </button>
        )}

        {/* Desktop Back to Landing Page / Sign Out */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="hidden sm:inline-block px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-xs font-medium transition-all"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
