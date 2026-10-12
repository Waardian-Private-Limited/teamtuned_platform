import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import type { OtherCompany, SalarySegment } from '../../types/payrollRuns.model';
import { money, shortDate } from '../../utils/format';
import { SectionCard } from './controls';

const RUN_STATUS: Record<string, string> = { draft: 'Draft', finalized: 'Finalized', paid: 'Paid', not_started: 'Not started' };

export function SalaryUsed({ segments, revisionsHref }: { segments: SalarySegment[]; revisionsHref: string }) {
  return (
    <SectionCard
      title="Salary used"
      aside={
        <Link href={revisionsHref} className="inline-flex items-center gap-0.5 text-xs font-semibold text-fg underline-offset-4 hover:underline">
          Increments & Promotions <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
    >
      {segments.length === 0 ? (
        <p className="px-4 py-5 text-center text-xs text-fg-muted">No salary structure was found for this period.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {segments.map((s, i) => (
            <li key={`${s.revisionId}-${s.from}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">
                  {shortDate(s.from)} – {shortDate(s.to)}
                </p>
                <p className="text-[11px] text-fg-muted">
                  {s.revisionId ? `Revision #${s.revisionId}` : 'Salary structure'} · {Math.round(s.weight * 1000) / 10}% of the period
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-fg">{money(s.gross)}</p>
                <p className="text-[11px] text-fg-muted">monthly gross</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function OtherCompanies({ companies }: { companies: OtherCompany[] }) {
  if (!companies.length) return null;
  return (
    <SectionCard title="Also paid by">
      <ul className="divide-y divide-line/70">
        {companies.map((c) => (
          <li key={c.runId} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-sm font-semibold text-fg">
                {c.companyName}
                {c.isPrimaryCompany && <Star aria-label="Primary company" className="h-3 w-3 fill-current text-fg" />}
              </p>
              <p className="text-[11px] text-fg-muted">{RUN_STATUS[c.status] || c.status}</p>
            </div>
            <p className="text-sm font-bold tabular-nums text-fg">{money(c.netPay)}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
