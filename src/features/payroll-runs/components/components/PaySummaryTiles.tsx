import { Info } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { PayDetail } from '../../types/payrollRuns.model';
import { days, lateDeductionTip, minutesText, money } from '../../utils/format';

interface TileProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  className?: string;
  danger?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

function Tile({ label, value, sub, className, danger, children, footer }: TileProps) {
  return (
    <div className={cx('min-w-0 rounded-xl border border-line bg-surface p-3.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
        {children}
      </div>
      <p className={cx('mt-1.5 truncate text-xl font-extrabold leading-none tabular-nums sm:text-2xl', danger ? 'text-[var(--tt-danger)]' : 'text-fg')}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-xs text-fg-muted">{sub}</p>}
      {footer}
    </div>
  );
}

interface LopPart {
  label: string;
  days: number;
  detail?: string;
}

function Row({ label, value, note, danger, divider }: { label: string; value: string; note?: string; danger?: boolean; divider?: boolean }) {
  return (
    <li className={cx('flex items-baseline justify-between gap-4', divider && 'mt-1 border-t border-bg/20 pt-1')}>
      <span className="min-w-0">
        {label}
        {note && <span className="block text-[10px] leading-tight opacity-70">{note}</span>}
      </span>
      <span className={cx('shrink-0 font-semibold tabular-nums', danger && 'text-[var(--tt-danger-soft)]')}>{value}</span>
    </li>
  );
}

function BreakdownInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip align="end" side="bottom" content={<ul className="min-w-[13rem] space-y-0.5 py-0.5 text-[11px]">{children}</ul>}>
      <button type="button" aria-label={label} className="-m-1 rounded p-1 text-fg-subtle transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/30">
        <Info className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}

function leaveSummary(a: NonNullable<PayDetail['attendance']>) {
  const parts = [`${days(a.paidLeaveDays)} paid`];
  if (a.unpaidLeaveDays > 0) parts.push(`${days(a.unpaidLeaveDays)} unpaid`);
  const sandwich = a.sandwichLeave.days + a.lop.sandwich;
  if (sandwich > 0) parts.push(`${days(sandwich)} sandwich`);
  if (a.leaveByType.length > 1) parts.push(`${a.leaveByType.length} types`);
  return parts.join(' · ');
}

export function PaySummaryTiles({ item }: { item: PayDetail }) {
  const a = item.attendance;
  const ld = item.lateDeduction;
  const lateDays = ld ? ld.days : a ? a.lop.lateDeduction : 0;
  const lopParts: LopPart[] = a
    ? [
        { label: 'Absent', days: a.lop.absent },
        { label: 'Half day', days: a.lop.halfDay },
        { label: 'Unpaid leave', days: a.lop.unpaidLeave },
        { label: 'Sandwich', days: a.lop.sandwich },
        { label: 'Late minutes', days: lateDays, detail: ld ? `${minutesText(ld.chargeableMinutes)} · ${money(ld.amount)}` : undefined },
        { label: 'Short hours', days: a.lop.other },
      ]
    : [];
  const shown = lopParts.filter((p) => p.days > 0);
  const held = item.status === 'held';

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      <div className="col-span-2 min-w-0 rounded-xl border border-fg bg-fg p-4 text-fg-inverted sm:col-span-3 lg:col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Net pay</p>
        <p className={cx('mt-1.5 truncate text-3xl font-extrabold leading-none tabular-nums', held && 'line-through opacity-70')}>{money(item.netPay, true)}</p>
        <p className="mt-2 truncate text-xs opacity-70">
          {held ? `On hold${item.holdReason ? ` · ${item.holdReason}` : ''}` : item.monthlyGross !== null ? `Monthly gross ${money(item.monthlyGross)}` : ' '}
        </p>
      </div>
      <Tile label="Earnings" value={money(item.earnings)} />
      <Tile label="Deductions" value={money(item.deductions)} />
      <Tile label="Employer cost" value={money(item.employer)} sub="Not part of net pay" />
      {ld && (
        <Tile
          label="Late minutes deduction"
          value={`${days(ld.days)} ${ld.days === 1 ? 'day' : 'days'}`}
          danger={ld.days > 0}
          sub={ld.days > 0 ? `${minutesText(ld.chargeableMinutes)} chargeable · ${money(ld.amount)}` : `${minutesText(ld.minutes)} late · ${minutesText(ld.freeMinutes)} free`}
        >
          <Tooltip align="end" content={lateDeductionTip(ld)}>
            <Info className="h-3.5 w-3.5 text-fg-subtle" aria-label="Late minutes deduction details" />
          </Tooltip>
        </Tile>
      )}
      <Tile label="Payable days" value={days(item.payableDays)} sub={`of ${days(item.cycleDays)} cycle days`} className="lg:col-start-3" />
      <Tile
        label="LOP days"
        value={days(item.lopDays)}
        danger={item.lopDays > 0}
        sub={shown.length ? shown.slice(0, 2).map((p) => `${p.label} ${days(p.days)}`).join(' · ') + (shown.length > 2 ? ` · +${shown.length - 2}` : '') : 'No loss of pay'}
      >
        {shown.length > 0 && (
          <BreakdownInfo label="Loss of pay breakdown">
            {shown.map((p) => (
              <Row key={p.label} label={p.label} value={days(p.days)} note={p.detail} />
            ))}
          </BreakdownInfo>
        )}
      </Tile>
      <Tile
        label="Leaves"
        value={days(item.leaveDays)}
        sub={a ? leaveSummary(a) : undefined}
      >
        {a && (a.leaveByType.length > 0 || a.sandwichLeave.days > 0 || a.lop.sandwich > 0) && (
          <BreakdownInfo label="Leave breakdown">
            {a.leaveByType.map((t) => (
              <Row
                key={`${t.code}-${t.isPaid}`}
                label={`${t.name}${t.isPaid ? '' : ' (unpaid)'}`}
                value={days(t.days)}
                note={t.coveredAbsenceDays > 0 ? `${days(t.coveredAbsenceDays)} covering absence` : undefined}
              />
            ))}
            {a.sandwichLeave.days > 0 && (
              <Row
                label="Sandwich charged as leave"
                value={days(a.sandwichLeave.days)}
                note={a.sandwichLeave.byType.map((t) => `${t.name} ${days(t.days)}`).join(' · ')}
                divider
              />
            )}
            {a.lop.sandwich > 0 && <Row label="Sandwich as loss of pay" value={days(a.lop.sandwich)} note="Off days between days not worked" danger />}
          </BreakdownInfo>
        )}
      </Tile>
      <Tile label="Present" value={a ? days(a.present) : '—'} sub={a && a.halfDays ? `and ${days(a.halfDays)} half day${a.halfDays === 1 ? '' : 's'}` : a ? `${days(a.weekOffs)} week off · ${days(a.holidays)} holiday` : undefined} />
    </div>
  );
}
