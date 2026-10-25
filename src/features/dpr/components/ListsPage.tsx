'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, Card, PageHead } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { CatalogKind } from '../api/dpr.api';

const LISTS: { kind: CatalogKind; title: string; note: string }[] = [
  { kind: 'staff', title: 'Staff roles', note: 'offered when planning staff' },
  { kind: 'labour', title: 'Labour trades', note: 'offered when planning labour' },
  { kind: 'equipment', title: 'Equipment', note: 'offered for plans and breakdowns' },
  { kind: 'checklist', title: 'Billing checklist', note: 'asked every billing report' },
  { kind: 'document', title: 'Billing documents', note: 'documents for the client bill' },
];

function ListEditor({ kind, title, note, initial, onSaved }: { kind: CatalogKind; title: string; note: string; initial: string[]; onSaved: () => void }) {
  const [names, setNames] = React.useState(initial);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const changed = JSON.stringify(names) !== JSON.stringify(initial);
  const add = () => { const n = draft.trim(); if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) setNames([...names, n]); setDraft(''); };
  const save = async () => { setBusy(true); try { await api.saveCatalog(kind, names); showSuccess(`${title} saved`); onSaved(); } catch (e) { showError(messageOf(e)); } finally { setBusy(false); } };
  return (
    <Card title={title} note={note} right={changed ? <Btn size="sm" icon={Save} loading={busy} onClick={save}>Save</Btn> : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n) => <span key={n} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs">{n}<button type="button" aria-label={`Remove ${n}`} onClick={() => setNames(names.filter((x) => x !== n))} className="rounded-full p-0.5 text-fg-muted hover:text-fg"><X className="h-3 w-3" /></button></span>)}
        {!names.length && <span className="text-xs text-fg-muted">Empty.</span>}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Add a name" aria-label={`Add to ${title}`}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
        <Btn variant="secondary" icon={Plus} onClick={add} disabled={!draft.trim()}>Add</Btn>
      </div>
    </Card>
  );
}

/** The organization's lists: roles, trades, equipment, and the billing checklist and documents. */
export function DprListsPage({ basePath }: { basePath: string }) {
  const { data, error, refetch } = useAsync(() => api.catalog(), []);
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <PageHead title={<><Link href={`${basePath}/planning`} aria-label="Back to planning" className="rounded-lg p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>DPR lists</>} subtitle="Names offered across every site. Plans add new names here by themselves." />
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {!data ? <div className="rounded-xl border border-line bg-surface p-4"><TableSkeleton rows={5} columns={2} /></div> : (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {LISTS.map((l) => <ListEditor key={`${l.kind}:${data.catalog[l.kind].join('|')}`} {...l} initial={data.catalog[l.kind]} onSaved={refetch} />)}
        </div>
      )}
    </div>
  );
}
