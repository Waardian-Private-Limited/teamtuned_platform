'use client';

import React from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { StatusPill } from '@/components/ui/StatusPill';
import { useForm16PartA } from '../../hooks/useForm16PartA';
import { useForm16Releases } from '../../hooks/useForm16Releases';
import { formatCurrency, formatDate } from '../../utils/validators';
import { fieldErrorClass, primaryButton, smallButton } from './fields';
import type { CompanyOption } from './tdsShared';

/**
 * Everything to hand Form 16 to employees, top to bottom: upload Part A from TRACES,
 * check who is still missing, release. Downloads then carry Part A after our pages.
 */
export function Form16PartACard({
  canEdit,
  financialYear: fy,
  company,
  companyOptions,
}: {
  canEdit: boolean;
  /** Year and company come from the page's selects. */
  financialYear: string;
  company: number | null;
  companyOptions: CompanyOption[];
}) {
  const partA = useForm16PartA(fy, company);
  const releases = useForm16Releases(fy);
  const release = releases.releaseOf(company);
  const batchInput = React.useRef<HTMLInputElement>(null);
  const rowInput = React.useRef<HTMLInputElement>(null);
  const [rowTarget, setRowTarget] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);

  // Missing first: that is the list to work through.
  const rows = [...partA.employees].sort((a, b) => Number(Boolean(a.partA)) - Number(Boolean(b.partA)) || a.name.localeCompare(b.name));
  const batchBusy = partA.busy === 'batch';
  const companyLabel = companyOptions.find((o) => o.value === company)?.label ?? 'Organization';

  return (
    <div className="space-y-3">
      {canEdit && (
        <>
          <input
            ref={batchInput}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              if (files.length) partA.uploadBatch(files);
            }}
          />
          <button
            type="button"
            disabled={batchBusy}
            onClick={() => batchInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const files = Array.from(e.dataTransfer.files || []);
              if (files.length) partA.uploadBatch(files);
            }}
            className={cx(
              'flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors disabled:opacity-60',
              dragging ? 'border-fg bg-bg-subtle' : 'border-line-strong hover:bg-bg-subtle'
            )}
          >
            {batchBusy ? <Loader2 className="h-5 w-5 animate-spin text-fg" /> : <Upload className="h-5 w-5 text-fg" />}
            <span className="text-xs font-semibold text-fg sm:text-sm">
              {batchBusy ? 'Uploading…' : 'Upload Part A from TRACES (PDFs, named with PAN)'}
            </span>
            <span className="text-[11px] text-fg-muted">Drop the files here or click to choose. Up to 300 at a time.</span>
          </button>
        </>
      )}

      {partA.result && (
        <div className="rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-fg">
            {partA.result.matched.length} matched · {partA.result.unmatched.length} not matched
          </p>
          {partA.result.unmatched.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {partA.result.unmatched.map((u) => (
                <li key={u.file_name} className="text-[11px] text-[var(--tt-danger)]">
                  <span className="font-semibold">{u.file_name}</span> — {u.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {partA.error && <p className={fieldErrorClass}>{partA.error}</p>}

      <input
        ref={rowInput}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file && rowTarget) partA.uploadOne(rowTarget, file);
        }}
      />

      {partA.isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-bg-subtle" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-fg-muted">No one was paid by {companyLabel} in FY {fy}.</p>
      ) : (
        <div>
          <p className="mb-1.5 text-[11px] text-fg-muted">
            {partA.missing > 0
              ? <span className="font-semibold text-[var(--tt-danger)]">{partA.missing} with TDS still missing Part A</span>
              : 'Everyone with TDS has Part A'}
          </p>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg border border-line tt-scroll-hidden">
            {rows.map((emp) => {
              const busy = partA.busy === emp.employeeId;
              return (
                <li key={emp.employeeId} className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-fg sm:text-sm">{emp.name}</div>
                      <div className="text-[11px] tabular-nums text-fg-muted">
                        {[emp.code, `TDS ${formatCurrency(emp.tds)}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <StatusPill label={emp.partA ? 'Uploaded' : 'Missing'} tone={emp.partA ? 'active' : emp.tds > 0 ? 'inactive' : 'neutral'} />
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={partA.busy !== null}
                          onClick={() => { setRowTarget(emp.employeeId); rowInput.current?.click(); }}
                          className={smallButton}
                          title={emp.partA ? 'Replace the PDF' : 'Upload a PDF for this employee'}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">{emp.partA ? 'Replace' : 'Upload'}</span>
                        </button>
                        {emp.partA && (
                          <button
                            type="button"
                            disabled={partA.busy !== null}
                            onClick={() => partA.remove(emp.employeeId)}
                            aria-label={`Remove Part A for ${emp.name}`}
                            className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {partA.rowError?.employeeId === emp.employeeId && <p className={fieldErrorClass}>{partA.rowError.message}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg">Release to employees</p>
          <p className="text-[11px] leading-relaxed text-fg-muted">
            {release
              ? `Released ${formatDate(release.releasedAt)}. Employees can download their own Form 16.`
              : 'Release after filing the Q4 TDS return and downloading Part A from TRACES. Employees can then download their own Form 16.'}
          </p>
        </div>
        {releases.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
        ) : canEdit ? (
          <button
            type="button"
            disabled={releases.busy !== null}
            onClick={() => releases.setReleased(company, !release)}
            className={release ? smallButton + ' h-9' : primaryButton}
          >
            {releases.busy !== null && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{release ? 'Withdraw' : `Release FY ${fy}`}</span>
          </button>
        ) : (
          <StatusPill label={release ? 'Released' : 'Not released'} tone={release ? 'active' : 'neutral'} />
        )}
      </div>
      {releases.error && <p className={fieldErrorClass}>{releases.error}</p>}
    </div>
  );
}
