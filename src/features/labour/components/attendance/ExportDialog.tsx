'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { Opt } from '../../hooks/useLabourLists';
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
const STATUSES: Array<{ value: Status; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'active', label: 'Currently active' },
  { value: 'completed', label: 'Completed shift' },
  { value: 'absent', label: 'Absent' },
];

/**
 * The v1 "Export labour attendance" dialog: daily / monthly / date range, site, contractor, category, subcategory,
 * status (daily) and Excel or PDF. The file is built in the background and lands in the Download Centre.
 */
export function ExportDialog({ defaults, sites, singleSite = false, contractors, categoryOptions, subcategoryOptions, onClose }: {
  defaults: ExportDefaults; sites: FilterOption[]; /** Scoped user: one site is required (the server refuses none when they have several). */ singleSite?: boolean; contractors: Opt[]; categoryOptions: Opt[]; subcategoryOptions: (categoryId: number | null) => Opt[]; onClose: () => void;
}) {
  const { track } = useDownloadCenter();
  const [type, setType] = useState<ExportType>('daily');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [date, setDate] = useState(defaults.to || today());
  const [month, setMonth] = useState((defaults.to || thisMonth()).slice(0, 7));
  const [from, setFrom] = useState(defaults.from || today());
  const [to, setTo] = useState(defaults.to || today());
  const [siteId, setSiteId] = useState<number | null>(defaults.siteId ?? (singleSite ? sites[0]?.value ?? null : null));
  const [contractorId, setContractorId] = useState<number | null>(defaults.contractorId);
  const [categoryId, setCategoryId] = useState<number | null>(defaults.categoryId);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
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
        ...(type === 'daily' ? { date, status } : type === 'month' ? { month } : { from, to }),
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

  const subs = subcategoryOptions(categoryId);
  return (
    <Dialog open onClose={onClose} title="Export labour attendance" maxWidthClassName="max-w-2xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={submit}>{busy ? 'Queuing…' : 'Export'}</button></>}>
      <div className="space-y-4">
        <SegmentedControl options={TYPES} value={type} onChange={(v) => { setType(v); setErrors({}); }} fitText />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel label="Site" />
            <SearchableFilterDropdown label="Site" allLabel="All sites" hideAll={singleSite} value={siteId} options={sites} onChange={setSiteId} className="w-full" />
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
            <SearchableFilterDropdown label="Contractor" allLabel="All contractors" value={contractorId} options={contractors} onChange={setContractorId} className="w-full" />
          </div>
          {type === 'daily' && <SelectField<Status> label="Status" value={status} placeholder="All status" options={STATUSES} onChange={setStatus} />}
          <SelectField<number> label="Category" numeric value={categoryId} placeholder="All categories" options={categoryOptions} onChange={(v) => { setCategoryId(v); setSubcategoryId(null); }} />
          <SelectField<number> label="Subcategory" numeric value={subcategoryId} placeholder="All subcategories" options={subs} disabled={!categoryId} onChange={setSubcategoryId} />
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
