import React from 'react';

interface NoxLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  variant?: 'badge' | 'rune-only';
}

export function NoxRuneIcon({ className = 'w-6 h-6', strokeColor = '#002df5' }: { className?: string; strokeColor?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke={strokeColor}
      strokeWidth="6.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Central Spine */}
      <line x1="50" y1="5" x2="50" y2="95" />

      {/* Left Rune Wing */}
      <line x1="24" y1="20" x2="24" y2="65" />
      <polyline points="24,20 38,34 24,44" />
      <line x1="24,44" y1="44" x2="50" y2="67" />

      {/* Right Rune Wing */}
      <polyline points="50,38 76,14 76,34 64,46 50,67" />
      <line x1="76" y1="14" x2="90" y2="28" />
      <line x1="70" y1="50" x2="84" y2="63" />

      {/* Bottom Cross Base */}
      <line x1="22" y1="91" x2="50" y2="67" />
      <line x1="78" y1="91" x2="50" y2="67" />
    </svg>
  );
}

export default function NoxLogo({
  size = 'md',
  className = '',
  showText = false,
  variant = 'badge',
}: NoxLogoProps) {
  const sizeMap = {
    xs: { box: 'w-6 h-6 rounded-md p-0.5', icon: 'w-4 h-4', text: 'text-sm', sub: 'text-[8px]' },
    sm: { box: 'w-8 h-8 rounded-lg p-1', icon: 'w-5 h-5', text: 'text-base', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10 rounded-xl p-1.5', icon: 'w-6 h-6', text: 'text-xl', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14 rounded-2xl p-2', icon: 'w-9 h-9', text: 'text-2xl', sub: 'text-xs' },
    xl: { box: 'w-20 h-20 rounded-3xl p-3', icon: 'w-13 h-13', text: 'text-4xl', sub: 'text-sm' },
  };

  const { box, icon, text, sub } = sizeMap[size] || sizeMap.md;

  const content =
    variant === 'rune-only' ? (
      <NoxRuneIcon className={icon} strokeColor="#002df5" />
    ) : (
      <div
        className={`${box} bg-slate-950 dark:bg-slate-950 border border-slate-800/90 dark:border-slate-800 shadow-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-blue-500/10 pointer-events-none" />
        <NoxRuneIcon className={`${icon} relative z-10 drop-shadow-[0_0_8px_rgba(0,45,245,0.4)]`} strokeColor="#1a44ff" />
      </div>
    );

  if (!showText) {
    return <div className={`inline-flex items-center ${className}`}>{content}</div>;
  }

  return (
    <div className={`flex items-center space-x-3 cursor-pointer group ${className}`}>
      {content}
      <div className="flex flex-col">
        <span className={`font-display ${text} font-black tracking-wider text-slate-900 dark:text-slate-100 leading-none`}>
          NOX
        </span>
        <span className={`font-mono ${sub} text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase mt-1`}>
          YOUR SECOND SELF
        </span>
      </div>
    </div>
  );
}
