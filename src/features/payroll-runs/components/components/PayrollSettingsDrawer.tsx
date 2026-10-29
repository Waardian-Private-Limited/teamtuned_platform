'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/Switch';
import { usePayrollSettings } from '../../hooks/usePayrollSettings';
import type { DocumentNameDto } from '../../types/payrollRuns.dto';
import { Skeleton } from './controls';

const DOCUMENT_NAMES: Array<{ value: DocumentNameDto; label: string }> = [
  { value: 'assigned', label: "Employee's own sub-organization" },
  { value: 'organization', label: 'Main organization' },
  { value: 'primary', label: 'Primary sub-organization' },
];

const selectCls =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)]';

function SettingRow({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-fg">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export function PayrollSettingsDrawer({
  open,
  onClose,
  companies,
  initialCompany,
}: {
  open: boolean;
  onClose: () => void;
  companies: Array<{ id: number | null; name: string }>;
  initialCompany: number | null;
}) {
  const [company, setCompany] = React.useState<number | null>(initialCompany);
  React.useEffect(() => {
    if (open) setCompany(initialCompany);
  }, [open, initialCompany]);

  // Organization-wide settings live on the organization entry, so it is always offered.
  const choices = React.useMemo(
    () => (companies.some((c) => c.id === null) ? companies : [{ id: null, name: 'Organization' }, ...companies]),
    [companies]
  );
  const s = usePayrollSettings(open, company);
  const showPicker = choices.length > 1;
  const orgLevel = company === null;

  return (
    <Drawer open={open} onClose={onClose} title="Payroll settings">
      <div className="space-y-5">
        {showPicker && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Company</span>
            <select
              value={company ?? ''}
              onChange={(e) => setCompany(e.target.value === '' ? null : Number(e.target.value))}
              className={selectCls}
            >
              {choices.map((c) => (
                <option key={c.id ?? 'org'} value={c.id ?? ''}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-fg-muted">
              {orgLevel ? 'Organization settings apply to every company unless a company has its own.' : 'Settings apply to each paying company separately.'}
            </span>
          </label>
        )}

        {orgLevel && (
          <div className="space-y-4 rounded-xl border border-line p-4">
            <SettingRow
              title="Separate payroll for each sub-organization"
              hint="On: one payroll per sub-organization, each finalized and paid on its own. Off: one payroll for the whole organization with every employee in it. A month already started keeps the way it was started."
            >
              {s.loading ? (
                <Skeleton className="h-5 w-10 rounded-full" />
              ) : (
                <Switch
                  checked={s.payrollBySubOrg}
                  onChange={(next) => s.save({ payroll_by_sub_org: next }, { payrollBySubOrg: next })}
                  disabled={s.saving}
                  label="Separate payroll for each sub-organization"
                />
              )}
            </SettingRow>

            <label className="block border-t border-line pt-4">
              <span className="block text-sm font-bold text-fg">Company name on payslips and letters</span>
              <span className="mb-2 mt-1 block text-xs leading-relaxed text-fg-muted">
                The name, address and logo printed on payslips, letters and documents. Payslips already finalized keep the name they were issued with.
              </span>
              {s.loading ? (
                <Skeleton className="h-10 w-full rounded-lg" />
              ) : (
                <select
                  value={s.documentName}
                  disabled={s.saving}
                  onChange={(e) => {
                    const next = e.target.value as DocumentNameDto;
                    s.save({ document_name: next }, { documentName: next });
                  }}
                  className={selectCls}
                >
                  {DOCUMENT_NAMES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        )}

        <div className="rounded-xl border border-line p-4">
          <SettingRow
            title="Finalize needs approval"
            hint="When on, finalizing a payroll goes through the approval flow before salaries are locked. Reopening a finalized payroll always needs approval."
          >
            {s.loading ? (
              <Skeleton className="h-5 w-10 rounded-full" />
            ) : (
              <Switch
                checked={s.finalizeApproval}
                onChange={(next) => s.save({ finalize_approval: next }, { finalizeApproval: next })}
                disabled={s.saving}
                label="Finalize needs approval"
              />
            )}
          </SettingRow>
          {s.error && <p className="mt-3 text-xs font-medium text-[var(--tt-danger)]">{s.error}</p>}
        </div>
      </div>
    </Drawer>
  );
}
