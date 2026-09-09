import React, { useState } from 'react';
import { Flame, Plus, Check, Edit2, Trash2, X, Save } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface HabitsViewProps {
  habits: any[];
  onRefresh: () => void;
}

export default function HabitsView({ habits, onRefresh }: HabitsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [reminderTime, setReminderTime] = useState('08:00 PM');

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await fetch('http://localhost:4000/api/v1/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          frequency,
          reminderTime,
        }),
      });

      setTitle('');
      setShowCreate(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit) return;

    try {
      await fetch(`http://localhost:4000/api/v1/habits/${editingHabit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingHabit.title,
          frequency: editingHabit.frequency,
          reminderTime: editingHabit.reminderTime,
        }),
      });
      setEditingHabit(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Habit Routine',
      message: 'Are you sure you want to delete this Habit routine?',
      onConfirm: async () => {
        try {
          await fetch(`http://localhost:4000/api/v1/habits/${habitId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleCheckin = async (habitId: string) => {
    try {
      await fetch(`http://localhost:4000/api/v1/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Flame className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>Habits & Routines</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Daily consistency building systems and momentum tracking.</p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Create Habit Form */}
      {showCreate && (
        <form onSubmit={handleCreateHabit} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Daily / Weekly Habit Routine</h3>
          <input
            type="text"
            placeholder="Habit Title (e.g. Solve 2 LeetCode questions or Read 30 mins)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Daily Reminder Time</label>
              <input
                type="text"
                placeholder="08:00 PM"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold shadow-xs">
              Save Habit System
            </button>
          </div>
        </form>
      )}

      {/* Edit Habit Form */}
      {editingHabit && (
        <form onSubmit={handleUpdateHabit} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Habit</h3>
            <button type="button" onClick={() => setEditingHabit(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={editingHabit.title}
            onChange={(e) => setEditingHabit({ ...editingHabit, title: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <div className="flex justify-end space-x-2">
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1">
              <Save className="w-3.5 h-3.5" />
              <span>Update Habit</span>
            </button>
          </div>
        </form>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {habits.map((habit) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayLog = habit.logs?.find((l: any) => l.date === todayStr);
          const isDoneToday = todayLog?.status === 'COMPLETED';

          return (
            <div key={habit.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase">
                    {habit.frequency}
                  </span>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mt-1">{habit.title}</h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1 mb-1">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-mono">
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{habit.streakCount} Days</span>
                    </p>
                    <button onClick={() => setEditingHabit(habit)} className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200" title="Edit Habit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteHabit(habit.id)} className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400" title="Delete Habit">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Best: {habit.bestStreak} days</p>
                </div>
              </div>

              {/* Action Check-in Button */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Target: {habit.targetCount} / day</span>
                <button
                  onClick={() => handleCheckin(habit.id)}
                  disabled={isDoneToday}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    isDoneToday
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95 shadow-sm shadow-amber-500/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isDoneToday ? 'Completed Today ✓' : 'Check In Now'}</span>
                </button>
              </div>
            </div>
          );
        })}
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
