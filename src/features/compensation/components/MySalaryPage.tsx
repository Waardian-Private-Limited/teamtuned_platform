'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/compensation.api';
import type { HistoryDto } from '../types/compensation.dto';
import { SalaryHistory } from './shared/SalaryHistory';
import { RevisionLetterDrawer } from '@/features/salary-revisions/components/components/RevisionLetterDrawer';
import { getMyLetter } from '@/features/salary-revisions/api/salaryRevisions.api';

export function MySalaryPage() {
  const [data, setData] = React.useState<HistoryDto | null>(null);
  const [error, setError] = React.useState('');
  const [letterId, setLetterId] = React.useState<number | null>(null);

  React.useEffect(() => {
    api.myHistory().then(setData).catch((e) => setError(messageOf(e)));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">My salary</h1>
        <p className="text-[11px] text-fg-muted sm:text-xs">Your current pay, every revision and one-time payout</p>
      </div>
      {error && <Alert message={error} tone="error" />}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface p-3 tt-scroll-hidden sm:p-5">
        {!data && !error && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-bg-subtle" />)}</div>}
        {data && <div className="mx-auto max-w-4xl"><SalaryHistory history={data} onLetter={setLetterId} /></div>}
      </div>
      <RevisionLetterDrawer revisionId={letterId} load={getMyLetter} onClose={() => setLetterId(null)} />
    </div>
  );
}
