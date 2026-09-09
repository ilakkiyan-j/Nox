'use client';

import React, { useState } from 'react';
import { AlarmClock, Plus, CheckCircle2, Trash2, Edit2, X, Save } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface RemindersViewProps {
  reminders: any[];
  onRefresh: () => void;
}

export default function RemindersView({ reminders, onRefresh }: RemindersViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;

    try {
      await fetch('http://localhost:4000/api/v1/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, remindAt }),
      });

      setTitle('');
      setRemindAt('');
      setShowCreate(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder) return;

    try {
      await fetch(`http://localhost:4000/api/v1/reminders/${editingReminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingReminder.title,
          remindAt: editingReminder.remindAt,
        }),
      });
      setEditingReminder(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReminder = async (id: string, currentIsCompleted: boolean) => {
    try {
      await fetch(`http://localhost:4000/api/v1/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentIsCompleted }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReminder = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Reminder',
      message: 'Are you sure you want to delete this reminder?',
      onConfirm: async () => {
        try {
          await fetch(`http://localhost:4000/api/v1/reminders/${id}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <AlarmClock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>Reminders</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Time-based prompts for tasks, habits, learning, and events.</p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreateReminder} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Set Reminder Prompt</h3>
          <input
            type="text"
            placeholder="Reminder Title (e.g. Prepare System Architecture Slides)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600"
            required
          />
          <div className="flex items-center space-x-3">
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              required
            />
            <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold shadow-xs">
              Save Reminder
            </button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingReminder && (
        <form onSubmit={handleUpdateReminder} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Reminder</h3>
            <button type="button" onClick={() => setEditingReminder(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={editingReminder.title}
            onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <div className="flex justify-end space-x-2">
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1">
              <Save className="w-3.5 h-3.5" />
              <span>Update Reminder</span>
            </button>
          </div>
        </form>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <AlarmClock className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No active reminders</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add a reminder for upcoming focus areas.</p>
          </div>
        ) : (
          reminders.map((rem) => (
            <div
              key={rem.id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                rem.isCompleted
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={() => handleToggleReminder(rem.id, rem.isCompleted)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    rem.isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 hover:border-emerald-600 text-transparent bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 fill-current" />
                </button>
                <div>
                  <h4 className={`text-sm font-bold ${rem.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                    {rem.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    ⏰ {new Date(rem.remindAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setEditingReminder(rem)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  title="Edit Reminder"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Delete Reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
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
