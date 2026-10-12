'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/Switch';
import { usePayrollSettings } from '../../hooks/usePayrollSettings';
import { Skeleton } from './controls';

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

  const s = usePayrollSettings(open, company);
  const showPicker = companies.length > 1;

  return (
    <Drawer open={open} onClose={onClose} title="Payroll settings">
      <div className="space-y-5">
        {showPicker && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Company</span>
            <select
              value={company ?? ''}
              onChange={(e) => setCompany(e.target.value === '' ? null : Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)]"
            >
              {companies.map((c) => (
                <option key={c.id ?? 'org'} value={c.id ?? ''}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-fg-muted">Settings apply to each paying company separately.</span>
          </label>
        )}

        <div className="rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-fg">Finalize needs approval</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                When on, finalizing a payroll goes through the approval flow before salaries are locked. Reopening a finalized payroll always needs approval.
              </p>
            </div>
            {s.loading ? (
              <Skeleton className="h-5 w-10 rounded-full" />
            ) : (
              <Switch checked={s.finalizeApproval} onChange={s.toggle} disabled={s.saving} label="Finalize needs approval" />
            )}
          </div>
          {s.error && <p className="mt-3 text-xs font-medium text-[var(--tt-danger)]">{s.error}</p>}
        </div>
      </div>
    </Drawer>
  );
}
