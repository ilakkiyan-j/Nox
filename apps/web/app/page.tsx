'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { ThemeProvider } from '../components/ThemeContext';
import Navigation, { navItems } from '../components/Navigation';
import type { NavTab } from '../components/Navigation';
import Header from '../components/Header';
import LandingPage from '../components/LandingPage';
import AuthModal from '../components/AuthModal';
import ProfileModal from '../components/ProfileModal';
import TypographyVisualizerModal, { applyFontPreset, FontPresetKey } from '../components/TypographyVisualizerModal';
import { API_BASE_URL, assertApiSuccess, fetchWithUser, clearAuth, getToken, getStoredUser, setStoredUser } from '../lib/api';
import { appendTimeZone } from '../lib/date';

const API_BASE = `${API_BASE_URL}/api/v1`;

function ViewLoading() {
  return (
    <div className="mx-auto flex min-h-48 max-w-xl items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400" role="status">
      Loading section...
    </div>
  );
}

const AdminDashboardView = dynamic(() => import('../components/AdminDashboardView'), { loading: ViewLoading });
const AdminPanelModal = dynamic(() => import('../components/AdminPanelModal'), { loading: ViewLoading });
const QuickCaptureModal = dynamic(() => import('../components/QuickCaptureModal'), { loading: ViewLoading });
const CommandPalette = dynamic(() => import('../components/CommandPalette'), { loading: ViewLoading });
const UserControlPanel = dynamic(() => import('../components/UserControlPanel'), { loading: ViewLoading });
const DashboardView = dynamic(() => import('../components/DashboardView'), { loading: ViewLoading });
const GoalsView = dynamic(() => import('../components/GoalsView'), { loading: ViewLoading });
const RoadmapsView = dynamic(() => import('../components/RoadmapsView'), { loading: ViewLoading });
const TasksView = dynamic(() => import('../components/TasksView'), { loading: ViewLoading });
const LearningView = dynamic(() => import('../components/LearningView'), { loading: ViewLoading });
const EventsView = dynamic(() => import('../components/EventsView'), { loading: ViewLoading });
const HabitsView = dynamic(() => import('../components/HabitsView'), { loading: ViewLoading });
const NotesView = dynamic(() => import('../components/NotesView'), { loading: ViewLoading });
const NotificationsView = dynamic(() => import('../components/NotificationsView'), { loading: ViewLoading });
const TimeView = dynamic(() => import('../components/TimeView'), { loading: ViewLoading });
const RemindersView = dynamic(() => import('../components/RemindersView'), { loading: ViewLoading });
const CouncilView = dynamic(() => import('../components/CouncilView'), { loading: ViewLoading });
const MessagesView = dynamic(() => import('../components/MessagesView'), { loading: ViewLoading });

export default function Home() {
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminMode, setAdminMode] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [learning, setLearning] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // Modals state
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const readArrayResponse = async (response: Response, label: string): Promise<any[]> => {
    await assertApiSuccess(response, `Could not load ${label.toLowerCase()}`);
    const payload = await response.json();
    if (payload?.success !== true || !Array.isArray(payload.data)) {
      throw new Error(`Invalid ${label.toLowerCase()} response`);
    }
    return payload.data;
  };

  const handleEnterApp = () => {
    const user = getStoredUser();
    const token = getToken();
    if (user && token) {
      setCurrentUser(user);
      if (user?.role === 'ADMIN') setAdminMode(true);
      setViewMode('app');
      fetchAllData(true);
    } else {
      setCurrentUser(null);
      clearAuth();
      setViewMode('landing');
      setIsAuthOpen(true);
    }
  };

  const fetchDashboard = async (silent = true) => {
    try {
      const res = await fetchWithUser(appendTimeZone(`${API_BASE}/dashboard`));
      if (res.status === 401) { handleSignOut(); setIsAuthOpen(true); return; }
      await assertApiSuccess(res, 'Could not load dashboard');
      const data = await res.json();
      if (data?.success !== true || !data.data || typeof data.data !== 'object' || Array.isArray(data.data)) {
        throw new Error('Invalid dashboard response');
      }
      setDashboardData(data.data);
      if (!silent) setDataLoadError(null);
    } catch (err) {
      console.error('Fetch dashboard error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load dashboard');
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/goals`);
      setGoals(await readArrayResponse(res, 'Goals'));
    } catch (err) {
      console.error('Fetch goals error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load goals');
    }
  };

  const fetchRoadmaps = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/roadmaps`);
      setRoadmaps(await readArrayResponse(res, 'Roadmaps'));
    } catch (err) {
      console.error('Fetch roadmaps error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load roadmaps');
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/tasks`);
      setTasks(await readArrayResponse(res, 'Tasks'));
    } catch (err) {
      console.error('Fetch tasks error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load tasks');
    }
  };

  const fetchLearning = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/learning`);
      setLearning(await readArrayResponse(res, 'Learning'));
    } catch (err) {
      console.error('Fetch learning error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load learning');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/events`);
      setEvents(await readArrayResponse(res, 'Events'));
    } catch (err) {
      console.error('Fetch events error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load events');
    }
  };

  const fetchHabits = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/habits`);
      setHabits(await readArrayResponse(res, 'Habits'));
    } catch (err) {
      console.error('Fetch habits error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load habits');
    }
  };

  const fetchNotesAndFolders = async () => {
    try {
      const [notesRes, foldersRes] = await Promise.all([
        fetchWithUser(`${API_BASE}/notes`),
        fetchWithUser(`${API_BASE}/folders`),
      ]);
      const [loadedNotes, loadedFolders] = await Promise.all([
        readArrayResponse(notesRes, 'Notes'),
        readArrayResponse(foldersRes, 'Folders'),
      ]);
      setNotes(loadedNotes);
      setFolders(loadedFolders);
    } catch (err) {
      console.error('Fetch notes error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load notes and folders');
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/notifications`);
      setNotifications(await readArrayResponse(res, 'Notifications'));
    } catch (err) {
      console.error('Fetch notifications error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load notifications');
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/reminders`);
      setReminders(await readArrayResponse(res, 'Reminders'));
    } catch (err) {
      console.error('Fetch reminders error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load reminders');
    }
  };

  const fetchAllData = async (isInitial = false) => {
    const token = getToken();
    if (!token) {
      handleSignOut();
      setIsAuthOpen(true);
      setLoading(false);
      return;
    }
    if (isInitial) {
      setLoading(true);
    }
    try {
      const responses = await Promise.all([
        fetchWithUser(appendTimeZone(`${API_BASE}/dashboard`)),
        fetchWithUser(`${API_BASE}/goals`),
        fetchWithUser(`${API_BASE}/roadmaps`),
        fetchWithUser(`${API_BASE}/tasks`),
        fetchWithUser(`${API_BASE}/learning`),
        fetchWithUser(`${API_BASE}/events`),
        fetchWithUser(`${API_BASE}/habits`),
        fetchWithUser(`${API_BASE}/notes`),
        fetchWithUser(`${API_BASE}/folders`),
        fetchWithUser(`${API_BASE}/notifications`),
        fetchWithUser(`${API_BASE}/reminders`),
        fetchWithUser(`${API_BASE}/auth/me`),
      ]);

      if (responses.some((r) => r.status === 401)) {
        handleSignOut();
        setIsAuthOpen(true);
        return;
      }

      const payloads = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      const failures: string[] = [];
      const loadArray = (index: number, label: string, setter: (value: any[]) => void) => {
        const response = responses[index];
        const payload = payloads[index];
        if (response.ok && payload?.success === true && Array.isArray(payload.data)) {
          setter(payload.data);
          return;
        }
        const detail = typeof payload?.error?.message === 'string'
          ? payload.error.message
          : `HTTP ${response.status}`;
        failures.push(`${label}: ${detail}`);
      };
      const dashboardPayload = payloads[0];
      if (
        responses[0].ok &&
        dashboardPayload?.success === true &&
        dashboardPayload.data &&
        typeof dashboardPayload.data === 'object' &&
        !Array.isArray(dashboardPayload.data)
      ) {
        setDashboardData(dashboardPayload.data);
      } else {
        failures.push(`Dashboard: ${dashboardPayload?.error?.message || `HTTP ${responses[0].status}`}`);
      }
      loadArray(1, 'Goals', setGoals);
      loadArray(2, 'Roadmaps', setRoadmaps);
      loadArray(3, 'Tasks', setTasks);
      loadArray(4, 'Learning', setLearning);
      loadArray(5, 'Events', setEvents);
      loadArray(6, 'Habits', setHabits);
      loadArray(7, 'Notes', setNotes);
      loadArray(8, 'Folders', setFolders);
      loadArray(9, 'Notifications', setNotifications);
      loadArray(10, 'Reminders', setReminders);
      const mePayload = payloads[11];
      if (responses[11].ok && mePayload?.success === true && mePayload.data) {
        setCurrentUser(mePayload.data);
        setStoredUser(mePayload.data);
      } else {
        failures.push(`Account: ${mePayload?.error?.message || `HTTP ${responses[11].status}`}`);
      }
      setDataLoadError(failures.length ? `Some workspace data could not be loaded. ${failures.join(' · ')}` : null);
    } catch (err) {
      console.error('API Fetch error:', err);
      setDataLoadError(err instanceof Error ? err.message : 'Could not load workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleUnauthorized = () => {
        handleSignOut();
        setIsAuthOpen(true);
      };
      window.addEventListener('nox-unauthorized', handleUnauthorized);

      const handleFocus = () => {
        const token = getToken();
        if (token) fetchAllData(false);
      };
      window.addEventListener('focus', handleFocus);

      // Initialize Typography Preset
      const savedPreset = (localStorage.getItem('nox_font_preset') as FontPresetKey) || 'executive';
      applyFontPreset(savedPreset);

      const user = getStoredUser();
      const token = getToken();
      if (user && token) {
        setCurrentUser(user);
        if (user?.role === 'ADMIN') setAdminMode(true);
        setViewMode('app');
        fetchAllData(true);
      } else {
        setViewMode('landing');
        setLoading(false);
      }

      return () => {
        window.removeEventListener('nox-unauthorized', handleUnauthorized);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, []);

  const clearWorkspaceData = () => {
    setDashboardData(null);
    setGoals([]);
    setRoadmaps([]);
    setTasks([]);
    setLearning([]);
    setEvents([]);
    setHabits([]);
    setNotes([]);
    setFolders([]);
    setNotifications([]);
    setReminders([]);
    setDataLoadError(null);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    clearAuth();
    setAdminMode(false);
    setLoading(false);
    clearWorkspaceData();
    setViewMode('landing');
    setActiveTab('dashboard');
  };

  const handleLoginSuccess = (user: any) => {
    if (currentUser?.id !== user?.id) clearWorkspaceData();
    setCurrentUser(user);
    if (user?.role === 'ADMIN') {
      setAdminMode(true);
    } else {
      setAdminMode(false);
    }
    setViewMode('app');
    setTimeout(() => fetchAllData(true), 100);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            data={dashboardData}
            loading={loading}
            onNavigate={(tab) => setActiveTab(tab)}
            onRefresh={() => fetchDashboard(true)}
          />
        );
      case 'council':
        return (
          <CouncilView
            currentUser={currentUser}
            tasks={tasks}
            events={events}
            habits={habits}
            onNavigate={(tab) => setActiveTab(tab as NavTab)}
            onRefresh={() => {
              fetchTasks();
              fetchEvents();
              fetchHabits();
              fetchDashboard(true);
            }}
          />
        );
      case 'goals':
        return (
          <GoalsView
            goals={goals}
            onRefresh={() => {
              fetchGoals();
              fetchDashboard(true);
            }}
          />
        );
      case 'roadmaps':
        return (
          <RoadmapsView
            roadmaps={roadmaps}
            goals={goals}
            onRefresh={() => {
              fetchRoadmaps();
              fetchGoals();
              fetchDashboard(true);
            }}
          />
        );
      case 'tasks':
        return (
          <TasksView
            tasks={tasks}
            goals={goals}
            roadmaps={roadmaps}
            learning={learning}
            events={events}
            onRefresh={() => {
              fetchTasks();
              fetchDashboard(true);
            }}
          />
        );
      case 'learning':
        return (
          <LearningView
            learning={learning}
            onRefresh={() => {
              fetchLearning();
              fetchDashboard(true);
            }}
          />
        );
      case 'events':
        return (
          <EventsView
            events={events}
            onRefresh={() => {
              fetchEvents();
              fetchDashboard(true);
            }}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'habits':
        return (
          <HabitsView
            habits={habits}
            onRefresh={() => {
              fetchHabits();
              fetchDashboard(true);
            }}
          />
        );
      case 'messages':
        return (
          <MessagesView
            onNavigate={(tab) => setActiveTab(tab)}
            currentUser={currentUser}
          />
        );
      case 'notes':
        return (
          <NotesView
            notes={notes}
            folders={folders}
            onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
            onRefresh={() => {
              fetchNotesAndFolders();
              fetchDashboard(true);
            }}
          />
        );
      case 'time':
        return <TimeView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'reminders':
        return (
          <RemindersView
            reminders={reminders}
            events={events}
            onRefresh={() => {
              fetchReminders();
              fetchEvents();
              fetchDashboard(true);
            }}
          />
        );
      case 'notifications':
        return (
          <NotificationsView
            notifications={notifications}
            onRefresh={fetchNotifications}
          />
        );
      default:
        return (
          <DashboardView
            data={dashboardData}
            loading={loading}
            onNavigate={(tab) => setActiveTab(tab)}
            onRefresh={() => fetchDashboard(true)}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      {viewMode === 'landing' || !currentUser || !getToken() ? (
        <>
          <LandingPage
            onEnterApp={handleEnterApp}
            onOpenLogin={() => setIsAuthOpen(true)}
          />
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </>
      ) : currentUser?.role === 'ADMIN' ? (
        <AdminDashboardView
          onSignOut={handleSignOut}
        />
      ) : (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative text-slate-900 dark:text-slate-100 transition-colors">
          {/* Navigation Sidebar & Mobile Glass Nav */}
          <Navigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenProfile={() => setIsProfileOpen(true)}
            currentUser={currentUser}
          />

          {/* Main Workstation */}
          <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-8 min-w-0 max-w-full overflow-x-hidden transition-all duration-300">
            {/* Global Header with embedded Notifications dropdown bar */}
            <a href="#main-content" className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm text-indigo-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
              Skip to content
            </a>
            <Header
              activeTabTitle={navItems.find((item) => item.id === activeTab)?.label || 'Dashboard'}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
              notifications={notifications}
              onRefreshNotifications={fetchNotifications}
              onBackToLanding={handleSignOut}
              onOpenProfile={() => setIsProfileOpen(true)}
              currentUser={currentUser}
            />

            {/* View Workstation Content Container with Animated Entrance */}
            <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto min-w-0 max-w-full overflow-hidden">
              {dataLoadError && (
                <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="flex min-w-0 items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="min-w-0">
                      <strong className="font-semibold">Some information may be out of date.</strong>{' '}
                      {dataLoadError}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fetchAllData(false)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setDataLoadError(null)}
                      aria-label="Dismiss data loading warning"
                      className="rounded-lg p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {renderActiveView()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* Global Modals */}
          <QuickCaptureModal
            isOpen={isQuickCaptureOpen}
            onClose={() => setIsQuickCaptureOpen(false)}
            onSaved={() => {
              fetchNotesAndFolders();
              fetchTasks();
              fetchDashboard(true);
            }}
            folders={folders}
          />

          <CommandPalette
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectEntity={(type, item) => {
              if (type === 'goals') setActiveTab('goals');
              else if (type === 'tasks') setActiveTab('tasks');
              else if (type === 'notes') setActiveTab('notes');
              else if (type === 'events') setActiveTab('events');
              else if (type === 'learning') setActiveTab('learning');
            }}
          />

          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />

          <UserControlPanel
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            onSignOut={handleSignOut}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onProfileUpdated={(user) => {
              setCurrentUser(user);
              setStoredUser(user);
            }}
            onOpenTypography={() => setIsTypographyOpen(true)}
            currentUser={currentUser}
            stats={{
              goalsCount: goals.length,
              habitsStreak: habits[0]?.streakCount || 7,
              notesCount: notes.length,
              tasksCount: tasks.length,
              eventsCount: events.length,
              remindersCount: reminders.length,
              learningCount: learning.length,
            }}
          />

          <TypographyVisualizerModal
            isOpen={isTypographyOpen}
            onClose={() => setIsTypographyOpen(false)}
          />

          <AdminPanelModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
          />
        </div>
      )}
    </ThemeProvider>
  );
}
