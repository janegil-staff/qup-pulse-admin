// qup-pulse-admin/src/lib/useDarkMode.js
'use client';

// Global dark-mode controller. Toggles the `dark` class on <html>, persists the
// choice to localStorage, and defaults to the OS preference on first visit.
//
// Because it drives the ROOT element (not a per-page wrapper), the choice holds
// across every page that uses it — the AppNav toggle, and any other page.
//
// Requires Tailwind class-based dark mode:
//   Tailwind v4: `@custom-variant dark (&:where(.dark, .dark *));` in globals.css
//   Tailwind v3: `darkMode: 'class'` in tailwind.config

import { useEffect, useState, useCallback } from 'react';

const KEY = 'quppulse_theme'; // 'dark' | 'light'

function apply(isDark) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
}

export function useDarkMode() {
  const [dark, setDark] = useState(true);

  // On mount: stored choice wins, else fall back to OS preference.
  useEffect(() => {
    let initial = true;
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === 'dark') initial = true;
      else if (stored === 'light') initial = false;
      else initial = !window.matchMedia('(prefers-color-scheme: light)').matches;
    } catch { /* default dark */ }
    setDark(initial);
    apply(initial);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      apply(next);
      try { window.localStorage.setItem(KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { dark, toggle };
}