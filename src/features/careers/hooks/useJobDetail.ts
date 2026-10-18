'use client';

import { useEffect, useState } from 'react';
import { PublicApiError, fetchHostedJob, fetchHostedJobs } from '../api/careers.api';
import type { CareersCompany, JobDetail } from '../types/careers.types';

type State = 'loading' | 'ready' | 'not_found' | 'error';

/**
 * Job detail + the company header. The detail endpoint returns the job only
 * (§6.4), so the company comes from the board endpoint's first page, fetched
 * in parallel. A failure there only loses the header, never the page.
 */
export function useJobDetail(slug: string, jobSlug: string) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [company, setCompany] = useState<CareersCompany | null>(null);
  const [state, setState] = useState<State>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState('loading');
    setError(null);

    fetchHostedJobs(slug, { page: 1 }, ctrl.signal)
      .then((res) => setCompany(res.company))
      .catch(() => undefined);

    fetchHostedJob(slug, jobSlug, ctrl.signal)
      .then((res) => {
        setJob(res);
        setState('ready');
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        if (err instanceof PublicApiError && err.status === 404) {
          setState('not_found');
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load this job.');
        setState('error');
      });

    return () => ctrl.abort();
  }, [slug, jobSlug, reloadKey]);

  return { job, company, state, error, reload: () => setReloadKey((k) => k + 1) };
}
