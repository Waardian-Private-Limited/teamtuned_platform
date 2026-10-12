'use client';

import { useEffect, useRef, useState } from 'react';
import * as employeesApi from '../api/employees.api';
import { messageOf } from '@/lib/api/errors';
import type { FormOptionsDto } from '../types/employees.dto';
import { subOrgKey } from '../utils/allocations';

export function useSalaryOptions(subOrgIds: (number | null)[], enabled = true) {
  const [byKey, setByKey] = useState<Record<string, FormOptionsDto>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const wanted = enabled ? [...new Set(subOrgIds.map(subOrgKey))].sort().join(',') : '';

  useEffect(() => {
    if (!wanted) return;
    for (const key of wanted.split(',')) {
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      employeesApi.getFormOptions(Number(key) || null, false)
        .then((dto) => setByKey((m) => ({ ...m, [key]: dto })))
        .catch((err) => {
          requested.current.delete(key);
          setFailed((m) => ({ ...m, [key]: messageOf(err) }));
        });
    }
  }, [wanted]);

  return { byKey, failed };
}
