'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
  Target,
  Compass,
  GraduationCap,
  Calendar,
  Filter,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface TasksViewProps {
  tasks: any[];
  goals?: any[];
  roadmaps?: any[];
  learning?: any[];
  events?: any[];
  onRefresh: () => void;
}

type AssocType = 'STANDALONE' | 'GOAL' | 'ROADMAP' | 'LEARNING' | 'EVENT';

export default function TasksView({
  tasks,
  goals = [],
  roadmaps = [],
  learning = [],
  events = [],
  onRefresh,
}: TasksViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [assocFilter, setAssocFilter] = useState<'ALL' | 'GOAL' | 'ROADMAP' | 'LEARNING' | 'EVENT' | 'STANDALONE'>('ALL');

  // Task Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [dueDate, setDueDate] = useState('');
  const [assocType, setAssocType] = useState<AssocType>('STANDALONE');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('');
  const [selectedLearningId, setSelectedLearningId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  // Task Edit Form State
  const [editAssocType, setEditAssocType] = useState<AssocType>('STANDALONE');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('HIGH');
    setAssocType('STANDALONE');
    setSelectedGoalId('');
    setSelectedRoadmapId('');
    setSelectedLearningId('');
    setSelectedEventId('');
    setShowCreate(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          dueDate: dueDate || null,
          goalId: assocType === 'GOAL' ? selectedGoalId || null : null,
          roadmapId: assocType === 'ROADMAP' ? selectedRoadmapId || null : null,
          learningId: assocType === 'LEARNING' ? selectedLearningId || null : null,
          eventId: assocType === 'EVENT' ? selectedEventId || null : null,
        }),
      });

      resetCreateForm();
      onRefresh();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleStartEdit = (task: any) => {
    let detectedAssoc: AssocType = 'STANDALONE';
    if (task.goalId) detectedAssoc = 'GOAL';
    else if (task.roadmapId) detectedAssoc = 'ROADMAP';
    else if (task.learningId) detectedAssoc = 'LEARNING';
    else if (task.eventId) detectedAssoc = 'EVENT';

    setEditAssocType(detectedAssoc);
    setEditingTask({
      ...task,
      goalId: task.goalId || '',
      roadmapId: task.roadmapId || '',
      learningId: task.learningId || '',
      eventId: task.eventId || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate || null,
          goalId: editAssocType === 'GOAL' ? editingTask.goalId || null : null,
          roadmapId: editAssocType === 'ROADMAP' ? editingTask.roadmapId || null : null,
          learningId: editAssocType === 'LEARNING' ? editingTask.learningId || null : null,
          eventId: editAssocType === 'EVENT' ? editingTask.eventId || null : null,
        }),
      });
      setEditingTask(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Task',
      message: 'Are you sure you want to permanently delete this task?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/tasks/${taskId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleClearCompletedTasks = () => {
    const count = tasks.filter((t) => t.status === 'COMPLETED').length;
    if (count === 0) return;

    setConfirmState({
      isOpen: true,
      title: 'Clear Completed Tasks',
      message: `Are you sure you want to permanently delete all ${count} completed tasks? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/tasks/completed`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
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

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      // Priority
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
        return false;
      }
      // Association
      if (assocFilter === 'GOAL' && !t.goalId) return false;
      if (assocFilter === 'ROADMAP' && !t.roadmapId) return false;
      if (assocFilter === 'LEARNING' && !t.learningId) return false;
      if (assocFilter === 'EVENT' && !t.eventId) return false;
      if (assocFilter === 'STANDALONE' && (t.goalId || t.roadmapId || t.learningId || t.eventId)) return false;

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, assocFilter]);

  const pendingTasks = filteredTasks.filter((t) => t.status !== 'COMPLETED');
  const completedTasks = filteredTasks.filter((t) => t.status === 'COMPLETED');
  const totalCompletedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  const renderAssociationBadge = (task: any) => {
    if (task.goalId) {
      const gTitle = task.goal?.title || goals.find((g) => g.id === task.goalId)?.title || 'Goal';
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
          <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span className="truncate max-w-[140px]">{gTitle}</span>
        </span>
      );
    }
    if (task.roadmapId) {
      const rTitle = task.roadmap?.title || roadmaps.find((r) => r.id === task.roadmapId)?.title || 'Roadmap';
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300">
          <Compass className="w-3 h-3 text-violet-600 dark:text-violet-400" />
          <span className="truncate max-w-[140px]">{rTitle}</span>
        </span>
      );
    }
    if (task.learningId) {
      const lTitle = task.learning?.title || learning.find((l) => l.id === task.learningId)?.title || 'Learning';
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
          <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span className="truncate max-w-[140px]">{lTitle}</span>
        </span>
      );
    }
    if (task.eventId) {
      const eTitle = task.event?.title || events.find((e) => e.id === task.eventId)?.title || 'Event';
      return (
        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
          <Calendar className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span className="truncate max-w-[140px]">{eTitle}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        Standalone
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Mobile-Optimized Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Tasks & Action Items</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            High-leverage action items tied to outcomes, roadmaps, learning tracks, or standalone execution.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showCreate ? 'Close Form' : 'New Task'}</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-[11px] font-semibold">
          {(['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                priorityFilter === p
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p === 'ALL' ? 'All Priorities' : p}
            </button>
          ))}
        </div>

        {/* Association Filter Dropdown */}
        <div className="flex items-center space-x-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={assocFilter}
            onChange={(e) => setAssocFilter(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Associations</option>
            <option value="STANDALONE">Standalone Only</option>
            <option value="GOAL">🎯 Tied to Goals</option>
            <option value="ROADMAP">🧭 Tied to Roadmaps</option>
            <option value="LEARNING">🎓 Tied to Learning</option>
            <option value="EVENT">📅 Tied to Events</option>
          </select>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreate && (
        <form
          onSubmit={handleCreateTask}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 shadow-md space-y-4 transition-all"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Create Action Item</span>
            </h3>
            <button
              type="button"
              onClick={resetCreateForm}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Task Title (e.g. Implement Database Migration Scripts)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
            required
          />

          <textarea
            placeholder="Task description & context..."
            value={description}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🔵 Medium</option>
                <option value="HIGH">🟠 High</option>
                <option value="URGENT">🔴 Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Associate With</label>
              <select
                value={assocType}
                onChange={(e) => setAssocType(e.target.value as AssocType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="STANDALONE">None (Standalone)</option>
                <option value="GOAL">🎯 Goal</option>
                <option value="ROADMAP">🧭 Roadmap</option>
                <option value="LEARNING">🎓 Learning Track</option>
                <option value="EVENT">📅 Event</option>
              </select>
            </div>

            {/* Contextual selector based on association */}
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">
                {assocType === 'GOAL'
                  ? 'Select Goal'
                  : assocType === 'ROADMAP'
                  ? 'Select Roadmap'
                  : assocType === 'LEARNING'
                  ? 'Select Learning Track'
                  : assocType === 'EVENT'
                  ? 'Select Event'
                  : 'Context Link'}
              </label>

              {assocType === 'GOAL' && (
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      🎯 {g.title}
                    </option>
                  ))}
                </select>
              )}

              {assocType === 'ROADMAP' && (
                <select
                  value={selectedRoadmapId}
                  onChange={(e) => setSelectedRoadmapId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Roadmap</option>
                  {roadmaps.map((r) => (
                    <option key={r.id} value={r.id}>
                      🧭 {r.title}
                    </option>
                  ))}
                </select>
              )}

              {assocType === 'LEARNING' && (
                <select
                  value={selectedLearningId}
                  onChange={(e) => setSelectedLearningId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Course/Track</option>
                  {learning.map((l) => (
                    <option key={l.id} value={l.id}>
                      🎓 {l.title}
                    </option>
                  ))}
                </select>
              )}

              {assocType === 'EVENT' && (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      📅 {ev.title}
                    </option>
                  ))}
                </select>
              )}

              {assocType === 'STANDALONE' && (
                <input
                  type="text"
                  disabled
                  value="Independent Action"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 italic"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={resetCreateForm}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Edit Task Form */}
      {editingTask && (
        <form
          onSubmit={handleUpdateTask}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <Edit2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Edit Action Item Details</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Task Title</label>
            <input
              type="text"
              value={editingTask.title}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Description</label>
            <textarea
              value={editingTask.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Priority Level</label>
              <select
                value={editingTask.priority || 'MEDIUM'}
                onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🔵 Medium</option>
                <option value="HIGH">🟠 High</option>
                <option value="URGENT">🔴 Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Due Date</label>
              <input
                type="date"
                value={editingTask.dueDate || ''}
                onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Association Type</label>
              <select
                value={editAssocType}
                onChange={(e) => setEditAssocType(e.target.value as AssocType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="STANDALONE">None (Standalone)</option>
                <option value="GOAL">🎯 Goal</option>
                <option value="ROADMAP">🧭 Roadmap</option>
                <option value="LEARNING">🎓 Learning Track</option>
                <option value="EVENT">📅 Event</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Linked Entity</label>
              {editAssocType === 'GOAL' && (
                <select
                  value={editingTask.goalId || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, goalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      🎯 {g.title}
                    </option>
                  ))}
                </select>
              )}

              {editAssocType === 'ROADMAP' && (
                <select
                  value={editingTask.roadmapId || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, roadmapId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Roadmap</option>
                  {roadmaps.map((r) => (
                    <option key={r.id} value={r.id}>
                      🧭 {r.title}
                    </option>
                  ))}
                </select>
              )}

              {editAssocType === 'LEARNING' && (
                <select
                  value={editingTask.learningId || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, learningId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Learning Track</option>
                  {learning.map((l) => (
                    <option key={l.id} value={l.id}>
                      🎓 {l.title}
                    </option>
                  ))}
                </select>
              )}

              {editAssocType === 'EVENT' && (
                <select
                  value={editingTask.eventId || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, eventId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">— Choose Event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      📅 {ev.title}
                    </option>
                  ))}
                </select>
              )}

              {editAssocType === 'STANDALONE' && (
                <input
                  type="text"
                  disabled
                  value="Independent Action"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 italic"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Task</span>
            </button>
          </div>
        </form>
      )}

      {/* Pending Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Action Items ({pendingTasks.length})
          </h3>
          {(searchQuery || priorityFilter !== 'ALL' || assocFilter !== 'ALL') && (
            <span className="text-[11px] text-slate-400">
              Filtered from {tasks.filter((t) => t.status !== 'COMPLETED').length} total
            </span>
          )}
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <CheckSquare className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {searchQuery || priorityFilter !== 'ALL' || assocFilter !== 'ALL'
                ? 'No tasks match current filter'
                : 'All tasks completed!'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery || priorityFilter !== 'ALL' || assocFilter !== 'ALL'
                ? 'Try resetting the search or filter pills.'
                : 'Your task pipeline is completely clear.'}
            </p>
          </div>
        ) : (
          pendingTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-3"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <button
                  onClick={() => handleToggleTask(task.id, task.status)}
                  className="w-5 h-5 rounded-lg border border-slate-300 dark:border-slate-600 hover:border-emerald-600 text-transparent bg-slate-50 dark:bg-slate-800 mt-0.5 shrink-0 transition-all cursor-pointer flex items-center justify-center"
                  title="Mark Complete"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    {renderAssociationBadge(task)}
                    {task.dueDate && (
                      <span className="text-slate-500 dark:text-slate-400 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                    task.priority === 'URGENT'
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                      : task.priority === 'HIGH'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      : task.priority === 'MEDIUM'
                      ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {task.priority === 'URGENT' ? '🔴' : task.priority === 'HIGH' ? '🟠' : task.priority === 'MEDIUM' ? '🔵' : '🟢'}{' '}
                  {task.priority}
                </span>
                <button
                  onClick={() => handleStartEdit(task)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
                  title="Edit Task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Completed Tasks List with Bulk Clear Action */}
      {completedTasks.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Completed Tasks ({completedTasks.length})
            </h3>
            <button
              onClick={handleClearCompletedTasks}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Permanently remove all completed tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Completed ({totalCompletedCount})</span>
            </button>
          </div>

          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between opacity-80 hover:opacity-100 transition-all gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className="w-5 h-5 rounded-lg bg-emerald-600 border border-emerald-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                    title="Mark Incomplete"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <div className="min-w-0 flex items-center space-x-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-through truncate">
                      {task.title}
                    </span>
                    {renderAssociationBadge(task)}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors shrink-0"
                  title="Delete Task"
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
