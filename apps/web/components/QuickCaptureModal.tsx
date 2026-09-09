'use client';

import React, { useState } from 'react';
import { X, Clipboard, Link as LinkIcon, Folder, Tag, Save } from 'lucide-react';
import { API_BASE_URL, fetchWithUser } from '../lib/api';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickCaptureModal({ isOpen, onClose, onSaved }: QuickCaptureModalProps) {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('Unsorted');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !url.trim() && !title.trim()) return;

    setSaving(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || content.slice(0, 35) || 'Captured Link',
          content: content.trim(),
          url: url.trim(),
          tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        }),
      });

      if (res.ok) {
        setContent('');
        setUrl('');
        setTitle('');
        setTags('');
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error('Quick capture error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setUrl(text);
        if (!title) setTitle('Link Capture');
      } else {
        setContent(text);
      }
    } catch (err) {
      console.log('Clipboard access denied or unavailable');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 relative transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clipboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Quick Capture Scratchpad</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paste from Clipboard Button */}
        <button
          type="button"
          onClick={handlePasteClipboard}
          className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
        >
          <Clipboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Paste from Clipboard (URL or Snippet)</span>
        </button>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Amazon Job Link or System Design note"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">URL (Optional)</label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Content / Snippet</label>
            <textarea
              rows={3}
              placeholder="Paste text, job description, code snippet, or idea..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Folder</label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 font-medium"
              >
                <option value="Unsorted">📥 Unsorted</option>
                <option value="Jobs">📁 Jobs</option>
                <option value="Events">📁 Events</option>
                <option value="Learning">📁 Learning</option>
                <option value="Resources">📁 Resources</option>
                <option value="Ideas">📁 Ideas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. job, dsa, url"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Capture'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
