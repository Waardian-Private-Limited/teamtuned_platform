'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Download } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../../api/labour.api';
import type { TemplateSummary } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

const MAX_COMBINED = 50;
const MAX_SEPARATE = 200;

function Choice({ selected, disabled, onSelect, title, description }: { selected: boolean; disabled?: boolean; onSelect: () => void; title: string; description: string }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={selected} onClick={onSelect}
      className={cx('flex-1 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50', selected ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle')}>
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
    </button>
  );
}

/**
 * Client forms as a Download Centre job (the PDF is prepared in the background and appears in Downloads). One click
 * prints, per labourer, the forms of the pack their SITE follows now (the plan below shows what that is); labour at a
 * site with no pack are held back (dropped from the selection or sent through "Choose forms by hand"). Several: a ZIP
 * with one PDF per labourer in a folder per client / site (up to 200), or one combined PDF (up to 50).
 */
export function FormsPdfDialog({ labourerIds, onClose }: { labourerIds: number[]; name?: string; onClose: () => void }) {
  const { track } = useDownloadCenter();
  const [plan, setPlan] = useState<api.FormsPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [dropped, setDropped] = useState<number[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [manual, setManual] = useState(false);
  const [templateIds, setTemplateIds] = useState<number[]>([]);
  const [attachments, setAttachments] = useState(false);
  const [layout, setLayout] = useState<'combined' | 'separate'>('separate');
  const [error, setError] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [busy, setBusy] = useState(false);

  const ids = useMemo(() => labourerIds.filter((id) => !dropped.includes(id)), [labourerIds, dropped]);
  const many = ids.length > 1;

  useEffect(() => { api.listTemplates().then((r) => setTemplates(r.templates || [])).catch(() => setTemplates([])); }, []);
  useEffect(() => {
    let off = false;
    setPlanLoading(true);
    api.getFormsPlan(labourerIds)
      .then((r) => { if (!off) setPlan(r); })
      .catch((e) => { if (!off) setError(parseLabourError(e).message); })
      .finally(() => { if (!off) setPlanLoading(false); });
    return () => { off = true; };
  }, [labourerIds]);

  const groups = useMemo(() => (plan?.groups || [])
    .map((g) => ({ ...g, labourerIds: g.labourerIds.filter((id) => ids.includes(id)) })).filter((g) => g.labourerIds.length), [plan, ids]);
  const missing = useMemo(() => (plan?.withoutPack || []).filter((w) => ids.includes(w.labourerId)), [plan, ids]);
  const missingSites = Array.from(new Set(missing.map((w) => w.siteName)));
  const blocked = !manual && missing.length > 0;
  const noneLeft = ids.length === 0;

  useEffect(() => { if (ids.length > MAX_COMBINED && layout === 'combined') setLayout('separate'); }, [ids.length, layout]);

  const toggle = (id: number) => { setTemplateIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id])); setTemplateError(''); };
  const dropMissing = () => setDropped((d) => [...d, ...missing.map((w) => w.labourerId)]);

  const run = async () => {
    setError('');
    if (manual && !templateIds.length) { setTemplateError('Choose at least one form'); return; }
    if (ids.length > MAX_SEPARATE) { setError(`Choose at most ${MAX_SEPARATE} labourers at a time.`); return; }
    setBusy(true);
    try {
      const job = await api.requestFormsExport({ labourerIds: ids, templateIds: manual ? templateIds : undefined, attachments, layout: many ? layout : 'combined' });
      track(job);
      onClose();
    } catch (err) {
      const e = parseLabourError(err);
      const wp = e.details?.withoutPack;
      if (Array.isArray(wp) && wp.length) setPlan((p) => ({ groups: p?.groups || [], withoutPack: wp as api.WithoutPackLabourer[] }));
      else if (e.field === 'templateIds') { setManual(true); setTemplateError(e.message); }
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={labourerIds.length > 1 ? `Download forms for ${labourerIds.length} labourers` : 'Download forms'}
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy || planLoading || blocked || noneLeft} className={primaryBtn} onClick={run}><Download className="h-3.5 w-3.5" aria-hidden />{busy ? 'Queuing…' : 'Prepare download'}</button></>}>
      <div className="space-y-4">
        {!manual && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">Forms to print</p>
            {planLoading ? <p className="text-xs text-fg-muted sm:text-sm">Checking each labourer’s site pack…</p> : (
              <ul className="space-y-1.5">
                {groups.map((g) => (
                  <li key={g.packId} className="rounded-lg border border-line px-3 py-2 text-sm text-fg">
                    <span className="font-semibold">{g.clientLabel && g.clientLabel !== g.packName ? `${g.clientLabel} / ${g.packName}` : g.packName}</span>
                    <span className="text-fg-muted">: {g.forms.length} form{g.forms.length === 1 ? '' : 's'} for {g.labourerIds.length} labour</span>
                  </li>
                ))}
                {groups.length === 0 && !missing.length && !noneLeft && <li className="text-xs text-fg-muted sm:text-sm">No pack forms found.</li>}
              </ul>
            )}
          </div>
        )}
        {missing.length > 0 && (
          <div role="alert" className="rounded-lg border border-[var(--tt-danger)] px-3 py-2.5 text-xs text-fg sm:text-sm">
            <p className="font-semibold text-[var(--tt-danger)]">These labour are at sites with no form pack: {missingSites.join(', ')}.</p>
            <p className="mt-1 text-fg-muted">{missing.map((w) => `${w.name}${w.code ? ` (${w.code})` : ''}`).join(', ')}</p>
            <p className="mt-1">Set a pack for the site in Compliance, or choose forms by hand.</p>
            {!manual && ids.length > missing.length && (
              <button type="button" className={cx(secondaryBtn, 'mt-2')} onClick={dropMissing}>Continue without them ({ids.length - missing.length} left)</button>
            )}
          </div>
        )}
        {noneLeft && <p className="text-xs text-fg-muted sm:text-sm">No labourers left to print.</p>}
        {many && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">Format</p>
            <div className="flex gap-2">
              <Choice selected={layout === 'separate'} onSelect={() => setLayout('separate')} title="ZIP, one PDF each" description="A folder per client / site, one PDF per labourer" />
              <Choice selected={layout === 'combined'} disabled={ids.length > MAX_COMBINED} onSelect={() => setLayout('combined')} title="One combined PDF"
                description={ids.length > MAX_COMBINED ? `Up to ${MAX_COMBINED} labourers` : 'Every labourer one after another'} />
            </div>
          </div>
        )}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-fg">
          Add uploaded documents after each labourer’s forms
          <Switch label="Include documents" checked={attachments} onChange={setAttachments} />
        </label>
        <div className="rounded-lg border border-line">
          <button type="button" aria-expanded={manual} onClick={() => { setManual((v) => !v); setTemplateError(''); }}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-fg">
            Choose forms by hand
            <ChevronDown className={cx('h-4 w-4 text-fg-muted transition-transform', manual && 'rotate-180')} aria-hidden />
          </button>
          {manual && (
            <div className="space-y-1.5 border-t border-line p-3">
              <p className="text-xs text-fg-muted">Prints only the forms you tick for every labourer, whatever their site’s pack.</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {templates.map((t) => {
                  const on = templateIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)}
                      className={cx('flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm', on ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle')}>
                      <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-white' : 'border-line')}>{on && <Check className="h-3 w-3" aria-hidden />}</span>
                      <span className="min-w-0 flex-1 truncate text-fg">{t.name}</span>
                      {t.clientLabel && <span className="shrink-0 text-xs text-fg-muted">{t.clientLabel}</span>}
                    </button>
                  );
                })}
                {templates.length === 0 && <p className="text-xs text-fg-muted sm:text-sm">No forms yet. Add them under Compliance.</p>}
              </div>
              {templateError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{templateError}</p>}
            </div>
          )}
        </div>
        <p className="text-xs text-fg-muted sm:text-sm">The file is prepared in the background. Find it in Downloads when it is ready.</p>
        <FormError message={error} />
      </div>
    </Dialog>
  );
}
