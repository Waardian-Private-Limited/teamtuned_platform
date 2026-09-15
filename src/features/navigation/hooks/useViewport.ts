'use client';

import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, type ViewportMode } from '../constants/navigation.constants';

function computeMode(): ViewportMode {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < BREAKPOINTS.tablet) return 'phone';
  if (w < BREAKPOINTS.desktop) return 'tablet';
  if (w < BREAKPOINTS.wide) return 'desktop';
  return 'wide';
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/**
 * Viewport mode, in one of four bands (see navigation.constants.ts).
 * SSR-safe: the server snapshot is fixed at 'desktop' so hydration can't
 * mismatch; the real width is read once mounted.
 */
export function useViewport(): ViewportMode {
  return useSyncExternalStore(subscribeResize, computeMode, () => 'desktop');
}

/**
 * True on devices whose primary input is a precise pointer (mouse/trackpad).
 * Used to gate the hover-peek behavior so a touch tap-and-hold on a phone or
 * tablet never triggers it.
 */
export function useHoverCapable(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(pointer: fine)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(pointer: fine)').matches,
    () => false
  );
}
