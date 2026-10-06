'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `task` now and then every `intervalMs`, but only while the tab is
 * visible. A hidden tab stops polling and refreshes once when it comes back.
 * The task receives an AbortSignal that fires when a newer run starts or the
 * component unmounts, so a slow response never overwrites a newer one.
 * A changed `key` (for example the active filters) restarts it with an immediate run.
 */
export function usePolling(task: (signal: AbortSignal) => Promise<void> | void, intervalMs: number, enabled = true, key = '') {
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    if (!enabled) return;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      controller?.abort();
      controller = new AbortController();
      void Promise.resolve(taskRef.current(controller.signal)).catch(() => undefined);
    };
    const start = () => {
      run();
      timer = setInterval(run, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      stop();
      if (document.visibilityState === 'visible') start();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled, key]);
}
