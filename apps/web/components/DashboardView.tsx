'use client';

import React, { useState } from 'react';
import {
  Target,
  CheckSquare,
  Calendar,
  Flame,
  StickyNote,
  ArrowRight,
  Zap,
  CheckCircle2,
  Trash2,
  Edit2,
  GraduationCap,
  AlarmClock,
  Plus,
  BookOpen,
  Clock,
} from 'lucide-react';
import { NavTab } from './Navigation';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface DashboardViewProps {
  data: any;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onRefresh: () => void;
}

export default function DashboardView({ data, loading, onNavigate, onRefresh }: DashboardViewProps) {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-medium">Loading your personal command center...</p>
      </div>
    );
  }

  const {
    tasks = [],
    activeGoals = [],
    habits = [],
    upcomingEvents = [],
    recentNotes = [],
    activeLearning = [],
    reminders = [],
  } = data || {};

  const handleHabitCheckin = async (habitId: string) => {
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReminderToggle = async (reminderId: string, currentStatus: boolean) => {
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntity = (endpoint: string, id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete ${name}`,
      message: `Are you sure you want to delete this ${name}?`,
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/${endpoint}/${id}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Hero Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-slate-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            <span>Personal Command Center</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">What matters to you right now?</h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            NOX captures your personal context so you stay intentional, organized, and focused on high-leverage outcomes.
          </p>
        </div>

        <button
          onClick={() => onNavigate('time')}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-2 shadow-sm shadow-indigo-500/20 w-fit transition-all shrink-0"
        >
          <span>View Vertical Time Feed</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Command Pulse Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigate('tasks')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-between transition-all group text-left"
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Focus Tasks</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{tasks.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CheckSquare className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('goals')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-between transition-all group text-left"
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Goals</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{activeGoals.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Target className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('learning')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-between transition-all group text-left"
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Learning Tracks</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{activeLearning.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <GraduationCap className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('habits')}
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-between transition-all group text-left"
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Habit Streaks</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{habits.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('reminders')}
          className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 flex items-center justify-between transition-all group text-left"
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Prompts</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{reminders.length}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <AlarmClock className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Grid Layout for Command Center Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 spans): Tasks, Learning, Goals */}
        <div className="lg:col-span-7 space-y-6">
          {/* Priority Tasks */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Action Items (Today's Focus)</h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">All caught up! No urgent tasks pending right now.</p>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create a task</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between group hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <button
                        onClick={() => handleTaskToggle(task.id, task.status)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-600 text-transparent bg-white dark:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            task.status === 'COMPLETED' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.goal && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">🎯 {task.goal.title}</span>}
                          {task.dueDate && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          task.priority === 'URGENT'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : task.priority === 'HIGH'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <button
                        onClick={() => onNavigate('tasks')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-opacity"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntity('tasks', task.id, 'Task')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Learning Tracks */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Learning Tracks</h3>
              </div>
              <button
                onClick={() => onNavigate('learning')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Curriculum</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {activeLearning.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">No active learning tracks right now.</p>
                <button
                  onClick={() => onNavigate('learning')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start a learning track</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeLearning.map((track: any) => {
                  const totalMods = track.modules?.length || 0;
                  const completedMods = track.modules?.filter((m: any) => m.isCompleted)?.length || 0;
                  const pct = totalMods > 0 ? Math.round((completedMods / totalMods) * 100) : 0;

                  return (
                    <div
                      key={track.id}
                      className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3 group relative hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                      onClick={() => onNavigate('learning')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 uppercase">
                          {track.platform || 'Custom Track'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">{pct}%</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{track.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 inline" />
                          <span>{completedMods} of {totalMods} modules completed</span>
                        </p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Outcome Goals */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Active Goals</h3>
              </div>
              <button
                onClick={() => onNavigate('goals')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>View Goals</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">No active goals set. Define an outcome to stay focused.</p>
                <button
                  onClick={() => onNavigate('goals')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Set a goal</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeGoals.map((goal: any) => (
                  <div key={goal.id} className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 group relative hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                        {goal.status}
                      </span>
                      <div className="flex items-center space-x-1">
                        {goal.targetDate && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Due {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          onClick={() => onNavigate('goals')}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-opacity ml-1"
                          title="Edit Goal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntity('goals', goal.id, 'Goal')}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{goal.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{goal.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 spans): Habits, Reminders, Events & Notes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Habits & Streaks */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Habit Streaks</h3>
              </div>
              <button onClick={() => onNavigate('habits')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                View Habits
              </button>
            </div>

            {habits.length === 0 ? (
              <div className="p-5 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Build steady routines with habit tracking.</p>
                <button
                  onClick={() => onNavigate('habits')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add a habit</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {habits.map((habit: any) => {
                  const todayLog = habit.logs?.find((l: any) => l.date === new Date().toISOString().split('T')[0]);
                  const isCheckedToday = todayLog?.status === 'COMPLETED';

                  return (
                    <div key={habit.id} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{habit.title}</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">🔥 {habit.streakCount} Day Streak</p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleHabitCheckin(habit.id)}
                          disabled={isCheckedToday}
                          className={`px-3 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                            isCheckedToday
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                          }`}
                        >
                          {isCheckedToday ? 'Done ✓' : 'Check In'}
                        </button>
                        <button
                          onClick={() => onNavigate('habits')}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-opacity"
                          title="Edit Habit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntity('habits', habit.id, 'Habit')}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                          title="Delete Habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Prompts & Reminders */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlarmClock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Timely Reminders</h3>
              </div>
              <button onClick={() => onNavigate('reminders')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                View All
              </button>
            </div>

            {reminders.length === 0 ? (
              <div className="p-4 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">No active prompts or reminders.</p>
                <button
                  onClick={() => onNavigate('reminders')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add reminder</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder: any) => (
                  <div
                    key={reminder.id}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <button
                        onClick={() => handleReminderToggle(reminder.id, reminder.isCompleted)}
                        className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 hover:border-purple-500 flex items-center justify-center shrink-0 transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle2 className="w-3 h-3 text-transparent hover:text-purple-500" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{reminder.title}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 inline" />
                          <span>{new Date(reminder.remindAt).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('reminders')}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Upcoming Events</h3>
              </div>
              <button onClick={() => onNavigate('events')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                View All
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="p-4 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">No events scheduled on your calendar.</p>
                <button
                  onClick={() => onNavigate('events')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule event</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event: any) => (
                  <div key={event.id} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{event.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                        📅 {new Date(event.date).toLocaleDateString()} {event.startTime && `• ${event.startTime}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onNavigate('events')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-opacity"
                        title="Edit Event"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntity('events', event.id, 'Event')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Quick Notes / Clipboard Captures */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Recent Captures</h3>
              </div>
              <button onClick={() => onNavigate('notes')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                Scratchpad
              </button>
            </div>

            {recentNotes.length === 0 ? (
              <div className="p-4 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Quick capture scratchpad is empty.</p>
                <button
                  onClick={() => onNavigate('notes')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Jot down note</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note: any) => (
                  <div key={note.id} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="space-y-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{note.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{note.content}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => onNavigate('notes')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-opacity"
                        title="Edit Note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntity('notes', note.id, 'Note')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

