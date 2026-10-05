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
    xs: { img: 'w-7 h-7 rounded-lg', text: 'text-sm', sub: 'text-[8px]' },
    sm: { img: 'w-9 h-9 rounded-xl', text: 'text-base', sub: 'text-[9px]' },
    md: { img: 'w-12 h-12 rounded-2xl', text: 'text-2xl', sub: 'text-[10px]' },
    lg: { img: 'w-16 h-16 rounded-2xl', text: 'text-3xl', sub: 'text-xs' },
    xl: { img: 'w-24 h-24 rounded-3xl', text: 'text-5xl', sub: 'text-sm' },
  };

  const { img, text, sub } = sizeMap[size] || sizeMap.md;

  const logoImage = (
    <img
      src="/Nox_logo.png"
      alt="NOX Logo"
      className={`${img} object-cover shadow-xs shrink-0 transition-transform group-hover:scale-105`}
    />
  );

  if (!showText) {
    return <div className={`inline-flex items-center shrink-0 ${className}`}>{logoImage}</div>;
  }

  return (
    <div className={`flex items-center space-x-3.5 cursor-pointer group ${className}`}>
      {logoImage}
      <div className="flex flex-col justify-center">
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
