'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/labour.api';
import { useCatalog, useLabourSites } from '../../hooks/useLabourLists';
import type { ContractorTrade, ImportCandidate, ImportManyResult, LookupPerson } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { FaceAvatar } from '../shared/FaceAvatar';
import { FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';

export interface ImportContractor { id: number; name: string; siteIds: number[]; trades: ContractorTrade[] }

interface Props {
  contractor: ImportContractor;
  /** Prefilled when the Add labourer screen found the person already registered. */
  preset?: { query?: string; labourerId?: number | null; siteId?: number | null; categoryId?: number | null; subcategoryId?: number | null };
  onClose: () => void;
  /** The new site records, in the order picked. */
  onImported: (records: Array<{ id: number; code: string }>) => void;
}

/** A person picked for import: the record imported from and the sites the person already works at. */
interface Picked { id: number; name: string; code: string; photoUrl: string | null; siteIds: number[]; siteNames: string[] }

type Find = 'search' | 'site';
type CategoryMode = 'same' | 'keep';

const FIELDS = new Set(['siteId', 'categoryId', 'subcategoryId', 'contractorId', 'ids']);
const LIST_SIZE = 100;
const checkbox = 'h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-[var(--tt-primary)] disabled:cursor-not-allowed disabled:opacity-40';

const fromLookup = (p: LookupPerson): Picked | null => (p.importFrom
  ? { id: p.importFrom, name: p.name, code: p.code, photoUrl: p.photoUrl, siteIds: p.sites.map((s) => s.siteId), siteNames: p.sites.map((s) => s.siteName || '') }
  : null);
const fromRow = (l: ImportCandidate): Picked => ({
  id: l.id, name: `${l.firstName} ${l.lastName || ''}`.trim(), code: l.code, photoUrl: l.photoUrl ?? null,
  siteIds: l.siteId ? [l.siteId] : [], siteNames: [l.siteName || ''],
});

/**
 * Imports registered labourers into this contractor at another site: no new face, no new registration; each site record
 * is its own. One or many: pick people by search, or tick a crew from a site's list, then choose the site and category once.
 */
export function ImportLabourerDialog({ contractor, preset, onClose, onImported }: Props) {
  const [find, setFind] = useState<Find>('search');
  const [picked, setPicked] = useState<Map<number, Picked>>(new Map());
  const [siteId, setSiteId] = useState<number | null>(preset?.siteId ?? null);
  const [mode, setMode] = useState<CategoryMode>('same');
  const [categoryId, setCategoryId] = useState<number | null>(preset?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(preset?.subcategoryId ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportManyResult | null>(null);
  const { sites } = useLabourSites();
  const { categoryOptions, subcategoryOptions } = useCatalog();

  const siteOptions = sites.filter((s) => !contractor.siteIds.length || contractor.siteIds.includes(s.value));
  // Every category: one the contractor does not list yet is added to its trades on import.
  const cats = categoryOptions;
  const subs = subcategoryOptions(categoryId);
  const list = [...picked.values()];
  const alreadyThere = siteId === null ? [] : list.filter((p) => p.siteIds.includes(siteId));

  const toggle = (p: Picked, on: boolean) => setPicked((m) => {
    const next = new Map(m);
    if (on) next.set(p.id, p); else next.delete(p.id);
    return next;
  });
  const pickAll = (ps: Picked[], on: boolean) => setPicked((m) => {
    const next = new Map(m);
    for (const p of ps) { if (on) next.set(p.id, p); else next.delete(p.id); }
    return next;
  });

  const importNow = async () => {
    const next: Record<string, string> = {};
    if (!list.length) next.ids = 'Pick at least one labourer';
    if (siteId === null) next.siteId = 'Choose the site';
    if (mode === 'same' && categoryId === null) next.categoryId = 'Choose a category';
    if (mode === 'same' && subs.length && subcategoryId === null) next.subcategoryId = 'Choose a subcategory';
    setErrors(next);
    setFormError(next.ids || '');
    if (Object.keys(next).length || siteId === null) return;
    const ids = list.filter((p) => !p.siteIds.includes(siteId)).map((p) => p.id);
    if (!ids.length) { setFormError('Everyone picked already works at this site.'); return; }

    const all: ImportManyResult = { imported: 0, failed: 0, items: [] };
    setBusy({ done: 0, total: ids.length });
    setFormError('');
    try {
      for (let i = 0; i < ids.length; i += api.IMPORT_MANY_MAX) {
        const r = await api.importLabourers({
          ids: ids.slice(i, i + api.IMPORT_MANY_MAX), contractorId: contractor.id, siteId,
          ...(mode === 'keep' ? { keepCategory: true, categoryId: null, subcategoryId: null } : { categoryId, subcategoryId }),
        });
        all.imported += r.imported;
        all.failed += r.failed;
        all.items.push(...r.items);
        setBusy({ done: Math.min(ids.length, i + api.IMPORT_MANY_MAX), total: ids.length });
      }
    } catch (err) {
      // The place or the shared category was refused before anyone was imported (or a later batch failed as a whole).
      const p = placeError(err, (f) => FIELDS.has(f));
      setErrors(p.fields);
      setFormError(p.form);
      if (!all.items.length) { setBusy(null); return; }
    }
    setBusy(null);
    const made = all.items.filter((x) => x.ok && x.newId).map((x) => ({ id: x.newId as number, code: x.code || '' }));
    if (all.failed === 0 && made.length) {
      showSuccess(made.length === 1 ? `${all.items[0].name} imported to ${contractor.name}` : `${made.length} labourers imported to ${contractor.name}`);
      onImported(made);
      return;
    }
    setResult(all);
  };

  // Some were refused: say who and why; the imported ones stay imported.
  if (result) {
    const made = result.items.filter((x) => x.ok && x.newId).map((x) => ({ id: x.newId as number, code: x.code || '' }));
    return (
      <Dialog open onClose={() => (made.length ? onImported(made) : onClose())} title="Import result" maxWidthClassName="max-w-xl"
        footer={<button type="button" className={primaryBtn} onClick={() => (made.length ? onImported(made) : onClose())}>Done</button>}>
        <div className="space-y-3">
          <p className="text-sm text-fg">{result.imported} imported, {result.failed} not imported.</p>
          <ul className="max-h-80 divide-y divide-line overflow-auto rounded-xl border border-line">
            {result.items.filter((x) => !x.ok).map((x) => (
              <li key={x.id} className="px-3 py-2">
                <p className="text-sm font-semibold text-fg">{[x.name, x.code].filter(Boolean).join(' · ')}</p>
                <p className="text-xs text-[var(--tt-danger)]">{x.error}</p>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    );
  }

  const n = list.length;
  return (
    <Dialog open onClose={onClose} title={`Import labourers to ${contractor.name}`} maxWidthClassName="max-w-2xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" className={primaryBtn} disabled={!n || !!busy} onClick={importNow}>{busy ? `Importing ${busy.done}/${busy.total}…` : n > 1 ? `Import ${n} labourers` : 'Import labourer'}</button></>}>
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">Adds labourers who are already registered to this contractor at another site. Faces are reused, so nothing is registered again. At this site each has their own attendance, rates and reports.</p>

        <SegmentedControl<Find> options={[{ value: 'search', label: 'Search' }, { value: 'site', label: 'From a site' }]} value={find} onChange={setFind} fitText />
        {find === 'search'
          ? <SearchPicker preset={preset} picked={picked} onToggle={toggle} />
          : <SitePicker picked={picked} onToggle={toggle} onPickAll={pickAll} />}

        {n > 0 && (
          <div className="rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-fg">{n} picked</p>
              <button type="button" className="text-xs text-fg-muted hover:text-fg" onClick={() => setPicked(new Map())}>Clear</button>
            </div>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto">
              {list.map((p) => (
                <span key={p.id} className={cx('inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs', siteId !== null && p.siteIds.includes(siteId) ? 'text-fg-muted line-through' : 'text-fg')}>
                  {p.name} <span className="text-fg-muted">{p.code}</span>
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => toggle(p, false)} className="text-fg-muted hover:text-fg"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            {alreadyThere.length > 0 && <p className="mt-2 text-xs text-fg-muted">{alreadyThere.length} already work at this site and are skipped.</p>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Import to site" required numeric value={siteId} options={siteOptions} error={errors.siteId} placeholder="Choose site…" onChange={(v) => { setSiteId(v); setErrors((e) => ({ ...e, siteId: '' })); }} hint={siteOptions.length === 0 ? 'No site of this contractor is available to you.' : undefined} />
          <SelectField<CategoryMode> label="Category" value={mode} options={[{ value: 'same', label: 'Same for everyone' }, { value: 'keep', label: 'Keep each one\'s own' }]} onChange={(v) => setMode(v || 'same')}
            hint={mode === 'keep' ? 'Each keeps the category they have now; it is added to this contractor\'s trades if missing.' : undefined} />
          {mode === 'same' && <SelectField label="Category for all" required numeric value={categoryId} options={cats} error={errors.categoryId} placeholder="Choose category…" onChange={(v) => { setCategoryId(v); setSubcategoryId(null); setErrors((e) => ({ ...e, categoryId: '' })); }} />}
          {mode === 'same' && categoryId !== null && subs.length > 0 && <SelectField label="Subcategory" required numeric value={subcategoryId} options={subs} error={errors.subcategoryId} placeholder="Choose subcategory…" onChange={(v) => { setSubcategoryId(v); setErrors((e) => ({ ...e, subcategoryId: '' })); }} />}
        </div>
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

/** People of the whole organization by name, code, mobile or Aadhaar last 4; tick one or many. */
function SearchPicker({ preset, picked, onToggle }: { preset: Props['preset']; picked: Map<number, Picked>; onToggle: (p: Picked, on: boolean) => void }) {
  const [q, setQ] = useState(preset?.query || '');
  const [people, setPeople] = useState<LookupPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [presetDone, setPresetDone] = useState(false);

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
  useEffect(() => {
    if (presetDone || presetId === null) return;
    const hit = people.find((p) => p.sites.some((s) => s.labourerId === presetId));
    const p = hit && fromLookup(hit);
    if (p) { setPresetDone(true); onToggle(p, true); }
  }, [people, presetId, presetDone, onToggle]);

  return (
    <div className="space-y-2">
      <TextField label="Find labourer" value={q} onChange={setQ} placeholder="Name, code, mobile or last 4 of Aadhaar" hint="Type at least 3 characters. Tick everyone to import; search again to add more." />
      {searching && <div className="h-12 animate-pulse rounded-xl bg-bg-subtle" />}
      {!searching && q.trim().length >= 3 && people.length === 0 && <p className="text-xs text-fg-muted">No labourer found.</p>}
      <ul className="max-h-72 space-y-2 overflow-auto">
        {people.map((person) => {
          const p = fromLookup(person);
          const on = !!p && picked.has(p.id);
          return (
            <li key={person.rootId}>
              <label className={cx('flex w-full items-start gap-3 rounded-xl border p-3', p ? 'cursor-pointer hover:bg-bg-subtle' : 'opacity-60', on ? 'border-fg' : 'border-line')}>
                <input type="checkbox" className={cx(checkbox, 'mt-1')} disabled={!p} checked={on} onChange={(e) => p && onToggle(p, e.target.checked)} />
                <FaceAvatar name={person.name} url={person.photoUrl} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{person.name}</span>
                  <span className="block text-xs text-fg-muted">{[person.code, person.phone].filter(Boolean).join(' · ')}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {person.sites.map((s) => <Pill key={s.labourerId} tone={s.status === 'active' ? 'neutral' : 'warn'}>{[s.siteName, s.contractorName].filter(Boolean).join(' · ')}</Pill>)}
                  </span>
                  {!p && <span className="mt-1 block text-xs text-fg-muted">Cannot be imported: must be active with a registered face.</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Any site's active labourers with a registered face (a crew), filtered by name or code; tick some or all. Every site of
 * the organization is offered, not only the user's: people are imported from anywhere, only the target site is theirs.
 */
function SitePicker({ picked, onToggle, onPickAll }: {
  picked: Map<number, Picked>; onToggle: (p: Picked, on: boolean) => void; onPickAll: (ps: Picked[], on: boolean) => void;
}) {
  const [sites, setSites] = useState<Array<{ value: number; label: string }>>([]);
  useEffect(() => {
    let off = false;
    api.importSourceSites().then((r) => { if (!off) setSites(r.sites.map((x) => ({ value: x.id, label: x.name }))); }).catch(() => null);
    return () => { off = true; };
  }, []);
  const [fromSite, setFromSite] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ImportCandidate[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPage(1); }, [fromSite, search]);
  useEffect(() => {
    if (fromSite === null) { setRows([]); setTotal(0); return; }
    let off = false;
    const t = setTimeout(() => {
      setLoading(true);
      api.importCandidates({ siteId: fromSite, search: search.trim() || undefined, page, pageSize: LIST_SIZE })
        .then((r) => { if (!off) { setRows(r.items); setPages(r.pages); setTotal(r.total); } })
        .catch(() => { if (!off) setRows([]); })
        .finally(() => { if (!off) setLoading(false); });
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [fromSite, search, page]);

  const shown = rows.map(fromRow);
  const onPage = shown.filter((p) => picked.has(p.id)).length;
  const allOn = shown.length > 0 && onPage === shown.length;

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="From site" numeric value={fromSite} options={sites} placeholder="Choose site…" onChange={setFromSite} />
        <TextField label="Filter" value={search} onChange={setSearch} placeholder="Name or code" />
      </div>
      {fromSite !== null && (
        <div className="rounded-xl border border-line">
          <label className="flex items-center gap-3 border-b border-line px-3 py-2 text-xs font-semibold text-fg">
            <input type="checkbox" className={checkbox} disabled={!shown.length} checked={allOn}
              ref={(el) => { if (el) el.indeterminate = onPage > 0 && !allOn; }} onChange={() => onPickAll(shown, !allOn)} />
            {loading ? 'Loading…' : `Select all ${shown.length}${pages > 1 ? ' on this page' : ''} (${total} with a registered face)`}
          </label>
          <ul className="max-h-72 divide-y divide-line overflow-auto">
            {shown.map((p, i) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-bg-subtle">
                  <input type="checkbox" className={checkbox} checked={picked.has(p.id)} onChange={(e) => onToggle(p, e.target.checked)} />
                  <FaceAvatar name={p.name} url={p.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{p.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{[p.code, rows[i].contractorName, rows[i].categoryName].filter(Boolean).join(' · ')}</span>
                  </span>
                </label>
              </li>
            ))}
            {!loading && !shown.length && <li className="px-3 py-3 text-xs text-fg-muted">No active labourer with a registered face here.</li>}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-fg-muted">
              <button type="button" className={secondaryBtn} disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button type="button" className={secondaryBtn} disabled={page >= pages} onClick={() => setPage((x) => x + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
