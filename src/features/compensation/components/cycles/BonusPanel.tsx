'use client';

import React from 'react';
import { Coins, Eye, Save } from 'lucide-react';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import { useCompensationSettings } from '../../hooks/useCompensationSettings';
import type { BonusBase, BonusPayoutsDto, BonusPersonStatus, CycleDto } from '../../types/compensation.dto';
import { currentMonth, inr } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { td, th } from '../shared/Panel';

const BASES: { value: BonusBase; label: string }[] = [
  { value: 'ctc', label: 'Yearly CTC' },
  { value: 'gross', label: 'Monthly gross' },
  { value: 'basic', label: 'Basic' },
];

const STATUS_TEXT: Record<BonusPersonStatus, string> = {
  new: 'Will be created',
  already_created: 'Already created',
  no_rating: 'No rating',
  unknown_rating: 'Rating not in guide',
  no_bonus: 'No bonus for this rating',
  zero_base: 'Base is zero',
};

const control = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)] disabled:bg-bg-subtle disabled:opacity-60';
const small = 'h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm disabled:bg-bg-subtle disabled:opacity-60';

/**
 * Rating → bonus for one appraisal cycle: the bonus % of each rating (editable until the cycle is closed), then a preview of
 * who gets what and the payouts themselves. Payouts follow the normal payout approval and are paid by payroll in the chosen month.
 * Running it again only adds people who have no bonus from this cycle yet.
 */
export function BonusPanel({ cycle, canEdit, canCreate, onChanged }: { cycle: CycleDto; canEdit: boolean; canCreate: boolean; onChanged: () => void }) {
  const { data: settings } = useCompensationSettings(cycle.sub_organization_id);
  const types = (settings?.settings.payoutTypes || []).filter((t) => t.active);
  const [guide, setGuide] = React.useState<Record<string, string>>({});
  const [base, setBase] = React.useState<BonusBase>('ctc');
  const [monthKey, setMonthKey] = React.useState(currentMonth());
  const [type, setType] = React.useState('');
  const [plan, setPlan] = React.useState<BonusPayoutsDto | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setGuide(Object.fromEntries(cycle.rating_scale.map((r) => [r.rating, r.bonus_percent === undefined || r.bonus_percent === null ? '' : String(r.bonus_percent)])));
  }, [cycle.rating_scale]);
  React.useEffect(() => {
    if (!type && types.length) setType((types.find((t) => t.code === 'performance_bonus') || types[0]).code);
  }, [types, type]);

  const configured = cycle.rating_scale.some((r) => Number(r.bonus_percent) > 0);
  const guideDirty = cycle.rating_scale.some((r) => (guide[r.rating] ?? '') !== (r.bonus_percent === undefined || r.bonus_percent === null ? '' : String(r.bonus_percent)));
  const open = cycle.status !== 'closed';
  const existing = cycle.bonus;

  const saveGuide = async () => {
    setBusy('guide');
    setError('');
    try {
      await api.setBonusGuide(cycle.id, Object.fromEntries(cycle.rating_scale.map((r) => [r.rating, guide[r.rating] === '' || guide[r.rating] === undefined ? null : Number(guide[r.rating])])));
      showSuccess('Bonus guide saved');
      setPlan(null);
      onChanged();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? 'preview' : 'create');
    setError('');
    try {
      const res = await api.bonusPayouts(cycle.id, { base, payout_month: monthKey, payout_type: type || undefined, dry_run: dryRun });
      setPlan(res);
      if (!dryRun) {
        const made = (res.batches || []).reduce((a, b) => a + b.created, 0);
        showSuccess(made ? `${made} bonus payout${made === 1 ? '' : 's'} created` : 'Nothing new to create');
        onChanged();
      }
    } catch (e) {
      if (dryRun) setError(messageOf(e));
      else showError(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const toCreate = plan?.counts.new ?? 0;

  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Bonus from ratings</p>
          <p className="mt-0.5 text-xs text-fg-muted">Each rating can earn a one-time bonus. Payouts go through payout approval and are paid with payroll.</p>
        </div>
        {existing && existing.payouts > 0 && (
          <p className="text-xs text-fg"><strong className="font-bold">{inr(existing.amount)}</strong> created for {existing.employees} {existing.employees === 1 ? 'person' : 'people'} · {existing.by_status.map((b) => `${b.payouts} ${b.status}`).join(' · ')}</p>
        )}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-fg-muted">Bonus % per rating</p>
          <div className="space-y-1.5">
            {cycle.rating_scale.map((r) => (
              <div key={r.rating} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2">
                <span className="truncate text-xs text-fg"><strong>{r.rating}</strong> · {r.label} <span className="text-fg-muted">(+{r.percent}%)</span></span>
                <div className="relative">
                  <input className={small} inputMode="decimal" placeholder="None" disabled={!canEdit || !open} value={guide[r.rating] ?? ''} aria-label={`Bonus percent for ${r.label}`}
                    onChange={(e) => setGuide((g) => ({ ...g, [r.rating]: e.target.value.replace(/[^\d.]/g, '') }))} />
                  <span className="pointer-events-none absolute right-2 top-1.5 text-xs text-fg-muted">%</span>
                </div>
              </div>
            ))}
          </div>
          {canEdit && open && guideDirty && <div className="mt-2"><Btn icon={<Save className="h-3.5 w-3.5" />} busy={busy === 'guide'} onClick={saveGuide}>Save bonus guide</Btn></div>}
        </div>

        <div className="min-w-0">
          {!configured ? (
            <p className="text-xs text-fg-muted">Set a bonus % on at least one rating, then preview who gets what.</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-[11px] font-semibold text-fg-muted">Bonus base
                  <select className={cx(control, 'mt-1')} value={base} onChange={(e) => { setBase(e.target.value as BonusBase); setPlan(null); }}>{BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select>
                </label>
                <label className="text-[11px] font-semibold text-fg-muted">Paid in
                  <input type="month" className={cx(control, 'mt-1')} value={monthKey} onChange={(e) => { setMonthKey(e.target.value); setPlan(null); }} />
                </label>
                <label className="text-[11px] font-semibold text-fg-muted">Payout type
                  <select className={cx(control, 'mt-1')} value={type} onChange={(e) => { setType(e.target.value); setPlan(null); }}>{types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select>
                </label>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Btn icon={<Eye className="h-3.5 w-3.5" />} busy={busy === 'preview'} disabled={guideDirty} onClick={() => run(true)}>Preview</Btn>
                {canCreate && plan?.dry_run && toCreate > 0 && (
                  <Btn variant="primary" icon={<Coins className="h-3.5 w-3.5" />} busy={busy === 'create'} onClick={() => run(false)}>Create {toCreate} payout{toCreate === 1 ? '' : 's'} · {inr(plan.total)}</Btn>
                )}
              </div>
              {guideDirty && <p className="mt-1.5 text-[11px] text-fg-muted">Save the bonus guide before previewing.</p>}
            </>
          )}
          {error && <p role="alert" className="mt-2 text-xs text-[var(--tt-danger)]">{error}</p>}
        </div>
      </div>

      {plan && (
        <div className="mt-4 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {plan.groups.map((g) => (
              <span key={g.rating} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-subtle px-2 py-1 text-xs text-fg">
                <strong>{g.label || g.rating}</strong> {g.bonus_percent}% · {g.employees} · {inr(g.amount)}
              </span>
            ))}
            {Object.entries(plan.counts).filter(([k]) => k !== 'new').map(([k, n]) => (
              <span key={k} className="inline-flex items-center rounded-md border border-line px-2 py-1 text-xs text-fg-muted">{STATUS_TEXT[k as BonusPersonStatus]}: {n}</span>
            ))}
          </div>
          {!plan.dry_run && <p className="text-xs text-fg">Created {(plan.batches || []).reduce((a, b) => a + b.created, 0)} payouts ({(plan.batches || [])[0]?.status ?? 'none'}). Track them in Payouts.</p>}
          <div className="max-h-80 overflow-auto rounded-lg border border-line tt-scroll-hidden">
            <table className="w-full min-w-[640px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10"><tr><th className={th}>Employee</th><th className={th}>Rating</th><th className={th}>Bonus %</th><th className={th}>Base</th><th className={th}>Bonus</th><th className={th}>Result</th></tr></thead>
              <tbody>
                {plan.people.map((p) => (
                  <tr key={p.employee_id} className={cx(p.status !== 'new' && 'text-fg-muted')}>
                    <td className={td}><span className="font-semibold">{p.employee_name || `#${p.employee_id}`}</span>{p.employee_code && <span className="block text-[11px] text-fg-muted">{p.employee_code}</span>}</td>
                    <td className={td}>{p.rating ? `${p.rating}${p.rating_label ? ` · ${p.rating_label}` : ''}` : '—'}</td>
                    <td className={td}>{p.bonus_percent ? `${p.bonus_percent}%` : '—'}</td>
                    <td className={td}>{inr(p.base)}</td>
                    <td className={cx(td, 'font-semibold')}>{p.amount ? inr(p.amount) : '—'}</td>
                    <td className={td}>{STATUS_TEXT[p.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
