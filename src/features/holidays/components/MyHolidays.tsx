'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Alert } from '@/components/ui/Alert';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { applyOptionalHoliday, cancelOptionalHoliday, myHolidays } from '../api/holidays.api';
import { OPTIONAL_BLOCKED_TEXT, OPTIONAL_STATE_LABEL, SESSION_LABEL } from '../constants';
import type { MyHoliday, OptionalPolicy } from '../types/holidays';
import { HolidaysEmptyState } from './HolidaysEmptyState';
import { orgToday } from '@/lib/datetime';

/** Allotted, taken and left of the year's optional holidays, and the rules that apply to taking one. */
function OptionalBalance({ policy }: { policy: OptionalPolicy }) {
  const cell = (label: string, value: number) => (
    <div className="min-w-24 rounded-lg border border-line bg-bg-subtle/40 px-3 py-2">
      <p className="text-xl font-bold tabular-nums text-fg">{value}</p>
      <p className="text-[11px] font-medium text-fg-muted">{label}</p>
    </div>
  );
  const dayText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const period = policy.period ? `Leave year ${dayText(policy.period.start)} – ${dayText(policy.period.end)}` : '';
  const rules = [
    policy.apply_before_days > 0 ? `Apply at least ${policy.apply_before_days} day${policy.apply_before_days === 1 ? '' : 's'} before` : null,
    policy.needs_approval ? 'Needs approval' : 'No approval needed',
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
      <div className="mr-auto">
        <p className="text-sm font-bold text-fg">Optional holidays</p>
        <p className="text-xs text-fg-muted">{[period, rules].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex gap-2">{cell('Allotted', policy.limit)}{cell('Taken', policy.used)}{cell('Can take', policy.remaining)}</div>
    </div>
  );
}

// Employee view: only the holidays that apply to them (their sub-organization and sites), and, where the
// policy lets them, the optional ones they can take with what is left of the year's allowance.
export function MyHolidays() {
  const [year, setYear] = React.useState(() => Number(orgToday().slice(0, 4)));
  const [rows, setRows] = React.useState<MyHoliday[] | null>(null);
  const [policy, setPolicy] = React.useState<OptionalPolicy | null>(null);
  const [error, setError] = React.useState('');
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    setRows(null);
    myHolidays(year)
      .then((r) => { setRows(r.holidays); setPolicy(r.optional_policy?.enabled ? r.optional_policy : null); setError(''); })
      .catch((e) => setError(messageOf(e)));
  }, [year, nonce]);

  const act = (h: MyHoliday, apply: boolean) => setConfirm({
    title: apply ? `Apply for ${h.name}?` : `${h.optional?.choice?.state === 'pending' ? 'Withdraw' : 'Give back'} ${h.name}?`,
    body: apply && policy ? `It uses 1 of your ${policy.limit} optional holidays this year.` : 'You will be working that day again.',
    cta: apply ? 'Apply' : h.optional?.choice?.state === 'pending' ? 'Withdraw' : 'Give back',
    run: async () => {
      setBusyId(h.id);
      try {
        if (apply) await applyOptionalHoliday(h.id);
        else if (h.optional?.choice) await cancelOptionalHoliday(h.optional.choice.id);
        showSuccess(apply ? 'Applied' : 'Done');
      } catch (e) {
        showError(messageOf(e));
      } finally {
        setBusyId(null);
        setNonce((n) => n + 1);
      }
    },
  });

  const today = orgToday();
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
        <h1 className="text-lg font-bold tracking-tight text-fg">Holidays</h1>
        <div className="flex items-center rounded-lg border border-line">
          <button type="button" aria-label="Previous year" onClick={() => setYear(year - 1)} className="grid h-8 w-8 place-items-center hover:bg-bg-subtle"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-14 text-center text-sm font-semibold">{year}</span>
          <button type="button" aria-label="Next year" onClick={() => setYear(year + 1)} className="grid h-8 w-8 place-items-center hover:bg-bg-subtle"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {policy && <OptionalBalance policy={policy} />}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
        {rows === null ? (
          <div className="h-40 animate-pulse bg-bg-subtle/60" />
        ) : rows.length === 0 ? (
          <HolidaysEmptyState year={year} filtered={false} canAdd={false} onAdd={() => undefined} onClear={() => undefined} />
        ) : (
          <ul className="divide-y divide-line overflow-y-auto">
            {rows.map((h) => {
              const o = h.optional;
              const passed = h.date < today;
              const choice = o?.choice ?? null;
              const taken = choice?.state === 'pending' || choice?.state === 'approved';
              const badge = choice && OPTIONAL_STATE_LABEL[choice.state];
              // The policy lets employees take optional holidays: a holiday still ahead shows Apply (greyed out, with
              // the reason, when it cannot be taken now), or its status with a way back once applied.
              const offers = !!policy && !!o && !passed;
              const reason = offers && !taken && !o.can_apply && o.blocked_reason ? OPTIONAL_BLOCKED_TEXT[o.blocked_reason] : null;
              return (
                <li key={`${h.id}-${h.date}`} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${passed && !taken ? 'opacity-55' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold text-fg">{h.name}{h.is_optional && <span className="ml-2 rounded-md border border-dashed border-line px-1.5 py-0.5 text-[10px] text-fg-muted">Optional</span>}</p>
                    <p className="text-xs text-fg-muted">{new Date(`${h.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {h.session !== 'full' && <span className="rounded-full border border-[var(--tt-primary)] px-2.5 py-1 text-xs font-medium text-fg">{SESSION_LABEL[h.session]}</span>}
                    {badge && <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${choice?.state === 'rejected' ? 'border-[var(--tt-danger)] text-[var(--tt-danger)]' : 'border-line text-fg'}`}>{badge}</span>}
                    {reason && <span className="text-xs text-fg-muted">{reason}</span>}
                    {offers && !taken && <Btn variant="primary" onClick={() => act(h, true)} disabled={!o.can_apply} busy={busyId === h.id}>Apply</Btn>}
                    {offers && taken && <Btn onClick={() => act(h, false)} disabled={!o.can_cancel} busy={busyId === h.id}>{choice?.state === 'pending' ? 'Withdraw' : 'Give back'}</Btn>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
