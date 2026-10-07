'use client';

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Clock,
  Clipboard,
  Flame,
  CheckCircle2,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import NoxLogo from './NoxLogo';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenLogin: () => void;
}

export default function LandingPage({ onEnterApp, onOpenLogin }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="nox-landing-bg min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 glass-panel bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 py-4 max-w-7xl mx-auto flex items-center justify-between shadow-xs transition-colors">
        <button type="button" className="flex items-center space-x-3 text-left" onClick={onEnterApp} aria-label="Open Nox workspace">
          <NoxLogo size="md" showText />
          <span className="hidden sm:flex text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 items-center space-x-1.5 shadow-2xs">
            <img src="/arixen.png" alt="Arixen" className="h-3.5 w-auto object-contain rounded-xs" />
            <span>Arixen</span>
          </span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={onEnterApp}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center space-x-1.5"
          >
            <span>Open Workstation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-16 md:min-h-[620px] md:grid-cols-[0.95fr_1.05fr] md:gap-4 md:pt-12">
        <div className="relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/70 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Your personal context, connected</span>
          </div>

          <h1 className="max-w-2xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
            Make space for
            <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text pb-2 text-transparent">what matters.</span>
          </h1>

          <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
            Goals, plans, habits, and the right next step—brought together in one calm workspace that learns your context and keeps you in control.
          </p>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <button
              onClick={onEnterApp}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
            >
              <span>Open your workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenLogin}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Sign in</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Private by design</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-indigo-500" /> Your priorities, in context</span>
          </div>
        </div>

        <div className="nox-hero-scene" role="img" aria-label="A layered 3D view of goals, schedule, and daily priorities connected in Nox">
          <div className="nox-scene-glow" />
          <div className="nox-scene-orbit nox-scene-orbit-back" />
          <div className="nox-scene-orbit nox-scene-orbit-front" />
          <div className="nox-scene-core">
            <div className="nox-scene-window">
              <div className="nox-scene-toolbar">
                <span /><span /><span />
                <span className="nox-scene-toolbar-label">YOUR DAY, IN CONTEXT</span>
              </div>
              <div className="nox-scene-content">
                <div className="nox-scene-eyebrow">TODAY · YOUR FOCUS</div>
                <div className="nox-scene-title">A clear next step.</div>
                <div className="nox-scene-task">
                  <span className="nox-scene-check"><CheckCircle2 size={14} /></span>
                  <span>Prepare project proposal</span>
                  <span className="nox-scene-time">9:30</span>
                </div>
                <div className="nox-scene-task nox-scene-task-muted">
                  <span className="nox-scene-check" />
                  <span>Review weekly goals</span>
                  <span className="nox-scene-time">11:00</span>
                </div>
                <div className="nox-scene-progress">
                  <div><span>Weekly focus</span><strong>3 of 5</strong></div>
                  <div className="nox-scene-progress-track"><span /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="nox-scene-card nox-scene-card-goal">
            <div className="nox-scene-card-icon"><Target size={15} /></div>
            <div><span>LONG-TERM GOAL</span><strong>Build with intention</strong></div>
          </div>
          <div className="nox-scene-card nox-scene-card-habit">
            <div className="nox-scene-card-icon habit"><Flame size={15} /></div>
            <div><span>HABIT STREAK</span><strong>Showing up, daily</strong></div>
            <span className="nox-scene-streak">07</span>
          </div>
        </div>
      </section>

      {/* Feature Pillar Cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 space-y-12 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">Designed for Radical Personal Clarity</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">NOX connects every dimension of your personal context without noise.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Outcome Goals & Roadmaps</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect high-level aspirations directly to roadmaps, milestones, action tasks, and learning courses.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs hover:border-violet-300 dark:hover:border-violet-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Non-Grid Vertical Time</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Forget rigid 7-day calendar grids. Experience time as a smooth vertical sequence of Now, Next, and Upcoming focus blocks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Clipboard className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">1-Second Quick Capture</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Copy job URLs, code snippets, or raw thoughts and paste directly into NOX scratchpad without friction.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 py-10 px-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
        <div className="flex items-center justify-center space-x-2.5">
          <img src="/arixen.png" alt="Arixen Logo" className="h-6 w-auto object-contain rounded-xs" />
          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-wide">A Product of Arixen</span>
        </div>
        <p className="text-slate-500 dark:text-slate-400">NOX — Your Second Self • Personal Context Operating System</p>
      </footer>
    </div>
  );
}
