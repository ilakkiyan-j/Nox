'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, X, User, Mail, Lock, Key, Copy, Check, Trash2, RefreshCw } from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const randomPass = 'nox-' + Math.random().toString(36).slice(-8);
    setPassword(randomPass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    try {
      const res = await fetch('http://localhost:4000/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (res.ok) {
        setName('');
        setEmail('');
        setPassword('');
        setShowCreate(false);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await fetch(`http://localhost:4000/api/v1/admin/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">Admin Account Manager</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Provision user accounts and serve credentials (No self signup)</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create User Form */}
        {showCreate && (
          <form onSubmit={handleCreateUser} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Provision New Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Gmail / Email</label>
                <input
                  type="email"
                  placeholder="alex@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>Password</span>
                  <button type="button" onClick={handleGeneratePassword} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-generate</span>
                  </button>
                </label>
                <input
                  type="text"
                  placeholder="Strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setName('');
                  setEmail('');
                  setPassword('');
                  setShowCreate(false);
                }}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
                Save & Serve Credentials
              </button>
            </div>
          </form>
        )}

        {/* Users Credentials Table */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">Loading user directory...</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between space-x-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                    {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-500 block font-mono">Password:</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {u.password}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCredentials(u)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    title="Copy Credentials to Clipboard"
                  >
                    {copiedId === u.id ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
