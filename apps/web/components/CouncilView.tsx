'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { getToken } from '../lib/api';

export interface CouncilViewProps {
  tasks?: any[];
  events?: any[];
  habits?: any[];
  onRefresh?: () => void;
}

// Configurable Council URL: defaults to local port 4100 in dev or Render in prod
const COUNCIL_BASE_URL = (
  process.env.NEXT_PUBLIC_COUNCIL_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:4100'
    : 'https://council-os.onrender.com')
).replace(/\/+$/, '');

export default function CouncilView({ tasks, events, habits }: CouncilViewProps) {
  const [token, setToken] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const userToken = getToken();
    setToken(userToken);
  }, []);

  // Sync token and Nox context to iframe via postMessage on load
  const handleIframeLoad = () => {
    setIsLoading(false);
    if (iframeRef.current?.contentWindow) {
      if (token) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'COUNCIL_INIT_AUTH', token },
          '*'
        );
      }
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'NOX_CONTEXT_UPDATE',
          context: {
            tasksCount: tasks?.length || 0,
            eventsCount: events?.length || 0,
            habitsCount: habits?.length || 0,
          },
        },
        '*'
      );
    }
  };

  const embedUrl = `${COUNCIL_BASE_URL}/embed?embed=true&token=${encodeURIComponent(token || '')}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] w-full overflow-hidden rounded-xl border border-white/10 bg-[#090d16] shadow-2xl">
      {/* Top Embedded Control Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-white/5 backdrop-blur-md z-10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Council V2 Studio
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Embedded
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Custom AI Bots • BYOK Vault • Deliberation Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 px-2 py-1 rounded bg-white/5 border border-white/5">
            <ShieldCheck size={12} className="text-blue-400" />
            <span>BYOK Encrypted</span>
          </div>

          <button
            onClick={() => {
              setIsLoading(true);
              setIframeKey((k) => k + 1);
            }}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition"
            title="Reload Council Studio"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <a
            href={COUNCIL_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-blue-400 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition"
            title="Open in new standalone tab"
          >
            <span className="hidden sm:inline">Fullscreen</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative flex-1 w-full h-full bg-[#090d16]">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d16] z-0 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 tracking-wide font-mono">
              Loading Council V2 Platform...
            </span>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={embedUrl}
          onLoad={handleIframeLoad}
          className="w-full h-full border-0 relative z-10"
          allow="clipboard-write"
          title="Council Studio Embed"
        />
      </div>
    </div>
  );
}
