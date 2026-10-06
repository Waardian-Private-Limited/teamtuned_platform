'use client';

import dynamic from 'next/dynamic';

// MapLibre needs the browser; load it only on the client.
export const TrackingMapLazy = dynamic(() => import('./TrackingMap'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-bg-subtle text-xs text-fg-muted">Loading map…</div>,
});
