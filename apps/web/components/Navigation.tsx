'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Target,
  Compass,
  GraduationCap,
  Calendar,
  Flame,
  CheckSquare,
  StickyNote,
  Clock,
  AlarmClock,
  Bell,
  Settings,
  MoreHorizontal,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

import Avatar from './Avatar';
import NoxLogo from './NoxLogo';

export type NavTab =
  | 'dashboard'
  | 'council'
  | 'goals'
  | 'roadmaps'
  | 'learning'
  | 'events'
  | 'habits'
  | 'tasks'
  | 'messages'
  | 'notes'
  | 'reminders'
  | 'time'
  | 'notifications';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenProfile: () => void;
  currentUser?: any;
}

export const navItems: { id: NavTab; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'council', label: 'Council', icon: Sparkles },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'roadmaps', label: 'Roadmaps', icon: Compass },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'reminders', label: 'Reminders', icon: AlarmClock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'time', label: 'Time', icon: Clock },
];

const navGroups: { label: string; items: typeof navItems }[] = [
  { label: 'Workspace', items: navItems.filter((item) => ['dashboard', 'council'].includes(item.id)) },
  { label: 'Plan', items: navItems.filter((item) => ['goals', 'roadmaps', 'tasks', 'time'].includes(item.id)) },
  { label: 'Grow', items: navItems.filter((item) => ['learning', 'habits'].includes(item.id)) },
  { label: 'Capture & connect', items: navItems.filter((item) => ['events', 'notes', 'reminders', 'messages', 'notifications'].includes(item.id)) },
];

const mobilePrimaryTabs: NavTab[] = ['dashboard', 'tasks', 'goals', 'council', 'notes'];

export default function Navigation({ activeTab, setActiveTab, onOpenProfile, currentUser }: NavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLElement>(null);
  const mobileVisible = mobilePrimaryTabs
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is (typeof navItems)[number] => Boolean(item));
  const mobileHidden = navItems.filter((item) => !mobilePrimaryTabs.includes(item.id));
  const hiddenActiveItem = mobileHidden.find((item) => item.id === activeTab);
  const hasHiddenActive = Boolean(hiddenActiveItem);
  const selectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMoreOpen(false);
  };

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMoreOpen(false);
    };
    desktopQuery.addEventListener('change', closeOnDesktop);
    return () => desktopQuery.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const panel = morePanelRef.current;
    const initialFocusTarget = panel?.querySelector<HTMLButtonElement>('button[aria-current="page"]')
      ?? panel?.querySelector<HTMLButtonElement>('button');
    initialFocusTarget?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      moreButtonRef.current?.focus();
    };
  }, [moreOpen]);

  return (
    <>
      {/* Desktop & Laptop Left Navigation Sidebar (Light/Dark Theme Parity) */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 p-4 justify-between shadow-sm transition-colors">
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          {/* Logo Brand */}
          <button type="button" className="px-1 py-1 text-left" onClick={() => setActiveTab('dashboard')} aria-label="Go to dashboard">
            <NoxLogo size="md" showText />
          </button>

          {/* Navigation Links with Smooth Active Indicator */}
          <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" aria-label="Main navigation">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 rounded-lg border border-indigo-200/80 bg-indigo-50 dark:border-indigo-800/80 dark:bg-indigo-950/70"
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                          />
                        )}
                        <Icon className={`relative z-10 h-4 w-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="relative z-10">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Context Footer Profile */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open profile settings"
          className="mt-4 flex w-full items-center justify-between rounded-xl border-t border-slate-200 px-3 py-3 text-left transition-all hover:bg-slate-100/70 dark:border-slate-800 dark:hover:bg-slate-800/70"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar src={currentUser?.avatarUrl} name={currentUser?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{currentUser?.name || 'Nox Architect'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email || 'user@nox.internal'}</p>
            </div>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        </button>
      </aside>

      {/* Mobile Glassmorphism Bottom Navigation Bar */}
      <nav aria-label="Primary mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 glass-nav bg-white/95 dark:bg-slate-900/95 z-40 grid grid-cols-6 items-stretch border-t border-slate-200 px-1 pt-1 pb-[env(safe-area-inset-bottom)] shadow-lg transition-colors dark:border-slate-800">
        {mobileVisible.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 transition-colors ${
                isActive
                  ? 'font-semibold text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className={`grid h-7 w-10 place-items-center rounded-full transition-colors ${isActive ? 'bg-indigo-100/80 dark:bg-indigo-900/60' : ''}`}>
                <Icon className="h-5 w-5 shrink-0" />
              </span>
              <span className="max-w-full truncate text-[10px] leading-none">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          ref={moreButtonRef}
          onClick={() => setMoreOpen(!moreOpen)}
          aria-expanded={moreOpen}
          aria-label={
            moreOpen
              ? 'Close more sections'
              : hiddenActiveItem
                ? `Open more sections, current section: ${hiddenActiveItem.label}`
                : 'Open more sections'
          }
          aria-controls={moreOpen ? 'nox-more-sections' : undefined}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 transition-colors ${
            hasHiddenActive
              ? 'font-semibold text-indigo-700 dark:text-indigo-300'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className={`grid h-7 w-10 place-items-center rounded-full transition-colors ${hasHiddenActive ? 'bg-indigo-100/80 dark:bg-indigo-900/60' : ''}`}>
            <MoreHorizontal className="h-5 w-5" />
          </span>
          <span className="text-[10px] leading-none">More</span>
        </button>
      </nav>

      {/* Mobile "More" tab sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
          <motion.button
            type="button"
            aria-label="Close sections menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
            className="md:hidden fixed inset-0 bottom-16 z-30 bg-slate-950/20"
          />
          <motion.nav
            ref={morePanelRef}
            id="nox-more-sections"
            aria-label="More sections"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 grid grid-cols-3 gap-1 max-h-[50vh] overflow-y-auto"
          >
            {mobileHidden.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-1.5">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                onOpenProfile();
                setMoreOpen(false);
              }}
              className="flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] mt-1.5">Profile & Settings</span>
            </button>
          </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
