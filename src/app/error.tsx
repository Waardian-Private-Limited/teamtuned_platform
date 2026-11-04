'use client';

import { useEffect } from 'react';

/** A screen that throws while rendering shows this instead of Next's blank "Application error" page. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-lg font-bold text-fg">Something went wrong on this screen</h2>
      <p className="max-w-md text-sm text-fg-muted">The rest of the app is fine. Try again; if it keeps happening, reload the page.</p>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="inline-flex h-10 items-center rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)]">Try again</button>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-fg">Reload</button>
      </div>
    </div>
  );
}
