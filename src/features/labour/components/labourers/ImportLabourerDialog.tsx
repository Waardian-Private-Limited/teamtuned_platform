'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { useCatalog, useLabourSites } from '../../hooks/useLabourLists';
import type { ContractorTrade, LookupPerson } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { categoryOptionsFor, subcategoryOptionsFor } from '../../utils/trades';
import { FaceAvatar } from '../shared/FaceAvatar';
import { FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';

export interface ImportContractor { id: number; name: string; siteIds: number[]; trades: ContractorTrade[] }

interface Props {
  contractor: ImportContractor;
  /** Prefilled when the Add labourer screen found the person already registered. */
  preset?: { query?: string; labourerId?: number | null; siteId?: number | null; categoryId?: number | null; subcategoryId?: number | null };
  onClose: () => void;
  onImported: (r: { id: number; code: string }) => void;
}

const FIELDS = new Set(['siteId', 'categoryId', 'subcategoryId', 'contractorId']);

/** Imports a registered labourer into this contractor at another site: no new face, no new registration; the site record is its own. */
export function ImportLabourerDialog({ contractor, preset, onClose, onImported }: Props) {
  const [q, setQ] = useState(preset?.query || '');
  const [people, setPeople] = useState<LookupPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [person, setPerson] = useState<LookupPerson | null>(null);
  const [siteId, setSiteId] = useState<number | null>(preset?.siteId ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(preset?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(preset?.subcategoryId ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const { sites } = useLabourSites();
  const { categoryOptions, subcategoryOptions } = useCatalog();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setPeople([]); setSearching(false); return; }
    let off = false;
    const t = setTimeout(() => {
      setSearching(true);
      api.lookupLabourers(term).then((r) => { if (!off) setPeople(r.items || []); }).catch(() => { if (!off) setPeople([]); }).finally(() => { if (!off) setSearching(false); });
    }, 300);
    return () => { off = true; clearTimeout(t); setSearching(false); };
  }, [q]);

  // Opened from Add labourer's duplicate Aadhaar: the person it named is picked once the search shows them.
  const presetId = preset?.labourerId ?? null;
  const [presetDone, setPresetDone] = useState(false);
  useEffect(() => {
    if (presetDone || presetId === null || person) return;
    const hit = people.find((p) => p.sites.some((s) => s.labourerId === presetId));
    if (hit) { setPresetDone(true); choose(hit); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, presetId, presetDone, person]);

  const filterContractor = useMemo(() => ({ value: contractor.id, label: contractor.name, siteIds: contractor.siteIds, trades: contractor.trades }), [contractor]);
  const taken = new Set(person?.sites.map((s) => s.siteId) || []);
  const siteOptions = sites.filter((s) => (!contractor.siteIds.length || contractor.siteIds.includes(s.value)) && !taken.has(s.value));
  const cats = categoryOptionsFor(categoryOptions, filterContractor);
  const subs = subcategoryOptionsFor(subcategoryOptions(categoryId), filterContractor, categoryId);

  const choose = (p: LookupPerson) => {
    setPerson(p);
    setErrors({});
    setFormError('');
    if (siteId !== null && p.sites.some((s) => s.siteId === siteId)) setSiteId(null);
  };

  const importNow = async () => {
    if (!person?.importFrom) return;
    const next: Record<string, string> = {};
    if (siteId === null) next.siteId = 'Choose the site';
    if (categoryId === null) next.categoryId = 'Choose a category';
    if (subs.length && subcategoryId === null) next.subcategoryId = 'Choose a subcategory';
    setErrors(next);
    if (Object.keys(next).length || siteId === null) return;
    setBusy(true);
    setFormError('');
    try {
      const r = await api.importLabourer(person.importFrom, { contractorId: contractor.id, siteId, categoryId, subcategoryId });
      showSuccess(`${person.name} imported to ${contractor.name}`);
      onImported({ id: r.id, code: r.code });
    } catch (err) {
      const p = placeError(err, (f) => FIELDS.has(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Import labourer to ${contractor.name}`} maxWidthClassName="max-w-xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" className={primaryBtn} disabled={!person?.importFrom || busy} onClick={importNow}>{busy ? 'Importing…' : 'Import labourer'}</button></>}>
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">Adds a labourer who is already registered to this contractor at another site. The face is reused, so nothing is registered again. At this site they have their own attendance, rates and reports, separate from their other site.</p>
        {!person ? (
          <div className="space-y-2">
            <TextField label="Find labourer" value={q} onChange={setQ} placeholder="Name, code, mobile or last 4 of Aadhaar" hint="Type at least 3 characters." />
            {searching && <div className="h-12 animate-pulse rounded-xl bg-bg-subtle" />}
            {!searching && q.trim().length >= 3 && people.length === 0 && <p className="text-xs text-fg-muted">No labourer found.</p>}
            <ul className="space-y-2">
              {people.map((p) => (
                <li key={p.rootId}>
                  <button type="button" onClick={() => choose(p)} className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left hover:bg-bg-subtle">
                    <FaceAvatar name={p.name} url={p.photoUrl} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{p.name}</span>
                      <span className="block text-xs text-fg-muted">{[p.code, p.phone].filter(Boolean).join(' · ')}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {p.sites.map((s) => <Pill key={s.labourerId} tone={s.status === 'active' ? 'neutral' : 'warn'}>{[s.siteName, s.contractorName].filter(Boolean).join(' · ')}</Pill>)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-line p-3">
              <FaceAvatar name={person.name} url={person.photoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{person.name}</p>
                <p className="text-xs text-fg-muted">{[person.code, person.phone].filter(Boolean).join(' · ')}</p>
                <p className="mt-1 text-xs text-fg-muted">Already at: {person.sites.map((s) => [s.siteName, s.contractorName].filter(Boolean).join(' · ')).join('; ')}</p>
              </div>
              <button type="button" className={secondaryBtn} onClick={() => { setPerson(null); setErrors({}); }}>Change</button>
            </div>
            {!person.importFrom && <FormError message="This labourer cannot be imported: they must be active with a registered face." />}
            <SelectField label="Site" required numeric value={siteId} options={siteOptions} error={errors.siteId} placeholder="Choose site…" onChange={(v) => { setSiteId(v); setErrors((e) => ({ ...e, siteId: '' })); }} hint={siteOptions.length === 0 ? 'No other site of this contractor is available to you.' : undefined} />
            <SelectField label="Category" required numeric value={categoryId} options={cats} error={errors.categoryId} placeholder="Choose category…" onChange={(v) => { setCategoryId(v); setSubcategoryId(null); setErrors((e) => ({ ...e, categoryId: '' })); }} />
            {categoryId !== null && subs.length > 0 && <SelectField label="Subcategory" required numeric value={subcategoryId} options={subs} error={errors.subcategoryId} placeholder="Choose subcategory…" onChange={(v) => { setSubcategoryId(v); setErrors((e) => ({ ...e, subcategoryId: '' })); }} />}
          </div>
        )}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
