import { CalendarCheck, IndianRupee, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MyTax } from '../../types/myTax.model';
import { dayOf, fyLabel, money } from '../../utils/format';

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        <p className="truncate text-base font-bold tabular-nums text-fg sm:text-lg">{value}</p>
      </div>
    </div>
  );
}

export function TaxHeader({ tax }: { tax: MyTax }) {
  const e = tax.estimate;
  const submittedAt = tax.profile?.submittedAt;
  const flags = [
    e?.noPanRateApplied && { label: 'PAN missing — TDS at 20%', danger: true },
    e?.proofMode && { label: 'Using HR-verified proofs', danger: false },
    submittedAt && { label: `Last submitted ${dayOf(submittedAt)}`, danger: false },
  ].filter(Boolean) as Array<{ label: string; danger: boolean }>;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Income tax · {fyLabel(tax.financialYear)}</h1>
        <p className="mt-1 text-sm text-fg-muted">Choose your tax regime and declare investments. Payroll works out your monthly TDS from this.</p>
        {flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {flags.map((f) => (
              <span
                key={f.label}
                className={
                  f.danger
                    ? 'inline-flex items-center rounded-full border border-[var(--tt-danger)] px-2.5 py-0.5 text-xs font-semibold text-[var(--tt-danger)]'
                    : 'inline-flex items-center rounded-full border border-line bg-bg-subtle px-2.5 py-0.5 text-xs font-semibold text-fg'
                }
              >
                {f.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={IndianRupee} label="Expected tax this year" value={e ? money(e.annualTax) : '—'} />
        <Stat icon={CalendarCheck} label="TDS deducted so far" value={money(tax.tdsDeducted)} />
        <Stat icon={Receipt} label="This month's TDS" value={e ? money(e.monthlyTds) : '—'} />
      </div>
      {/* Usually this year's tax rates aren't loaded yet; the form below still saves. */}
      {tax.estimateError && !e && <p className="text-sm text-[var(--tt-danger)]">Tax estimate is not available yet</p>}
    </div>
  );
}
