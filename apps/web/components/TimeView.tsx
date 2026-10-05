'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  Zap,
  ArrowRight,
  Calendar,
  CheckSquare,
  AlarmClock,
  Plus,
  Target,
  Repeat,
  CheckCircle2,
  Circle,
  Filter,
  Sparkles,
  ChevronRight,
  Timer,
} from 'lucide-react';
import { NavTab } from './Navigation';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface TimeViewProps {
  onNavigate?: (tab: NavTab) => void;
}

export default function TimeView({ onNavigate }: TimeViewProps) {
  const [timeData, setTimeData] = useState<{ now: any[]; next: any[]; upcoming: any[] }>({
    now: [],
    next: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [activeTypeFilter, setActiveTypeFilter] = useState<'ALL' | 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE' | 'HABIT'>('ALL');

  useEffect(() => {
    fetchTimeFeed();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTimeFeed = async () => {
    try {
      setLoading(true);
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/time`);
      const data = await res.json();
      if (data.success) {
        setTimeData(data.data);
      }
    } catch (err) {
      console.error('Fetch time feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      fetchTimeFeed();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const filterItems = (items: any[]) => {
    if (activeTypeFilter === 'ALL') return items;
    return items.filter((item) => item.type === activeTypeFilter);
  };

  const nowFiltered = filterItems(timeData.now);
  const nextFiltered = filterItems(timeData.next);
  const upcomingFiltered = filterItems(timeData.upcoming);
  const totalItemsCount = timeData.now.length + timeData.next.length + timeData.upcoming.length;

  const TYPE_CONFIG: Record<string, any> = {
    TASK: {
      icon: CheckSquare,
      color: 'text-emerald-500',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      bg: 'bg-emerald-500/5',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      nav: 'tasks' as NavTab,
    },
    EVENT: {
      icon: Calendar,
      color: 'text-rose-500',
      border: 'border-rose-500/20 hover:border-rose-500/40',
      bg: 'bg-rose-500/5',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      nav: 'events' as NavTab,
    },
    REMINDER: {
      icon: AlarmClock,
      color: 'text-violet-500',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      bg: 'bg-violet-500/5',
      badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      nav: 'reminders' as NavTab,
    },
    MILESTONE: {
      icon: Target,
      color: 'text-amber-500',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      bg: 'bg-amber-500/5',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      nav: 'roadmaps' as NavTab,
    },
    HABIT: {
      icon: Repeat,
      color: 'text-sky-500',
      border: 'border-sky-500/20 hover:border-sky-500/40',
      bg: 'bg-sky-500/5',
      badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      nav: 'habits' as NavTab,
    },
  };

  const renderTimelineCard = (item: any, phase: 'now' | 'next' | 'upcoming') => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.TASK;
    const Icon = cfg.icon;
    const metaText = [item.subtitle, item.when, item.time].filter(Boolean).join(' · ');

    return (
      <div
        key={item.id || item.title}
        onClick={() => onNavigate && onNavigate(cfg.nav)}
        className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border ${cfg.border} shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
      >
        <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
          <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.color} shrink-0 border border-slate-200/50 dark:border-slate-800`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono ${cfg.badge}`}>
                {item.label || item.type}
              </span>
              {phase === 'now' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse">
                  IN PROGRESS
                </span>
              )}
            </div>

            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
              {item.title}
            </h4>

            {metaText && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                {metaText}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
          {item.type === 'TASK' && item.id && (
            <button
              type="button"
              onClick={(e) => handleToggleTaskComplete(item.id, e)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center space-x-1.5 transition-all"
              title="Mark task completed"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Done</span>
            </button>
          )}

          <div className="p-2 rounded-xl text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 max-w-xl mx-auto">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Calibrating your live temporal feed...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Dynamic Live Time Beacon Header */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-emerald-300">
              LIVE NON-GRID TEMPORAL PERCEPTION
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight">
            Vertical Time Flow
          </h2>
          <p className="text-xs text-indigo-200/80 max-w-md leading-relaxed">
            Free your cognitive load from rigid calendar grids. Focus exclusively on what is happening <span className="text-emerald-300 font-bold">Now</span>, queue up what comes <span className="text-amber-300 font-bold">Next</span>, and glance at your <span className="text-violet-300 font-bold">Horizon</span>.
          </p>
        </div>

        {/* Live Digital Clock Chip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 relative z-10">
          <div className="px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-center">
            <div className="text-xl sm:text-2xl font-mono font-black tracking-wider text-emerald-400">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-0.5">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
          {(['ALL', 'TASK', 'EVENT', 'REMINDER', 'MILESTONE', 'HABIT'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveTypeFilter(filter)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTypeFilter === filter
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {filter === 'ALL' ? `All Sequence (${totalItemsCount})` : filter}
            </button>
          ))}
        </div>

        {onNavigate && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigate('tasks')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Vertical Spine Timeline Container */}
      <div className="relative pl-6 sm:pl-8 space-y-10 before:absolute before:left-2 sm:before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-amber-500 before:to-violet-500">
        
        {/* 1. NOW SECTION */}
        <div className="relative space-y-4">
          <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full bg-emerald-500 border-4 border-slate-900 shadow-md shadow-emerald-500/40 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </div>

          <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Now — Active Focus
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {nowFiltered.length} Active
            </span>
          </div>

          {nowFiltered.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>No active priority scheduled right now. You are in free focus mode.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {nowFiltered.map((item) => renderTimelineCard(item, 'now'))}
            </div>
          )}
        </div>

        {/* 2. NEXT SECTION */}
        <div className="relative space-y-4">
          <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full bg-amber-500 border-4 border-slate-900 shadow-md shadow-amber-500/40" />

          <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
            <div className="flex items-center space-x-2">
              <ArrowRight className="w-4 h-4 text-amber-500" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Next — Today&apos;s Queue
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {nextFiltered.length} Queued
            </span>
          </div>

          {nextFiltered.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Nothing queued up for the rest of today.
            </div>
          ) : (
            <div className="space-y-3">
              {nextFiltered.map((item) => renderTimelineCard(item, 'next'))}
            </div>
          )}
        </div>

        {/* 3. UPCOMING SECTION */}
        <div className="relative space-y-4">
          <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full bg-violet-500 border-4 border-slate-900 shadow-md shadow-violet-500/40" />

          <div className="flex items-center justify-between pb-1 border-b border-violet-500/20">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Upcoming Horizon
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              {upcomingFiltered.length} Ahead
            </span>
          </div>

          {upcomingFiltered.length === 0 ? (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              No future deadlines or horizon items scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingFiltered.map((item) => renderTimelineCard(item, 'upcoming'))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
