'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/downloads.api';
import type { ExportJobDto } from '../types/downloads.dto';

const ACTIVE_POLL_MS = 3000;
const OPEN_POLL_MS = 8000;

interface DownloadCenterValue {
  jobs: ExportJobDto[];
  loading: boolean;
  open: boolean;
  activeCount: number;
  setOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  track: (job: ExportJobDto) => void;
  download: (job: ExportJobDto) => Promise<void>;
  cancel: (job: ExportJobDto) => Promise<void>;
  remove: (job: ExportJobDto) => Promise<void>;
}

const Ctx = createContext<DownloadCenterValue | null>(null);

function isActive(job: ExportJobDto) {
  return job.status === 'queued' || job.status === 'running';
}

/**
 * Holds the user's downloads for every page. It only polls while something
 * is queued or running (every 3 s) or while the panel is open (every 8 s);
 * otherwise it makes no requests at all.
 */
export function DownloadCenterProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ExportJobDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const loadedOnce = useRef(false);
  const previous = useRef<Map<number, ExportJobDto['status']>>(new Map());

  const refresh = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true);
    try {
      const res = await api.listJobs();
      for (const job of res.jobs) {
        const before = previous.current.get(job.id);
        if (before && before !== 'done' && job.status === 'done') showSuccess(`Ready to download: ${job.title}`);
        if (before && before !== 'failed' && job.status === 'failed') showError(`${job.title}: ${job.error || 'failed'}`);
      }
      previous.current = new Map(res.jobs.map((j) => [j.id, j.status]));
      setJobs(res.jobs);
      loadedOnce.current = true;
    } catch {
      // A failed poll is retried on the next tick.
    } finally {
      setLoading(false);
    }
  }, []);

  const activeCount = jobs.filter(isActive).length;

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeCount && !open) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, activeCount ? ACTIVE_POLL_MS : OPEN_POLL_MS);
    return () => clearInterval(timer);
  }, [activeCount, open, refresh]);

  const track = useCallback((job: ExportJobDto) => {
    previous.current.set(job.id, job.status);
    setJobs((list) => [job, ...list.filter((j) => j.id !== job.id)]);
    setOpen(true);
  }, []);

  const download = useCallback(async (job: ExportJobDto) => {
    try {
      const link = await api.downloadLink(job.id);
      if (link.url) {
        window.location.href = link.url;
        return;
      }
      const blob = await api.localFile(job.id);
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = link.file_name || job.file_name || 'download';
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (e) {
      showError(messageOf(e));
    }
  }, []);

  const cancel = useCallback(async (job: ExportJobDto) => {
    try {
      await api.cancelJob(job.id);
      await refresh();
    } catch (e) {
      showError(messageOf(e));
    }
  }, [refresh]);

  const remove = useCallback(async (job: ExportJobDto) => {
    setJobs((list) => list.filter((j) => j.id !== job.id));
    try {
      await api.removeJob(job.id);
    } catch (e) {
      showError(messageOf(e));
      refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ jobs, loading, open, activeCount, setOpen, refresh, track, download, cancel, remove }),
    [jobs, loading, open, activeCount, refresh, track, download, cancel, remove]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDownloadCenter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDownloadCenter must be used inside DownloadCenterProvider');
  return ctx;
}
