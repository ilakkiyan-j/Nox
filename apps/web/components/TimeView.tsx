'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Zap, ArrowRight, Calendar, CheckSquare, AlarmClock, Plus } from 'lucide-react';
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

  useEffect(() => {
    fetchTimeFeed();
  }, []);

  const fetchTimeFeed = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/time`);
      const data = await res.json();
      if (data.success) {
        setTimeData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-medium">Assembling your vertical time feed...</p>
      </div>
    );
  }

  const renderCard = (item: any) => {
    switch (item.type) {
      case 'TASK':
        return (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                {item.goal && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">🎯 {item.goal.title}</span>}
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
              Action Item
            </span>
          </div>
        );
      case 'EVENT':
        return (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">📅 {new Date(item.date).toLocaleDateString()}</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-mono font-bold">Event</span>
          </div>
        );
      case 'HABIT':
        // Habits not shown in Time view — filtered server side
        return null;
      case 'REMINDER':
        return (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center space-x-3">
              <AlarmClock className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 font-mono font-bold">Scheduled</span>
          </div>
        );
      default:
        return null;
    }
  };

  const isFeedEmpty = timeData.now.length === 0 && timeData.next.length === 0 && timeData.upcoming.length === 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Vertical Time Flow</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Non-grid time perception: Focus on Now, Next, and Upcoming sequences.</p>
      </div>

      {isFeedEmpty ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Your day is clear</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Nothing scheduled in your immediate time sequence. Create a task, event, or reminder to populate your vertical feed.
            </p>
          </div>
          {onNavigate && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => onNavigate('tasks')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
              <button
                onClick={() => onNavigate('events')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-200 dark:border-slate-700"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Add Event</span>
              </button>
              <button
                onClick={() => onNavigate('reminders')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-200 dark:border-slate-700"
              >
                <AlarmClock className="w-3.5 h-3.5 text-violet-500" />
                <span>Set Reminder</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 1. NOW SECTION */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-indigo-200 dark:border-indigo-900/60 pb-2">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 tracking-wide uppercase">Now — Active Focus</h3>
              <span className="px-2 py-0.5 text-[10px] bg-indigo-600 text-white font-mono rounded-full font-bold">LIVE</span>
            </div>

            {timeData.now.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 font-medium">No immediate active focus items.</p>
            ) : (
              <div className="space-y-2">{timeData.now.map((item, idx) => <div key={idx}>{renderCard(item)}</div>)}</div>
            )}
          </div>

          {/* 2. NEXT SECTION */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 tracking-wide uppercase">Next — Today's Sequence</h3>
            </div>

            {timeData.next.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 font-medium">Nothing scheduled next for today.</p>
            ) : (
              <div className="space-y-2">{timeData.next.map((item, idx) => <div key={idx}>{renderCard(item)}</div>)}</div>
            )}
          </div>

          {/* 3. UPCOMING SECTION */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 tracking-wide uppercase">Upcoming Horizon</h3>
            </div>

            {timeData.upcoming.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 font-medium">No upcoming events or deadlines scheduled.</p>
            ) : (
              <div className="space-y-2">{timeData.upcoming.map((item, idx) => <div key={idx}>{renderCard(item)}</div>)}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
