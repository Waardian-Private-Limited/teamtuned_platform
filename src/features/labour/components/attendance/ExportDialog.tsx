'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { ContractorOpt, Opt } from '../../hooks/useLabourLists';
import { cascade, categoryOptionsFor, contractorsAtSite, subcategoryOptionsFor } from '../../utils/trades';
import { placeError } from '../../utils/errors';
import { thisMonth, today } from '../../utils/format';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

type ExportType = api.AttendanceExportRequest['exportType'];
type Status = NonNullable<api.AttendanceExportRequest['status']>;

export interface ExportDefaults { siteId: number | null; contractorId: number | null; categoryId: number | null; from: string; to: string; search: string }

const TYPES = [
  { value: 'daily' as const, label: 'Daily report' },
  { value: 'month' as const, label: 'Monthly report' },
  { value: 'date_range' as const, label: 'Date range' },
];
/** Present = any punch (missed OUT included); absent = no punch; missed OUT = OUT still pending. Month / range keep whole labourers. */
const STATUSES: Array<{ value: Status; label: string; daily?: boolean }> = [
  { value: 'present', label: 'Present (all who punched)' },
  { value: 'absent', label: 'Absent (no punch)' },
  { value: 'missed_out', label: 'Missed OUT (OUT pending)' },
  { value: 'active', label: 'Currently inside', daily: true },
  { value: 'completed', label: 'Completed shift', daily: true },
];

/**
 * The v1 "Export labour attendance" dialog: daily / monthly / date range, site, contractor, category, subcategory,
 * status and Excel or PDF. The file is built in the background and lands in the Download Centre.
 */
export function ExportDialog({ defaults, sites, singleSite = false, contractors, categoryOptions, subcategoryOptions, onClose }: {
  defaults: ExportDefaults; sites: FilterOption[]; /** Scoped user: one site is required (the server refuses none when they have several). */ singleSite?: boolean; contractors: ContractorOpt[]; categoryOptions: Opt[]; subcategoryOptions: (categoryId: number | null) => Opt[]; onClose: () => void;
}) {
  const { track } = useDownloadCenter();
  const [type, setType] = useState<ExportType>('daily');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [date, setDate] = useState(defaults.to || today());
  const [month, setMonth] = useState((defaults.to || thisMonth()).slice(0, 7));
  const [from, setFrom] = useState(defaults.from || today());
  const [to, setTo] = useState(defaults.to || today());
  // Site -> contractor -> category -> subcategory: each list follows the picks above it (cascade drops what no longer fits).
  const [pick, setPick] = useState(() => {
    const siteId = defaults.siteId ?? (singleSite ? sites[0]?.value ?? null : null);
    const start = { siteId, contractorId: defaults.contractorId, categoryId: defaults.categoryId, subcategoryId: null as number | null };
    return { ...start, ...cascade(start, {}, contractors) };
  });
  const { siteId, contractorId, categoryId, subcategoryId } = pick;
  const choose = (patch: Partial<typeof pick>) => setPick((p) => ({ ...p, ...cascade(p, patch, contractors) }));
  const contractor = contractors.find((c) => c.value === contractorId);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const submit = async () => {
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const body: api.AttendanceExportRequest = {
        exportType: type, format, siteId, contractorId, categoryId, subcategoryId, search: defaults.search || null,
        status,
        ...(type === 'daily' ? { date } : type === 'month' ? { month } : { from, to }),
      };
      track(await api.exportAttendance(body));
      showSuccess('The attendance report is being prepared. Find it in Downloads.');
      onClose();
    } catch (err) {
      const p = placeError(err, (f) => ['date', 'month', 'from', 'to'].includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const subs = subcategoryOptionsFor(subcategoryOptions(categoryId), contractor, categoryId);
  return (
    <Dialog open onClose={onClose} title="Export labour attendance" maxWidthClassName="max-w-2xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={submit}>{busy ? 'Queuing…' : 'Export'}</button></>}>
      <div className="space-y-4">
        <SegmentedControl options={TYPES} value={type} onChange={(v) => { setType(v); setErrors({}); if (v !== 'daily' && STATUSES.find((x) => x.value === status)?.daily) setStatus(null); }} fitText />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel label="Site" />
            <SearchableFilterDropdown label="Site" allLabel="All sites" hideAll={singleSite} value={siteId} options={sites} onChange={(v) => choose({ siteId: v })} className="w-full" />
          </div>
          {type === 'daily' && <TextField label="Date" type="date" value={date} max={today()} error={errors.date} onChange={setDate} />}
          {type === 'month' && <TextField label="Month" type="month" value={month} max={thisMonth()} error={errors.month} onChange={setMonth} />}
          {type === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="From date" type="date" value={from} error={errors.from} onChange={setFrom} />
              <TextField label="Till date" type="date" value={to} error={errors.to} onChange={setTo} />
            </div>
          )}
          <div>
            <FieldLabel label="Contractor" />
            <SearchableFilterDropdown label="Contractor" allLabel="All contractors" value={contractorId} options={contractorsAtSite(contractors, siteId)} onChange={(v) => choose({ contractorId: v })} className="w-full" />
          </div>
          <SelectField<Status> label="Status" value={status} placeholder="All status" options={STATUSES.filter((x) => type === 'daily' || !x.daily).map(({ value, label }) => ({ value, label }))} onChange={setStatus}
            hint={type === 'daily' || !status ? undefined : status === 'absent' ? 'Labour with no punch on any day of the period.' : status === 'present' ? 'Labour who punched on at least one day; every day is shown.' : 'Labour with a day whose OUT is pending; every day is shown.'} />
          <SelectField<number> label="Category" numeric value={categoryId} placeholder="All categories" options={categoryOptionsFor(categoryOptions, contractor)} onChange={(v) => choose({ categoryId: v, subcategoryId: null })} />
          <SelectField<number> label="Subcategory" numeric value={subcategoryId} placeholder="All subcategories" options={subs} disabled={!categoryId} onChange={(v) => choose({ subcategoryId: v })} />
          <div>
            <FieldLabel label="Export format" />
            <div className="flex gap-2">
              <Chip active={format === 'excel'} onClick={() => setFormat('excel')}>Excel (.xlsx)</Chip>
              <Chip active={format === 'pdf'} onClick={() => setFormat('pdf')}>PDF (.pdf)</Chip>
            </div>
          </div>
        </div>
        {defaults.search && <p className="text-xs text-fg-muted">Only labour matching “{defaults.search}” is included.</p>}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
