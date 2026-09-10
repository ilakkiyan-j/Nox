import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Circle, Compass, Edit2, Trash2, X, Save, FileCode, Check, AlertCircle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface GoalsViewProps {
  goals: any[];
  onRefresh: () => void;
}

const EXAMPLE_JSON_PLAN = JSON.stringify(
  {
    title: 'FDE Mastery & Agentic Systems',
    description: 'Structured roadmap to master Full-Stack Forward Deployed Engineering & AI Agents',
    milestones: [
      {
        title: 'Phase 1: Architecture & Backend Fundamentals',
        description: 'Core REST, Express, Node.js, and Prisma schema design',
        tasks: [
          { title: 'Master Node.js Event Loop & Express Middleware', priority: 'HIGH' },
          { title: 'Design Normalized SQLite / PostgreSQL Schemas', priority: 'MEDIUM' },
        ],
      },
      {
        title: 'Phase 2: AI Agent Integration & Tool Calling',
        description: 'LLM function calling, vector stores, and prompt orchestration',
        tasks: [
          { title: 'Implement Agentic Tool Router & Error Recovery', priority: 'URGENT' },
          { title: 'Build Automated Playwright Verification Suite', priority: 'HIGH' },
        ],
      },
    ],
  },
  null,
  2
);

export default function GoalsView({ goals, onRefresh }: GoalsViewProps) {
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showCreateRoadmap, setShowCreateRoadmap] = useState(false);
  const [roadmapMode, setRoadmapMode] = useState<'manual' | 'json'>('manual');
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [editingRoadmap, setEditingRoadmap] = useState<any | null>(null);

  // Modal Dialog States
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    initialValue?: string;
    onSubmit: (val: string) => void;
  }>({ isOpen: false, title: '', onSubmit: () => {} });

  // Goal Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Roadmap Form State
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [roadmapDescription, setRoadmapDescription] = useState('');

  // JSON Import Form State
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, targetDate }),
      });
      setTitle('');
      setDescription('');
      setTargetDate('');
      setShowCreateGoal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Goal',
      message: 'Are you sure you want to delete this Goal and all linked roadmaps?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/goals/${goalId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapTitle.trim() || !selectedGoalId) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: selectedGoalId,
          title: roadmapTitle,
          description: roadmapDescription,
        }),
      });
      setRoadmapTitle('');
      setRoadmapDescription('');
      setShowCreateRoadmap(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleJsonInputChange = (val: string) => {
    setJsonInput(val);
    if (!val.trim()) {
      setJsonError(null);
      setParsedPreview(null);
      return;
    }

    try {
      const parsed = JSON.parse(val);
      if (!parsed.title || typeof parsed.title !== 'string') {
        setJsonError('Validation Error: Expected "title" string property');
        setParsedPreview(null);
        return;
      }
      if (!parsed.milestones || !Array.isArray(parsed.milestones) || parsed.milestones.length === 0) {
        setJsonError('Validation Error: Expected "milestones" non-empty array');
        setParsedPreview(null);
        return;
      }

      setJsonError(null);
      setParsedPreview(parsed);
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
      setParsedPreview(null);
    }
  };

  const handleImportJsonRoadmap = async () => {
    if (!parsedPreview) return;
    setImporting(true);

    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: selectedGoalId || undefined,
          title: parsedPreview.title,
          description: parsedPreview.description,
          milestones: parsedPreview.milestones,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setJsonError(data.error?.message || 'Import failed');
        return;
      }

      setJsonInput('');
      setParsedPreview(null);
      setJsonError(null);
      setShowCreateRoadmap(false);
      onRefresh();
    } catch (err: any) {
      setJsonError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleUpdateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoadmap) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps/${editingRoadmap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingRoadmap.title,
          description: editingRoadmap.description,
        }),
      });
      setEditingRoadmap(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoadmap = (roadmapId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Roadmap',
      message: 'Are you sure you want to delete this Roadmap?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps/${roadmapId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Checkpoint',
      message: 'Are you sure you want to delete this Checkpoint / Milestone?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/milestones/${milestoneId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleToggleMilestone = async (milestoneId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED';
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMilestone = (goalId: string, roadmapId: string) => {
    setPromptState({
      isOpen: true,
      title: 'New Checkpoint / Milestone',
      placeholder: 'Milestone Title (e.g. Phase 1: Setup Architecture)',
      initialValue: '',
      onSubmit: async (val: string) => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/milestones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goalId,
              roadmapId,
              title: val,
            }),
          });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleRenameMilestone = (milestoneId: string, currentTitle: string) => {
    setPromptState({
      isOpen: true,
      title: 'Edit Checkpoint Title',
      placeholder: 'Checkpoint Title',
      initialValue: currentTitle,
      onSubmit: async (val: string) => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/milestones/${milestoneId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: val }),
          });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
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
            <span>Goals & Roadmaps</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            High-level outcome targets and structured progression roadmaps.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowCreateRoadmap(!showCreateRoadmap);
              setShowCreateGoal(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/40 flex items-center space-x-1.5 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>New Roadmap</span>
          </button>
          <button
            onClick={() => {
              setShowCreateGoal(!showCreateGoal);
              setShowCreateRoadmap(false);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Create Goal Form */}
      {showCreateGoal && (
        <form onSubmit={handleCreateGoal} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Create New Outcome Goal</span>
            </h3>
            <button type="button" onClick={() => setShowCreateGoal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Close goal form">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Goal Title</label>
            <input
              type="text"
              placeholder="e.g. Become a Senior Forward Deployed Engineer (FDE)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Description & Success Criteria</label>
            <textarea
              rows={3}
              placeholder="Define success metrics, scope, and key deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Target Completion Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-end justify-end space-x-2 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setShowCreateGoal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm">
                Save Outcome Goal
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Create / Import Roadmap Modal */}
      {showCreateRoadmap && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Create Progression Roadmap</span>
            </h3>
            <div className="flex items-center space-x-2">
              {/* Mode Switcher Tabs */}
              <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setRoadmapMode('manual')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    roadmapMode === 'manual'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setRoadmapMode('json')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    roadmapMode === 'json'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Import JSON / Plan</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateRoadmap(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                aria-label="Close roadmap form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Link to Target Goal (Optional)</label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Select Target Goal...</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          {roadmapMode === 'manual' ? (
            <form onSubmit={handleCreateRoadmap} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Roadmap Title</label>
                <input
                  type="text"
                  placeholder="Roadmap Title (e.g. FDE Foundation & Agent Systems)"
                  value={roadmapTitle}
                  onChange={(e) => setRoadmapTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Roadmap Description & Strategy</label>
                <textarea
                  rows={4}
                  placeholder="Describe this roadmap's vision, key outcomes, and multi-phase progression strategy..."
                  value={roadmapDescription}
                  onChange={(e) => setRoadmapDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600 leading-relaxed"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoadmap(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm">
                  Save Roadmap
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Paste structured JSON plan defining roadmap, milestones, and tasks:</span>
                <button
                  type="button"
                  onClick={() => handleJsonInputChange(EXAMPLE_JSON_PLAN)}
                  className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center space-x-1"
                >
                  <span>Load Example Plan</span>
                </button>
              </div>

              <textarea
                rows={8}
                placeholder="Paste JSON plan here..."
                value={jsonInput}
                onChange={(e) => handleJsonInputChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-inner"
              />

              {/* Validation Status / Error Message */}
              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{jsonError}</span>
                </div>
              )}

              {/* Interactive Visual Tree Preview */}
              {parsedPreview && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Valid Plan Preview</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold font-mono">
                      {parsedPreview.milestones?.length || 0} Milestones
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">{parsedPreview.title}</h4>
                    {parsedPreview.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{parsedPreview.description}</p>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {parsedPreview.milestones?.map((m: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.title}</p>
                        {m.tasks && (
                          <div className="pl-3 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                            {m.tasks.map((t: any, tIdx: number) => (
                              <div key={tIdx} className="flex items-center space-x-1.5">
                                <span className="text-slate-400">└─</span>
                                <span>{t.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoadmap(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportJsonRoadmap}
                  disabled={!parsedPreview || importing}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
                >
                  {importing ? 'Importing...' : 'Import Roadmap Plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Goal Form */}
      {editingGoal && (
        <form onSubmit={handleUpdateGoal} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Goal Details</h3>
            <button type="button" onClick={() => setEditingGoal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Close edit goal form">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Goal Title</label>
            <input
              type="text"
              value={editingGoal.title}
              onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Description</label>
            <textarea
              value={editingGoal.description || ''}
              onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Status</label>
              <select
                value={editingGoal.status || 'IN_PROGRESS'}
                onChange={(e) => setEditingGoal({ ...editingGoal, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="NOT_STARTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">NOT_STARTED</option>
                <option value="IN_PROGRESS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">IN_PROGRESS</option>
                <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">COMPLETED</option>
                <option value="ON_HOLD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ON_HOLD</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Target Completion Date</label>
              <input
                type="date"
                value={editingGoal.targetDate ? new Date(editingGoal.targetDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-1">
            <button type="button" onClick={() => setEditingGoal(null)} className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center space-x-1 shadow-xs">
              <Save className="w-3.5 h-3.5" />
              <span>Update Goal</span>
            </button>
          </div>
        </form>
      )}

      {/* Edit Roadmap Form */}
      {editingRoadmap && (
        <form onSubmit={handleUpdateRoadmap} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Roadmap</h3>
            <button type="button" onClick={() => setEditingRoadmap(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Close edit roadmap form">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={editingRoadmap.title}
            onChange={(e) => setEditingRoadmap({ ...editingRoadmap, title: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <textarea
            value={editingRoadmap.description || ''}
            onChange={(e) => setEditingRoadmap({ ...editingRoadmap, description: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
          />
          <div className="flex justify-end space-x-2">
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center space-x-1">
              <Save className="w-3.5 h-3.5" />
              <span>Update Roadmap</span>
            </button>
          </div>
        </form>
      )}

      {/* Goals & Roadmaps Feed */}
      {goals.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <Target className="w-10 h-10 mx-auto text-indigo-300 dark:text-indigo-700" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No goals yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Create your first outcome goal, then link structured roadmaps with checkpoints and tasks to track progress over time.
          </p>
          <button
            onClick={() => {
              setShowCreateGoal(true);
              setShowCreateRoadmap(false);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <div key={goal.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                  {goal.status}
                </span>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mt-1">{goal.title}</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setEditingGoal(goal)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  title="Edit Goal"
                  aria-label="Edit Goal"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Delete Goal"
                  aria-label="Delete Goal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {goal.description && <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{goal.description}</p>}

            {/* Linked Roadmaps */}
            {goal.roadmaps && goal.roadmaps.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Roadmaps & Checkpoints</span>
                </h4>

                {goal.roadmaps.map((rm: any) => (
                  <div key={rm.id} className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{rm.title}</p>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleAddMilestone(goal.id, rm.id)}
                          className="p-1 text-indigo-600 dark:text-indigo-400 hover:underline text-[10px] font-semibold flex items-center space-x-0.5"
                          title="Add Checkpoint"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Checkpoint</span>
                        </button>
                        <button
                          onClick={() => setEditingRoadmap(rm)}
                          className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          title="Edit Roadmap"
                          aria-label="Edit Roadmap"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoadmap(rm.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                          title="Delete Roadmap"
                          aria-label="Delete Roadmap"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {rm.milestones && rm.milestones.length > 0 && (
                      <div className="space-y-1.5 pl-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                        {rm.milestones.map((ms: any) => (
                          <div key={ms.id} className="flex items-center justify-between group/ms text-xs py-0.5">
                            <button
                              onClick={() => handleToggleMilestone(ms.id, ms.status)}
                              className="flex items-center space-x-2 cursor-pointer select-none text-left"
                              aria-pressed={ms.status === 'COMPLETED'}
                              aria-label={ms.status === 'COMPLETED' ? `Mark ${ms.title} as not completed` : `Mark ${ms.title} as completed`}
                            >
                              {ms.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className={ms.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}>
                                {ms.title}
                              </span>
                            </button>
                            <div className="flex items-center space-x-1 opacity-0 group-hover/ms:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRenameMilestone(ms.id, ms.title)}
                                className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                title="Edit Checkpoint Title"
                                aria-label="Edit Checkpoint Title"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMilestone(ms.id)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                                title="Delete Checkpoint"
                                aria-label="Delete Checkpoint"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Reusable Confirmation & Prompt Modals */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
      />

      <PromptModal
        isOpen={promptState.isOpen}
        title={promptState.title}
        placeholder={promptState.placeholder}
        initialValue={promptState.initialValue}
        onSubmit={promptState.onSubmit}
        onClose={() => setPromptState({ ...promptState, isOpen: false })}
      />
    </div>
  );
}
