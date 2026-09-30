'use client';

import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/compensation.api';
import type { SettingsResponseDto } from '../types/compensation.dto';
import { messageOf } from '@/lib/api/errors';

const cache = new Map<string, SettingsResponseDto>();

export function invalidateCompensationSettings() {
  cache.clear();
}

export function useCompensationSettings(subOrgId: number | null) {
  const key = String(subOrgId ?? 0);
  const [data, setData] = useState<SettingsResponseDto | null>(cache.get(key) || null);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!force && cache.has(key)) {
      setData(cache.get(key) || null);
      return;
    }
    try {
      const dto = await api.getSettings(subOrgId);
      cache.set(key, dto);
      setData(dto);
    } catch (err) {
      setError(messageOf(err));
    }
  }, [key, subOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, reload: () => load(true) };
}
