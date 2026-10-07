'use client';

import React, { useState, useEffect } from 'react';
import {
  StickyNote,
  Folder,
  Link as LinkIcon,
  Trash2,
  Edit2,
  ExternalLink,
  Plus,
  X,
  Save,
  Maximize2,
  Copy,
  Check,
  Eye,
  LayoutGrid,
  List,
  Search,
  Clock,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import DialogShell from './ui/Dialog';
import ApiErrorNotice from './ui/ApiErrorNotice';
import NoteStudioModal from './NoteStudioModal';
import { API_BASE_URL, assertApiSuccess, fetchWithUser } from '../lib/api';

interface NotesViewProps {
  notes: any[];
  folders: any[];
  onOpenQuickCapture: () => void;
  onRefresh: () => void;
}

export default function NotesView({ notes, folders, onOpenQuickCapture, onRefresh }: NotesViewProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [viewingNote, setViewingNote] = useState<any | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioNote, setStudioNote] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    initialValue?: string;
    onSubmit: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    placeholder: '',
    initialValue: '',
    onSubmit: () => {},
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('nox_notes_view_mode');
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    }
  }, []);

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nox_notes_view_mode', mode);
    }
  };

  const filteredNotes = notes
    .filter((n) => (selectedFolderId ? n.folderId === selectedFolderId : true))
    .filter((n) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.url && n.url.toLowerCase().includes(q))
      );
    });

  const handleCopyContent = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveStudioNote = async (data: { id?: string; title: string; content: string; url?: string; folderId?: string | null }) => {
    try {
      if (data.id) {
        const response = await fetchWithUser(`${API_BASE_URL}/api/v1/notes/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            url: data.url || null,
            folderId: data.folderId || null,
          }),
        });
        await assertApiSuccess(response, 'Could not save note');
      } else {
        const response = await fetchWithUser(`${API_BASE_URL}/api/v1/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            content: data.content,
            url: data.url || undefined,
            folderId: data.folderId || undefined,
          }),
        });
        await assertApiSuccess(response, 'Could not save note');
      }
      onRefresh();
    } catch (err) {
      console.error('Save note error:', err);
      setError(err instanceof Error ? err.message : 'Could not save note');
      throw err;
    }
  };

  const handleOpenNewNote = () => {
    setStudioNote(null);
    setIsStudioOpen(true);
  };

  const handleOpenEditStudio = (note: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStudioNote(note);
    setIsStudioOpen(true);
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    try {
      const response = await fetchWithUser(`${API_BASE_URL}/api/v1/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingNote.title,
          content: editingNote.content,
          url: editingNote.url,
          folderId: editingNote.folderId,
        }),
      });
      await assertApiSuccess(response, 'Could not update note');
      setEditingNote(null);
      if (viewingNote?.id === editingNote.id) {
        setViewingNote({ ...editingNote });
      }
      onRefresh();
    } catch (err) {
      console.error('Failed to update note:', err);
      setError(err instanceof Error ? err.message : 'Could not update note');
    }
  };

  const handleEditFolder = (e: React.MouseEvent, folderId: string, currentName: string) => {
    e.stopPropagation();
    setPromptState({
      isOpen: true,
      title: 'Rename Folder',
      placeholder: 'Folder Name',
      initialValue: currentName,
      onSubmit: async (val: string) => {
        try {
          const response = await fetchWithUser(`${API_BASE_URL}/api/v1/folders/${folderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: val }),
          });
          await assertApiSuccess(response, 'Could not rename folder');
          onRefresh();
        } catch (err) {
          console.error('Failed to rename folder:', err);
          setError(err instanceof Error ? err.message : 'Could not rename folder');
        }
      },
    });
  };

  const handleDeleteNote = (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmState({
      isOpen: true,
      title: 'Delete Note',
      message: 'Are you sure you want to delete this Note?',
      onConfirm: async () => {
        try {
          const response = await fetchWithUser(`${API_BASE_URL}/api/v1/notes/${noteId}`, { method: 'DELETE' });
          await assertApiSuccess(response, 'Could not delete note');
          if (viewingNote?.id === noteId) setViewingNote(null);
          if (editingNote?.id === noteId) setEditingNote(null);
          onRefresh();
        } catch (err) {
          console.error('Failed to delete note:', err);
          setError(err instanceof Error ? err.message : 'Could not delete note');
        }
      },
    });
  };

  const handleCreateFolder = () => {
    setPromptState({
      isOpen: true,
      title: 'Create New Folder',
      placeholder: 'Folder Name (e.g. Architecture Ideas)',
      initialValue: '',
      onSubmit: async (val: string) => {
        try {
          const response = await fetchWithUser(`${API_BASE_URL}/api/v1/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: val }),
          });
          await assertApiSuccess(response, 'Could not create folder');
          onRefresh();
        } catch (err) {
          console.error('Failed to create folder:', err);
          setError(err instanceof Error ? err.message : 'Could not create folder');
        }
      },
    });
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string, folderName: string) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      title: 'Delete Folder',
      message: `Are you sure you want to delete folder "${folderName}"? Notes inside will be moved to Unsorted.`,
      onConfirm: async () => {
        try {
          const response = await fetchWithUser(`${API_BASE_URL}/api/v1/folders/${folderId}`, { method: 'DELETE' });
          await assertApiSuccess(response, 'Could not delete folder');
          if (selectedFolderId === folderId) setSelectedFolderId(null);
          onRefresh();
        } catch (err) {
          console.error('Failed to delete folder:', err);
          setError(err instanceof Error ? err.message : 'Could not delete folder');
        }
      },
    });
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      <ApiErrorNotice message={error} onDismiss={() => setError(null)} />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <StickyNote className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span>Quick Capture Scratchpad</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">1-second clipboard captures, job URLs, ideas, and text snippets.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateFolder}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/40 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Folder className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          <button
            onClick={onOpenQuickCapture}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Quick Capture snippet / link"
          >
            <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Quick Capture</span>
          </button>
          <button
            onClick={handleOpenNewNote}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Folder Chips Filter Bar with Strict Overflow Containment */}
      <div className="w-full max-w-full flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none min-w-0 touch-pan-x">
        <button
          onClick={() => setSelectedFolderId(null)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
            selectedFolderId === null
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Notes ({notes.length})
        </button>
        {folders.map((f) => {
          const isSelected = selectedFolderId === f.id;
          const count = notes.filter((n) => n.folderId === f.id).length;
          return (
            <div
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer group/f shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: f.color }} />
              <span className="truncate max-w-[120px] sm:max-w-[180px] inline-block">{f.name}</span>
              <span className="text-[10px] opacity-75 shrink-0">({count})</span>
              {!f.isSystem && (
                <div className="flex items-center space-x-0.5 opacity-100 sm:opacity-0 group-hover/f:opacity-100 transition-opacity ml-1 shrink-0">
                  <button
                    onClick={(e) => handleEditFolder(e, f.id, f.name)}
                    className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    title="Rename Folder"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteFolder(e, f.id, f.name)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Note Form */}
      {editingNote && (
        <form onSubmit={handleUpdateNote} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 shadow-sm space-y-3 max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Quick Note</h3>
            <button type="button" onClick={() => setEditingNote(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Title</label>
            <input
              type="text"
              value={editingNote.title}
              onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Folder</label>
            <select
              value={editingNote.folderId || ''}
              onChange={(e) => setEditingNote({ ...editingNote, folderId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="">📥 Unsorted</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Content / Snippet</label>
            <textarea
              rows={6}
              value={editingNote.content || ''}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">URL (Optional)</label>
            <input
              type="url"
              value={editingNote.url || ''}
              onChange={(e) => setEditingNote({ ...editingNote, url: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setEditingNote(null)}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center space-x-1 shadow-xs">
              <Save className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}

      {/* Sub-toolbar: Search & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes by title, content, or link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <StickyNote className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
              {searchQuery ? 'No matching notes found' : 'No notes in this folder'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery ? 'Try clearing your search query.' : 'Capture a quick clipboard note or create a full note studio document.'}
            </p>
          </div>
          <button
            onClick={handleOpenNewNote}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition shadow-xs inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List View Layout */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Title & Folder</div>
            <div className="col-span-5">Content Preview</div>
            <div className="col-span-2 hidden md:block">Updated</div>
            <div className="col-span-3 md:col-span-1 text-right">Actions</div>
          </div>

          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleOpenEditStudio(note)}
              className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group text-xs"
            >
              {/* Title & Folder */}
              <div className="col-span-4 min-w-0 pr-2">
                <div className="flex items-center space-x-2">
                  <StickyNote className="w-4 h-4 text-violet-500 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {note.title}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  {note.folder ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center space-x-1">
                      <Folder className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                      <span className="truncate max-w-[100px]">{note.folder.name}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Unsorted</span>
                  )}
                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-indigo-500 hover:underline inline-flex items-center space-x-0.5 truncate max-w-[120px]"
                    >
                      <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{note.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Snippet */}
              <div className="col-span-5 min-w-0 pr-2">
                <p className="text-slate-600 dark:text-slate-400 truncate font-normal text-xs">
                  {note.content || <span className="italic text-slate-400">Empty note</span>}
                </p>
              </div>

              {/* Updated Date */}
              <div className="col-span-2 hidden md:flex items-center space-x-1 text-slate-400 text-[11px] font-mono">
                <Clock className="w-3 h-3 shrink-0" />
                <span>
                  {note.updatedAt
                    ? new Date(note.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-3 md:col-span-1 flex items-center justify-end space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleCopyContent(note.content || note.title, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Copy content"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleOpenEditStudio(note, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Open Note Studio"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Notes Grid with Containment & Min-Width Safety */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0 max-w-full">
          {filteredNotes.map((note) => {
            const isLongContent = note.content && note.content.length > 120;

            return (
              <div
                key={note.id}
                onClick={() => handleOpenEditStudio(note)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all cursor-pointer group relative min-w-0 max-w-full overflow-hidden"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors break-words overflow-hidden">
                      {note.title}
                    </h4>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={(e) => handleOpenEditStudio(note, e)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Open Note Studio"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleOpenEditStudio(note, e)}
                        className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {note.content && (
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-4 leading-relaxed font-normal break-words overflow-hidden">
                        {note.content}
                      </p>
                      {isLongContent && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                          <span>Open Studio / View full note</span>
                          <Maximize2 className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] min-w-0 gap-2">
                  {note.folder ? (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1 shrink-0 max-w-[60%] truncate">
                      <Folder className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{note.folder.name}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 shrink-0">Unsorted</span>
                  )}

                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-medium truncate max-w-[40%]"
                    >
                      <LinkIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">URL</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Note Detail Modal */}
      <DialogShell
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        label="Note Details"
        className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
      >
        {viewingNote && (
          <div className="space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  {viewingNote.folder ? (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center space-x-1 border border-indigo-200 dark:border-indigo-800">
                      <Folder className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>{viewingNote.folder.name}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
                      Unsorted Note
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 break-words leading-tight">
                  {viewingNote.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* URL Banner if present */}
            {viewingNote.url && (
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <LinkIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 font-mono truncate">{viewingNote.url}</span>
                </div>
                <a
                  href={viewingNote.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1 shrink-0 shadow-xs transition-all"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Full Content View */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Full Content / Snippet</span>
                {viewingNote.content && (
                  <button
                    onClick={(e) => handleCopyContent(viewingNote.content, e)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center space-x-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 max-h-[50vh] overflow-y-auto font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words leading-relaxed select-text">
                {viewingNote.content || <span className="text-slate-400 italic">No text content in this note.</span>}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={(e) => handleDeleteNote(viewingNote.id, e)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Note</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const note = viewingNote;
                    setViewingNote(null);
                    setEditingNote(note);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Note</span>
                </button>
                <button
                  onClick={() => setViewingNote(null)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogShell>

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

      <NoteStudioModal
        isOpen={isStudioOpen}
        note={studioNote}
        folders={folders}
        defaultFolderId={selectedFolderId}
        onSave={handleSaveStudioNote}
        onDelete={(id) => handleDeleteNote(id)}
        onClose={() => {
          setIsStudioOpen(false);
          setStudioNote(null);
        }}
      />
    </div>
  );
}
