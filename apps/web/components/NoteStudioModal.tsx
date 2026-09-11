'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Folder, Copy, Check, StickyNote, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import DialogShell from './ui/Dialog';

interface NoteStudioModalProps {
  isOpen: boolean;
  note: any | null; // null if creating new, note object if editing
  folders: any[];
  defaultFolderId?: string | null;
  onSave: (noteData: { id?: string; title: string; content: string; url?: string; folderId?: string | null }) => Promise<void>;
  onDelete?: (noteId: string) => void;
  onClose: () => void;
}

export default function NoteStudioModal({
  isOpen,
  note,
  folders,
  defaultFolderId = null,
  onSave,
  onDelete,
  onClose,
}: NoteStudioModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setUrl(note.url || '');
      setFolderId(note.folderId || null);
    } else {
      setTitle('');
      setContent('');
      setUrl('');
      setFolderId(defaultFolderId);
    }
  }, [note, defaultFolderId, isOpen]);

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleCopy = () => {
    const fullText = title ? `${title}\n\n${content}` : content;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    setSaving(true);
    try {
      await onSave({
        id: note?.id,
        title: title.trim() || 'Untitled Note',
        content,
        url: url.trim() || undefined,
        folderId: folderId || null,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      label="Note Studio"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all flex flex-col overflow-hidden ${
        isFullScreen ? 'w-screen h-screen max-w-none rounded-none inset-0 fixed z-50' : 'max-w-3xl w-full max-h-[85vh] h-[650px]'
      }`}
    >
      {/* ── TOP ACTION BAR ── */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0 gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 shrink-0">
            <StickyNote className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
              {note ? 'Edit Note' : 'New Note'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Mobile Plain-Text Studio</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Folder Picker */}
          <div className="relative">
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="pl-7 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer appearance-none"
            >
              <option value="">📥 Unsorted</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
            <Folder className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Copy full note text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Full Screen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer hidden sm:flex"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Focus'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── WRITING BODY (TITLE + CONTENT) ── */}
      <div className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto min-h-0 bg-white dark:bg-slate-900">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title / Heading..."
          className="w-full text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-slate-100 dark:border-slate-800/80 pb-2 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
          autoFocus
        />

        {/* Optional URL Input */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-semibold text-slate-400">URL (optional):</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Body Textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing your note here... (write thoughts, meeting logs, technical notes, or quick ideas)"
          className="flex-1 w-full text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-sans min-h-[250px]"
        />
      </div>

      {/* ── BOTTOM FOOTER BAR ── */}
      <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0 gap-3 text-xs">
        <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          <span>Words: <strong className="text-slate-700 dark:text-slate-300">{wordCount}</strong></span>
          <span>·</span>
          <span>Characters: <strong className="text-slate-700 dark:text-slate-300">{charCount}</strong></span>
        </div>

        <div className="flex items-center space-x-2">
          {note && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving || (!title.trim() && !content.trim())}
            className="px-5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold flex items-center space-x-1.5 shadow-sm shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Note'}</span>
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
