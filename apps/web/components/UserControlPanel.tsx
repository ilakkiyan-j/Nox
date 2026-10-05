import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Sun, Moon, Shield, Zap, LogOut, Settings, Target, CheckSquare,
  StickyNote, Calendar, Flame, GraduationCap, Bell, Download, Trash2,
  Edit3, Save, BarChart3, Clock, AlarmClock, Layers, ChevronRight,
  Database, Compass, Lock, Sparkles, ArrowLeft, Upload, Image as ImageIcon, Link as LinkIcon, RefreshCw,
  Volume2, Mic, Play, Pause, Radio, Check, SlidersHorizontal
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { API_BASE_URL, fetchWithUser } from '../lib/api';
import Avatar from './Avatar';
import NoxLogo from './NoxLogo';

interface UserControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onOpenAdmin?: () => void;
  currentUser?: any;
  stats?: {
    goalsCount: number;
    habitsStreak: number;
    notesCount: number;
    tasksCount?: number;
    eventsCount?: number;
    remindersCount?: number;
    learningCount?: number;
  };
}

type PanelSection = 'overview' | 'profile' | 'preferences' | 'voice' | 'analytics' | 'data';

export default function UserControlPanel({
  isOpen,
  onClose,
  onSignOut,
  onOpenAdmin,
  currentUser,
  stats,
}: UserControlPanelProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<PanelSection>('overview');
  const [displayName, setDisplayName] = useState(currentUser?.name || 'Nox Architect');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Settings State
  const [voiceModel, setVoiceModel] = useState('en-US-AvaMultilingualNeural');
  const [pitchHz, setPitchHz] = useState<number>(0);
  const [ratePct, setRatePct] = useState<number>(0);
  const [isCloneEnabled, setIsCloneEnabled] = useState(true);
  const [voiceCatalog, setVoiceCatalog] = useState<any[]>([]);
  const [testText, setTestText] = useState("Hi Ilakkiyan! Tomorrow is Snowflake prep day. We are going to go hard and crush it together.");
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaveSuccess, setVoiceSaveSuccess] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentUser?.name) setDisplayName(currentUser.name);
    if (currentUser?.avatarUrl !== undefined) setAvatarUrl(currentUser.avatarUrl || '');
    loadVoiceSettings();
  }, [currentUser]);

  const loadVoiceSettings = async () => {
    try {
      const [prefRes, catalogRes] = await Promise.all([
        fetchWithUser(`${API_BASE_URL}/api/v1/voice/preferences`),
        fetchWithUser(`${API_BASE_URL}/api/v1/voice/catalog`),
      ]);
      const prefData = await prefRes.json();
      const catalogData = await catalogRes.json();

      if (prefData.success && prefData.data) {
        setVoiceModel(prefData.data.voiceModel || 'en-US-AvaMultilingualNeural');
        const pMatch = (prefData.data.pitch || '+0Hz').match(/([+-]?\d+)/);
        if (pMatch) setPitchHz(parseInt(pMatch[1], 10));
        const rMatch = (prefData.data.rate || '+0%').match(/([+-]?\d+)/);
        if (rMatch) setRatePct(parseInt(rMatch[1], 10));
        setIsCloneEnabled(prefData.data.isCloneEnabled ?? true);
      }

      if (catalogData.success && catalogData.data) {
        setVoiceCatalog(catalogData.data);
      }
    } catch (err) {
      console.warn('Could not load voice preferences:', err);
    }
  };

  const handleSaveVoice = async () => {
    setSavingVoice(true);
    try {
      const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;
      const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceModel,
          pitch: pitchStr,
          rate: rateStr,
          isCloneEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVoiceSaveSuccess(true);
        setTimeout(() => setVoiceSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save voice preference:', err);
    } finally {
      setSavingVoice(false);
    }
  };

  const handleTestVoice = async () => {
    if (isPlayingTest && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingTest(false);
      return;
    }

    setTestingVoice(true);
    try {
      const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;
      const rateStr = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;

      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/voice/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voiceModel,
          pitch: pitchStr,
          rate: rateStr,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.audioUrl) {
        const audio = new Audio(data.data.audioUrl);
        audioPlayerRef.current = audio;
        setIsPlayingTest(true);
        audio.onended = () => setIsPlayingTest(false);
        audio.onerror = () => setIsPlayingTest(false);
        await audio.play();
      }
    } catch (err) {
      console.error('Voice test synthesis failed:', err);
    } finally {
      setTestingVoice(false);
    }
  };

  if (!isOpen) return null;

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'NA';

  const uploadToCloudCDN = async (base64Payload: string) => {
    setUploadingCloud(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/auth/avatar/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Payload }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setAvatarUrl(data.data.url);
        if (data.data.user && typeof window !== 'undefined') {
          localStorage.setItem('nox_user', JSON.stringify(data.data.user));
        }
      } else {
        setAvatarUrl(base64Payload);
      }
    } catch (err) {
      console.error('Cloud avatar upload failed:', err);
      setAvatarUrl(base64Payload);
    } finally {
      setUploadingCloud(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size is too large. Please select an image under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) return;

      // Compress photo to 256x256 thumbnail using Canvas before cloud upload
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 256;
        canvas.width = maxDim;
        canvas.height = maxDim;

        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          uploadToCloudCDN(compressed);
        } else {
          uploadToCloudCDN(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('nox_user', JSON.stringify(data.data));
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const sectionNav: { id: PanelSection; label: string; description: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', description: 'Identity summary & workspace snapshot', icon: User },
    { id: 'profile', label: 'Profile & Identity', description: 'Personal details & display settings', icon: Edit3 },
    { id: 'preferences', label: 'Preferences', description: 'Theme, time flow & environment rules', icon: Settings },
    { id: 'voice', label: 'Voice & Speech', description: 'Locked Sofi voice synthesizer, pitch & rate', icon: Volume2 },
    { id: 'analytics', label: 'Analytics & Impact', description: 'Metrics & workspace activity breakdown', icon: BarChart3 },
    { id: 'data', label: 'Data & Security', description: 'Exports, session status & danger zone', icon: Database },
  ];

  const analyticsItems = [
    { label: 'Active Goals', value: stats?.goalsCount ?? 0, icon: Target, color: 'indigo' },
    { label: 'Total Tasks', value: stats?.tasksCount ?? 0, icon: CheckSquare, color: 'emerald' },
    { label: 'Note Captures', value: stats?.notesCount ?? 0, icon: StickyNote, color: 'violet' },
    { label: 'Scheduled Events', value: stats?.eventsCount ?? 0, icon: Calendar, color: 'rose' },
    { label: 'Learning Tracks', value: stats?.learningCount ?? 0, icon: GraduationCap, color: 'sky' },
    { label: 'Active Reminders', value: stats?.remindersCount ?? 0, icon: AlarmClock, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60',
    violet: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/60',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60',
    sky: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/60',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60',
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      
      {/* ── FULL SCREEN TOP BAR ── */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
            title="Return to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Workspace</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          <div className="flex items-center space-x-2.5">
            <NoxLogo size="sm" showText={false} />
            <div>
              <h1 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">User Control Center</h1>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-wider font-semibold">NOX Personal OS · Command Hub</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center space-x-2 text-xs font-semibold"
            title="Toggle Light / Dark Theme"
          >
            {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            <span className="hidden sm:inline font-mono">{theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 transition-all cursor-pointer"
            title="Close Control Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── FULL SCREEN WORKSTATION BODY ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Desktop Left Navigation Sidebar */}
        <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 space-y-1.5 shrink-0 hidden md:flex flex-col justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1 font-mono">Control Center Navigation</p>
            {sectionNav.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-start space-x-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                  <div>
                    <p className="text-sm font-bold leading-tight">{s.label}</p>
                    <p className={`text-[11px] mt-0.5 line-clamp-1 ${isActive ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>{s.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* User Profile Footer card in Sidebar */}
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar src={avatarUrl} name={displayName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser?.email || 'user@nox.internal'}</p>
              </div>
            </div>
            <button
              onClick={() => { onClose(); onSignOut(); }}
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer border border-rose-200/60 dark:border-rose-900/60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex items-center space-x-1 p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0 touch-pan-x">
          {sectionNav.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Workstation Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 max-w-6xl w-full mx-auto space-y-8 pb-16 md:pb-10">

          {/* ── OVERVIEW SECTION ── */}
          {activeSection === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              
              {/* Identity Banner */}
              <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-xl shadow-indigo-500/15 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center space-x-5 z-10">
                  <Avatar src={avatarUrl} name={displayName} size="2xl" className="shadow-2xl border-2 border-white/30" />
                  <div>
                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/20 text-white uppercase font-mono tracking-wider border border-white/20 mb-2">
                      {currentUser?.role === 'ADMIN' ? '🛡️ System Administrator' : '⚡ Personal Operating System User'}
                    </span>
                    <h2 className="font-display font-bold text-2xl md:text-3xl text-white leading-tight">{displayName}</h2>
                    <p className="text-xs text-indigo-100 mt-1">{currentUser?.email || 'user@nox.internal'}</p>
                  </div>
                </div>

                <div className="z-10 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveSection('profile')}
                    className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('preferences')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Preferences</span>
                  </button>
                </div>
              </div>

              {/* Workspace Snapshot Analytics */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Workspace Snapshot</span>
                  </h3>
                  <button
                    onClick={() => setActiveSection('analytics')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                  >
                    <span>View All Analytics</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {analyticsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={`p-4 rounded-2xl border text-center transition-all hover:scale-102 ${colorMap[item.color]}`}>
                        <Icon className="w-5 h-5 mx-auto mb-2" />
                        <span className="text-3xl font-bold block font-display">{item.value}</span>
                        <span className="text-[10px] opacity-75 uppercase font-mono font-bold mt-1 block leading-tight">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Control Center Shortcuts */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">Control Hub Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionNav.filter(s => s.id !== 'overview').map((s) => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group flex items-start space-x-4"
                      >
                        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {s.label}
                            </h4>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{s.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ── PROFILE SECTION ── */}
          {activeSection === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-3xl">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Edit3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>Profile & Identity</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your public display name, email, and identity settings across NOX.</p>
              </div>

              {/* Avatar & Display Name Settings */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-start space-x-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex-col sm:flex-row gap-4 sm:gap-0">
                  <Avatar src={avatarUrl} name={displayName} size="2xl" className="shadow-lg" />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Identity Avatar Customizer</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use an external image URL or upload a custom photo from your computer/device.</p>
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingCloud}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingCloud ? 'Uploading to Cloud...' : 'Upload Photo File'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset to Initials</span>
                        </button>
                      )}

                      {avatarUrl?.startsWith('http') && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1">
                          <span>☁️ Cloud CDN Hosted</span>
                        </span>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Custom Avatar Image URL</span>
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors font-mono"
                      placeholder="https://images.unsplash.com/... or https://github.com/username.png"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Paste any direct image link URL (`https://...`).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors font-medium"
                      placeholder="Enter display name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Email address is managed via login credentials and cannot be edited here.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingProfile ? 'Saving...' : saveSuccess ? '✓ Saved Profile' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </div>

              {/* Role & Access Rights */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Account Access Level</h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                    {currentUser?.role === 'ADMIN' ? 'ADMINISTRATOR' : 'STANDARD USER'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your access level grants isolated permission to manage personal goals, tasks, learning tracks, events, habits, and notes.
                </p>
              </div>
            </div>
          )}

          {/* ── PREFERENCES SECTION ── */}
          {activeSection === 'preferences' && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-3xl">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>System Preferences</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customize interface themes, layout behavior, and workspace rules.</p>
              </div>

              <div className="space-y-4">
                {/* Theme Preference */}
                <div
                  onClick={toggleTheme}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-indigo-950/80 text-amber-500 dark:text-indigo-400 border border-amber-200 dark:border-indigo-900/60">
                      {theme === 'light' ? <Sun className="w-6 h-6 text-amber-500" /> : <Moon className="w-6 h-6 text-indigo-400" />}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Interface Visual Mode</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch between Light Mode and Dark Glassmorphism Mode.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                    {theme === 'light' ? '☀️ Light Mode Active' : '🌙 Dark Mode Active'}
                  </span>
                </div>

                {/* Vertical Time Flow */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Vertical Time Flow</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Focus sequence ordering for Now, Next, and Upcoming horizons.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    ENABLED
                  </span>
                </div>

                {/* Account Isolation */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Personal Data Isolation</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Strict database scoping per user account.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    ISOLATED
                  </span>
                </div>

                {/* Admin Panel Launch (If available) */}
                {onOpenAdmin && (
                  <button
                    onClick={() => { onClose(); onOpenAdmin(); }}
                    className="w-full p-6 rounded-3xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 hover:border-indigo-400 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-bold text-base">Launch Administrator Console</h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5">User provisioning, account management & system diagnostics</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-4 py-2 rounded-xl bg-indigo-600 text-white">
                      ADMIN CONSOLE →
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── VOICE & SPEECH SYNTHESIZER SECTION ── */}
          {activeSection === 'voice' && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-3xl">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Volume2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>Voice & Speech Synthesizer</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure high-fidelity neural voices, speech rate, pitch tuning, and exclusive clone voice settings.
                </p>
              </div>

              {/* Exclusive Sofi Cloned Voice Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-violet-900/40 to-slate-900/40 border border-indigo-500/30 shadow-lg space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          🔒 EXCLUSIVE OWNER VOICE PACK
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          CLEAN CLONE ACTIVE
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mt-1">
                        Sofi Locked Neural Voice
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Clean reference profile (<code className="text-indigo-400 font-mono text-[11px]">sofi_clean_reference.wav</code>) locked to your account with zero noise.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span className="font-mono text-[11px]">🛡️ Multi-Tenancy Isolation Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">Isolated to Ilakkiyan's Account Only</span>
                </div>
              </div>

              {/* Voice Model Selection */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Neural Voice Model</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">edge-tts neural engine</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {voiceCatalog.length > 0 ? (
                    voiceCatalog.map((voice) => {
                      const isSelected = voiceModel === voice.voiceModel;
                      return (
                        <div
                          key={voice.id}
                          onClick={() => {
                            if (voice.available !== false) {
                              setVoiceModel(voice.voiceModel);
                            }
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            voice.available === false
                              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                              : isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                              : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                                <span>{voice.name}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {voice.description}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-indigo-600 text-white shrink-0 ml-2">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-3">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {voice.locale}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {voice.gender}
                            </span>
                            {voice.isExclusive && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                                🔒 Locked Profile
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Ava Multilingual Neural (Locked Sofi Voice)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">en-US-AvaMultilingualNeural</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pitch & Rate Sliders */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Acoustic Pitch & Speech Velocity Tuning</span>
                </h3>

                <div className="space-y-5">
                  {/* Pitch Tuning */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Voice Pitch Offset
                      </label>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                        {pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="1"
                      value={pitchHz}
                      onChange={(e) => setPitchHz(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                      <span>-20Hz (Deeper)</span>
                      <span>+0Hz (Natural)</span>
                      <span>+20Hz (Higher)</span>
                    </div>
                  </div>

                  {/* Speech Rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Speech Rate / Cadence
                      </label>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                        {ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="5"
                      value={ratePct}
                      onChange={(e) => setRatePct(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                      <span>-30% (Slower)</span>
                      <span>+0% (Natural)</span>
                      <span>+30% (Brisk)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Live Voice Sample Tester */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Real-Time Voice Test Preview</span>
                </h3>

                <div>
                  <textarea
                    rows={2}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Type a sample sentence to synthesize..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={testingVoice}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {testingVoice ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isPlayingTest ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{testingVoice ? 'Synthesizing...' : isPlayingTest ? 'Stop Audio' : 'Play Live Voice Sample'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveVoice}
                    disabled={savingVoice}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingVoice ? 'Saving...' : voiceSaveSuccess ? '✓ Voice Preferences Saved' : 'Save Voice Settings'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS SECTION ── */}
          {activeSection === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>Workspace Analytics & Metrics</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live data distribution and breakdown across your NOX workspace.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {analyticsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`p-5 rounded-3xl border text-center flex flex-col items-center justify-center space-y-2 ${colorMap[item.color]}`}>
                      <Icon className="w-6 h-6" />
                      <span className="text-4xl font-bold font-display">{item.value}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Engagement Summary */}
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Engagement Breakdown</span>
                </h3>

                <div className="space-y-3 pt-2">
                  {[
                    { label: 'Total Entities Managed', value: Object.values(stats || {}).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0), percentage: '100%' },
                    { label: 'Active Goals & Strategic Roadmaps', value: stats?.goalsCount ?? 0, percentage: `${Math.round(((stats?.goalsCount ?? 0) / Math.max(1, (stats?.tasksCount ?? 1))) * 100)}%` },
                    { label: 'Total Executable Tasks', value: stats?.tasksCount ?? 0, percentage: 'Active' },
                    { label: 'Active Learning Tracks', value: stats?.learningCount ?? 0, percentage: 'Active' },
                    { label: 'Scheduled Calendar Events', value: stats?.eventsCount ?? 0, percentage: 'Scheduled' },
                  ].map((row) => (
                    <div key={row.label} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.label}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{row.value}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {row.percentage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DATA SECTION ── */}
          {activeSection === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-3xl">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>Data & Security Management</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Export your workspace data, inspect session details, or manage your account.</p>
              </div>

              <div className="space-y-4">
                {/* Export Data Card */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Export Workspace Data</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Download a JSON backup of your personal workspace entities.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const data = { exportedAt: new Date().toISOString(), user: currentUser?.name, stats };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                      a.download = `nox-export-${Date.now()}.json`; a.click();
                    }}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                {/* Session Information */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <span>Active Session Status</span>
                  </h3>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Account ID</span>
                      <span className="text-xs font-mono text-slate-800 dark:text-slate-200 font-semibold">{currentUser?.id || 'session-local'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Security Encryption</span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">JWT Token Auth</span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-6 rounded-3xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-rose-700 dark:text-rose-400">Session Danger Zone</h3>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Sign out of your active workstation session.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { onClose(); onSignOut(); }}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of NOX Workstation</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
