'use client';

import React from 'react';
import { messageOf } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import * as api from '../api/leave.api';
import type { LedgerEntry } from '../types/leave';
import { ENTRY_LABEL, fmtDate } from '../utils/format';

// Full history behind a balance: every credit, request, lapse and adjustment, newest first.
export function LedgerTable({ employeeId, typeId }: { employeeId?: number; typeId?: number | null }) {
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<LedgerEntry[] | null>(null);
  const [pages, setPages] = React.useState(1);
  const [error, setError] = React.useState('');

  React.useEffect(() => { setPage(1); }, [typeId, employeeId]);
  React.useEffect(() => {
    setRows(null);
    const p = { leave_type_id: typeId ?? undefined, page, pageSize: 20 };
    (employeeId ? api.employeeLedger(employeeId, p) : api.myLedger(p)).then((r) => { setRows(r.entries); setPages(Math.max(1, r.pages)); }).catch((e) => setError(messageOf(e)));
  }, [employeeId, typeId, page]);

  if (error) return <Alert message={error} tone="error" />;
  if (!rows) return <div className="h-32 animate-pulse rounded-lg bg-bg-subtle" />;
  if (!rows.length) return <p className="py-6 text-center text-sm text-fg-muted">No history yet.</p>;
  return (
    <div>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{ENTRY_LABEL[r.entry_type] ?? r.entry_type} <span className="text-fg-muted">· {r.leave_type_name}</span></p>
              <p className="truncate text-xs text-fg-muted">{fmtDate(r.effective_date)}{r.note ? ` · ${r.note}` : ''}{r.expires_on ? ` · expires ${fmtDate(r.expires_on)}` : ''}</p>
            </div>
            <span className={`shrink-0 text-sm font-bold ${r.quantity < 0 ? 'text-fg' : 'text-[var(--tt-success)]'}`}>{r.quantity > 0 ? '+' : ''}{Math.round(r.quantity * 1000) / 1000}</span>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 rounded-lg border border-line px-3 disabled:opacity-40">Previous</button>
          <span className="text-fg-muted">{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="h-8 rounded-lg border border-line px-3 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
