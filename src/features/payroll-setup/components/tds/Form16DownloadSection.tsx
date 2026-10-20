'use client';

import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { showError } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../../api/payrollSetup.api';
import { useTdsCompanies } from '../../hooks/useTdsCompanies';
import type { TdsReadinessDto } from '../../types/payroll-setup.dto';
import { decodeCompany, encodeCompany } from './tdsShared';
import { inputClass, labelClass, primaryButton } from './fields';

/** Payroll's own Form 16 download for one employee (old TDS step 6). */
export function Form16DownloadSection({ financialYear, readiness }: { financialYear: string; readiness: TdsReadinessDto | null }) {
  const { track } = useDownloadCenter();
  const { companyName } = useTdsCompanies();
  const [form16EmployeeId, setForm16EmployeeId] = React.useState<number | null>(null);
  const [form16EmployeeQuery, setForm16EmployeeQuery] = React.useState('');
  const [form16Candidates, setForm16Candidates] = React.useState<Array<{ id: number; name: string; designation: string | null }>>([]);
  const [form16Searching, setForm16Searching] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [form16Companies, setForm16Companies] = React.useState<Array<number | null>>([]);
  const [form16Company, setForm16Company] = React.useState<number | null>(null);
  const [form16CompaniesLoading, setForm16CompaniesLoading] = React.useState(false);

  React.useEffect(() => {
    setForm16Companies([]);
    setForm16Company(null);
    if (!form16EmployeeId) return;
    let active = true;
    setForm16CompaniesLoading(true);
    api
      .getForm16Companies(form16EmployeeId, financialYear)
      .then((dto) => {
        if (!active) return;
        const list = Array.isArray(dto.companies) ? dto.companies : [];
        setForm16Companies(list);
        setForm16Company(dto.company ?? list[0] ?? null);
      })
      .catch(() => {
        if (active) setForm16Companies([]);
      })
      .finally(() => {
        if (active) setForm16CompaniesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form16EmployeeId, financialYear]);

  const form16MultiCompany = form16Companies.length > 1;

  React.useEffect(() => {
    if (!form16EmployeeQuery.trim()) {
      setForm16Candidates([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setForm16Searching(true);
      try {
        const dto = await api.searchEmployees(form16EmployeeQuery);
        setForm16Candidates(dto.employees || []);
      } catch {
        setForm16Candidates([]);
      } finally {
        setForm16Searching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [form16EmployeeQuery]);

  const downloadForm16 = async () => {
    if (!form16EmployeeId) return;
    setDownloading(true);
    try {
      track(await api.exportForm16(form16EmployeeId, financialYear, form16MultiCompany ? form16Company : undefined));
    } catch (err) {
      showError(messageOf(err) || 'Failed to generate Form 16');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {!readiness?.form16.ready && (
        <div className="rounded-lg border border-[var(--tt-danger)] bg-surface p-3">
          <p className="text-[11px] font-semibold text-fg">Not ready to issue yet</p>
          <ul className="mt-1 list-inside list-disc text-[11px] leading-relaxed text-fg-muted">
            {readiness?.form16.blockedBy.includes('employerIdentity') && (
              <li>Set the employer TAN and signatory name in Settings — the certificate cannot be signed without them.</li>
            )}
            {readiness?.form16.blockedBy.includes('challans') && (
              <li>Record at least one deposit challan in Deposits &amp; returns — Part A needs proof the tax was paid.</li>
            )}
          </ul>
        </div>
      )}

      <div className="relative">
        <label className={labelClass}>Employee</label>
        <input
          value={form16EmployeeQuery}
          onChange={(e) => { setForm16EmployeeQuery(e.target.value); setForm16EmployeeId(null); }}
          placeholder="Search employee by name…"
          className={inputClass}
        />
        {form16Searching && (
          <Loader2 className="absolute right-2.5 top-9 h-3.5 w-3.5 animate-spin text-fg-subtle" />
        )}
        {form16Candidates.length > 0 && !form16EmployeeId && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg tt-scroll-hidden">
            {form16Candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  setForm16EmployeeId(candidate.id);
                  setForm16EmployeeQuery(candidate.name);
                  setForm16Candidates([]);
                }}
                className="w-full px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
              >
                {candidate.name}
                <span className="ml-2 text-fg-subtle">{candidate.designation || ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {form16MultiCompany && (
        <div>
          <label className={labelClass}>Company</label>
          <select
            value={encodeCompany(form16Company)}
            onChange={(e) => {
              const next = decodeCompany(e.target.value);
              setForm16Company(next === 'all' ? null : next);
            }}
            className={inputClass}
          >
            {form16Companies.map((id) => (
              <option key={encodeCompany(id)} value={encodeCompany(id)}>
                {companyName(id)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-fg-muted">
            Paid by {form16Companies.length} companies in FY {financialYear}. Each issues its own Form 16 under
            its TAN.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!form16EmployeeId || downloading || form16CompaniesLoading || !readiness?.form16.ready}
        onClick={downloadForm16}
        className={primaryButton}
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        <span>
          {downloading
            ? 'Generating…'
            : form16MultiCompany
              ? `Download Form 16 — ${companyName(form16Company)}`
              : `Download Form 16 for FY ${financialYear}`}
        </span>
      </button>

    </div>
  );
}
