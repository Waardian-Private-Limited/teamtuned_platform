'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { METER_LABEL } from '../../constants/labour.constants';
import type { BillingLine, BillingUsage } from '../../types/labour.types';
import type { BillingPeriod } from '../../api/labour.api';
import { fmtDate, money, thisMonth } from '../../utils/format';
import { Block, FormError, Stat, td, th, trCls } from '../shared/Primitives';
import { PeriodPicker, monthPeriod, periodParams, periodProblem, type Period } from './PeriodPicker';

const FLOW = ['new_labour', 'labour_day'];

/**
 * Per-event meters are priced per plan window; per-labourer / per-machine meters and the monthly minimum come once, on the
 * last window only. Lines with nothing used and nothing charged are left out so earlier windows do not show empty rows.
 */
const shown = (l: BillingLine) => l.quantity !== 0 || l.amount !== 0;

function totals(u: BillingUsage) {
  const out: Record<string, { quantity: number; amount: number }> = {};
  Object.keys(METER_LABEL).forEach((m) => { out[m] = { quantity: 0, amount: 0 }; });
  u.windows.forEach((w) => {
    w.lines.forEach((l) => {
      const t = (out[l.meter] ||= { quantity: 0, amount: 0 });
      t.amount += l.amount;
      t.quantity = FLOW.includes(l.meter) ? t.quantity + l.quantity : Math.max(t.quantity, l.quantity);
    });
  });
  return out;
}

/** Usage and charges for a month or any dates, computed by the server from facts. Used by the org and superadmin views. */
export function UsagePanel({ load, outstandingNote }: { load: (period: BillingPeriod) => Promise<BillingUsage>; outstandingNote?: boolean }) {
  const [period, setPeriod] = useState<Period>(() => monthPeriod(0));
  const problem = periodProblem(period);
  const [u, setU] = useState<BillingUsage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let off = false;
    setU(null);
    if (problem) { setError(''); return; }
    load(periodParams(period)).then((r) => { if (!off) { setU(r); setError(''); } }).catch((e) => { if (!off) setError(messageOf(e)); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.mode, period.month, period.from, period.to]);

  const t = useMemo(() => (u ? totals(u) : null), [u]);
  const unit = (m: string, noun: string) => `${t?.[m].quantity ?? 0} ${noun}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:items-center md:justify-between">
        <PeriodPicker value={period} onChange={setPeriod} maxMonth={thisMonth()} />
        {u && <p className="text-xs text-fg-muted">{fmtDate(u.start)} – {fmtDate(u.end)}</p>}
      </div>
      <FormError message={problem || error} />
      {!u && !error && !problem && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Block key={i} className="h-[96px] rounded-xl" />)}</div>}
      {u && t && (
        <>
          {u.noPlan && <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-muted">No billing plan applies to this period, so nothing is charged.</p>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label={METER_LABEL.new_labour} value={money(t.new_labour.amount)} note={unit('new_labour', 'registered')} />
            <Stat label={METER_LABEL.labour_day} value={money(t.labour_day.amount)} note={unit('labour_day', 'labour-days')} />
            <Stat label={METER_LABEL.active_labour} value={money(t.active_labour.amount)} note={unit('active_labour', 'active')} />
            <Stat label={METER_LABEL.licence} value={money(t.licence.amount)} note={unit('licence', 'licences')} />
            <Stat label={METER_LABEL.device} value={money(t.device.amount)} note={unit('device', 'machines')} />
          </div>

          {u.windows.length > 1 && (
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <h2 className="border-b border-line px-4 py-3 text-sm font-bold text-fg">Charged in parts</h2>
              <p className="border-b border-line px-4 py-2 text-[11px] text-fg-muted">The period is priced month by month and at each rate change. Monthly charges are pro-rated for part of a month.</p>
              <ul className="divide-y divide-line/60">
                {u.windows.map((w, i) => <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span className="font-semibold text-fg">{fmtDate(w.from)} – {fmtDate(w.to)}</span><span className="text-xs text-fg-muted">Plan v{w.planVersion ?? '—'}</span><span className="tabular-nums">{money(w.subtotal)}</span></li>)}
              </ul>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-3 text-sm font-bold text-fg">Charges</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] border-separate border-spacing-0">
                <thead><tr><th className={th}>Item</th><th className={`${th} text-right`}>Quantity</th><th className={`${th} text-right`}>Rate</th><th className={`${th} text-right`}>Amount</th></tr></thead>
                <tbody>
                  {u.windows.flatMap((w, wi) => w.lines.filter(shown).map((l, li) => (
                    <tr key={`${wi}-${li}`} className={trCls}><td className={td}>{l.label || METER_LABEL[l.meter] || l.meter}{u.windows.length > 1 && <span className="text-[11px] text-fg-muted"> · {fmtDate(w.from)}–{fmtDate(w.to)}</span>}</td><td className={`${td} text-right tabular-nums`}>{l.quantity} <span className="text-fg-muted">{l.unit}</span></td><td className={`${td} text-right tabular-nums`}>{money(l.rate)}</td><td className={`${td} text-right tabular-nums`}>{money(l.amount)}</td></tr>
                  )))}
                  {u.windows.every((w) => !w.lines.some(shown)) && <tr><td colSpan={4} className={`${td} text-fg-muted`}>No charges in this period.</td></tr>}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto grid max-w-xs grid-cols-2 gap-y-1.5 border-t border-line px-4 py-3 text-sm">
              <dt className="text-fg-muted">Subtotal</dt><dd className="text-right tabular-nums">{money(u.subtotal)}</dd>
              <dt className="text-fg-muted">GST</dt><dd className="text-right tabular-nums">{money(u.gst)}</dd>
              <dt className="font-bold text-fg">Total</dt><dd className="text-right text-base font-extrabold tabular-nums">{money(u.total)}</dd>
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="text-sm font-bold text-fg">Outstanding</h2>
            <dl className="mt-2 grid grid-cols-3 gap-3">
              <div><dt className="text-[11px] text-fg-muted">Invoiced, unpaid</dt><dd className="text-base font-extrabold tabular-nums">{money(u.outstanding.invoiced)}</dd></div>
              <div><dt className="text-[11px] text-fg-muted">Adjustments</dt><dd className="text-base font-extrabold tabular-nums">{money(u.outstanding.adjustments)}</dd></div>
              <div><dt className="text-[11px] text-fg-muted">Total due</dt><dd className="text-base font-extrabold tabular-nums">{money(u.outstanding.total)}</dd></div>
            </dl>
            {outstandingNote && <p className="mt-2 text-[11px] text-fg-muted">Draft invoices are not included until issued.</p>}
          </section>
        </>
      )}
    </div>
  );
}
