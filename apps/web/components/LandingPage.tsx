'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Clock,
  Clipboard,
  Flame,
  CheckCircle2,
  Lock,
  Globe,
  ChevronRight,
  Compass,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from './ThemeContext';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenLogin: () => void;
}

export default function LandingPage({ onEnterApp, onOpenLogin }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-600 selection:text-white relative overflow-hidden transition-colors">
      {/* Background Subtle Gradient Highlights */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-violet-200/40 dark:bg-violet-900/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[450px] h-[450px] bg-emerald-200/30 dark:bg-emerald-900/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 glass-panel bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 py-4 max-w-7xl mx-auto flex items-center justify-between shadow-xs transition-colors">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onEnterApp}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-xl font-bold tracking-wider text-slate-900 dark:text-slate-100">NOX</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 shadow-2xs">
                <img src="/arixen.png" alt="Arixen" className="h-3.5 w-auto object-contain rounded-xs" />
                <span>Arixen</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase font-medium">Your Second Self</p>
          </div>
        </div>

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
      <section className="relative z-10 pt-20 pb-16 px-6 max-w-5xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>The Next-Generation Personal Context OS</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1]"
        >
          An External Representation <br className="hidden sm:inline" />
          Of Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-400">Own Mind.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          NOX unifies your personal Goals, Roadmaps, Learning paths, Habits, Events, Fast Clipboard Captures, and Vertical Time Flow in one calm workstation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
          >
            <span>Launch NOX Workstation</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 shadow-xs"
          >
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sign In to Account</span>
          </button>
        </motion.div>
      </section>

      {/* Interactive Workstation Mockup Preview */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-5 shadow-2xl"
        >
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-6">
            {/* Top Bar Preview */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2">nox.internal/command-center</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                <Zap className="w-3.5 h-3.5" />
                <span>LIVE PERSONAL SYSTEM</span>
              </div>
            </div>

            {/* Dashboard Command Center Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Active Goal: Become a Senior FDE</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">IN_PROGRESS</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Master AI Agent Architecture, System Design, Backend Engineering, and Cloud Deployments.</p>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="w-[65%] h-full bg-gradient-to-r from-indigo-600 to-violet-600" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">Habit Streak</h3>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">🔥 7 Days</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Practice DSA & System Architecture</p>
                <button className="w-full py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                  Completed Today ✓
                </button>
              </div>
            </div>
          </div>
        </motion.div>
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
