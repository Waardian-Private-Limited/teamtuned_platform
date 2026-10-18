'use client';

import { useEffect, useState } from 'react';
import * as api from '../api/recruitment.api';
import { toOptions } from '../types/recruitment.mapper';
import type { RecruitmentOptions } from '../types/recruitment.model';

const EMPTY: RecruitmentOptions = { departments: [], roles: [], employmentTypes: [], sites: [], tests: [] };

// One fetch shared by every consumer on the page; refreshed on the next mount
// after `invalidateRecruitmentOptions()` (e.g. after a test is created).
let cache: RecruitmentOptions | null = null;
let inflight: Promise<RecruitmentOptions> | null = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api.getOptions()
      .then((dto) => { cache = toOptions(dto); return cache; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function invalidateRecruitmentOptions() {
  cache = null;
}

export function useRecruitmentOptions() {
  const [options, setOptions] = useState<RecruitmentOptions>(cache || EMPTY);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let alive = true;
    load()
      .then((o) => { if (alive) setOptions(o); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { options, loading };
}
