'use client';

import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'NA';

  const dimensions = sizeMap[size] || sizeMap.md;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'User Avatar'}
        onError={() => setImgError(true)}
        className={`${dimensions} rounded-2xl object-cover border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white font-bold flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 font-mono tracking-wider ${className}`}
    >
      {initials}
    </div>
  );
}
