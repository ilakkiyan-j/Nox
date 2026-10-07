import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Sun, Moon, Shield, Zap, LogOut, Settings, Target, CheckSquare,
  StickyNote, Calendar, Flame, GraduationCap, Bell, Download, Trash2,
  Edit3, Save, BarChart3, Clock, AlarmClock, Layers, ChevronRight,
  Database, Compass, Lock, Sparkles, ArrowLeft, Upload, Image as ImageIcon, Link as LinkIcon, RefreshCw,
  Volume2, Mic, Play, Pause, Radio, Check, SlidersHorizontal, Type,
  Bot, Plus, Copy, CheckCircle2, AlertCircle, AlertTriangle, ArrowUp, ArrowDown, Globe, Terminal, Key
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import ApiErrorNotice from './ui/ApiErrorNotice';
import { API_BASE_URL, assertApiSuccess, fetchWithUser, setStoredUser } from '../lib/api';
import Avatar from './Avatar';
import NoxLogo from './NoxLogo';

import {
  BotAvatarDisplay,
  BotItem,
  ProviderCredential,
  FallbackItem,
  BotPermissions,
  DEFAULT_PERSONAS,
  DEFAULT_FALLBACK_PIPELINE,
  DEFAULT_PERMISSIONS_BY_BOT,
  SUGGESTED_EMOJIS,
} from './CouncilView';
import { TelegramIcon } from './ui/BrandIcons';

interface UserControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onOpenAdmin?: () => void;
  onOpenTypography?: () => void;
  onProfileUpdated?: (user: any) => void;
  initialSection?: PanelSection;
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

export type PanelSection = 'overview' | 'profile' | 'council' | 'preferences' | 'voice' | 'analytics' | 'data';

export default function UserControlPanel({
  isOpen,
  onClose,
  onSignOut,
  onOpenAdmin,
  onOpenTypography,
  onProfileUpdated,
  initialSection,
  currentUser,
  stats,
}: UserControlPanelProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<PanelSection>(initialSection || 'overview');
  const [displayName, setDisplayName] = useState(currentUser?.name || 'Nox Architect');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialSection if panel opens or prop updates
  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

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

  // Council Settings State
  const [councilTab, setCouncilTab] = useState<'bots' | 'create' | 'byok'>('bots');
  const [councilBots, setCouncilBots] = useState<BotItem[]>([]);
  const [councilCreds, setCouncilCreds] = useState<ProviderCredential[]>([]);
  const [loadingCouncilData, setLoadingCouncilData] = useState(false);
  const [councilNotice, setCouncilNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bot Editor Drawer State
  const [showBotDrawer, setShowBotDrawer] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAvatar, setEditAvatar] = useState('🤖');
  const [editProvider, setEditProvider] = useState('gemini');
  const [editModel, setEditModel] = useState('gemini-2.5-flash');
  const [editPrompt, setEditPrompt] = useState('');
  const [editGuidelines, setEditGuidelines] = useState('');
  const [editSafety, setEditSafety] = useState('');
  const [editTemperature, setEditTemperature] = useState(0.7);
  const [editFallbacks, setEditFallbacks] = useState<FallbackItem[]>(DEFAULT_FALLBACK_PIPELINE);
  const [editPermissions, setEditPermissions] = useState<BotPermissions>({
    canAccessNox: true,
    canSearchWeb: true,
    canAuditCode: false,
    canAdaptPersona: true,
    canAccessMemory: true,
  });
  const [editTelegramToken, setEditTelegramToken] = useState('');
  const [savingBot, setSavingBot] = useState(false);
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
  const [uploadingBotAvatar, setUploadingBotAvatar] = useState(false);
  const botAvatarFileRef = useRef<HTMLInputElement>(null);

  // Create Bot Form State
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('');
  const [createAvatar, setCreateAvatar] = useState('🤖');
  const [createProvider, setCreateProvider] = useState('gemini');
  const [createModel, setCreateModel] = useState('gemini-2.5-flash');
  const [createPrompt, setCreatePrompt] = useState('');
  const [createGuidelines, setCreateGuidelines] = useState('');
  const [createSafety, setCreateSafety] = useState('');
  const [createTemperature, setCreateTemperature] = useState(0.7);
  const [createFallbacks, setCreateFallbacks] = useState<FallbackItem[]>(DEFAULT_FALLBACK_PIPELINE);
  const [createPermissions, setCreatePermissions] = useState<BotPermissions>({
    canAccessNox: false,
    canSearchWeb: true,
    canAuditCode: false,
    canAdaptPersona: true,
    canAccessMemory: true,
  });
  const [creatingBot, setCreatingBot] = useState(false);
  const [uploadingCreateAvatar, setUploadingCreateAvatar] = useState(false);
  const createAvatarFileRef = useRef<HTMLInputElement>(null);

  // BYOK Vault State
  const [credProvider, setCredProvider] = useState('gemini');
  const [credLabel, setCredLabel] = useState('');
  const [credKey, setCredKey] = useState('');
  const [savingCred, setSavingCred] = useState(false);
  const [revokingCredId, setRevokingCredId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.name) setDisplayName(currentUser.name);
    if (currentUser?.avatarUrl !== undefined) setAvatarUrl(currentUser.avatarUrl || '');
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && activeSection === 'voice') loadVoiceSettings();
    if (isOpen && activeSection === 'council') loadCouncilData();
  }, [isOpen, activeSection, currentUser]);

  const loadVoiceSettings = async () => {
    try {
      const [prefRes, catalogRes] = await Promise.all([
        fetchWithUser(`${API_BASE_URL}/api/v1/voice/preferences`),
        fetchWithUser(`${API_BASE_URL}/api/v1/voice/catalog`),
      ]);
      await Promise.all([
        assertApiSuccess(prefRes, 'Could not load voice preferences'),
        assertApiSuccess(catalogRes, 'Could not load voice catalog'),
      ]);
      const prefData = await prefRes.json();
      const catalogData = await catalogRes.json();

      if (prefData.data && typeof prefData.data === 'object') {
        setVoiceModel(prefData.data.voiceModel || 'en-US-AvaMultilingualNeural');
        const pMatch = (prefData.data.pitch || '+0Hz').match(/([+-]?\d+)/);
        if (pMatch) setPitchHz(parseInt(pMatch[1], 10));
        const rMatch = (prefData.data.rate || '+0%').match(/([+-]?\d+)/);
        if (rMatch) setRatePct(parseInt(rMatch[1], 10));
        setIsCloneEnabled(prefData.data.isCloneEnabled ?? true);
      }

      if (Array.isArray(catalogData.data)) {
        setVoiceCatalog(catalogData.data);
      } else {
        throw new Error('Invalid voice catalog response');
      }
    } catch (err) {
      console.warn('Could not load voice preferences:', err);
      setPanelError(err instanceof Error ? err.message : 'Could not load voice preferences');
    }
  };

  const loadCouncilData = async () => {
    setLoadingCouncilData(true);
    setCouncilNotice(null);
    try {
      const [botsRes, credsRes] = await Promise.all([
        fetchWithUser(`${API_BASE_URL}/api/v1/council/bots`),
        fetchWithUser(`${API_BASE_URL}/api/v1/council/provider-credentials`),
      ]);

      if (botsRes.ok) {
        const bData = await botsRes.json();
        const rawBots = bData.data || bData;
        if (Array.isArray(rawBots)) {
          setCouncilBots(rawBots);
        }
      }

      if (credsRes.ok) {
        const cData = await credsRes.json();
        const rawCreds = cData.data || cData;
        if (Array.isArray(rawCreds)) {
          setCouncilCreds(rawCreds);
        }
      }
    } catch (err) {
      console.error('Failed to load council settings data:', err);
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load Council settings.',
      });
    } finally {
      setLoadingCouncilData(false);
    }
  };

  const handleSaveVoice = async () => {
    setSavingVoice(true);
    setPanelError(null);
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
      await assertApiSuccess(res, 'Could not save voice preferences');
      setVoiceSaveSuccess(true);
      setTimeout(() => setVoiceSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save voice preference:', err);
      setPanelError(err instanceof Error ? err.message : 'Could not save voice preferences');
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
    setPanelError(null);
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
      await assertApiSuccess(res, 'Could not synthesize voice sample');
      const data = await res.json();
      if (data.data?.audioUrl) {
        const audio = new Audio(data.data.audioUrl);
        audioPlayerRef.current = audio;
        setIsPlayingTest(true);
        audio.onended = () => setIsPlayingTest(false);
        audio.onerror = () => {
          setIsPlayingTest(false);
          setPanelError('Voice sample audio could not be played');
        };
        await audio.play();
      } else {
        throw new Error('Voice service returned no audio sample');
      }
    } catch (err) {
      console.error('Voice test synthesis failed:', err);
      setPanelError(err instanceof Error ? err.message : 'Voice test synthesis failed');
    } finally {
      setTestingVoice(false);
    }
  };

  const uploadToCloudCDN = async (base64Payload: string, forBotEdit = false, forBotCreate = false) => {
    if (forBotEdit) setUploadingBotAvatar(true);
    else if (forBotCreate) setUploadingCreateAvatar(true);
    else setUploadingCloud(true);

    setPanelError(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/auth/avatar/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Payload,
          target: forBotEdit || forBotCreate ? 'bot' : 'user',
        }),
      });
      await assertApiSuccess(res, 'Could not upload image');
      const data = await res.json();
      if (!data.data?.url) {
        throw new Error('Avatar service returned no image URL');
      }

      if (forBotEdit) {
        setEditAvatar(data.data.url);
        setCouncilNotice({ type: 'success', message: 'Bot custom avatar uploaded to Cloud CDN.' });
      } else if (forBotCreate) {
        setCreateAvatar(data.data.url);
        setCouncilNotice({ type: 'success', message: 'Bot custom avatar uploaded to Cloud CDN.' });
      } else {
        setAvatarUrl(data.data.url);
        const updatedUser = data.data.user || { ...currentUser, avatarUrl: data.data.url };
        if (typeof window !== 'undefined') {
          setStoredUser(updatedUser);
        }
        onProfileUpdated?.(updatedUser);
      }
    } catch (err) {
      console.error('Cloud avatar upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not upload image';
      if (forBotEdit || forBotCreate) {
        setCouncilNotice({ type: 'error', message: msg });
      } else {
        setPanelError(msg);
      }
    } finally {
      if (forBotEdit) setUploadingBotAvatar(false);
      else if (forBotCreate) setUploadingCreateAvatar(false);
      else setUploadingCloud(false);
    }
  };

  const processAndUploadFile = (file: File, forBotEdit = false, forBotCreate = false) => {
    if (!file.type.startsWith('image/')) {
      const msg = 'Select an image file (PNG/JPEG/WebP).';
      if (forBotEdit || forBotCreate) setCouncilNotice({ type: 'error', message: msg });
      else setPanelError(msg);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const msg = 'Image is too large. Please select a file under 10 MB.';
      if (forBotEdit || forBotCreate) setCouncilNotice({ type: 'error', message: msg });
      else setPanelError(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) return;

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
          uploadToCloudCDN(compressed, forBotEdit, forBotCreate);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndUploadFile(file, false, false);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setPanelError(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      await assertApiSuccess(res, 'Could not save profile');
      const data = await res.json();
      if (!data.data) {
        throw new Error('Profile service returned no updated profile');
      }
      if (typeof window !== 'undefined') {
        setStoredUser(data.data);
      }
      onProfileUpdated?.(data.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setPanelError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Bot Editor Actions
  const handleOpenEditBot = (bot: BotItem) => {
    setEditingBotId(bot.id);
    setEditName(bot.name);
    setEditRole(bot.role);
    setEditAvatar(bot.avatar || '🤖');
    setEditProvider(bot.modelConfig?.provider || 'gemini');
    setEditModel(bot.modelConfig?.model || 'gemini-2.5-flash');
    setEditPrompt(bot.instruction?.systemPrompt || '');
    setEditGuidelines(bot.instruction?.contextGuidelines || '');
    setEditSafety(bot.instruction?.safetyRules || '');
    setEditTemperature(bot.modelConfig?.temperature ?? 0.7);

    // Fallbacks
    if (bot.modelConfig?.fallbackPipeline && bot.modelConfig.fallbackPipeline.length > 0) {
      setEditFallbacks([...bot.modelConfig.fallbackPipeline]);
    } else {
      setEditFallbacks([...DEFAULT_FALLBACK_PIPELINE]);
    }

    // Permissions
    const initialPerms = bot.persona?.traits?.permissions || bot.permissions || (
      DEFAULT_PERMISSIONS_BY_BOT[bot.slug || ''] || {
        canAccessNox: false,
        canSearchWeb: true,
        canAuditCode: false,
        canAdaptPersona: true,
        canAccessMemory: true,
      }
    );
    setEditPermissions({
      canAccessNox: initialPerms.canAccessNox ?? false,
      canSearchWeb: initialPerms.canSearchWeb ?? true,
      canAuditCode: initialPerms.canAuditCode ?? false,
      canAdaptPersona: initialPerms.canAdaptPersona ?? true,
      canAccessMemory: initialPerms.canAccessMemory ?? true,
    });

    setEditTelegramToken('');
    setShowBotDrawer(true);
    setCouncilNotice(null);
  };

  const handleSaveBot = async () => {
    if (!editingBotId) return;
    setSavingBot(true);
    setCouncilNotice(null);
    try {
      const payload = {
        name: editName.trim(),
        role: editRole.trim(),
        avatar: editAvatar.trim(),
        instruction: {
          systemPrompt: editPrompt,
          contextGuidelines: editGuidelines,
          safetyRules: editSafety,
        },
        modelConfig: {
          provider: editProvider,
          model: editModel,
          temperature: editTemperature,
          fallbackPipeline: editFallbacks,
        },
        persona: {
          traits: {
            permissions: editPermissions,
          },
        },
        permissions: editPermissions,
      };

      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${editingBotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await assertApiSuccess(res, 'Could not save bot settings');
      await loadCouncilData();
      setShowBotDrawer(false);
      setCouncilNotice({ type: 'success', message: `${editName} settings saved successfully.` });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not save bot settings.',
      });
    } finally {
      setSavingBot(false);
    }
  };

  const handleConnectTelegram = async (botId: string) => {
    if (!editTelegramToken.trim()) return;
    setConnectingTelegram(true);
    setCouncilNotice(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${botId}/telegram/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: editTelegramToken.trim() }),
      });
      await assertApiSuccess(res, 'Failed to connect Telegram Bot');
      setEditTelegramToken(''); // Vanish token from state & input
      await loadCouncilData();
      setCouncilNotice({ type: 'success', message: '✓ Telegram Bot connected & persisted to database!' });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to connect Telegram Bot token.',
      });
    } finally {
      setConnectingTelegram(false);
    }
  };

  const handleDisconnectTelegram = async (botId: string) => {
    setDisconnectingTelegram(true);
    setCouncilNotice(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: null,
          telegramBotUsername: null,
          telegramWebhookUrl: null,
        }),
      });
      await assertApiSuccess(res, 'Could not disconnect Telegram bot');
      await loadCouncilData();
      setCouncilNotice({ type: 'success', message: 'Telegram bot disconnected.' });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not disconnect Telegram bot.',
      });
    } finally {
      setDisconnectingTelegram(false);
    }
  };

  const handleDuplicateBot = async (botId: string) => {
    setCouncilNotice(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${botId}/duplicate`, {
        method: 'POST',
      });
      await assertApiSuccess(res, 'Failed to duplicate bot');
      await loadCouncilData();
      setCouncilNotice({ type: 'success', message: 'Bot duplicated successfully.' });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to duplicate bot.',
      });
    }
  };

  const handleDeleteBot = async (botId: string, botName: string) => {
    if (!confirm(`Are you sure you want to delete ${botName}?`)) return;
    setCouncilNotice(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots/${botId}`, {
        method: 'DELETE',
      });
      await assertApiSuccess(res, 'Failed to delete bot');
      await loadCouncilData();
      setCouncilNotice({ type: 'success', message: `${botName} was deleted.` });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete bot.',
      });
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreatingBot(true);
    setCouncilNotice(null);
    try {
      const payload = {
        name: createName.trim(),
        role: createRole.trim() || 'Council Special Agent',
        avatar: createAvatar.trim(),
        instruction: {
          systemPrompt: createPrompt.trim() || `You are ${createName}, an intelligent AI persona in the user's personal operating system.`,
          contextGuidelines: createGuidelines.trim(),
          safetyRules: createSafety.trim(),
        },
        modelConfig: {
          provider: createProvider,
          model: createModel,
          temperature: createTemperature,
          fallbackPipeline: createFallbacks,
        },
        persona: {
          traits: {
            permissions: createPermissions,
          },
        },
        permissions: createPermissions,
      };

      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await assertApiSuccess(res, 'Failed to create bot');
      setCreateName('');
      setCreateRole('');
      setCreatePrompt('');
      setCreateGuidelines('');
      setCreateSafety('');
      await loadCouncilData();
      setCouncilTab('bots');
      setCouncilNotice({ type: 'success', message: 'Custom bot created successfully!' });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create custom bot.',
      });
    } finally {
      setCreatingBot(false);
    }
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credKey.trim()) return;
    setSavingCred(true);
    setCouncilNotice(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/provider-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: credProvider,
          label: credLabel.trim() || `${credProvider.toUpperCase()} Key`,
          apiKey: credKey.trim(),
        }),
      });
      await assertApiSuccess(res, 'Failed to save provider credential');
      setCredKey(''); // Vanish plaintext key from input
      setCredLabel('');
      await loadCouncilData();
      setCouncilNotice({ type: 'success', message: '✓ Provider API key saved securely in database.' });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save provider credential.',
      });
    } finally {
      setSavingCred(false);
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    if (!confirm('Are you sure you want to revoke this provider credential?')) return;
    setRevokingCredId(credId);
    setCouncilNotice(null);
    try {
      const res = await fetchWithUser(`${API_BASE_URL}/api/v1/council/provider-credentials/${credId}`, {
        method: 'DELETE',
      });
      await assertApiSuccess(res, 'Failed to revoke provider credential');
      await loadCouncilData();
      setCouncilNotice({ type: 'success', message: 'Provider credential revoked.' });
    } catch (err) {
      setCouncilNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to revoke provider credential.',
      });
    } finally {
      setRevokingCredId(null);
    }
  };

  const moveFallback = (index: number, direction: 'up' | 'down', isEdit = true) => {
    const list = isEdit ? [...editFallbacks] : [...createFallbacks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    if (isEdit) setEditFallbacks(list);
    else setCreateFallbacks(list);
  };

  const toggleFallbackEnabled = (index: number, isEdit = true) => {
    const list = isEdit ? [...editFallbacks] : [...createFallbacks];
    list[index].enabled = !list[index].enabled;
    if (isEdit) setEditFallbacks(list);
    else setCreateFallbacks(list);
  };

  const sectionNav: { id: PanelSection; label: string; description: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', description: 'Identity summary & workspace snapshot', icon: User },
    { id: 'profile', label: 'Profile & Identity', description: 'Personal details & display settings', icon: Edit3 },
    { id: 'council', label: 'AI Council & Bots', description: 'Bot workshop, permissions, models & BYOK vault', icon: Bot },
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

  if (!isOpen) return null;

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
          <ApiErrorNotice message={panelError} onDismiss={() => setPanelError(null)} />

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
                    onClick={() => setActiveSection('council')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Manage Bots</span>
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
            </div>
          )}

          {/* ── AI COUNCIL & BOTS SECTION ── */}
          {activeSection === 'council' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <span>AI Council & Bot Workshop</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage AI agent personas, fallback model pipelines, capability permissions, Telegram links & BYOK keys.
                  </p>
                </div>

                {/* Sub-tab Switcher */}
                <div className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/50 dark:border-slate-700/60 shrink-0">
                  <button
                    onClick={() => setCouncilTab('bots')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      councilTab === 'bots'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>My Bots ({councilBots.length})</span>
                  </button>
                  <button
                    onClick={() => setCouncilTab('create')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      councilTab === 'create'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Bot</span>
                  </button>
                  <button
                    onClick={() => setCouncilTab('byok')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                      councilTab === 'byok'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>BYOK Vault ({councilCreds.length})</span>
                  </button>
                </div>
              </div>

              {councilNotice && (
                <div
                  className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-medium border ${
                    councilNotice.type === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {councilNotice.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
                    <span>{councilNotice.message}</span>
                  </div>
                  <button onClick={() => setCouncilNotice(null)} className="p-1 hover:opacity-75">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── TAB 1: MY BOTS WORKSHOP ── */}
              {councilTab === 'bots' && (
                <div className="space-y-6">
                  {loadingCouncilData ? (
                    <div className="p-12 text-center text-slate-400 space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                      <p className="text-xs font-mono">Loading Council bots...</p>
                    </div>
                  ) : councilBots.length === 0 ? (
                    <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <Bot className="w-10 h-10 mx-auto text-slate-400" />
                      <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-200">No Bots Configured</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">Create custom bots or reconnect the AI Council server to initialize default personas.</p>
                      <button
                        onClick={() => setCouncilTab('create')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500"
                      >
                        + Create Your First Bot
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {councilBots.map((bot) => {
                        const isSofi = bot.slug === 'sofi' || bot.id === 'sofi';
                        const isDefault = bot.isDefault || isSofi || bot.slug === 'riven' || bot.slug === 'lucifer';
                        const perms = bot.persona?.traits?.permissions || bot.permissions || DEFAULT_PERMISSIONS_BY_BOT[bot.slug || ''] || {};

                        return (
                          <div
                            key={bot.id}
                            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600/70 transition-all flex flex-col justify-between space-y-4 group"
                          >
                            <div className="space-y-3">
                              {/* Top Bar: Avatar & Title */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                                    <BotAvatarDisplay avatar={bot.avatar} name={bot.name} className="w-full h-full text-2xl" />
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">{bot.name}</h3>
                                      {isDefault && (
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                          CORE
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium line-clamp-1">{bot.role}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Telegram Status Badge */}
                              <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                                  <TelegramIcon className="w-3.5 h-3.5 text-sky-500" />
                                  <span className="font-medium">Telegram:</span>
                                </div>
                                {bot.telegramBotUsername ? (
                                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>@{bot.telegramBotUsername}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[10px]">Not Connected</span>
                                )}
                              </div>

                              {/* Capabilities tags */}
                              <div className="flex flex-wrap gap-1.5">
                                {perms.canAccessNox && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-semibold">
                                    ⚡ Nox OS Control
                                  </span>
                                )}
                                {perms.canSearchWeb && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900 font-semibold">
                                    🌐 Web Search
                                  </span>
                                )}
                                {perms.canAuditCode && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900 font-semibold">
                                    💻 Code Audit
                                  </span>
                                )}
                                {perms.canAccessMemory && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-semibold">
                                    🧠 Memory Vault
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                              <button
                                onClick={() => handleOpenEditBot(bot)}
                                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Configure Bot</span>
                              </button>

                              <button
                                onClick={() => handleDuplicateBot(bot.id)}
                                title="Duplicate Bot"
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {!isDefault && (
                                <button
                                  onClick={() => handleDeleteBot(bot.id, bot.name)}
                                  title="Delete Custom Bot"
                                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 transition-all cursor-pointer border border-rose-200/50 dark:border-rose-900/50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: CREATE CUSTOM BOT ── */}
              {councilTab === 'create' && (
                <form onSubmit={handleCreateBot} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 max-w-4xl">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Create Custom Agent</h3>
                    <p className="text-xs text-slate-500">Design a specialized bot with tailored permissions, fallback models, and distinct prompts.</p>
                  </div>

                  {/* Avatar & Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Bot Avatar
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl overflow-hidden shrink-0 shadow-xs">
                          <BotAvatarDisplay avatar={createAvatar} name={createName} className="w-full h-full text-3xl" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {SUGGESTED_EMOJIS.slice(0, 6).map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setCreateAvatar(em)}
                                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition ${createAvatar === em ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60' : 'border-slate-200 dark:border-slate-700'}`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => createAvatarFileRef.current?.click()}
                            disabled={uploadingCreateAvatar}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                          >
                            <Upload className="w-3 h-3" />
                            <span>{uploadingCreateAvatar ? 'Uploading...' : 'Upload Image'}</span>
                          </button>
                          <input
                            ref={createAvatarFileRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) processAndUploadFile(f, false, true);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Bot Name
                      </label>
                      <input
                        type="text"
                        required
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. Athena, Vulcan, Cipher"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Role & Title
                      </label>
                      <input
                        type="text"
                        value={createRole}
                        onChange={(e) => setCreateRole(e.target.value)}
                        placeholder="e.g. Lead Security Auditor"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* System Prompt Instructions */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      System Instructions & Core Persona
                    </label>
                    <textarea
                      rows={3}
                      value={createPrompt}
                      onChange={(e) => setCreatePrompt(e.target.value)}
                      placeholder="Describe how this agent reasons, talks, and approaches your challenges..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Granular Permissions Matrix */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Capability & Tool Permissions Matrix</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'canAccessNox', label: 'NOX OS Control', desc: 'Read & create tasks, goals, habits, notes & calendar' },
                        { key: 'canSearchWeb', label: 'Live Web Search', desc: 'Query real-time web documents and references' },
                        { key: 'canAuditCode', label: 'Codebase & Architecture Audit', desc: 'Deep-dive analysis of system schemas and design' },
                        { key: 'canAccessMemory', label: 'Long-Term Memory Vault', desc: 'Recall personal context and auto-adapt facts' },
                      ].map((item) => {
                        const isChecked = createPermissions[item.key as keyof BotPermissions] ?? false;
                        return (
                          <div
                            key={item.key}
                            onClick={() => setCreatePermissions({ ...createPermissions, [item.key]: !isChecked })}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                              isChecked
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                                : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.label}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={creatingBot}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{creatingBot ? 'Creating Bot...' : 'Create & Register Bot'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ── TAB 3: BYOK KEY VAULT ── */}
              {councilTab === 'byok' && (
                <div className="space-y-6">
                  {/* Active Credentials List */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">Saved Provider API Keys</h3>
                        <p className="text-xs text-slate-500">Encrypted in your database. Plaintext tokens vanish immediately upon saving.</p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        {councilCreds.length} Active Key{councilCreds.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {councilCreds.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-400">
                        <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No BYOK credentials saved yet. Add your Gemini, Groq, or OpenAI keys below.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {councilCreds.map((cred) => (
                          <div
                            key={cred.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between space-x-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{cred.label}</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase">
                                  {cred.provider}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-slate-400">{cred.maskedKey || '••••••••••••'}</p>
                            </div>

                            <button
                              onClick={() => handleDeleteCredential(cred.id)}
                              disabled={revokingCredId === cred.id}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Revoke Credential"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Key Form */}
                  <form onSubmit={handleSaveCredential} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 max-w-2xl">
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                        <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Add Provider API Key</span>
                      </h3>
                      <p className="text-xs text-slate-500">Provide keys for Gemini, Groq, OpenAI, or local Ollama endpoints.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Provider
                        </label>
                        <select
                          value={credProvider}
                          onChange={(e) => setCredProvider(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-indigo-600"
                        >
                          <option value="gemini">Google Gemini</option>
                          <option value="groq">Groq (Llama 3.3)</option>
                          <option value="openai">OpenAI (GPT-4o)</option>
                          <option value="ollama">Ollama (Local)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Key Label
                        </label>
                        <input
                          type="text"
                          value={credLabel}
                          onChange={(e) => setCredLabel(e.target.value)}
                          placeholder="e.g. Primary Gemini Pro Key"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        API Secret Key
                      </label>
                      <input
                        type="password"
                        required
                        value={credKey}
                        onChange={(e) => setCredKey(e.target.value)}
                        placeholder="sk-... or AIzaSy..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-indigo-600"
                      />
                      <p className="text-[11px] text-slate-400">Once saved, this plaintext key is wiped from memory and saved in database.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={savingCred}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60 flex items-center space-x-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingCred ? 'Saving Key...' : 'Save Credential in Database'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* ── BOT SLIDE-OVER DRAWER / MODAL ── */}
              {showBotDrawer && (
                <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
                  <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 space-y-6 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div className="flex items-center space-x-3">
                          <BotAvatarDisplay avatar={editAvatar} name={editName} className="w-9 h-9 text-xl" />
                          <div>
                            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">Configure {editName}</h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">{editRole}</p>
                          </div>
                        </div>
                        <button onClick={() => setShowBotDrawer(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Avatar & Basic Info */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl overflow-hidden shrink-0 shadow-xs">
                            <BotAvatarDisplay avatar={editAvatar} name={editName} className="w-full h-full text-3xl" />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {SUGGESTED_EMOJIS.map((em) => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => setEditAvatar(em)}
                                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition ${editAvatar === em ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60' : 'border-slate-200 dark:border-slate-700'}`}
                                >
                                  {em}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => botAvatarFileRef.current?.click()}
                              disabled={uploadingBotAvatar}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>{uploadingBotAvatar ? 'Uploading to CDN...' : 'Upload Custom Image'}</span>
                            </button>
                            <input
                              ref={botAvatarFileRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) processAndUploadFile(f, true, false);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Role Title</label>
                            <input
                              type="text"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">System Prompt</label>
                          <textarea
                            rows={3}
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600 font-sans leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Fallback Pipeline Reordering */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                          <span>Fallback Model Pipeline</span>
                          <span className="text-[10px] text-slate-400 font-normal">Reorder priority (▲ / ▼)</span>
                        </label>
                        <div className="space-y-2">
                          {editFallbacks.map((fb, idx) => (
                            <div
                              key={fb.provider}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                                fb.enabled
                                  ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                                  : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 opacity-60'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={fb.enabled}
                                  onChange={() => toggleFallbackEnabled(idx, true)}
                                  className="rounded text-indigo-600"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">{fb.provider}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">{fb.model}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveFallback(idx, 'up', true)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === editFallbacks.length - 1}
                                  onClick={() => moveFallback(idx, 'down', true)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Capabilities Matrix */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Bot Capabilities
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { key: 'canAccessNox', label: 'NOX OS Control' },
                            { key: 'canSearchWeb', label: 'Live Web Search' },
                            { key: 'canAuditCode', label: 'Codebase Audit' },
                            { key: 'canAccessMemory', label: 'Memory Vault' },
                          ].map((item) => {
                            const isChecked = editPermissions[item.key as keyof BotPermissions] ?? false;
                            return (
                              <div
                                key={item.key}
                                onClick={() => setEditPermissions({ ...editPermissions, [item.key]: !isChecked })}
                                className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2.5 transition ${
                                  isChecked
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                                }`}
                              >
                                <input type="checkbox" checked={isChecked} onChange={() => {}} className="rounded text-indigo-600" />
                                <span className="text-xs font-semibold">{item.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Telegram Integration */}
                      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2">
                          <TelegramIcon className="w-4 h-4 text-sky-500" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Telegram Bot Link</h4>
                        </div>

                        {councilBots.find(b => b.id === editingBotId)?.telegramBotUsername ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Connected Bot:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                @{councilBots.find(b => b.id === editingBotId)?.telegramBotUsername}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => editingBotId && handleDisconnectTelegram(editingBotId)}
                              disabled={disconnectingTelegram}
                              className="w-full py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition"
                            >
                              {disconnectingTelegram ? 'Disconnecting...' : 'Disconnect Telegram Bot'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="password"
                              value={editTelegramToken}
                              onChange={(e) => setEditTelegramToken(e.target.value)}
                              placeholder="Paste Telegram Bot Token from @BotFather"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-sky-500"
                            />
                            <button
                              type="button"
                              onClick={() => editingBotId && handleConnectTelegram(editingBotId)}
                              disabled={connectingTelegram || !editTelegramToken.trim()}
                              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-50"
                            >
                              {connectingTelegram ? 'Verifying & Connecting...' : 'Connect Telegram Bot'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Drawer Footer */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setShowBotDrawer(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBot}
                        disabled={savingBot}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                      >
                        {savingBot ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PREFERENCES SECTION ── */}
          {activeSection === 'preferences' && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-3xl">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>Workspace Preferences</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure workspace display themes, typography, and developer tools.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                      {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">Appearance Theme</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Toggle between Light and Dark mode across NOX.</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                  </button>
                </div>

                {onOpenTypography && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                        <Type className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">Typography Studio</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Preview and customize fonts across the application.</p>
                      </div>
                    </div>
                    <button
                      onClick={onOpenTypography}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Open Typography Studio
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VOICE SECTION ── */}
          {activeSection === 'voice' && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-3xl">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Volume2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span>Voice & Speech Synthesis</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure neural speech synthesis for Sofi and the AI Council.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Voice Synthesizer Model
                    </label>
                    <select
                      value={voiceModel}
                      onChange={(e) => setVoiceModel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:border-indigo-600"
                    >
                      {voiceCatalog.length > 0 ? (
                        voiceCatalog.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.locale || 'Multilingual'})
                          </option>
                        ))
                      ) : (
                        <option value="en-US-AvaMultilingualNeural">Sofi Neural Multilingual (Ava)</option>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Pitch ({pitchHz >= 0 ? `+${pitchHz}` : pitchHz} Hz)
                      </label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={pitchHz}
                        onChange={(e) => setPitchHz(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Rate ({ratePct >= 0 ? `+${ratePct}` : ratePct} %)
                      </label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={ratePct}
                        onChange={(e) => setRatePct(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={testingVoice}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {testingVoice ? <RefreshCw className="w-4 h-4 animate-spin" /> : isPlayingTest ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
