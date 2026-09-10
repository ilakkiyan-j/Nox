'use client';

import React, { useState, useEffect } from 'react';
import { Edit3, X } from 'lucide-react';
import DialogShell from './ui/Dialog';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export default function PromptModal({
  isOpen,
  title,
  placeholder = 'Enter value...',
  initialValue = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
  onSubmit,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    onClose();
  };

  return (
    <DialogShell isOpen={isOpen} onClose={onClose} label={title} className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 transition-colors">
      <form onSubmit={handleSubmit}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <Edit3 className="w-5 h-5" />
          </div>
          <div className="w-full min-w-0">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
            required
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
