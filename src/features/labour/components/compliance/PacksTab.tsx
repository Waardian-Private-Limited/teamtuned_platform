'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/Switch';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { PackDetail } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { LABOUR_ILLUSTRATIONS } from '../../constants/labour.constants';
import { Block, EmptyPanel, FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { PackDrawer } from './PackDrawer';

export function PacksTab({ reloadKey = 0 }: { reloadKey?: number }) {
  const [items, setItems] = useState<PackDetail[] | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(() => { api.listPacks(showInactive).then((r) => { setItems(r.packs || []); setError(''); }).catch((e) => setError(parseLabourError(e).message)); }, [showInactive]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const deactivate = (p: PackDetail) => setConfirm({
    title: `Deactivate “${p.name}”?`, body: 'Its sites stop following the pack, so new labourers there will not be asked for these details.', cta: 'Deactivate', danger: true,
    run: async () => { try { await api.deactivatePack(p.id); showSuccess('Pack deactivated'); load(); } catch (e) { showError(parseLabourError(e).message); throw e; } },
  });
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  const counts = (p: PackDetail) => [plural(p.fields?.length ?? 0, 'detail'), plural(p.templateIds?.length ?? 0, 'form'), plural(p.siteIds?.length ?? 0, 'site')].join(' · ');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted">Show inactive<Switch label="Show inactive packs" checked={showInactive} onChange={setShowInactive} /></label>
        <button type="button" className={primaryBtn} onClick={() => setEditing({ id: null })}><Plus className="h-3.5 w-3.5" aria-hidden />New pack</button>
      </div>
      <FormError message={error} />
      {!items ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1].map((i) => <Block key={i} className="h-24 rounded-xl" />)}</div> : items.length === 0 ? (
        <EmptyPanel illustration={LABOUR_ILLUSTRATIONS.packs} title="No packs yet" text="A pack lists the extra details a client needs and the forms to print, then follows its sites." action={{ label: 'New pack', onClick: () => setEditing({ id: null }) }} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-fg">{p.name}</h3>{p.isActive === false && <Pill>Inactive</Pill>}</div>
              <p className="mt-0.5 text-xs text-fg-muted">{[p.clientLabel, counts(p)].filter(Boolean).join(' · ') || 'No client label'}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className={secondaryBtn} onClick={() => setEditing({ id: p.id })}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button>
                {p.isActive !== false && <button type="button" className={secondaryBtn} onClick={() => deactivate(p)}>Deactivate</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? 'Edit pack' : 'New pack'} maxWidthClassName="sm:max-w-2xl">
        {editing && <PackDrawer key={editing.id ?? 'new'} id={editing.id} onSaved={load} />}
      </Drawer>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
