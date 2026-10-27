'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/Switch';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { TemplateSummary } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { fmtDateTime } from '../../utils/format';
import { LABOUR_ILLUSTRATIONS } from '../../constants/labour.constants';
import { Block, EmptyPanel, FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { TemplateDesigner } from './TemplateDesigner';

export function TemplatesTab({ reloadKey = 0 }: { reloadKey?: number }) {
  const [items, setItems] = useState<TemplateSummary[] | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [designer, setDesigner] = useState<{ id: number | null } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(() => {
    api.listTemplates(showInactive).then((r) => { setItems(r.templates || []); setError(''); }).catch((e) => setError(parseLabourError(e).message));
  }, [showInactive]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const deactivate = (t: TemplateSummary) => setConfirm({
    title: `Deactivate “${t.name}”?`, body: 'The form is hidden from new downloads. It cannot be deactivated while an active pack uses it.', cta: 'Deactivate', danger: true,
    run: async () => { try { await api.deactivateTemplate(t.id); showSuccess('Form deactivated'); load(); } catch (e) { showError(parseLabourError(e).message); throw e; } },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted">Show inactive<Switch label="Show inactive forms" checked={showInactive} onChange={setShowInactive} /></label>
        <div className="flex gap-2">
          <button type="button" className={primaryBtn} onClick={() => setDesigner({ id: null })}><Plus className="h-3.5 w-3.5" aria-hidden />New form</button>
        </div>
      </div>
      <FormError message={error} />
      {!items ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Block key={i} className="h-24 rounded-xl" />)}</div> : items.length === 0 ? (
        <EmptyPanel illustration={LABOUR_ILLUSTRATIONS.forms} title="No forms yet" text="Install a client preset above, or design your own form." action={{ label: 'New form', onClick: () => setDesigner({ id: null }) }} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <div key={t.id} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4">
              <div>
                <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-fg">{t.name}</h3>{!t.isActive && <Pill>Inactive</Pill>}</div>
                <p className="mt-0.5 text-xs text-fg-muted">{t.clientLabel || 'No client label'} · updated {fmtDateTime(t.updatedAt)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" className={secondaryBtn} onClick={() => setDesigner({ id: t.id })}><Pencil className="h-3.5 w-3.5" aria-hidden />Open designer</button>
                {t.isActive && <button type="button" className={secondaryBtn} onClick={() => deactivate(t)}>Deactivate</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Drawer open={designer !== null} onClose={() => setDesigner(null)} title={designer?.id ? 'Edit form' : 'New form'} maxWidthClassName="sm:max-w-[min(1400px,96vw)]">
        {designer && <TemplateDesigner key={designer.id ?? 'new'} id={designer.id} onClose={() => setDesigner(null)} onSaved={load} />}
      </Drawer>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
