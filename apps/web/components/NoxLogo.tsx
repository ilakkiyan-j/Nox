'use client';

import React from 'react';

interface NoxLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export default function NoxLogo({
  size = 'md',
  className = '',
  showText = false,
}: NoxLogoProps) {
  const sizeMap = {
    xs: { box: 'w-6 h-6 rounded-md p-0.5', text: 'text-sm', sub: 'text-[8px]' },
    sm: { box: 'w-8 h-8 rounded-lg p-1', text: 'text-base', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10 rounded-xl p-1', text: 'text-xl', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14 rounded-2xl p-1.5', text: 'text-2xl', sub: 'text-xs' },
    xl: { box: 'w-20 h-20 rounded-3xl p-2', text: 'text-4xl', sub: 'text-sm' },
  };

  const { box, text, sub } = sizeMap[size] || sizeMap.md;

  const logoImage = (
    <div
      className={`${box} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 overflow-hidden`}
    >
      <img
        src="/Nox_logo.png"
        alt="NOX Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );

  if (!showText) {
    return <div className={`inline-flex items-center ${className}`}>{logoImage}</div>;
  }

  return (
    <div className={`flex items-center space-x-3 cursor-pointer group ${className}`}>
      {logoImage}
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
