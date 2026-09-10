'use client';

import React, { useState } from 'react';
import { Target, Plus, X, Save, Edit2, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface GoalsViewProps {
  goals: any[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
  COMPLETED: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
  NOT_STARTED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  ON_HOLD: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
};

export default function GoalsView({ goals, onRefresh }: GoalsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors';
  const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, targetDate }),
      });
      setTitle(''); setDescription(''); setTargetDate('');
      setShowCreate(false);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/goals/${editingGoal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingGoal.title,
          description: editingGoal.description,
          status: editingGoal.status,
          targetDate: editingGoal.targetDate || null,
        }),
      });
      setEditingGoal(null);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleDelete = (id: string, title: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Goal',
      message: `Delete "${title}" and all linked roadmaps, tasks and notes?`,
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/goals/${id}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) { console.error(err); }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Goals</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            High-level outcome targets you're working toward.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>New Outcome Goal</span>
            </h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className={labelCls}>Goal Title</label>
            <input
              type="text"
              placeholder="e.g. Become a Senior Forward Deployed Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Description & Success Criteria</label>
            <textarea
              rows={3}
              placeholder="Define success metrics, scope, and key deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} leading-relaxed resize-none`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Target Completion Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex items-end justify-end space-x-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer">
                Save Goal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingGoal && (
        <form onSubmit={handleUpdate} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Goal</h3>
            <button type="button" onClick={() => setEditingGoal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input type="text" value={editingGoal.title}
              onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
              className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={3} value={editingGoal.description || ''}
              onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
              className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={editingGoal.status || 'IN_PROGRESS'}
                onChange={(e) => setEditingGoal({ ...editingGoal, status: e.target.value })}
                className={`${inputCls} appearance-none`}>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Target Date</label>
              <input type="date"
                value={editingGoal.targetDate ? new Date(editingGoal.targetDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-1">
            <button type="button" onClick={() => setEditingGoal(null)}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer">
              <Save className="w-3.5 h-3.5" />
              <span>Update Goal</span>
            </button>
          </div>
        </form>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <Target className="w-10 h-10 mx-auto text-indigo-300 dark:text-indigo-700" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No goals yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Create your first outcome goal. Then go to the Roadmaps tab to build structured progression plans.
          </p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer">
            <Plus className="w-4 h-4" /><span>New Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => {
            const roadmapCount = goal.roadmaps?.length ?? 0;
            const milestoneCount = goal.milestones?.length ?? 0;
            const completedMilestones = (goal.milestones ?? []).filter((m: any) => m.status === 'COMPLETED').length;
            const progress = milestoneCount > 0 ? Math.round((completedMilestones / milestoneCount) * 100) : 0;

            return (
              <div key={goal.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${STATUS_COLORS[goal.status] || STATUS_COLORS.IN_PROGRESS}`}>
                      {goal.status?.replace('_', ' ')}
                    </span>
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mt-1.5 leading-tight">{goal.title}</h3>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button onClick={() => setEditingGoal(goal)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                      title="Edit Goal">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(goal.id, goal.title)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Goal">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {goal.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{goal.description}</p>
                )}

                {/* Progress */}
                {milestoneCount > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <span>PROGRESS</span>
                      <span>{completedMilestones}/{milestoneCount} milestones</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Meta badges */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {roadmapCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-mono">
                      {roadmapCount} roadmap{roadmapCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {goal.targetDate && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Due {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
