'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, Key, Copy, Check, Trash2, RefreshCw, Users, Lock, LogOut, Sun, Moon, AlertCircle } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { API_BASE_URL } from '../lib/api';

interface AdminDashboardViewProps {
  onSignOut: () => void;
  onOpenWorkstation?: () => void;
}

export default function AdminDashboardView({ onSignOut, onOpenWorkstation }: AdminDashboardViewProps) {
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setErrorMsg(data.error?.message || 'Failed to fetch user directory');
      }
    } catch (err) {
      setErrorMsg('Cannot connect to backend API server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGeneratePassword = () => {
    const randomPass = 'nox-' + Math.random().toString(36).slice(-8);
    setPassword(randomPass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setName('');
        setEmail('');
        setPassword('');
        setShowCreate(false);
        setSuccessMsg(`Account provisioned successfully for ${email}`);
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchUsers();
      } else {
        setErrorMsg(data.error?.message || 'Failed to create user account');
      }
    } catch (err) {
      setErrorMsg('Server connection error during account creation');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Account access revoked');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchUsers();
      } else {
        const data = await res.json();
        setErrorMsg(data.error?.message || 'Failed to revoke account');
      }
    } catch (err) {
      setErrorMsg('Server connection error');
      console.error(err);
    }
  };

  const handleCopyCredentials = (u: any) => {
    const text = `NOX Account Credentials:\nEmail: ${u.email}\nPassword: ${u.password}\nRole: ${u.role}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8 space-y-6 max-w-5xl mx-auto transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">NOX Admin Control Panel</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 uppercase font-mono">
                ADMIN ACCESS ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Account Provisioning & Credentials Server (Privacy Isolated)</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {onOpenWorkstation && (
            <button
              onClick={onOpenWorkstation}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
            >
              <span>Open Personal Workstation</span>
            </button>
          )}

          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Account</span>
          </button>

          <button
            onClick={onSignOut}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Error & Success Feedback Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs space-y-1">
        <p className="font-bold flex items-center space-x-1.5">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Strict Admin Data Privacy Boundary Active</span>
        </p>
        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
          As Administrator, you can ONLY create accounts, provision credentials, and manage user access. You CANNOT access, view, or read any personal user data (Goals, Tasks, Learning, Notes, Habits, Events).
        </p>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <form onSubmit={handleCreateUser} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Provision New User Account</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gmail / Email Address</label>
              <input
                type="email"
                placeholder="alex@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Password Credentials</label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate Secure</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="USER">USER (Standard Personal OS)</option>
                <option value="ADMIN">ADMIN (Account Manager)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2 space-x-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs">
              Provision Account
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Provisioned System Accounts ({users.length})
        </h3>

        {loading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">Loading accounts from server...</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No provisioned accounts found.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">{u.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        u.role === 'ADMIN'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{u.email}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopyCredentials(u)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                    <span>{copiedId === u.id ? 'Copied Creds!' : 'Copy Creds'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                    title="Revoke Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
