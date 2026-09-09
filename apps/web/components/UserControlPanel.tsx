'use client';

import React, { useState, useEffect } from 'react';
import {
  X, User, Sun, Moon, Shield, Zap, LogOut, Settings, Target, CheckSquare,
  StickyNote, Calendar, Flame, GraduationCap, Bell, Download, Trash2,
  Edit3, Save, BarChart3, Clock, AlarmClock, Layers, ChevronRight,
  Database, Compass, Lock, Sparkles,
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface UserControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onOpenAdmin?: () => void;
  currentUser?: any;
  stats?: {
    goalsCount: number;
    habitsStreak: number;
    notesCount: number;
    tasksCount?: number;
    eventsCount?: number;
    remindersCount?: number;
    learningCount?: number;
  };
}

type PanelSection = 'overview' | 'profile' | 'preferences' | 'analytics' | 'data';

export default function UserControlPanel({
  isOpen,
  onClose,
  onSignOut,
  onOpenAdmin,
  currentUser,
  stats,
}: UserControlPanelProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<PanelSection>('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.name || 'Nox Architect');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentUser?.name) setDisplayName(currentUser.name);
  }, [currentUser]);

  if (!isOpen) return null;

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'NA';

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      // Update stored user info locally (real API update would go here)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nox_user');
        if (stored) {
          const user = JSON.parse(stored);
          user.name = displayName;
          localStorage.setItem('nox_user', JSON.stringify(user));
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const sectionNav: { id: PanelSection; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'profile', label: 'Profile', icon: Edit3 },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'data', label: 'Data', icon: Database },
  ];

  const analyticsItems = [
    { label: 'Active Goals', value: stats?.goalsCount ?? 0, icon: Target, color: 'indigo' },
    { label: 'Total Tasks', value: stats?.tasksCount ?? 0, icon: CheckSquare, color: 'emerald' },
    { label: 'Note Captures', value: stats?.notesCount ?? 0, icon: StickyNote, color: 'violet' },
    { label: 'Events', value: stats?.eventsCount ?? 0, icon: Calendar, color: 'rose' },
    { label: 'Learning Tracks', value: stats?.learningCount ?? 0, icon: GraduationCap, color: 'sky' },
    { label: 'Reminders', value: stats?.remindersCount ?? 0, icon: AlarmClock, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60',
    violet: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/60',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60',
    sky: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/60',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-colors">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white leading-tight">User Control Center</h2>
              <p className="text-[10px] text-indigo-200 font-mono uppercase tracking-wider">Identity · Preferences · Analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center space-x-1 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 overflow-x-auto">
          {sectionNav.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── OVERVIEW ── */}
          {activeSection === 'overview' && (
            <div className="space-y-5">
              {/* Identity Card */}
              <div className="flex items-center space-x-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30 shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 uppercase font-mono border border-indigo-200/50 dark:border-indigo-800/50 mb-1">
                    {currentUser?.role === 'ADMIN' ? '🛡️ Administrator' : '⚡ Standard User'}
                  </span>
                  <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 truncate">{displayName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{currentUser?.email || 'user@nox.internal'}</p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Workspace Snapshot</h4>
                <div className="grid grid-cols-3 gap-3">
                  {analyticsItems.slice(0, 3).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={`p-3.5 rounded-xl border text-center ${colorMap[item.color]}`}>
                        <Icon className="w-4 h-4 mx-auto mb-1.5" />
                        <span className="text-2xl font-bold block font-display">{item.value}</span>
                        <span className="text-[10px] opacity-70 uppercase font-mono font-semibold mt-0.5 block leading-tight">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h4>
                {[
                  { label: 'Edit Profile & Identity', icon: Edit3, action: () => setActiveSection('profile') },
                  { label: 'System Preferences', icon: Settings, action: () => setActiveSection('preferences') },
                  { label: 'Workspace Analytics', icon: BarChart3, action: () => setActiveSection('analytics') },
                  { label: 'Data Management', icon: Database, action: () => setActiveSection('data') },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Identity Customization</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Personalize your NOX workspace identity and profile details.</p>
              </div>

              {/* Avatar Preview */}
              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-bold text-xl text-white shadow-md shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Identity Avatar</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Auto-generated from your display name initials.</p>
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-bold">LIVE PREVIEW</span>
                </div>
              </div>

              {/* Display Name Edit */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors"
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1.5 font-bold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Email is set by your account and cannot be changed here.</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingProfile ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Profile'}</span>
                </button>
              </div>

              {/* Role info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Role</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold uppercase">
                    {currentUser?.role || 'USER'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Role is assigned by the system administrator and cannot be self-modified.
                </p>
              </div>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {activeSection === 'preferences' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">System Preferences</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure your NOX workspace environment and behavioral settings.</p>
              </div>

              <div className="space-y-2.5">
                {/* Theme Toggle */}
                <div
                  onClick={toggleTheme}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    {theme === 'light'
                      ? <Sun className="w-5 h-5 text-amber-500" />
                      : <Moon className="w-5 h-5 text-indigo-400" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Interface Theme</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{theme === 'light' ? 'Currently using Light Mode' : 'Currently using Dark Mode'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono font-bold">
                    {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                  </span>
                </div>

                {/* Vertical Time Flow */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Vertical Time Flow</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Non-grid time perception for tasks & events</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold">ACTIVE</span>
                </div>

                {/* Data Isolation */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Personal Data Isolation</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">All data is scoped to your account only</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold">SECURE</span>
                </div>

                {/* Quick Capture */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quick Capture Scratchpad</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Global ⚡ keyboard shortcut ready</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 font-mono font-bold">ENABLED</span>
                </div>

                {/* Admin Panel if available */}
                {onOpenAdmin && (
                  <button
                    onClick={() => { onClose(); onOpenAdmin(); }}
                    className="w-full p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div className="text-left">
                        <p className="text-sm font-bold">Admin Control Panel</p>
                        <p className="text-[11px] text-indigo-500 dark:text-indigo-400">Manage user accounts & provisioning</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono font-bold">ADMIN</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeSection === 'analytics' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Workspace Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live overview of your NOX workspace entity counts and engagement.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {analyticsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`p-4 rounded-2xl border flex flex-col items-center text-center space-y-1.5 ${colorMap[item.color]}`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-3xl font-bold font-display">{item.value}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Engagement context */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Engagement Summary</span>
                </h4>
                <div className="space-y-2">
                  {[
                    { label: 'Total Workspace Entities', value: Object.values(stats || {}).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0) },
                    { label: 'Goals + Roadmaps Tracked', value: stats?.goalsCount ?? 0 },
                    { label: 'Learning Tracks Active', value: stats?.learningCount ?? 0 },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">{row.label}</span>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DATA MANAGEMENT ── */}
          {activeSection === 'data' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Data Management</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Export your workspace data or manage your session and account.</p>
              </div>

              <div className="space-y-3">
                {/* Export Data */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Export Workspace Data</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Download a complete export of your NOX workspace including goals, tasks, notes, events, and learning tracks.
                  </p>
                  <button
                    onClick={() => {
                      const data = { exportedAt: new Date().toISOString(), user: currentUser?.name, note: 'Full export coming soon via API.' };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                      a.download = `nox-export-${Date.now()}.json`; a.click();
                    }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export as JSON</span>
                  </button>
                </div>

                {/* Session info */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Session Info</h4>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Account ID</span>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded truncate max-w-[160px]">
                        {currentUser?.id?.slice(0, 12) || 'session-local'}...
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Role</span>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{currentUser?.role || 'USER'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Data Isolation</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-bold">ENABLED</span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">Danger Zone</h4>
                  </div>
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80 leading-relaxed">
                    Signing out will end your current session. Your data is safely persisted and will be available when you sign back in.
                  </p>
                  <button
                    onClick={() => { onClose(); onSignOut(); }}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of NOX</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span>NOX Personal OS · Data Isolated</span>
          </div>
          <button
            onClick={() => { onClose(); onSignOut(); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
