'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/compensation.api';
import type { HistoryDto } from '../types/compensation.dto';
import { SalaryHistory } from './shared/SalaryHistory';
import { RevisionLetterDrawer } from '@/features/salary-revisions/components/components/RevisionLetterDrawer';
import { getLetter } from '@/features/salary-revisions/api/salaryRevisions.api';

export function SalaryHistoryPanel({ employeeId, onLoaded }: { employeeId: number; onLoaded?: (data: HistoryDto) => void }) {
  const [data, setData] = React.useState<HistoryDto | null>(null);
  const [error, setError] = React.useState('');
  const [letterId, setLetterId] = React.useState<number | null>(null);
  const loadedRef = React.useRef(onLoaded);
  loadedRef.current = onLoaded;

  React.useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    api.employeeHistory(employeeId)
      .then((d) => {
        if (!active) return;
        setData(d);
        loadedRef.current?.(d);
      })
      .catch((e) => active && setError(messageOf(e)));
    return () => { active = false; };
  }, [employeeId]);

  return (
    <>
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {!data && !error && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-subtle" />)}</div>}
      {data && <SalaryHistory history={data} compact onLetter={setLetterId} />}
      <RevisionLetterDrawer revisionId={letterId} load={getLetter} onClose={() => setLetterId(null)} />
    </>
  );
}

export function SalaryHistoryDrawer({ employeeId, onClose }: { employeeId: number | null; onClose: () => void }) {
  const [name, setName] = React.useState('');

  React.useEffect(() => { setName(''); }, [employeeId]);

  return (
    <Drawer open={employeeId !== null} onClose={onClose} title={name ? `${name} · Salary history` : 'Salary history'}>
      {employeeId !== null && <SalaryHistoryPanel employeeId={employeeId} onLoaded={(d) => setName(d.employee.name)} />}
    </Drawer>
  );
}
