'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Download, RefreshCw } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { useFilterOptions } from '@/features/payroll-runs/hooks/useFilterOptions';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LABOUR_ILLUSTRATIONS } from '../../constants/labour.constants';
import type { CompliancePreset } from '../../types/labour.types';
import { parseLabourError } from '../../utils/errors';
import { Block, EmptyPanel, FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { SiteMultiSelect } from '../shared/FormBits';

/** Ready-made client form packs (VTP Realty, Godrej Properties). Installing creates the forms and the pack and assigns sites. */
export function PresetsSection({ onInstalled }: { onInstalled: () => void }) {
  const [items, setItems] = useState<CompliancePreset[] | null>(null);
  const [error, setError] = useState('');
  const [installing, setInstalling] = useState<CompliancePreset | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // Brings an installed preset's forms and details up to date in place (same forms, no copies; added fields and sites kept).
  const upgrade = (p: CompliancePreset) => setConfirm({
    title: `Update ${p.label}`,
    body: <p className="text-sm text-fg">The {p.label} forms and the details collected at joining are updated to the latest version. Changes you made to these forms are replaced; fields you added to the pack and its sites are kept.</p>,
    cta: 'Update',
    run: async () => {
      try {
        const r = await api.upgradePreset(p.key);
        showSuccess(`${p.label} updated: ${r.templatesUpdated + r.templatesCreated} forms${r.fieldsAdded ? `, ${r.fieldsAdded} new details` : ''}`);
        load(); onInstalled();
      } catch (err) { showError(parseLabourError(err).message); }
    },
  });

  const load = useCallback(() => {
    api.listPresets().then((r) => { setItems(r.presets || []); setError(''); }).catch((e) => setError(parseLabourError(e).message));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="space-y-3" aria-label="Client presets">
      <div>
        <h2 className="text-sm font-bold text-fg">Client presets</h2>
        <p className="text-xs text-fg-muted sm:text-sm">Install the forms exactly as a client prints them, with the extra details they need at joining.</p>
      </div>
      <FormError message={error} />
      {!items ? <div className="grid gap-3 md:grid-cols-2">{[0, 1].map((i) => <Block key={i} className="h-40 rounded-xl" />)}</div> : items.length === 0 ? (
        <EmptyPanel illustration={LABOUR_ILLUSTRATIONS.presets} title="No presets available" text="Client presets will show up here when they are available for your account." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((p) => (
            <div key={p.key} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-fg">{p.label}</h3>
                  {p.installed && <Pill tone="good">Installed</Pill>}
                </div>
                <p className="mt-1 text-xs text-fg-muted sm:text-sm">{p.description}</p>
                <ul className="mt-3 space-y-1">
                  {p.forms.map((f) => <li key={f} className="flex items-start gap-2 text-xs text-fg sm:text-sm"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />{f}</li>)}
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={p.installed ? secondaryBtn : primaryBtn} onClick={() => setInstalling(p)}>
                  <Download className="h-3.5 w-3.5" aria-hidden />{p.installed ? 'Add sites' : 'Install'}
                </button>
                {p.installed && (
                  <button type="button" className={secondaryBtn} onClick={() => upgrade(p)}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />Update forms
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      {installing && <InstallDialog preset={installing} onClose={() => setInstalling(null)} onDone={() => { setInstalling(null); load(); onInstalled(); }} />}
    </section>
  );
}

function InstallDialog({ preset, onClose, onDone }: { preset: CompliancePreset; onClose: () => void; onDone: () => void }) {
  const { sites } = useFilterOptions(null);
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [taken, setTaken] = useState<Record<number, string>>({});
  const [siteError, setSiteError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Sites that already follow a different pack are shown disabled with the pack name.
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const own = `${preset.label} - labour onboarding`;
        const { packs } = await api.listPacks(false);
        const map: Record<number, string> = {};
        for (const pk of (packs || []).filter((x) => x.name !== own)) {
          const d = await api.getPack(pk.id);
          for (const sid of d.siteIds || []) map[sid] = 'In another pack';
        }
        if (!off) setTaken(map);
      } catch { /* the server still refuses a taken site with a clear message */ }
    })();
    return () => { off = true; };
  }, [preset.label]);

  const options = useMemo(() => sites, [sites]);

  const run = async () => {
    setBusy(true); setError(''); setSiteError('');
    try {
      const r = await api.installPreset(preset.key, siteIds);
      showSuccess(r.packCreated ? `${preset.label} installed` : `${preset.label} updated`);
      onDone();
    } catch (err) {
      const e = parseLabourError(err);
      if (e.status === 409) {
        const ids = Array.isArray(e.details?.siteIds) ? (e.details?.siteIds as number[]) : [];
        const names = ids.map((sid) => sites.find((s) => s.value === sid)?.label || `Site ${sid}`);
        if (ids.length) { setTaken((t) => ({ ...t, ...Object.fromEntries(ids.map((sid) => [sid, 'In another pack'])) })); setSiteIds((v) => v.filter((x) => !ids.includes(x))); }
        setSiteError(names.length ? `${e.message} (${names.join(', ')})` : e.message);
      } else { setError(e.message); showError(e.message); }
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={`Install ${preset.label}`}
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={run}>{busy ? 'Installing…' : 'Install'}</button></>}>
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">Choose the sites that follow this pack. A site can follow only one pack, so sites already in another pack are disabled. You can also install without sites and assign them later.</p>
        <SiteMultiSelect options={options} value={siteIds} onChange={(v) => { setSiteIds(v); setSiteError(''); }} error={siteError} disabledNotes={taken} />
        <FormError message={error} />
      </div>
    </Dialog>
  );
}
