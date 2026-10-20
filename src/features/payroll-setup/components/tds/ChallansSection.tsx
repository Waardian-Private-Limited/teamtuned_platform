'use client';

import React from 'react';
import { AlertTriangle, Download, Loader2, Plus, Trash2 } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../../api/payrollSetup.api';
import type { useTdsAdmin } from '../../hooks/useTdsAdmin';
import { useTdsCompanies } from '../../hooks/useTdsCompanies';
import type { TdsChallan } from '../../types/payroll-setup.model';
import { serverFieldOf } from '../../utils/asyncAction';
import { formatCurrency, formatDate } from '../../utils/validators';
import { ChallanDialog } from './ChallanDialog';
import { decodeCompany, encodeCompany, fyOptions, QUARTERS } from './tdsShared';
import { errorInputClass, fieldErrorClass, inputClass, labelClass } from './fields';

/** Quarterly challans and the 24Q data download (old TDS step 5). */
export function ChallansSection({
  tds,
  canEdit,
  onChanged,
}: {
  tds: ReturnType<typeof useTdsAdmin>;
  canEdit: boolean;
  /** A challan added or removed changes Form 16 readiness. */
  onChanged: () => void;
}) {
  const { track } = useDownloadCenter();
  const { subOrgs, isOrgAdmin, hasCompanies, companyName, companyOptions } = useTdsCompanies();
  const defaultChallanCompany: number | null =
    tds.challanCompany !== 'all'
      ? tds.challanCompany
      : isOrgAdmin || !hasCompanies ? null : subOrgs[0]?.id ?? null;

  const [editChallan, setEditChallan] = React.useState<TdsChallan | null>(null);
  const [challanOpen, setChallanOpen] = React.useState(false);
  const totalDeposited = tds.challans.reduce((sum, challan) => sum + Number(challan.amount || 0), 0);

  // Quarterly return (24Q): one company's deductee rows and challans for a quarter.
  const [returnFy, setReturnFy] = React.useState(tds.financialYear);
  const [returnQuarter, setReturnQuarter] = React.useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [returnCompany, setReturnCompany] = React.useState<number | null>(null);
  const [returnError, setReturnError] = React.useState<{ field: string; message: string } | null>(null);
  const [returnDownloading, setReturnDownloading] = React.useState(false);

  React.useEffect(() => {
    setReturnFy(tds.financialYear);
  }, [tds.financialYear]);

  React.useEffect(() => {
    if (returnCompany === null && !(isOrgAdmin || !hasCompanies)) setReturnCompany(subOrgs[0]?.id ?? null);
  }, [returnCompany, isOrgAdmin, hasCompanies, subOrgs]);

  const downloadReturn = async () => {
    setReturnDownloading(true);
    setReturnError(null);
    try {
      track(await api.exportTdsQuarterlyReturn(returnFy, returnQuarter, hasCompanies ? returnCompany : null));
    } catch (err) {
      const field = serverFieldOf(err, ['financialYear', 'quarter', 'company'] as const);
      setReturnError({ field: field ?? '', message: messageOf(err) || 'Failed to prepare the 24Q data' });
    } finally {
      setReturnDownloading(false);
    }
  };

  return (
    <>
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-fg-muted">
            Deposited in FY {tds.financialYear}: <span className="font-semibold text-fg">{formatCurrency(totalDeposited)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasCompanies && (
              <select
                value={encodeCompany(tds.challanCompany)}
                onChange={(e) => tds.setChallanCompany(decodeCompany(e.target.value))}
                aria-label="Filter challans by company"
                className="h-8 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg outline-none focus:border-[var(--tt-primary)]"
              >
                <option value="all">All companies</option>
                {companyOptions.map((option) => (
                  <option key={encodeCompany(option.value)} value={encodeCompany(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => { setEditChallan(null); setChallanOpen(true); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Challan</span>
              </button>
            )}
          </div>
        </div>

        {tds.challansLoading && tds.challans.length === 0 ? (
          <div className="h-16 animate-pulse rounded-lg bg-bg-subtle" />
        ) : tds.challans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-5 text-center">
            <AlertTriangle className="mx-auto h-5 w-5 text-fg-subtle" />
            <p className={cx(text.caption, 'mt-2')}>
              No challans recorded for FY {tds.financialYear}
              {tds.challanCompany !== 'all' ? ` for ${companyName(tds.challanCompany)}` : ''}. Form 16 cannot be issued
              until at least one deposit is recorded.
            </p>
          </div>
        ) : (
          QUARTERS.filter((q) => tds.challans.some((c) => c.quarter === q.value)).map((quarter) => {
            const rows = tds.challans.filter((c) => c.quarter === quarter.value);
            const subtotal = rows.reduce((sum, c) => sum + Number(c.amount || 0), 0);
            return (
              <div key={quarter.value} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    {quarter.label}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-fg">{formatCurrency(subtotal)}</span>
                </div>
                {rows.map((challan) => (
                  <div key={challan.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-fg sm:text-sm">{formatCurrency(challan.amount)}</div>
                      <div className={cx(text.caption, 'text-[11px]')}>
                        {challan.challanSerialNo ? `Serial ${challan.challanSerialNo}` : ''}
                        {challan.bsrCode ? `${challan.challanSerialNo ? ' · ' : ''}BSR ${challan.bsrCode}` : ''}
                        {challan.depositDate ? ` · ${formatDate(challan.depositDate)}` : ''}
                      </div>
                    </div>
                    {hasCompanies && (
                      <span className="ml-auto max-w-[40%] shrink-0 truncate rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-fg-muted sm:text-[11px]">
                        {companyName(challan.subOrganizationId)}
                      </span>
                    )}
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditChallan(challan); setChallanOpen(true); }}
                          className="rounded-md px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => { await tds.deleteChallan(challan.id); onChanged(); }}
                          className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}

        <div className="space-y-2.5 border-t border-line pt-3">
          <div>
            <p className="text-xs font-semibold text-fg">Quarterly return (24Q)</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
              Excel with deductee rows, challans and (Q4) salary details, for the return preparation utility.
            </p>
          </div>
          <div className={cx('grid grid-cols-1 gap-3', hasCompanies ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <div>
              <label className={labelClass}>Financial year</label>
              <select
                value={returnFy}
                onChange={(e) => { setReturnFy(e.target.value); setReturnError(null); }}
                className={returnError?.field === 'financialYear' ? errorInputClass : inputClass}
              >
                {fyOptions().map((fy) => (
                  <option key={fy} value={fy}>FY {fy}</option>
                ))}
              </select>
              {returnError?.field === 'financialYear' && <p className={fieldErrorClass}>{returnError.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Quarter</label>
              <select
                value={returnQuarter}
                onChange={(e) => { setReturnQuarter(e.target.value as typeof returnQuarter); setReturnError(null); }}
                className={returnError?.field === 'quarter' ? errorInputClass : inputClass}
              >
                {QUARTERS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
              {returnError?.field === 'quarter' && <p className={fieldErrorClass}>{returnError.message}</p>}
            </div>
            {hasCompanies && (
              <div>
                <label className={labelClass}>Company</label>
                <select
                  value={encodeCompany(returnCompany)}
                  onChange={(e) => {
                    const next = decodeCompany(e.target.value);
                    setReturnCompany(next === 'all' ? null : next);
                    setReturnError(null);
                  }}
                  className={returnError?.field === 'company' ? errorInputClass : inputClass}
                >
                  {companyOptions.map((option) => (
                    <option key={encodeCompany(option.value)} value={encodeCompany(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {returnError?.field === 'company' && <p className={fieldErrorClass}>{returnError.message}</p>}
              </div>
            )}
          </div>
          {returnError && !returnError.field && <p className={fieldErrorClass}>{returnError.message}</p>}
          <button
            type="button"
            disabled={returnDownloading}
            onClick={downloadReturn}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40"
          >
            {returnDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>{returnDownloading ? 'Preparing…' : 'Download 24Q data'}</span>
          </button>
        </div>
      </div>

      <ChallanDialog
        open={challanOpen}
        initial={editChallan}
        defaultFy={tds.financialYear}
        defaultCompany={defaultChallanCompany}
        companyOptions={companyOptions}
        showCompany={hasCompanies}
        allowOrganization={isOrgAdmin || !hasCompanies}
        companyName={companyName}
        isSaving={tds.isSaving}
        onClose={() => setChallanOpen(false)}
        onSubmit={async (payload) => {
          const ok = await tds.saveChallan(payload);
          if (ok) {
            setChallanOpen(false);
            onChanged();
          }
        }}
      />
    </>
  );
}
