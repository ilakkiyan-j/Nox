'use client';

import React, { useEffect, useRef } from 'react';

interface DialogShellProps {
  isOpen: boolean;
  onClose: () => void;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible modal surface: role=dialog, aria-modal, Escape-to-close,
 * focus moved into the dialog on open and restored on close, body scroll
 * locked while open.
 */
export default function DialogShell({ isOpen, onClose, label, children, className = '' }: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const moveFocusIn = () => {
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const target = focusables[0];
      if (target) target.focus();
      else panel.focus();
    };

    const t = window.setTimeout(moveFocusIn, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`w-full relative outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}