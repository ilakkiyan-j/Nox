'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  Layers,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'goals'
  | 'roadmaps'
  | 'learning'
  | 'events'
  | 'habits'
  | 'tasks'
  | 'notes'
  | 'reminders'
  | 'time'
  | 'notifications';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenProfile: () => void;
}

export const navItems: { id: NavTab; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'roadmaps', label: 'Roadmaps', icon: Compass },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'reminders', label: 'Reminders', icon: AlarmClock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'time', label: 'Time', icon: Clock },
];

export default function Navigation({ activeTab, setActiveTab, onOpenProfile }: NavigationProps) {
  return (
    <>
      {/* Desktop & Laptop Left Navigation Sidebar (Light/Dark Theme Parity) */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 p-4 justify-between shadow-sm transition-colors">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div
            className="flex items-center space-x-3 px-3 py-2 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wider text-slate-900 dark:text-slate-100">NOX</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide uppercase font-medium">Your Second Self</p>
            </div>
          </div>

          {/* Navigation Links with Smooth Active Indicator */}
          <nav className="space-y-1 relative">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                    isActive
                      ? 'text-indigo-700 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 z-10 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Context Footer Profile */}
        <div
          onClick={onOpenProfile}
          className="pt-4 border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/70 p-2 rounded-xl transition-all"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              NA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">Nox Architect</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">user@nox.internal</p>
            </div>
          </div>
          <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shrink-0" />
        </div>
      </aside>

      {/* Mobile Glassmorphism Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-nav bg-white/95 dark:bg-slate-900/95 z-40 px-2 py-2 flex items-center justify-around border-t border-slate-200 dark:border-slate-800 shadow-lg transition-colors">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
