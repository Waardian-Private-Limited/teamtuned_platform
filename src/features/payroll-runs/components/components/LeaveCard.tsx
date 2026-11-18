import { cx } from '@/theme/tokens';
import { formatDate } from '@/lib/datetime';
import type { ItemLeave } from '../../types/payrollRuns.model';
import { SectionCard } from './controls';

const REASON: Record<string, string> = {
  week_off_work: 'Week off worked',
  holiday_work: 'Holiday worked',
  overtime: 'Overtime',
  night_ot: 'Night overtime',
  night_ot_leftover: 'Night credit not needed next day',
};

const STATE: Record<string, { label: string; tone: string }> = {
  credited: { label: 'Credited', tone: 'text-[var(--tt-success)]' },
  approved: { label: 'Approved', tone: 'text-[var(--tt-success)]' },
  pending: { label: 'Pending', tone: 'text-[var(--tt-warning)]' },
  rejected: { label: 'Rejected', tone: 'text-fg-subtle line-through' },
  used_flagged: { label: 'Used', tone: 'text-fg-muted' },
};

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

function Row({ label, balance, used }: { label: string; balance: number; used: number }) {
  const left = Math.round((balance - used) * 100) / 100;
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 px-4 py-2 text-xs">
      <span className="font-semibold text-fg">{label}</span>
      <span className="tabular-nums text-fg-muted">Balance {balance}</span>
      <span className="tabular-nums text-fg-muted">Used {used}</span>
      <span className={cx('tabular-nums font-semibold', left < 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>Left {left}</span>
    </div>
  );
}

/** Leave and comp-off for the pay period, and the comp-off earned in it (date and reason). */
export function LeaveCard({ leave }: { leave: ItemLeave | null }) {
  if (!leave) return null;
  const earned = leave.compOff.earned;
  return (
    <SectionCard title="Leave & comp-off">
      <div className="divide-y divide-line">
        <Row label="Paid leave" balance={leave.paid.balance} used={leave.paid.used} />
        <Row label="Comp-off" balance={leave.compOff.balance} used={leave.compOff.used} />
      </div>
      {earned.length > 0 && (
        <div className="border-t border-line px-4 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Comp-off earned this period</p>
          <ul className="space-y-0.5">
            {earned.map((e, i) => {
              const st = STATE[e.state] || { label: e.state, tone: 'text-fg-muted' };
              return (
                <li key={`${e.date}-${e.reason}-${i}`} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-fg">
                    {formatDate(e.date, 'weekday')} · {REASON[e.reason] || e.reason.replace(/_/g, ' ')}
                    {e.from && e.from !== e.date && <span className="text-fg-muted"> (night of {formatDate(e.from, 'short')})</span>}
                  </span>
                  <span className={cx('shrink-0 tabular-nums', st.tone)}>
                    {days(e.days)} · {st.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
