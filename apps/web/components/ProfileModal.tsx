'use client';

import React from 'react';
import { X, Shield, Zap, Target, Flame, Layers, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onOpenAdmin?: () => void;
  currentUser?: any;
  stats?: {
    goalsCount: number;
    habitsStreak: number;
    notesCount: number;
  };
}

export default function ProfileModal({ isOpen, onClose, onSignOut, onOpenAdmin, currentUser, stats }: ProfileModalProps) {
  const { theme, toggleTheme } = useTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative transition-colors">
        <button onClick={onClose} className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        {/* Profile Identity Context */}
        <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-500/20">
            {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'NA'}
          </div>
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 uppercase font-mono border border-indigo-200/50 dark:border-indigo-800/50">
              {currentUser?.role === 'ADMIN' ? 'Administrator' : 'Standard User'}
            </span>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 mt-0.5">{currentUser?.name || 'Nox Architect'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.email || 'user@nox.internal'}</p>
          </div>
        </div>

        {/* Personal Context Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 block font-display">{stats?.goalsCount || 2}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-medium">Active Goals</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 block font-display">{stats?.habitsStreak || 7}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-medium">Day Streak</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400 mx-auto mb-1" />
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 block font-display">{stats?.notesCount || 3}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-medium">Captures</span>
          </div>
        </div>

        {/* Core System Configuration */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Preferences</h4>

          {/* Theme Switcher Toggle Control */}
          <div
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
          >
            <div className="flex items-center space-x-2.5">
              {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Interface Theme ({theme === 'light' ? 'Light' : 'Dark'})
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono font-bold">
              TOGGLE {theme === 'light' ? '🌙' : '☀️'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Non-Grid Vertical Time Flow</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold">ACTIVE</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Personal Data Isolation</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold">SECURE</span>
          </div>

          {/* Admin User Account Provisioner Trigger */}
          {onOpenAdmin && (
            <button
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="w-full p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 text-xs font-bold transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Admin User Account Manager</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-mono">PANEL</span>
            </button>
          )}
        </div>

        {/* Sign Out Trigger */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 text-xs font-bold transition-all flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of NOX</span>
          </button>
        </div>
      </div>
    </div>
  );
}
