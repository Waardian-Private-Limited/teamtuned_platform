'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/myProfile.api';
import { toMyProfile } from '../types/myProfile.mapper';
import type { MyProfile } from '../types/myProfile.model';

export function useMyProfile() {
  const [version, setVersion] = useState(0);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getMyProfile()
      .then((dto) => !cancelled && setProfile(toMyProfile(dto)))
      .catch((err) => !cancelled && setError(messageOf(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const retry = useCallback(() => setVersion((v) => v + 1), []);

  return { profile, loading, error, retry };
}
