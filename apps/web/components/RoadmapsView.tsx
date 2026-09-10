'use client';

import React, { useState, useMemo } from 'react';
import {
  Compass, Plus, X, Save, Edit2, Trash2, CheckCircle2, Circle,
  ChevronDown, ChevronRight, FileCode, Check, AlertCircle, Layers,
  Search, Filter, Maximize2, Minimize2, Eye, LayoutGrid, ListFilter,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface RoadmapsViewProps {
  roadmaps: any[];
  goals: any[];
  onRefresh: () => void;
}

interface PhaseRow {
  id: string; // temp local id for keying
  title: string;
  description: string;
}

const STATUS_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
  COMPLETED: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
  NOT_STARTED: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  ON_HOLD: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
};

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-colors';
const labelCls = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';

const PREVIEW_PHASE_COUNT = 3;

// JSON import example
const EXAMPLE_JSON = JSON.stringify({
  title: 'FDE Mastery & Agentic Systems',
  description: 'Structured roadmap to master Full-Stack Forward Deployed Engineering & AI Agents',
  milestones: [
    {
      title: 'Phase 1: Architecture & Backend Fundamentals',
      description: 'Core REST, Express, Node.js, and Prisma schema design',
    },
    {
      title: 'Phase 2: AI Agent Integration & Tool Calling',
      description: 'LLM function calling, vector stores, and prompt orchestration',
    },
  ],
}, null, 2);

function newPhaseRow(): PhaseRow {
  return { id: Math.random().toString(36).slice(2), title: '', description: '' };
}

export default function RoadmapsView({ roadmaps, goals, onRefresh }: RoadmapsViewProps) {
  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<'manual' | 'json'>('manual');
  const [rmTitle, setRmTitle] = useState('');
  const [rmDescription, setRmDescription] = useState('');
  const [rmGoalId, setRmGoalId] = useState('');
  const [phases, setPhases] = useState<PhaseRow[]>([newPhaseRow()]);
  const [saving, setSaving] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [goalFilter, setGoalFilter] = useState('ALL');

  // JSON import state
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [jsonGoalId, setJsonGoalId] = useState('');
  const [importing, setImporting] = useState(false);

  // Card view state: expansion of roadmap cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  // Card view state: full phase list vs preview top 3
  const [showAllPhases, setShowAllPhases] = useState<Record<string, boolean>>({});

  // Focus View Modal for dedicated roadmap inspection
  const [focusedRoadmapId, setFocusedRoadmapId] = useState<string | null>(null);

  // Editing roadmap
  const [editingRoadmap, setEditingRoadmap] = useState<any | null>(null);

  // Adding phase inline on a card
  const [addingPhaseFor, setAddingPhaseFor] = useState<string | null>(null);
  const [newPhaseTitle, setNewPhaseTitle] = useState('');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');

  // Editing a phase
  const [editingPhase, setEditingPhase] = useState<any | null>(null);

  // Global error banner
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Confirm modal
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const toggleExpand = (id: string) =>
    setExpandedCards((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));

  const toggleShowAllPhases = (id: string) =>
    setShowAllPhases((prev) => ({ ...prev, [id]: !prev[id] }));

  // Global expand/collapse toggle
  const allCollapsed = useMemo(() => {
    if (roadmaps.length === 0) return true;
    return roadmaps.every((rm) => expandedCards[rm.id] === false);
  }, [roadmaps, expandedCards]);

  const toggleAllExpanded = () => {
    const shouldExpand = allCollapsed;
    const updated: Record<string, boolean> = {};
    roadmaps.forEach((rm) => {
      updated[rm.id] = shouldExpand;
    });
    setExpandedCards(updated);
  };

  // Filtered roadmaps calculation
  const filteredRoadmaps = useMemo(() => {
    return roadmaps.filter((rm) => {
      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rm.title.toLowerCase().includes(q);
        const matchesDesc = rm.description?.toLowerCase().includes(q);
        const matchesPhase = rm.milestones?.some((m: any) => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesPhase) return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && rm.status !== statusFilter) {
        return false;
      }
      // Goal filter
      if (goalFilter !== 'ALL') {
        if (goalFilter === 'NONE' && rm.goalId) return false;
        if (goalFilter !== 'NONE' && rm.goalId !== goalFilter) return false;
      }
      return true;
    });
  }, [roadmaps, searchQuery, statusFilter, goalFilter]);

  // Dynamic focused roadmap record
  const currentFocusedRoadmap = useMemo(() => {
    if (!focusedRoadmapId) return null;
    return roadmaps.find((rm) => rm.id === focusedRoadmapId) || null;
  }, [roadmaps, focusedRoadmapId]);

  // ── Phase rows helpers ────────────────────────────────────────────────────────
  const addPhaseRow = () => setPhases((p) => [...p, newPhaseRow()]);
  const removePhaseRow = (id: string) => setPhases((p) => p.filter((r) => r.id !== id));
  const updatePhaseRow = (id: string, field: 'title' | 'description', val: string) =>
    setPhases((p) => p.map((r) => r.id === id ? { ...r, [field]: val } : r));

  // ── Create roadmap (manual) ───────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmTitle.trim()) return;
    setSaving(true);
    setGlobalError(null);
    try {
      // 1. Create the roadmap
      const rmRes = await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rmTitle,
          description: rmDescription || null,
          goalId: rmGoalId || null,
        }),
      });
      const rmData = await rmRes.json();
      if (!rmData.success) {
        setGlobalError(rmData.error?.message || 'Failed to create roadmap');
        return;
      }
      const roadmapId = rmData.data?.id;

      // 2. Create each valid phase as a milestone
      const validPhases = phases.filter((p) => p.title.trim());
      for (let i = 0; i < validPhases.length; i++) {
        const msRes = await fetchWithUser(`${API_BASE_URL}/api/v1/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roadmapId,
            goalId: rmGoalId || null,
            title: validPhases[i].title,
            description: validPhases[i].description || null,
          }),
        });
        const msData = await msRes.json();
        if (!msData.success) {
          setGlobalError(`Phase ${i + 1} failed: ${msData.error?.message || 'Unknown error'}`);
        }
      }

      setRmTitle(''); setRmDescription(''); setRmGoalId('');
      setPhases([newPhaseRow()]);
      setShowCreate(false);
      onRefresh();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── JSON import ──────────────────────────────────────────────────────────────
  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    if (!val.trim()) { setJsonError(null); setParsedPreview(null); return; }
    try {
      const parsed = JSON.parse(val);
      if (!parsed.title || typeof parsed.title !== 'string') {
        setJsonError('Expected a "title" string'); setParsedPreview(null); return;
      }
      if (!Array.isArray(parsed.milestones) || parsed.milestones.length === 0) {
        setJsonError('Expected "milestones" non-empty array'); setParsedPreview(null); return;
      }
      setJsonError(null); setParsedPreview(parsed);
    } catch (err: any) { setJsonError(`JSON Error: ${err.message}`); setParsedPreview(null); }
  };

  const handleImport = async () => {
    if (!parsedPreview) return;
    setImporting(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: jsonGoalId || undefined,
          title: parsedPreview.title,
          description: parsedPreview.description,
          milestones: parsedPreview.milestones,
        }),
      });
      const data = await res.json();
      if (!data.success) { setJsonError(data.error?.message || 'Import failed'); return; }
      setJsonInput(''); setParsedPreview(null); setJsonError(null);
      setShowCreate(false);
      onRefresh();
    } catch (err: any) { setJsonError(`Import failed: ${err.message}`); }
    finally { setImporting(false); }
  };

  // ── Update roadmap ────────────────────────────────────────────────────────────
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
          status: editingRoadmap.status,
        }),
      });
      setEditingRoadmap(null);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  // ── Delete roadmap ────────────────────────────────────────────────────────────
  const handleDeleteRoadmap = (id: string, title: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Roadmap',
      message: `Delete "${title}" and all its phases?`,
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/roadmaps/${id}`, { method: 'DELETE' });
          if (focusedRoadmapId === id) setFocusedRoadmapId(null);
          onRefresh();
        } catch (err) { console.error(err); }
      },
    });
  };

  // ── Add phase to existing roadmap ─────────────────────────────────────────────
  const handleAddPhase = async (roadmapId: string, goalId?: string) => {
    if (!newPhaseTitle.trim()) return;
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapId,
          goalId: goalId || undefined,
          title: newPhaseTitle,
          description: newPhaseDesc || undefined,
        }),
      });
      setNewPhaseTitle(''); setNewPhaseDesc('');
      setAddingPhaseFor(null);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  // ── Toggle phase complete ──────────────────────────────────────────────────────
  const handleTogglePhase = async (id: string, status: string) => {
    const next = status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED';
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      onRefresh();
    } catch (err) { console.error(err); }
  };

  // ── Update phase ──────────────────────────────────────────────────────────────
  const handleUpdatePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase) return;
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/milestones/${editingPhase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingPhase.title, description: editingPhase.description }),
      });
      setEditingPhase(null);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  // ── Delete phase ──────────────────────────────────────────────────────────────
  const handleDeletePhase = (id: string, title: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Phase',
      message: `Delete phase "${title}"?`,
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/milestones/${id}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) { console.error(err); }
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Compass className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span>Roadmaps</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured phase-by-phase progression plans linked to your goals.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {roadmaps.length > 0 && (
            <button
              onClick={toggleAllExpanded}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title={allCollapsed ? 'Expand All Roadmaps' : 'Collapse All Roadmaps'}
            >
              {allCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
            </button>
          )}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Roadmap</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button onClick={() => setGlobalError(null)} className="text-rose-400 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Search & Filter Controls Bar ── */}
      {roadmaps.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roadmaps or phases..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Goal Filter */}
            <select
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="ALL">All Linked Goals</option>
              <option value="NONE">Standalone (No Goal)</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Create Form ── */}
      {showCreate && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800/60 shadow-xl space-y-5">
          {/* Form header + mode toggle */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>New Roadmap</span>
            </h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => setCreateMode('manual')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    createMode === 'manual'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setCreateMode('json')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    createMode === 'json'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                </button>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {createMode === 'manual' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Link to goal */}
              <div>
                <label className={labelCls}>Link to Goal (optional)</label>
                <select value={rmGoalId} onChange={(e) => setRmGoalId(e.target.value)}
                  className={`${inputCls} appearance-none`}>
                  <option value="">No goal — standalone roadmap</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              {/* Title & description */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelCls}>Roadmap Title</label>
                  <input type="text" value={rmTitle} onChange={(e) => setRmTitle(e.target.value)}
                    placeholder="e.g. FDE Foundation & Agent Systems"
                    className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Description & Strategy</label>
                  <textarea rows={3} value={rmDescription} onChange={(e) => setRmDescription(e.target.value)}
                    placeholder="Describe the vision, key outcomes, and approach of this roadmap..."
                    className={`${inputCls} resize-none leading-relaxed`} />
                </div>
              </div>

              {/* Phases builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls + ' mb-0'}>Phases</label>
                  <span className="text-[10px] text-slate-400 font-mono">{phases.filter(p => p.title.trim()).length} defined</span>
                </div>

                <div className="space-y-3">
                  {phases.map((phase, idx) => (
                    <div key={phase.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5 relative group">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-[10px] font-bold flex items-center justify-center shrink-0 font-mono">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={phase.title}
                          onChange={(e) => updatePhaseRow(phase.id, 'title', e.target.value)}
                          placeholder={`Phase ${idx + 1} title (e.g. Setup Architecture)`}
                          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        {phases.length > 1 && (
                          <button type="button" onClick={() => removePhaseRow(phase.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={phase.description}
                        onChange={(e) => updatePhaseRow(phase.id, 'description', e.target.value)}
                        placeholder="Describe what this phase covers and its key deliverables..."
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addPhaseRow}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>Add Another Phase</span>
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-semibold shadow-sm cursor-pointer">
                  {saving ? 'Saving...' : 'Create Roadmap'}
                </button>
              </div>
            </form>
          ) : (
            /* JSON Import */
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Link to Goal (optional)</label>
                <select value={jsonGoalId} onChange={(e) => setJsonGoalId(e.target.value)}
                  className={`${inputCls} appearance-none`}>
                  <option value="">No goal — standalone roadmap</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Paste a JSON plan with title + milestones array:</span>
                <button type="button" onClick={() => handleJsonChange(EXAMPLE_JSON)}
                  className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                  Load Example
                </button>
              </div>
              <textarea rows={9} value={jsonInput} onChange={(e) => handleJsonChange(e.target.value)}
                placeholder={'{\n  "title": "My Roadmap",\n  "milestones": [\n    { "title": "Phase 1", "description": "..." }\n  ]\n}'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none shadow-inner"
              />
              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}
              {parsedPreview && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" /><span>Valid Plan Preview</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold font-mono">
                      {parsedPreview.milestones?.length || 0} phases
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{parsedPreview.title}</h4>
                  {parsedPreview.description && <p className="text-xs text-slate-500">{parsedPreview.description}</p>}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {parsedPreview.milestones?.map((m: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{i + 1}. {m.title}</p>
                        {m.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{m.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleImport} disabled={!parsedPreview || importing}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer">
                  {importing ? 'Importing...' : 'Import Roadmap'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edit Roadmap Form ── */}
      {editingRoadmap && (
        <form onSubmit={handleUpdateRoadmap} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Roadmap</h3>
            <button type="button" onClick={() => setEditingRoadmap(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input type="text" value={editingRoadmap.title}
              onChange={(e) => setEditingRoadmap({ ...editingRoadmap, title: e.target.value })}
              className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={3} value={editingRoadmap.description || ''}
              onChange={(e) => setEditingRoadmap({ ...editingRoadmap, description: e.target.value })}
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={editingRoadmap.status || 'IN_PROGRESS'}
              onChange={(e) => setEditingRoadmap({ ...editingRoadmap, status: e.target.value })}
              className={`${inputCls} appearance-none`}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setEditingRoadmap(null)}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer">
              <Save className="w-3.5 h-3.5" /><span>Update Roadmap</span>
            </button>
          </div>
        </form>
      )}

      {/* ── Roadmaps List ── */}
      {filteredRoadmaps.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
          <Compass className="w-10 h-10 mx-auto text-violet-300 dark:text-violet-700" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {roadmaps.length === 0 ? 'No roadmaps yet' : 'No matching roadmaps'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {roadmaps.length === 0
              ? 'Create a roadmap with structured phases to plan how you\'ll achieve your goals.'
              : 'Try clearing your search or filter options.'}
          </p>
          {roadmaps.length === 0 ? (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold cursor-pointer">
              <Plus className="w-4 h-4" /><span>New Roadmap</span>
            </button>
          ) : (
            <button onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setGoalFilter('ALL'); }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer">
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRoadmaps.map((rm) => {
            const allMilestones = rm.milestones ?? [];
            const completed = allMilestones.filter((m: any) => m.status === 'COMPLETED').length;
            const total = allMilestones.length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            const isExpanded = expandedCards[rm.id] !== false; // default expanded so phases are visible at a glance
            const isShowingAllPhases = showAllPhases[rm.id] !== false; // default all phases when expanded

            // Phase preview slicing: show all phases by default unless user explicitly chose brief view
            const visiblePhases = isShowingAllPhases
              ? allMilestones
              : allMilestones.slice(0, PREVIEW_PHASE_COUNT);

            return (
              <div key={rm.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 transition-all overflow-hidden">
                {/* Card Header */}
                <div className="p-5 md:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                        <span className={`inline-flex items-center text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-lg uppercase font-mono shadow-xs border ${STATUS_COLORS[rm.status] || STATUS_COLORS.IN_PROGRESS}`}>
                          {rm.status?.replace('_', ' ')}
                        </span>
                        {rm.goal && (
                          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200/70 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 truncate max-w-[220px]">
                            <span className="mr-1 text-violet-500">↗</span> Goal: {rm.goal.title}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 tracking-tight leading-snug">{rm.title}</h3>
                      {rm.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">{rm.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                      {/* Focus View Dedicated Modal Button */}
                      <button
                        onClick={() => setFocusedRoadmapId(rm.id)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-violet-600 hover:text-white transition-all cursor-pointer"
                        title="Open Focus Workspace"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingRoadmap(rm)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        title="Edit Roadmap">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRoadmap(rm.id, rm.title)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                        title="Delete Roadmap">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleExpand(rm.id)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        title={isExpanded ? 'Collapse card' : 'Expand card'}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar section */}
                  {total > 0 && (
                    <div className="pt-1 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                        <span className="flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          <span className="font-mono font-semibold">{total} phase{total !== 1 ? 's' : ''}</span>
                        </span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {completed}/{total} complete · {progress}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 shadow-xs transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Phases Preview List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    {allMilestones.length === 0 && addingPhaseFor !== rm.id && (
                      <div className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500 italic flex items-center space-x-2">
                        <Circle className="w-3.5 h-3.5" />
                        <span>No phases yet — add one below to start planning.</span>
                      </div>
                    )}

                    {visiblePhases.map((phase: any, idx: number) => (
                      <div key={phase.id}>
                        {/* Editing this phase inline */}
                        {editingPhase?.id === phase.id ? (
                          <form onSubmit={handleUpdatePhase} className="px-5 py-4 bg-violet-50/50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/40 space-y-3">
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-[10px] font-bold flex items-center justify-center shrink-0 font-mono">
                                {idx + 1}
                              </span>
                              <input type="text" value={editingPhase.title}
                                onChange={(e) => setEditingPhase({ ...editingPhase, title: e.target.value })}
                                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                                required />
                            </div>
                            <textarea rows={2} value={editingPhase.description || ''}
                              onChange={(e) => setEditingPhase({ ...editingPhase, description: e.target.value })}
                              placeholder="Phase description..."
                              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed"
                            />
                            <div className="flex justify-end space-x-2">
                              <button type="button" onClick={() => setEditingPhase(null)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer">
                                Cancel
                              </button>
                              <button type="submit"
                                className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer">
                                <Save className="w-3 h-3" /><span>Save</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* Phase display row */
                          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/60 flex items-start gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <button
                              onClick={() => handleTogglePhase(phase.id, phase.status)}
                              className="mt-0.5 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              title={phase.status === 'COMPLETED' ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {phase.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" style={{ width: 18, height: 18 }} />
                              ) : (
                                <Circle className="w-4.5 h-4.5 text-slate-300 dark:text-slate-600 hover:text-violet-500 dark:hover:text-violet-400 transition-colors" style={{ width: 18, height: 18 }} />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold flex items-center justify-center shrink-0 font-mono">
                                  {idx + 1}
                                </span>
                                <p className={`text-sm font-semibold leading-tight ${phase.status === 'COMPLETED' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {phase.title}
                                </p>
                              </div>
                              {phase.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-7 leading-relaxed">
                                  {phase.description}
                                </p>
                              )}
                            </div>

                            {/* Phase actions — visible on hover */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => setEditingPhase(phase)}
                                className="p-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                                title="Edit phase">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeletePhase(phase.id, phase.title)}
                                className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete phase">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Phase expander toggle button */}
                    {allMilestones.length > PREVIEW_PHASE_COUNT && (
                      <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <button
                          onClick={() => toggleShowAllPhases(rm.id)}
                          className="text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          {isShowingAllPhases ? (
                            <><span>Collapse to Brief 3-Phase View</span><ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" /></>
                          ) : (
                            <><span>Show all {total} phases (+{total - PREVIEW_PHASE_COUNT} more)</span><ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                        <button
                          onClick={() => setFocusedRoadmapId(rm.id)}
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Open Focus View</span>
                        </button>
                      </div>
                    )}

                    {/* Add phase inline form */}
                    {addingPhaseFor === rm.id ? (
                      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Add Phase</p>
                        <input type="text" value={newPhaseTitle} onChange={(e) => setNewPhaseTitle(e.target.value)}
                          placeholder="Phase title (e.g. Phase 3: Testing & Launch)"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500 transition-colors"
                          autoFocus
                        />
                        <textarea rows={2} value={newPhaseDesc} onChange={(e) => setNewPhaseDesc(e.target.value)}
                          placeholder="Describe this phase and its key deliverables..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button type="button"
                            onClick={() => { setAddingPhaseFor(null); setNewPhaseTitle(''); setNewPhaseDesc(''); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer">
                            Cancel
                          </button>
                          <button type="button"
                            onClick={() => handleAddPhase(rm.id, rm.goalId)}
                            disabled={!newPhaseTitle.trim()}
                            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer">
                            Add Phase
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingPhaseFor(rm.id); setNewPhaseTitle(''); setNewPhaseDesc(''); }}
                        className="w-full flex items-center justify-center space-x-1.5 py-3 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Phase</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Focus View Workspace Modal ── */}
      {currentFocusedRoadmap && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${STATUS_COLORS[currentFocusedRoadmap.status] || STATUS_COLORS.IN_PROGRESS}`}>
                    {currentFocusedRoadmap.status?.replace('_', ' ')}
                  </span>
                  {currentFocusedRoadmap.goal && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      ↗ {currentFocusedRoadmap.goal.title}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <span>{currentFocusedRoadmap.title}</span>
                </h2>
                {currentFocusedRoadmap.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {currentFocusedRoadmap.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setFocusedRoadmapId(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / All Phases */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Phases Timeline ({(currentFocusedRoadmap.milestones || []).length})
                </h3>
                <button
                  onClick={() => setAddingPhaseFor(currentFocusedRoadmap.id)}
                  className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phase</span>
                </button>
              </div>

              <div className="space-y-3">
                {(currentFocusedRoadmap.milestones || []).map((phase: any, idx: number) => (
                  <div key={phase.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3 group">
                    <button
                      onClick={() => handleTogglePhase(phase.id, phase.status)}
                      className="mt-0.5 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                    >
                      {phase.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-violet-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-[10px] font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <h4 className={`text-sm font-bold ${phase.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {phase.title}
                        </h4>
                      </div>
                      {phase.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-7 leading-relaxed">
                          {phase.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingPhase(phase)} className="p-1 text-slate-400 hover:text-violet-500">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePhase(phase.id, phase.title)} className="p-1 text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setFocusedRoadmapId(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Focus View
              </button>
            </div>
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
