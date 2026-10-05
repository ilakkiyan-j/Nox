'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from '../components/ThemeContext';
import Navigation, { NavTab } from '../components/Navigation';
import Header from '../components/Header';
import LandingPage from '../components/LandingPage';
import AuthModal from '../components/AuthModal';
import ProfileModal from '../components/ProfileModal';
import AdminDashboardView from '../components/AdminDashboardView';
import AdminPanelModal from '../components/AdminPanelModal';
import QuickCaptureModal from '../components/QuickCaptureModal';
import CommandPalette from '../components/CommandPalette';
import UserControlPanel from '../components/UserControlPanel';
import DashboardView from '../components/DashboardView';
import GoalsView from '../components/GoalsView';
import RoadmapsView from '../components/RoadmapsView';
import TasksView from '../components/TasksView';
import LearningView from '../components/LearningView';
import EventsView from '../components/EventsView';
import HabitsView from '../components/HabitsView';
import NotesView from '../components/NotesView';
import NotificationsView from '../components/NotificationsView';
import TimeView from '../components/TimeView';
import RemindersView from '../components/RemindersView';
import CouncilView from '../components/CouncilView';
import MessagesView from '../components/MessagesView';
import { API_BASE_URL, fetchWithUser, clearAuth, getToken, getStoredUser, setStoredUser } from '../lib/api';

const API_BASE = `${API_BASE_URL}/api/v1`;

export default function Home() {
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminMode, setAdminMode] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

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

  // Modals state
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      const res = await fetchWithUser(`${API_BASE}/dashboard`);
      if (res.status === 401) { handleSignOut(); setIsAuthOpen(true); return; }
      const data = await res.json();
      if (data?.success) setDashboardData(data.data);
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/goals`);
      const data = await res.json();
      if (data?.success) setGoals(data.data);
    } catch (err) {
      console.error('Fetch goals error:', err);
    }
  };

  const fetchRoadmaps = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/roadmaps`);
      const data = await res.json();
      if (data?.success) setRoadmaps(data.data);
    } catch (err) {
      console.error('Fetch roadmaps error:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/tasks`);
      const data = await res.json();
      if (data?.success) setTasks(data.data);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
  };

  const fetchLearning = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/learning`);
      const data = await res.json();
      if (data?.success) setLearning(data.data);
    } catch (err) {
      console.error('Fetch learning error:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/events`);
      const data = await res.json();
      if (data?.success) setEvents(data.data);
    } catch (err) {
      console.error('Fetch events error:', err);
    }
  };

  const fetchHabits = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/habits`);
      const data = await res.json();
      if (data?.success) setHabits(data.data);
    } catch (err) {
      console.error('Fetch habits error:', err);
    }
  };

  const fetchNotesAndFolders = async () => {
    try {
      const [notesRes, foldersRes] = await Promise.all([
        fetchWithUser(`${API_BASE}/notes`),
        fetchWithUser(`${API_BASE}/folders`),
      ]);
      const [notesData, foldersData] = await Promise.all([notesRes.json(), foldersRes.json()]);
      if (notesData?.success) setNotes(notesData.data);
      if (foldersData?.success) setFolders(foldersData.data);
    } catch (err) {
      console.error('Fetch notes error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/notifications`);
      const data = await res.json();
      if (data?.success) setNotifications(data.data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetchWithUser(`${API_BASE}/reminders`);
      const data = await res.json();
      if (data?.success) setReminders(data.data);
    } catch (err) {
      console.error('Fetch reminders error:', err);
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
        fetchWithUser(`${API_BASE}/dashboard`),
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

      const [dashRes, goalsRes, roadmapsRes, tasksRes, learningRes, eventsRes, habitsRes, notesRes, foldersRes, notifRes, remindRes, meRes] =
        await Promise.all(responses.map((r) => r.json()));

      if (
        dashRes?.error?.statusCode === 401 ||
        goalsRes?.error?.statusCode === 401 ||
        dashRes?.statusCode === 401 ||
        goalsRes?.statusCode === 401
      ) {
        handleSignOut();
        setIsAuthOpen(true);
        return;
      }

      if (dashRes?.success) setDashboardData(dashRes.data);
      if (goalsRes?.success) setGoals(goalsRes.data);
      if (roadmapsRes?.success) setRoadmaps(roadmapsRes.data);
      if (tasksRes?.success) setTasks(tasksRes.data);
      if (learningRes?.success) setLearning(learningRes.data);
      if (eventsRes?.success) setEvents(eventsRes.data);
      if (habitsRes?.success) setHabits(habitsRes.data);
      if (notesRes?.success) setNotes(notesRes.data);
      if (foldersRes?.success) setFolders(foldersRes.data);
      if (notifRes?.success) setNotifications(notifRes.data);
      if (remindRes?.success) setReminders(remindRes.data);
      if (meRes?.success && meRes?.data) {
        setCurrentUser(meRes.data);
        setStoredUser(meRes.data);
      }
    } catch (err) {
      console.error('API Fetch error:', err);
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

  const handleSignOut = () => {
    setCurrentUser(null);
    clearAuth();
    setAdminMode(false);
    setViewMode('landing');
    setActiveTab('dashboard');
  };

  const handleLoginSuccess = (user: any) => {
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
            <Header
              activeTabTitle={activeTab}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
              notifications={notifications}
              onRefreshNotifications={fetchNotifications}
              onBackToLanding={handleSignOut}
              onOpenProfile={() => setIsProfileOpen(true)}
              currentUser={currentUser}
            />

            {/* View Workstation Content Container with Animated Entrance */}
            <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto min-w-0 max-w-full overflow-hidden">
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

          <AdminPanelModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
          />
        </div>
      )}
    </ThemeProvider>
  );
}
