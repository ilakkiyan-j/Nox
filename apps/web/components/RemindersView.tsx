'use client';

import React, { useState } from 'react';
import {
  Bell,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  Save,
  AlarmClock,
  Calendar,
  Zap,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface RemindersViewProps {
  reminders: any[];
  events?: any[];
  onRefresh: () => void;
}

export default function RemindersView({ reminders, events = [], onRefresh }: RemindersViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Create Form State
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  const formatDateTimeForInput = (val?: string | Date | null) => {
    if (!val) return '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return val;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const handleSyncEventDate = (eventId: string, isEditing = false) => {
    if (!eventId) return;
    const ev = events.find((e) => e.id === eventId);
    if (!ev || !ev.date) return;

    try {
      const d = new Date(ev.date);
      let hours = 9;
      let minutes = 0;

      if (ev.startTime) {
        const timeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(ev.startTime.trim());
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = (timeMatch[3] || '').toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          hours = h;
          minutes = m;
        }
      }

      d.setHours(hours, minutes, 0, 0);
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

      if (isEditing && editingReminder) {
        setEditingReminder({ ...editingReminder, remindAt: formatted, entityId: eventId, entityType: 'EVENT' });
      } else {
        setRemindAt(formatted);
      }
    } catch (err) {
      console.error('Error syncing event date:', err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          remindAt,
          entityType: selectedEventId ? 'EVENT' : null,
          entityId: selectedEventId || null,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTitle('');
        setRemindAt('');
        setSelectedEventId('');
        setShowCreate(false);
        onRefresh();
      } else {
        alert(data.error?.message || 'Failed to create reminder.');
      }
    } catch (err) {
      console.error('Error creating reminder:', err);
    }
  };

  const handleStartEdit = (rem: any) => {
    setEditingReminder({
      ...rem,
      remindAt: formatDateTimeForInput(rem.remindAt),
      entityId: rem.entityId || '',
      entityType: rem.entityType || '',
    });
  };

  const handleUpdateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder) return;

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/reminders/${editingReminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingReminder.title,
          remindAt: editingReminder.remindAt,
          entityType: editingReminder.entityId ? 'EVENT' : null,
          entityId: editingReminder.entityId || null,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setEditingReminder(null);
        onRefresh();
      } else {
        alert(data.error?.message || 'Failed to update reminder.');
      }
    } catch (err) {
      console.error('Error updating reminder:', err);
    }
  };

  const handleToggleReminder = async (id: string, currentIsCompleted: boolean) => {
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/reminders/${id}`, {
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
      message: 'Are you sure you want to permanently delete this reminder?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/reminders/${id}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleClearCompletedReminders = () => {
    const count = reminders.filter((r) => r.isCompleted).length;
    if (count === 0) return;

    setConfirmState({
      isOpen: true,
      title: 'Clear Completed Reminders',
      message: `Are you sure you want to permanently delete all ${count} completed reminders? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/reminders/completed`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const completedReminders = reminders.filter((r) => r.isCompleted);

  const getAssociatedEventTitle = (rem: any) => {
    if (rem.entityType === 'EVENT' && rem.entityId) {
      const ev = events.find((e) => e.id === rem.entityId);
      return ev?.title || 'Linked Event';
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with Mobile Responsive Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <AlarmClock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>Reminders & Prompts</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Time-based prompts standalone or linked to submission dates and calendar events.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showCreate ? 'Close Form' : 'New Reminder'}</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateReminder}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Set Reminder Prompt</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Reminder Title (e.g. Prepare Project Submission Draft)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Link to Event (Submission Dates / Deadlines)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  if (e.target.value) handleSyncEventDate(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="">— Standalone Reminder (No Event)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    📅 {ev.title} ({new Date(ev.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Remind Date &amp; Time
                </label>
                {selectedEventId && (
                  <button
                    type="button"
                    onClick={() => handleSyncEventDate(selectedEventId)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Sync with Event Date</span>
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600 [color-scheme:light] dark:[color-scheme:dark]"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Save Reminder
            </button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingReminder && (
        <form
          onSubmit={handleUpdateReminder}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Edit Reminder Prompt</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingReminder(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Title</label>
            <input
              type="text"
              value={editingReminder.title}
              onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Linked Event
              </label>
              <select
                value={editingReminder.entityId || ''}
                onChange={(e) => {
                  setEditingReminder({ ...editingReminder, entityId: e.target.value, entityType: e.target.value ? 'EVENT' : null });
                  if (e.target.value) handleSyncEventDate(e.target.value, true);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="">— Standalone Reminder (No Event)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    📅 {ev.title} ({new Date(ev.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Remind Date &amp; Time
                </label>
                {editingReminder.entityId && (
                  <button
                    type="button"
                    onClick={() => handleSyncEventDate(editingReminder.entityId, true)}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Sync with Event Date</span>
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={editingReminder.remindAt}
                onChange={(e) => setEditingReminder({ ...editingReminder, remindAt: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600 [color-scheme:light] dark:[color-scheme:dark]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingReminder(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Reminder</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Reminders List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Active Prompts ({activeReminders.length})
        </h3>

        {activeReminders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <AlarmClock className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No active reminders</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add a reminder for upcoming submission dates or focus areas.
            </p>
          </div>
        ) : (
          activeReminders.map((rem) => {
            const eventTitle = getAssociatedEventTitle(rem);
            return (
              <div
                key={rem.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-3"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleReminder(rem.id, rem.isCompleted)}
                    className="w-5 h-5 rounded-lg border border-slate-300 dark:border-slate-600 hover:border-emerald-600 text-transparent bg-slate-50 dark:bg-slate-800 mt-0.5 shrink-0 transition-all cursor-pointer flex items-center justify-center"
                    title="Mark Completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{rem.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {eventTitle && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                          <Calendar className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span className="truncate max-w-[150px]">{eventTitle}</span>
                        </span>
                      )}
                      <span className="text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(rem.remindAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleStartEdit(rem)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
                    title="Edit Reminder"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completed Reminders List with Bulk Clear Action */}
      {completedReminders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Completed Prompts ({completedReminders.length})
            </h3>
            <button
              onClick={handleClearCompletedReminders}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Permanently remove all completed reminders"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Completed ({completedReminders.length})</span>
            </button>
          </div>

          <div className="space-y-2">
            {completedReminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between opacity-75 hover:opacity-100 transition-all gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => handleToggleReminder(rem.id, rem.isCompleted)}
                    className="w-5 h-5 rounded-lg bg-emerald-600 border border-emerald-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                    title="Mark Incomplete"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <div className="min-w-0 flex items-center space-x-2">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 line-through truncate">
                      {rem.title}
                    </span>
                    {getAssociatedEventTitle(rem) && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        (📅 {getAssociatedEventTitle(rem)})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors shrink-0"
                  title="Delete Reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
