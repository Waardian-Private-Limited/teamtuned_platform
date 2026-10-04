'use client';

import { useSyncExternalStore } from 'react';

function make(query: string) {
  return {
    subscribe: (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const md = make('(min-width: 768px)');
const lg = make('(min-width: 1024px)');

export function useRosterBoardViewport() {
  const isMd = useSyncExternalStore(md.subscribe, md.get, () => true);
  const isLg = useSyncExternalStore(lg.subscribe, lg.get, () => true);
  return { isMd, isLg };
}
