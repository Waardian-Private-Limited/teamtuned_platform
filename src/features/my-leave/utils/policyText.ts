import type { Policy } from '../types/leave.model';
import { daysText } from './format';

/**
 * A leave type's rules in plain words, grouped as people ask about them. Only the rules that apply
 * are listed; a switched-off limit says nothing. Nothing here decides anything: the server checks
 * every rule when a request is previewed and sent.
 */
export interface PolicySection { title: string; lines: string[] }

const times = (n: number) => `${n} ${n === 1 ? 'time' : 'times'}`;
const requests = (n: number) => `${n} ${n === 1 ? 'request' : 'requests'}`;

function creditLines(p: Policy): string[] {
  const c = p.credit;
  const out: string[] = [];
  switch (c.mode) {
    case 'yearly': out.push(`${daysText(c.days_per_year)} a year, credited at the start of the leave year`); break;
    case 'half_yearly': out.push(`${daysText(c.days_per_year)} a year, credited every six months`); break;
    case 'quarterly': out.push(`${daysText(c.days_per_year)} a year, credited every quarter`); break;
    case 'monthly': out.push(`${daysText(c.days_per_month)} credited every month`); break;
    case 'earned_by_work': out.push(`${daysText(c.credit_per_block)} earned for every ${c.worked_days_per_credit} days worked`); break;
    case 'per_event': out.push(`${daysText(c.days_per_event)} each time it applies`); break;
    case 'unlimited': out.push('No limit on days'); break;
    case 'comp_off': out.push('Earned by working on a week off, a holiday or overtime; each credit can expire'); break;
    case 'none': out.push('Granted by HR when needed'); break;
    default: break;
  }
  if (c.max_balance !== null) out.push(`Balance stops growing at ${daysText(c.max_balance)}`);
  if (c.advance_use !== null) out.push(`You can use up to ${daysText(c.advance_use)} before it is credited`);
  return out;
}

function applyLines(p: Policy): string[] {
  const r = p.request;
  const out: string[] = [];
  out.push(r.smallest_unit === 'full_day' ? 'Taken in full days' : r.smallest_unit === 'half_day' ? 'Can be taken in half days' : 'Can be taken by the hour');
  if (r.min_days !== null) out.push(`Each request is at least ${daysText(r.min_days)}`);
  if (r.max_days !== null) out.push(`Each request is at most ${daysText(r.max_days)}`);
  if (r.notice_days) out.push(`Apply at least ${daysText(r.notice_days)} in advance`);
  for (const s of r.longer_notice) out.push(`Leave longer than ${daysText(s.longer_than_days)} needs ${daysText(s.notice_days)} notice`);
  if (r.past_days === 0) out.push('Past dates are not allowed');
  else if (r.past_days !== null) out.push(`Past dates up to ${daysText(r.past_days)} back`);
  if (r.future_days !== null) out.push(`Up to ${daysText(r.future_days)} ahead`);
  if (r.attachment === 'always') out.push('A supporting document is required');
  if (r.attachment === 'longer_than') out.push(`A supporting document is required for leave longer than ${daysText(r.attachment_after_days)}`);
  if (!r.needs_approval) out.push('Approved as soon as you apply');
  else if (r.auto_approve_up_to !== null) out.push(`Approved straight away up to ${daysText(r.auto_approve_up_to)}; longer needs approval`);
  else out.push('Needs approval');
  if (r.block?.rule === 'exact_days') out.push(`Taken as exactly ${daysText(r.block.days)} at a time`);
  if (r.block?.rule === 'min_block') out.push(`Taken ${daysText(r.block.days)} or more at a time`);
  if (r.block?.rule === 'whole_balance') out.push('Taken as the whole balance at once');
  return out;
}

function limitLines(p: Policy): string[] {
  const l = p.limits;
  const out: string[] = [];
  if (l.requests_per_month !== null) out.push(`At most ${requests(l.requests_per_month)} a month`);
  if (l.requests_per_quarter !== null) out.push(`At most ${requests(l.requests_per_quarter)} a quarter`);
  if (l.requests_per_year !== null) out.push(`At most ${requests(l.requests_per_year)} a leave year`);
  if (l.requests_lifetime !== null) out.push(`Can be taken ${times(l.requests_lifetime)} during your employment`);
  if (l.days_per_month !== null) out.push(`At most ${daysText(l.days_per_month)} a month`);
  if (l.days_lifetime !== null) out.push(`At most ${daysText(l.days_lifetime)} during your employment`);
  if (l.gap_days !== null) out.push(`Keep ${daysText(l.gap_days)} between two requests`);
  return out;
}

function countingLines(p: Policy): string[] {
  const c = p.counting;
  const out: string[] = [];
  if (c.week_offs_inside) out.push('Week offs inside the leave are counted');
  if (c.holidays_inside) out.push('Holidays inside the leave are counted');
  if (c.sandwich_week_off || c.sandwich_holiday) {
    const what = [c.sandwich_week_off && 'week offs', c.sandwich_holiday && 'holidays'].filter(Boolean).join(' and ');
    out.push(`Sandwich rule: ${what} between leave days are counted`);
  }
  if (c.next_to_holiday_blocked) out.push('Not allowed right before or after a holiday or week off');
  if (c.clubbing !== 'allow_all') out.push('Some leave types cannot be taken right next to this one');
  const w = p.when_exhausted;
  if (w.strategy === 'loss_of_pay') out.push('Days beyond your balance become unpaid leave');
  if (w.strategy === 'negative_balance') out.push(`Balance can go below zero by up to ${daysText(w.max_negative_days)}`);
  if (w.strategy === 'use_other_leave') out.push('Days beyond your balance come from your other leave');
  if (w.strategy === 'reject') out.push('You cannot apply for more than your balance');
  return out;
}

function yearEndLines(p: Policy): string[] {
  const y = p.year_end;
  const out: string[] = [];
  if (y.carry_forward === 'full_balance') out.push('Unused days carry over to next year');
  if (y.carry_forward === 'capped') out.push(`Up to ${daysText(y.carry_max_days)} carry over to next year`);
  if (y.carry_forward === 'all_collapse') out.push('Unused days do not carry over');
  if (y.carry_forward && y.carry_expiry_months !== null) out.push(`Carried days expire after ${y.carry_expiry_months} ${y.carry_expiry_months === 1 ? 'month' : 'months'}`);
  if (y.encash_max_days !== null) out.push(y.encash_max_days ? `Up to ${daysText(y.encash_max_days)} paid out at year end` : 'Unused days are paid out at year end');
  if (!y.carry_forward && y.encash_max_days === null) out.push('Unused days lapse at the end of the leave year');
  return out;
}

function eligibilityLines(p: Policy): string[] {
  const e = p.eligibility;
  const out: string[] = [];
  if (e.waiting_days !== null) out.push(`Usable after ${daysText(e.waiting_days)} of service`);
  if (e.during_probation === 'blocked') out.push('Not available during probation');
  if (e.during_probation === 'earn_not_use') out.push('Earned during probation, usable once you are confirmed');
  if (e.during_probation === 'no_earning') out.push('Not earned during probation');
  if (e.during_notice_period === 'blocked') out.push('Not available during the notice period');
  if (e.during_notice_period === 'capped') out.push(`At most ${daysText(e.notice_period_max_days)} during the notice period`);
  return out;
}

export function policySections(p: Policy): PolicySection[] {
  return [
    { title: 'How you get it', lines: creditLines(p) },
    { title: 'Applying', lines: applyLines(p) },
    { title: 'Limits', lines: limitLines(p) },
    { title: 'How days are counted', lines: countingLines(p) },
    { title: 'At year end', lines: p.credit.mode === 'per_event' || p.credit.mode === 'unlimited' || p.credit.mode === 'none' ? [] : yearEndLines(p) },
    { title: 'Who and when', lines: eligibilityLines(p) },
  ].filter((s) => s.lines.length > 0);
}

/** Which day parts a leave type can be taken in, from its smallest unit. */
export const allowsHalfDays = (p: Policy) => p.request.smallest_unit !== 'full_day';
export const allowsHours = (p: Policy) => p.request.smallest_unit === 'hour';

/** Whether a document is needed for a request of `days`; null days means not known yet. */
export function needsDocument(p: Policy, days: number | null) {
  if (p.request.attachment === 'always') return true;
  if (p.request.attachment === 'longer_than') return days !== null && p.request.attachment_after_days !== null && days > p.request.attachment_after_days;
  return false;
}
