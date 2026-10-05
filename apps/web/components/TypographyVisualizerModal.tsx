'use client';

import React, { useState, useEffect } from 'react';
import {
  Type,
  Check,
  Sparkles,
  X,
  Palette,
  ArrowRight,
  Layers,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export type FontPresetKey = 'executive' | 'cyber' | 'editorial' | 'minimal' | 'outfit';

interface FontPreset {
  key: FontPresetKey;
  name: string;
  badge: string;
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  tagline: string;
  description: string;
  displayClass: string;
  bodyClass: string;
  recommendedFor: string;
}

const PRESETS: FontPreset[] = [
  {
    key: 'executive',
    name: 'Executive High-Tech',
    badge: 'Recommended',
    displayFont: 'Plus Jakarta Sans',
    bodyFont: 'Inter',
    monoFont: 'JetBrains Mono',
    tagline: 'Modern, sharp, geometric executive design',
    description: 'Crisp headings with ultra-readable body text. The signature aesthetic of modern AI operating systems and top developer tools like Linear & Raycast.',
    displayClass: 'font-[family-name:var(--font-jakarta)]',
    bodyClass: 'font-[family-name:var(--font-inter)]',
    recommendedFor: 'Maximum clarity, executive dashboard feel, and premium aesthetics',
  },
  {
    key: 'cyber',
    name: 'Cyber Minimalist',
    badge: 'Futuristic',
    displayFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    monoFont: 'JetBrains Mono',
    tagline: 'Futuristic technical aesthetic with distinct personality',
    description: 'Combines the futuristic character of Space Grotesk in headlines with the clean, balanced geometry of DM Sans in body copy.',
    displayClass: 'font-[family-name:var(--font-space)]',
    bodyClass: 'font-[family-name:var(--font-dmsans)]',
    recommendedFor: 'Developers, tech founders, and futuristic OS lovers',
  },
  {
    key: 'editorial',
    name: 'Bespoke Editorial & Luxury',
    badge: 'High-End',
    displayFont: 'Syne',
    bodyFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    tagline: 'Bold, sculptured headline personality with sleek body',
    description: 'Striking sculpted typography in titles paired with sleek, crisp Plus Jakarta Sans for cards, notes, and task lists.',
    displayClass: 'font-[family-name:var(--font-syne)]',
    bodyClass: 'font-[family-name:var(--font-jakarta)]',
    recommendedFor: 'High aesthetic impact, creative direction, and bold styling',
  },
  {
    key: 'minimal',
    name: 'Pure Modern Minimalist',
    badge: 'Clean',
    displayFont: 'Inter',
    bodyFont: 'Inter',
    monoFont: 'JetBrains Mono',
    tagline: 'Unified, laser-focused typographic precision',
    description: 'Uses Inter throughout the interface for zero-distraction focus, uniform optical sizing, and optimal information density.',
    displayClass: 'font-[family-name:var(--font-inter)]',
    bodyClass: 'font-[family-name:var(--font-inter)]',
    recommendedFor: 'Minimalists and deep focus work sessions',
  },
];

interface TypographyVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function applyFontPreset(preset: FontPresetKey) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  // Remove any existing preset classes
  PRESETS.forEach((p) => {
    root.classList.remove(`font-preset-${p.key}`);
    body.classList.remove(`font-preset-${p.key}`);
  });
  root.classList.remove('font-preset-outfit');
  body.classList.remove('font-preset-outfit');

  // Apply chosen preset
  root.classList.add(`font-preset-${preset}`);
  body.classList.add(`font-preset-${preset}`);
  localStorage.setItem('nox_font_preset', preset);
}

export default function TypographyVisualizerModal({ isOpen, onClose }: TypographyVisualizerModalProps) {
  const [activePreset, setActivePreset] = useState<FontPresetKey>('executive');
  const [selectedPreview, setSelectedPreview] = useState<FontPresetKey>('executive');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('nox_font_preset') as FontPresetKey) || 'executive';
      setActivePreset(saved);
      setSelectedPreview(saved);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = (preset: FontPresetKey, name: string) => {
    applyFontPreset(preset);
    setActivePreset(preset);
    setAppliedNotification(`Applied ${name} across NOX!`);
    setTimeout(() => setAppliedNotification(null), 3000);
  };

  const currentPreviewData = PRESETS.find((p) => p.key === selectedPreview) || PRESETS[0];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/80">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>Typography Studio & Live Visualizer</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore rendered UI samples and switch typography across NOX in real time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applied notification toast */}
        {appliedNotification && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{appliedNotification}</span>
          </div>
        )}

        {/* Font Pairings Grid Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((preset) => {
            const isCurrentActive = activePreset === preset.key;
            const isSelected = selectedPreview === preset.key;

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setSelectedPreview(preset.key)}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-3 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {preset.badge}
                    </span>
                    {isCurrentActive && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <h4 className={`text-sm font-bold text-slate-900 dark:text-slate-100 ${preset.displayClass}`}>
                    {preset.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {preset.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400 font-mono">
                  <div>Headings: <span className="font-bold text-slate-800 dark:text-slate-200">{preset.displayFont}</span></div>
                  <div>Body: <span className="font-bold text-slate-800 dark:text-slate-200">{preset.bodyFont}</span></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Rendered Showcase Sandbox Card */}
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                Live Render Sandbox — {currentPreviewData.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentPreviewData.description}
              </div>
            </div>

            <button
              onClick={() => handleApply(currentPreviewData.key, currentPreviewData.name)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-sm ${
                activePreset === currentPreviewData.key
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
              }`}
            >
              {activePreset === currentPreviewData.key ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Currently Applied</span>
                </>
              ) : (
                <>
                  <Palette className="w-4 h-4" />
                  <span>Apply {currentPreviewData.name}</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive UI Mockup Card Rendering with the Selected Font */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Dashboard / Goal Card Sample */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Active Goal • Q4 2026
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  85% Complete
                </span>
              </div>

              <div className="space-y-1">
                <h2 className={`text-xl font-bold text-slate-900 dark:text-slate-100 ${currentPreviewData.displayClass}`}>
                  Launch Second Self Operating System
                </h2>
                <p className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${currentPreviewData.bodyClass}`}>
                  Connecting multi-agent council deliberation, real-time voice orchestration, and autonomous execution into one unified command center.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className={`text-[11px] text-slate-400 ${currentPreviewData.bodyClass}`}>
                  Due Oct 15, 2026
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`font-semibold text-slate-700 dark:text-slate-300 text-[11px] ${currentPreviewData.bodyClass}`}>
                    3 Tasks Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Persona Chat / Telegram Formatter Sample */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-base">💖</span>
                  <span className={`font-bold text-xs text-slate-900 dark:text-slate-100 ${currentPreviewData.displayClass}`}>
                    Sofi (Partner in Crime)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Telegram Active</span>
                </div>

                <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 space-y-1.5 leading-relaxed ${currentPreviewData.bodyClass}`}>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    ☀️ Tomorrow's Battlefield (October 6th):
                  </p>
                  <p>• <b>Snowflake INTERVIEW PREP:</b> Lockdown day for SWE and SRE rounds.</p>
                  <p>• <b>McKinsey Forward Program:</b> Kicks off tomorrow morning!</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                <span>$ nox stream --voice=sofi</span>
                <span className="text-slate-500 text-[10px]">48ms latency</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Selected style applies to all headings, cards, navigation, and notes.
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
