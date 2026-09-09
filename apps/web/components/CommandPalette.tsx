'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Target, CheckSquare, Calendar, StickyNote, GraduationCap } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (type: string, item: any) => void;
}

export default function CommandPalette({ isOpen, onClose, onSelectEntity }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    goals: any[];
    tasks: any[];
    events: any[];
    notes: any[];
    learning: any[];
  }>({ goals: [], tasks: [], events: [], notes: [], learning: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ goals: [], tasks: [], events: [], notes: [], learning: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/v1/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.goals.length + results.tasks.length + results.events.length + results.notes.length + results.learning.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/80 dark:bg-slate-800/80">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search goals, tasks, events, notes, learning..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 text-base focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 font-mono font-semibold shadow-xs">
            ESC
          </button>
        </div>

        {/* Search Results Feed */}
        <div className="p-4 overflow-y-auto space-y-4">
          {loading && <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6 font-medium">Searching NOX database...</p>}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-8">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No matching entities found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try searching for keywords like "System", "DSA", "Architecture", or "Jobs"</p>
            </div>
          )}

          {/* Goals Results */}
          {results.goals.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Goals ({results.goals.length})</span>
              </h4>
              <div className="space-y-1">
                {results.goals.map((goal) => (
                  <div
                    key={goal.id}
                    onClick={() => {
                      onSelectEntity('goals', goal);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{goal.title}</p>
                      {goal.description && <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-md">{goal.description}</p>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                      {goal.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {results.tasks.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tasks ({results.tasks.length})</span>
              </h4>
              <div className="space-y-1">
                {results.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      onSelectEntity('tasks', task);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold">
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Results */}
          {results.notes.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Notes & Captures ({results.notes.length})</span>
              </h4>
              <div className="space-y-1">
                {results.notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      onSelectEntity('notes', note);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{note.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-md">{note.content}</p>
                    </div>
                    {note.folder && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-medium">
                        {note.folder.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Results */}
          {results.events.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Events ({results.events.length})</span>
              </h4>
              <div className="space-y-1">
                {results.events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      onSelectEntity('events', event);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{event.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Results */}
          {results.learning.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>Learning ({results.learning.length})</span>
              </h4>
              <div className="space-y-1">
                {results.learning.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectEntity('learning', item);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
