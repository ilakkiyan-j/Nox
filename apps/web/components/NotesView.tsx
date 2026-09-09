'use client';

import React, { useState } from 'react';
import { StickyNote, Folder, Link as LinkIcon, Trash2, Edit2, ExternalLink, Plus, X, Save } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

interface NotesViewProps {
  notes: any[];
  folders: any[];
  onOpenQuickCapture: () => void;
  onRefresh: () => void;
}

export default function NotesView({ notes, folders, onOpenQuickCapture, onRefresh }: NotesViewProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<any | null>(null);

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

  const filteredNotes = selectedFolderId
    ? notes.filter((n) => n.folderId === selectedFolderId)
    : notes;

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    try {
      await fetch(`http://localhost:4000/api/v1/notes/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingNote.title,
          content: editingNote.content,
          url: editingNote.url,
          folderId: editingNote.folderId,
        }),
      });
      setEditingNote(null);
      onRefresh();
    } catch (err) {
      console.error(err);
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
          await fetch(`http://localhost:4000/api/v1/folders/${folderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: val }),
          });
          onRefresh();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleDeleteNote = (noteId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Note',
      message: 'Are you sure you want to delete this Note?',
      onConfirm: async () => {
        try {
          await fetch(`http://localhost:4000/api/v1/notes/${noteId}`, { method: 'DELETE' });
          onRefresh();
        } catch (err) {
          console.error(err);
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
          await fetch('http://localhost:4000/api/v1/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: val }),
          });
          onRefresh();
        } catch (err) {
          console.error(err);
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
          await fetch(`http://localhost:4000/api/v1/folders/${folderId}`, { method: 'DELETE' });
          if (selectedFolderId === folderId) setSelectedFolderId(null);
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
            <StickyNote className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <span>Quick Capture Scratchpad</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">1-second clipboard captures, job URLs, ideas, and text snippets.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateFolder}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/40 flex items-center space-x-1.5 transition-all"
          >
            <Folder className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          <button
            onClick={onOpenQuickCapture}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Capture</span>
          </button>
        </div>
      </div>

      {/* Folder Chips Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedFolderId(null)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center space-x-1.5 transition-all cursor-pointer group/f ${
                isSelected
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Folder className="w-3.5 h-3.5" style={{ color: f.color }} />
              <span>{f.name}</span>
              <span className="text-[10px] opacity-75">({count})</span>
              {!f.isSystem && (
                <div className="flex items-center space-x-0.5 opacity-0 group-hover/f:opacity-100 transition-opacity ml-1">
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
        <form onSubmit={handleUpdateNote} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 shadow-sm space-y-3">
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
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Folder</label>
            <select
              value={editingNote.folderId || ''}
              onChange={(e) => setEditingNote({ ...editingNote, folderId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-medium"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">Content</label>
            <textarea
              rows={3}
              value={editingNote.content || ''}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
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
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold flex items-center space-x-1 shadow-xs">
              <Save className="w-3.5 h-3.5" />
              <span>Update Note</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">{note.title}</h4>
                <div className="flex items-center space-x-1">
                  <button onClick={() => setEditingNote(note)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-1" title="Edit Note">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteNote(note.id)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1" title="Delete Note">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {note.content && <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-4 leading-relaxed">{note.content}</p>}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
              {note.folder ? (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1">
                  <Folder className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>{note.folder.name}</span>
                </span>
              ) : (
                <span className="text-slate-400">Unsorted</span>
              )}

              {note.url && (
                <a
                  href={note.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-medium"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Open URL</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        ))}
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
