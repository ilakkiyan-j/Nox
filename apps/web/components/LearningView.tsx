'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, CheckCircle2, Circle, Edit2, Trash2, X, Save, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface LearningViewProps {
  learning: any[];
  onRefresh: () => void;
}

export default function LearningView({ learning, onRefresh }: LearningViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingLearning, setEditingLearning] = useState<any | null>(null);

  // Card view state: expansion of learning modules per item
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Responsive mobile check
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const toggleExpandItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: prev[id] !== undefined ? !prev[id] : isMobile }));
  };

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

  const [title, setTitle] = useState('');
  const [type, setType] = useState('COURSE');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [moduleInputs, setModuleInputs] = useState('');

  const handleCreateLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const modules = moduleInputs
      ? moduleInputs.split('\n').filter((m) => m.trim().length > 0)
      : [];

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/learning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          modules,
        }),
      });
      setTitle('');
      setUrl('');
      setDescription('');
      setModuleInputs('');
      setShowCreate(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLearning) return;

    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/learning/${editingLearning.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingLearning.title,
          type: editingLearning.type,
          url: editingLearning.url?.trim() || null,
          description: editingLearning.description?.trim() || null,
          status: editingLearning.status,
        }),
      });
      setEditingLearning(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLearning = (learningId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Learning Item',
      message: 'Are you sure you want to delete this Learning item and all modules?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/learning/${learningId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleToggleLearningStatus = async (item: any) => {
    const nextStatus = item.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/learning/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleModule = async (moduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED';
    try {
      await fetchWithUser(`${API_BASE_URL}/api/v1/learning/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddModule = (learningId: string) => {
    setPromptState({
      isOpen: true,
      title: 'Add Module / Chapter',
      placeholder: 'Module Title (e.g. Chapter 4: Distributed Consensus)',
      initialValue: '',
      onSubmit: async (val: string) => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/learning/${learningId}/modules`, {
            method: 'POST',
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

  const handleDeleteModule = (moduleId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Module',
      message: 'Are you sure you want to delete this Module?',
      onConfirm: async () => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/learning/modules/${moduleId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleRenameModule = (moduleId: string, currentTitle: string) => {
    setPromptState({
      isOpen: true,
      title: 'Edit Module Title',
      placeholder: 'Module Title',
      initialValue: currentTitle,
      onSubmit: async (val: string) => {
        try {
          await fetchWithUser(`${API_BASE_URL}/api/v1/learning/modules/${moduleId}`, {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Learning & Knowledge Base</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Courses, certifications, technical practice, and book study modules.</p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Learning Track</span>
        </button>
      </div>

      {/* Create Learning Track Form */}
      {showCreate && (
        <form onSubmit={handleCreateLearning} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create New Learning Track</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Title (e.g. Distributed Systems & Raft Consensus)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                required
              />
            </div>
            <div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="COURSE">COURSE</option>
                <option value="BOOK">BOOK</option>
                <option value="CERTIFICATION">CERTIFICATION</option>
                <option value="PRACTICE">PRACTICE</option>
                <option value="TUTORIAL">TUTORIAL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Website / Certification Link (optional)</label>
            <input
              type="url"
              placeholder="https://coursera.org/learn/... or https://aws.amazon.com/certification/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Description & Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Key notes, prerequisites, exam format, or course goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Initial Modules / Chapters (One per line)</label>
            <textarea
              rows={3}
              placeholder="Module 1: Leader Election&#10;Module 2: Log Replication&#10;Module 3: Safety Invariants"
              value={moduleInputs}
              onChange={(e) => setModuleInputs(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs">
              Save Learning Track
            </button>
          </div>
        </form>
      )}

      {/* Edit Learning Modal */}
      {editingLearning && (
        <form onSubmit={handleUpdateLearning} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Edit Learning Track & Phases / Modules</span>
            </h3>
            <button type="button" onClick={() => setEditingLearning(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Track Title</label>
            <input
              type="text"
              value={editingLearning.title}
              onChange={(e) => setEditingLearning({ ...editingLearning, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Website / Certification Link</label>
            <input
              type="url"
              placeholder="https://..."
              value={editingLearning.url || ''}
              onChange={(e) => setEditingLearning({ ...editingLearning, url: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Description & Notes</label>
            <textarea
              rows={3}
              placeholder="Course description, notes, or objectives..."
              value={editingLearning.description || ''}
              onChange={(e) => setEditingLearning({ ...editingLearning, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Type</label>
              <select
                value={editingLearning.type || 'COURSE'}
                onChange={(e) => setEditingLearning({ ...editingLearning, type: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="COURSE">COURSE</option>
                <option value="BOOK">BOOK</option>
                <option value="CERTIFICATION">CERTIFICATION</option>
                <option value="PRACTICE">PRACTICE</option>
                <option value="TUTORIAL">TUTORIAL</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Status</label>
              <select
                value={editingLearning.status || 'IN_PROGRESS'}
                onChange={(e) => setEditingLearning({ ...editingLearning, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="NOT_STARTED">NOT_STARTED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          {/* Inline Module / Phase Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Modules & Chapters ({editingLearning.modules?.length || 0})</label>
              <button
                type="button"
                onClick={() => handleAddModule(editingLearning.id)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Module</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {editingLearning.modules?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-x-2">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate flex-1">{m.title}</span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRenameModule(m.id, m.title)}
                      className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      title="Edit Module Title"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModule(m.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Delete Module"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingLearning(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1">
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* Learning Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {learning.map((item) => {
          const completedCount = item.modules?.filter((m: any) => m.status === 'COMPLETED').length || 0;
          const totalCount = item.modules?.length || 0;
          const isCompleted = item.status === 'COMPLETED';
          const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (isCompleted ? 100 : 0);

          const isExpanded = expandedItems[item.id] !== undefined
            ? expandedItems[item.id]
            : !isMobile;

          return (
            <div key={item.id} className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleLearningStatus(item)}
                      className={`mt-1 p-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                        isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400'
                      }`}
                      title={isCompleted ? 'Mark as In Progress' : 'Mark Course as Completed'}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 fill-current text-emerald-600 dark:text-emerald-400" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 uppercase font-mono">
                        {item.type}
                      </span>
                      <h3 className={`font-display font-bold text-lg mt-0.5 ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                        {item.title}
                      </h3>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Visit Course / Website</span>
                        </a>
                      )}
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mt-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleAddModule(item.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold text-xs flex items-center space-x-1 cursor-pointer"
                      title="Add Module"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Module</span>
                    </button>
                    <button
                      onClick={() => setEditingLearning(item)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      title="Edit Track"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLearning(item.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      title="Delete Track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleExpandItem(item.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      title={isExpanded ? 'Collapse modules' : 'Expand modules'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Completion Progress ({completedCount}/{totalCount})</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Modules List */}
                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {totalCount === 0 ? (
                      <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span>No modules added yet</span>
                        <button
                          onClick={() => handleAddModule(item.id)}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Module</span>
                        </button>
                      </div>
                    ) : (
                      item.modules.map((mod: any) => (
                        <div key={mod.id} className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between group/m text-xs">
                          <div
                            onClick={() => handleToggleModule(mod.id, mod.status)}
                            className="flex items-center space-x-2.5 cursor-pointer select-none min-w-0 flex-1"
                          >
                            {mod.status === 'COMPLETED' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className={`truncate ${mod.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                              {mod.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0 text-slate-400 dark:text-slate-500">
                            <button
                              onClick={() => handleRenameModule(mod.id, mod.title)}
                              className="p-1 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                              title="Edit Module Title"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(mod.id)}
                              className="p-1 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                              title="Delete Module"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
