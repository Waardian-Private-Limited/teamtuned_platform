'use client';

import React from 'react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import * as api from '../api/perf.api';
import type { PresetMeta } from '../types/perf.types';
import { Btn } from './ui';

/** Ready-made KRAs, KPIs, competencies and a template for common kinds of work. Importing copies them into your library to edit. */
export function PresetsTab({ subOrgId, canEdit, isOrgAdmin, onImported }: { subOrgId: number | null; canEdit: boolean; isOrgAdmin: boolean; onImported: () => void }) {
  const [items, setItems] = React.useState<PresetMeta[] | null>(null);
  const [error, setError] = React.useState('');
  const [target, setTarget] = React.useState<number | null>(subOrgId);
  const [busy, setBusy] = React.useState('');
  const [done, setDone] = React.useState<Record<string, string>>({});

  React.useEffect(() => { api.listPresets().then((d) => setItems(d.items)).catch((e) => setError(messageOf(e))); }, []);
  React.useEffect(() => setTarget(subOrgId), [subOrgId]);

  const run = async (key: string) => {
    setBusy(key); setError('');
    try {
      const r = await api.importPreset(key, target);
      const made = Object.values(r.created).reduce((a, b) => a + b, 0);
      setDone({ ...done, [key]: made ? `Added ${r.created.kpis} KPIs, ${r.created.kras} KRAs and ${r.created.templates} template.` : 'Already in your library.' });
      showSuccess('Starter pack imported');
      onImported();
    } catch (e) { setError(messageOf(e)); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-3">
      <p className="max-w-2xl text-xs text-fg-muted">Start from a ready-made set instead of building from nothing. Everything is copied into your library, so you can rename, re-weight or delete anything. Importing twice does not create duplicates. Targets are sample values; set your own.</p>
      {canEdit && <div className="max-w-sm"><SubOrgPicker value={target} onChange={setTarget} allowShared={isOrgAdmin} /></div>}
      {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items === null && <li className="h-24 animate-pulse rounded-lg bg-bg-subtle" />}
        {items?.map((p) => (
          <li key={p.key} className="flex flex-col justify-between gap-3 rounded-lg border border-line p-4">
            <div>
              <p className="text-sm font-semibold text-fg">{p.name}</p>
              <p className="text-xs text-fg-muted">{p.description}</p>
              <p className="mt-1 text-[11px] text-fg-subtle">{p.kras} KRAs · {p.kpis} KPIs · {p.competencies} competencies · 1 template</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-fg-muted">{done[p.key]}</p>
              {canEdit && <Btn type="button" variant="secondary" size="sm" loading={busy === p.key} onClick={() => run(p.key)}>Import</Btn>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
