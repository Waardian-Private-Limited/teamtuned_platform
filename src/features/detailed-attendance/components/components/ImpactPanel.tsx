import { ArrowRight, Check, Info } from 'lucide-react';
import { COMP_OFF_REASON } from '../../constants/detailed.constants';
import type { Impact } from '../../types/detailed.model';
import { dayText, daysText, minutesText } from '../../utils/format';
import { Skeleton } from './controls';

const STATUS_NAME: Record<string, string> = { Present: 'Present', 'Half-Day': 'Half day', Absent: 'Absent', Leave: 'On leave', Holiday: 'Holiday', Weekend: 'Week off', 'In-Progress': 'In progress', Unscheduled: 'Unscheduled' };
const name = (s: string | null) => (s ? STATUS_NAME[s] || s : 'Absent');
const cut = (p: string | null) => (p === 'full_day' ? 'a full day' : 'half a day');

function lines(impact: Impact): Array<{ text: string; strong?: boolean }> {
  const out: Array<{ text: string; strong?: boolean }> = [];
  if (impact.status.changed || impact.payableUnits.changed) {
    out.push({ strong: true, text: `${name(impact.status.from)} to ${name(impact.status.to)}, ${daysText(impact.payableUnits.from)} to ${daysText(impact.payableUnits.to)} payable day${impact.payableUnits.to === 1 ? '' : 's'}` });
  }
  if (impact.late.mark.changed) out.push({ text: impact.late.mark.to ? 'Counts as a late mark' : 'No longer counts as a late mark' });
  if (impact.late.penalty.changed) out.push({ text: impact.late.penalty.to ? `Late-mark penalty applies: ${cut(impact.late.penalty.to)} is cut` : 'Late-mark penalty no longer applies' });
  if (impact.early.mark.changed) out.push({ text: impact.early.mark.to ? 'Counts as an early exit' : 'No longer counts as an early exit' });
  if (impact.early.penalty.changed) out.push({ text: impact.early.penalty.to ? `Early-exit penalty applies: ${cut(impact.early.penalty.to)} is cut` : 'Early-exit penalty no longer applies' });
  if (impact.overtimeMinutes.changed) out.push({ text: `Overtime ${minutesText(impact.overtimeMinutes.from)} to ${minutesText(impact.overtimeMinutes.to)}` });
  if (impact.nightOtMinutes.changed) out.push({ text: `Night overtime ${minutesText(impact.nightOtMinutes.from)} to ${minutesText(impact.nightOtMinutes.to)}` });
  for (const c of impact.compOff) {
    const what = COMP_OFF_REASON[c.reason] || c.reason;
    const unit = c.kind === 'paid' ? (c.minutes ? minutesText(c.minutes) : 'paid') : `${daysText(c.unitsTo)} day${c.unitsTo === 1 ? '' : 's'}`;
    const approval = c.needsApproval ? ', needs approval' : '';
    if (c.action === 'new') out.push({ text: `${what}: ${c.kind === 'paid' ? 'paid time' : 'comp-off'} ${unit} added${approval}` });
    else if (c.action === 'more') out.push({ text: `${what} comp-off raised from ${daysText(c.unitsFrom)} to ${daysText(c.unitsTo)} day${c.unitsTo === 1 ? '' : 's'}${approval}` });
    else if (c.action === 'less') out.push({ text: `${what} comp-off reduced from ${daysText(c.unitsFrom)} to ${daysText(c.unitsTo)} day${c.unitsTo === 1 ? '' : 's'}` });
    else out.push({ text: `${what} comp-off of ${daysText(c.unitsFrom)} day${c.unitsFrom === 1 ? '' : 's'} is withdrawn` });
  }
  if (impact.leaveBalanceReturned) out.push({ text: `Leave balance is given back as the leave policy says${impact.leaveFraction === 0.5 ? ' (half a day worked)' : ''}` });
  for (const o of impact.otherDays) out.push({ text: `${dayText(o.date)}: ${name(o.status.from)} to ${name(o.status.to)} (a night overtime credit moves)` });
  return out;
}

/** What applying the change would do, from the engine itself: status, penalties, comp-off, leave balance. */
export function ImpactPanel({ impact, loading }: { impact: Impact | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-line p-3" aria-busy="true">
        <Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3.5 w-2/3" />
      </div>
    );
  }
  if (!impact) return null;
  const items = lines(impact);
  return (
    <div className="rounded-xl border border-line bg-bg-subtle/50 p-3.5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">What will change</p>
      {items.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-sm text-fg-muted"><Info className="h-4 w-4" /> Nothing changes: the day already works out this way.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((l, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fg">
              {l.strong ? <ArrowRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg" /> : <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />}
              <span className={l.strong ? 'font-bold' : undefined}>{l.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
