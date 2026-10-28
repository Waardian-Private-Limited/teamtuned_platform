'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { CLEARANCE_STATUS_META } from '../constants/exits.constants';
import { useLoad } from '../hooks/useLoad';
import { Card, Skeleton, TonePill } from './parts';

/** The handover tasks the leaver owns. Shown only when there are some. */
export function MyClearanceCard({ caseId }: { caseId: number }) {
  const q = useLoad(() => api.myClearance(), [caseId]);
  const [busy, setBusy] = React.useState<number | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const done = async (id: number) => {
    setBusy(id);
    try { await api.markMyClearance(caseId, id); showSuccess('Marked as done'); q.reload(); } catch (e) { setErr(messageOf(e)); } finally { setBusy(null); }
  };
  if (q.loading && !q.data) return <Card title="Handover and clearance"><Skeleton className="h-16" /></Card>;
  if (q.error) return <Card title="Handover and clearance"><Alert message={q.error} /></Card>;
  if (!q.data?.length) return null;
  return (
    <Card title="Handover and clearance">
      {err && <Alert message={err} />}
      <ul className="divide-y divide-line">
        {q.data.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 first:pt-0 last:pb-0">
            <p className="min-w-0 flex-1 break-words text-sm font-semibold text-fg">{i.title}</p>
            <TonePill label={CLEARANCE_STATUS_META[i.status].label} tone={CLEARANCE_STATUS_META[i.status].tone} />
            {i.status === 'pending' && <Btn busy={busy === i.id} onClick={() => done(i.id)}>Mark done</Btn>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-muted">Your manager or the owner confirms each item once it is complete.</p>
    </Card>
  );
}
