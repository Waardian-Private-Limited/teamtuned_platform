'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { thisMonth } from '@/features/salary-slips/utils/format';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../api/myPayslips.api';
import { toMyPayslips } from '../types/myPayslips.mapper';
import type { MyPayslip } from '../types/myPayslips.model';
import { YEARS_BACK } from '../constants/myPayslips.constants';

export function useMyPayslips() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentYear = Number(thisMonth().slice(0, 4));
  const asked = Number(params.get('year'));
  const year = Number.isInteger(asked) && asked >= currentYear - 50 && asked <= currentYear ? asked : currentYear;
  const years = Array.from({ length: YEARS_BACK }, (_, i) => currentYear - i);

  const [payslips, setPayslips] = useState<MyPayslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const { track } = useDownloadCenter();
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const dto = await api.listMyPayslips(year);
      if (id !== request.current) return;
      setPayslips(toMyPayslips(dto.payslips || []));
    } catch (err) {
      if (id !== request.current) return;
      setPayslips([]);
      setError(messageOf(err));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const setYear = useCallback(
    (next: number) => router.replace(`${pathname}?year=${next}`, { scroll: false }),
    [pathname, router]
  );

  const download = useCallback(
    async (slip: MyPayslip) => {
      setDownloadingId(slip.id);
      try {
        track(await api.exportMyPayslips({ itemIds: [slip.id] }));
      } catch (err) {
        showError(messageOf(err));
      } finally {
        setDownloadingId(null);
      }
    },
    [track]
  );

  const downloadAll = useCallback(async () => {
    setDownloadingAll(true);
    try {
      track(await api.exportMyPayslips({ year }));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setDownloadingAll(false);
    }
  }, [track, year]);

  return {
    year,
    years: years.includes(year) ? years : [year, ...years],
    setYear,
    payslips,
    loading,
    error,
    downloadingId,
    download,
    downloadingAll,
    downloadAll,
    refetch: load,
  };
}
