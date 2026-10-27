'use client';

import React, { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { OptionCard, SelectField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { MERGE_RATE_MODES } from '../../constants/labour.constants';
import { useContractorOptions } from '../../hooks/useLabourLists';
import type { MergePreview } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

export function MergeDialog({ source, onClose, onMerged }: { source: { id: number; name: string }; onClose: () => void; onMerged: () => void }) {
  const options = useContractorOptions(source.id);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [rateMode, setRateMode] = useState<string>('keep_target');
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetError, setTargetError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPreview(null);
    setFormError('');
    if (!targetId) return;
    let off = false;
    setLoading(true);
    api.mergePreview(source.id, { targetId, rateMode })
      .then((p) => { if (!off) setPreview(p); })
      .catch((err) => { if (!off) { const p = placeError(err, (f) => f === 'targetId'); setTargetError(p.fields.targetId || ''); setFormError(p.form); } })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [source.id, targetId, rateMode]);

  const target = options.find((o) => o.value === targetId)?.label;
  const confirm = async () => {
    if (!targetId) { setTargetError('Choose the contractor to merge into'); return; }
    setBusy(true);
    try {
      await api.mergeContractor(source.id, { targetId, rateMode });
      showSuccess(`${source.name} merged into ${target}`);
      onMerged();
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const counts: Array<[string, number]> = preview ? [['Labourers moved', preview.labourers], ['Attendance days moved', preview.labourDays], ['Documents moved', preview.documents], ['Rates copied', preview.ratesCopied], ['Rates replaced', preview.ratesReplaced], ['Rates dropped', preview.ratesDropped]] : [];

  return (
    <Dialog open onClose={onClose} title={`Merge ${source.name}`} maxWidthClassName="max-w-xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" className={primaryBtn} disabled={!preview || busy} onClick={confirm}>{busy ? 'Merging…' : 'Merge contractors'}</button></>}>
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">Everything under {source.name} moves to the contractor you pick. {source.name} is then closed as merged. This cannot be undone.</p>
        <SelectField label="Merge into" required numeric value={targetId} options={options} error={targetError} placeholder="Choose contractor…" onChange={(v) => { setTargetId(v); setTargetError(''); }} />
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Rates</legend>
          <div role="radiogroup" className="grid gap-2">
            {MERGE_RATE_MODES.map((m) => <OptionCard key={m.value} selected={rateMode === m.value} onClick={() => setRateMode(m.value)} title={m.title} description={m.description} />)}
          </div>
        </fieldset>
        {loading && <div className="h-20 animate-pulse rounded-xl bg-bg-subtle" />}
        {preview && (
          <div className="rounded-xl border border-line p-3 sm:p-4">
            <p className="mb-2 text-sm font-bold text-fg">What will happen</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {counts.map(([label, n]) => <div key={label}><dt className="text-[11px] text-fg-muted">{label}</dt><dd className="text-lg font-extrabold tabular-nums text-fg">{n}</dd></div>)}
            </dl>
          </div>
        )}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
