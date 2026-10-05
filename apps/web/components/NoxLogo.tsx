'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export interface NoxLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  animated?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

const BAND_MASK: React.CSSProperties = {
  maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
  maskClip: 'border-box, content-box',
  maskComposite: 'exclude',
  WebkitMaskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
  WebkitMaskClip: 'border-box, content-box',
  WebkitMaskComposite: 'xor',
} as React.CSSProperties;

export default function NoxLogo({
  size = 'md',
  className = '',
  showText = false,
  animated = true,
  glow = true,
  onClick,
}: NoxLogoProps) {
  const sizeConfig = {
    xs: {
      dimension: 28,
      borderWidth: 2,
      roundedPx: 8,
      text: 'text-sm',
      sub: 'text-[8px]',
      glowBlur: 'blur-xs',
    },
    sm: {
      dimension: 36,
      borderWidth: 2.5,
      roundedPx: 12,
      text: 'text-base',
      sub: 'text-[9px]',
      glowBlur: 'blur-sm',
    },
    md: {
      dimension: 48,
      borderWidth: 3,
      roundedPx: 16,
      text: 'text-2xl',
      sub: 'text-[10px]',
      glowBlur: 'blur-md',
    },
    lg: {
      dimension: 64,
      borderWidth: 3.5,
      roundedPx: 20,
      text: 'text-3xl',
      sub: 'text-xs',
      glowBlur: 'blur-lg',
    },
    xl: {
      dimension: 96,
      borderWidth: 4,
      roundedPx: 28,
      text: 'text-5xl',
      sub: 'text-sm',
      glowBlur: 'blur-xl',
    },
  };

  const { dimension, borderWidth, roundedPx, text, sub, glowBlur } =
    sizeConfig[size] || sizeConfig.md;

  const glowRef = useRef<HTMLDivElement | null>(null);
  const ambientHaloRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const speedRef = useRef(isHovered ? 140 : 55);

  useEffect(() => {
    speedRef.current = isHovered ? 140 : 55;
  }, [isHovered]);

  useEffect(() => {
    if (!animated) return;

    let raf = 0;
    let last = 0;
    let angle = 0;

    const tick = (t: number) => {
      if (!last) last = t;
      const dt = (t - last) / 1000;
      last = t;

      angle = (angle + speedRef.current * dt) % 360;

      if (glowRef.current) {
        glowRef.current.style.transform = `rotate(${angle}deg)`;
      }
      if (ambientHaloRef.current) {
        ambientHaloRef.current.style.transform = `rotate(${angle}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated]);

  // Cyber Gradient Colors: Head (#00FF94 -> #38BDF8) -> Body (#7C3AED) -> Tail (#4F46E5)
  const strokeHeadColor = '#00FF94';
  const strokeMidColor = '#38BDF8';
  const strokeColor = '#7C3AED';
  const strokeTailColor = '#4F46E5';

  const gradient = `conic-gradient(from 0deg, transparent 0deg, transparent 120deg, ${strokeTailColor} 180deg, ${strokeColor} 260deg, ${strokeMidColor} 320deg, ${strokeHeadColor} 360deg)`;
  const haloGradient = `conic-gradient(from 0deg, transparent 0deg, ${strokeColor} 220deg, ${strokeMidColor} 300deg, ${strokeHeadColor} 360deg)`;

  const side = Math.ceil(dimension * 1.5);

  const logoRing = (
    <div
      className="relative shrink-0 flex items-center justify-center select-none group"
      style={{
        width: dimension,
        height: dimension,
        borderRadius: roundedPx,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 1. Ambient Backdrop Glow Halo */}
      {glow && animated && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-300 ${glowBlur}`}
          style={{ zIndex: 0 }}
        >
          <div
            ref={ambientHaloRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: side * 1.2,
              height: side * 1.2,
              marginTop: -(side * 1.2) / 2,
              marginLeft: -(side * 1.2) / 2,
              background: haloGradient,
            }}
          />
        </div>
      )}

      {/* 2. Moving Gradient Masked Border Layer */}
      {animated && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            boxSizing: 'border-box',
            padding: borderWidth,
            borderRadius: roundedPx,
            zIndex: 1,
            pointerEvents: 'none',
            ...BAND_MASK,
          }}
        >
          <div
            ref={glowRef}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: side,
              height: side,
              marginTop: -side / 2,
              marginLeft: -side / 2,
              background: gradient,
            }}
          />
        </div>
      )}

      {/* 3. Static Subtle Border Fallback / Outline */}
      {!animated && (
        <div
          className="absolute inset-0 rounded-[inherit] border border-indigo-500/40 pointer-events-none"
          style={{ zIndex: 1 }}
        />
      )}

      {/* 4. Core Inner Image */}
      <div
        className="relative z-10 w-full h-full rounded-[inherit] overflow-hidden bg-slate-900 flex items-center justify-center p-[2px] transition-transform duration-200 group-hover:scale-[1.02]"
      >
        <img
          src="/Nox_logo.png"
          alt="NOX Logo"
          className="w-full h-full object-cover rounded-[inherit] shadow-2xs"
          draggable={false}
        />
      </div>
    </div>
  );

  if (!showText) {
    return <div className={`inline-flex items-center shrink-0 ${className}`}>{logoRing}</div>;
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3.5 select-none cursor-pointer group ${className}`}
    >
      {logoRing}
      <div className="flex flex-col justify-center">
        <span
          className={`font-display ${text} font-black tracking-wider text-slate-900 dark:text-slate-100 leading-none transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400`}
        >
          NOX
        </span>
        <span
          className={`font-mono ${sub} text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase mt-1 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300`}
        >
          YOUR SECOND SELF
        </span>
      </div>
    </div>
  );
}
