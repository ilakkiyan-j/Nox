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
import DashboardView from '../components/DashboardView';
import GoalsView from '../components/GoalsView';
import TasksView from '../components/TasksView';
import LearningView from '../components/LearningView';
import EventsView from '../components/EventsView';
import HabitsView from '../components/HabitsView';
import NotesView from '../components/NotesView';
import NotificationsView from '../components/NotificationsView';
import TimeView from '../components/TimeView';
import RemindersView from '../components/RemindersView';

const API_BASE = 'http://localhost:4000/api/v1';

export default function Home() {
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
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

  const fetchAllData = async () => {
    try {
      const [dashRes, goalsRes, tasksRes, learningRes, eventsRes, habitsRes, notesRes, foldersRes, notifRes, remindRes] =
        await Promise.all([
          fetch(`${API_BASE}/dashboard`).then((r) => r.json()),
          fetch(`${API_BASE}/goals`).then((r) => r.json()),
          fetch(`${API_BASE}/tasks`).then((r) => r.json()),
          fetch(`${API_BASE}/learning`).then((r) => r.json()),
          fetch(`${API_BASE}/events`).then((r) => r.json()),
          fetch(`${API_BASE}/habits`).then((r) => r.json()),
          fetch(`${API_BASE}/notes`).then((r) => r.json()),
          fetch(`${API_BASE}/folders`).then((r) => r.json()),
          fetch(`${API_BASE}/notifications`).then((r) => r.json()),
          fetch(`${API_BASE}/reminders`).then((r) => r.json()),
        ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (goalsRes.success) setGoals(goalsRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (learningRes.success) setLearning(learningRes.data);
      if (eventsRes.success) setEvents(eventsRes.data);
      if (habitsRes.success) setHabits(habitsRes.data);
      if (notesRes.success) setNotes(notesRes.data);
      if (foldersRes.success) setFolders(foldersRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
      if (remindRes.success) setReminders(remindRes.data);
    } catch (err) {
      console.error('API Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setViewMode('app');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            data={dashboardData}
            loading={loading}
            onNavigate={(tab) => setActiveTab(tab)}
            onRefresh={fetchAllData}
          />
        );
      case 'goals':
      case 'roadmaps':
        return <GoalsView goals={goals} onRefresh={fetchAllData} />;
      case 'tasks':
        return <TasksView tasks={tasks} goals={goals} onRefresh={fetchAllData} />;
      case 'learning':
        return <LearningView learning={learning} onRefresh={fetchAllData} />;
      case 'events':
        return <EventsView events={events} onRefresh={fetchAllData} />;
      case 'habits':
        return <HabitsView habits={habits} onRefresh={fetchAllData} />;
      case 'notes':
        return (
          <NotesView
            notes={notes}
            folders={folders}
            onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
            onRefresh={fetchAllData}
          />
        );
      case 'time':
        return <TimeView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'reminders':
        return <RemindersView reminders={reminders} onRefresh={fetchAllData} />;
      case 'notifications':
        return <NotificationsView notifications={notifications} onRefresh={fetchAllData} />;
      default:
        return (
          <DashboardView
            data={dashboardData}
            loading={loading}
            onNavigate={(tab) => setActiveTab(tab)}
            onRefresh={fetchAllData}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      {viewMode === 'landing' ? (
        <>
          <LandingPage
            onEnterApp={() => setViewMode('app')}
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
          onSignOut={() => {
            setCurrentUser(null);
            setViewMode('landing');
          }}
        />
      ) : (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative text-slate-900 dark:text-slate-100 transition-colors">
          {/* Navigation Sidebar & Mobile Glass Nav */}
          <Navigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenProfile={() => setIsProfileOpen(true)}
          />

          {/* Main Workstation */}
          <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-8">
            {/* Global Header with embedded Notifications dropdown bar */}
            <Header
              activeTabTitle={activeTab}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
              notifications={notifications}
              onRefreshNotifications={fetchAllData}
              onBackToLanding={() => {
                setCurrentUser(null);
                setViewMode('landing');
              }}
            />

            {/* View Workstation Content Container with Animated Entrance */}
            <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
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
            onSaved={fetchAllData}
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

          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            onSignOut={() => {
              setCurrentUser(null);
              setViewMode('landing');
            }}
            onOpenAdmin={() => setIsAdminOpen(true)}
            currentUser={currentUser}
            stats={{
              goalsCount: goals.length,
              habitsStreak: habits[0]?.streakCount || 7,
              notesCount: notes.length,
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
