'use client';

import { cx } from '@/theme/tokens';
import { LABOUR_ILLUSTRATIONS as ILL } from '../../constants/labour.constants';
import React, { useCallback, useEffect, useState } from 'react';
import { History, SlidersHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import { useCatalog, useLabourSites } from '../../hooks/useLabourLists';
import type { ContractorRate } from '../../types/labour.types';
import { fmtDate, money } from '../../utils/format';
import { basisLabel } from '../../utils/pay';
import { EmptyPanel, FormError, Pill, primaryBtn, td, th, trCls } from '../shared/Primitives';
import { SetRatesDialog } from './SetRatesDialog';

export function ContractorRates({ contractorId, canManage }: { contractorId: number; canManage: boolean }) {
  const [history, setHistory] = useState(false);
  const [rates, setRates] = useState<ContractorRate[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const { sites } = useLabourSites();
  const { categories } = useCatalog(true);

  const load = useCallback(() => {
    setError('');
    api.listRates(contractorId, history).then((r) => setRates(r.rates || [])).catch((e) => setError(messageOf(e)));
  }, [contractorId, history]);
  useEffect(() => { load(); }, [load]);

  const siteName = (id: number | null) => (id === null ? 'All sites' : sites.find((s) => s.value === id)?.label || `Site ${id}`);
  const catName = (c: number | null, s: number | null) => {
    if (c === null && s === null) return 'All categories';
    const cat = categories.find((x) => x.id === c);
    const sub = cat?.subcategories.find((x) => x.id === s);
    return [cat?.name, sub?.name].filter(Boolean).join(' / ') || 'Category';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted"><History className="h-3.5 w-3.5" aria-hidden />Show history<Switch label="Show rate history" checked={history} onChange={setHistory} /></label>
        {canManage && <button type="button" className={primaryBtn} onClick={() => setEditing(true)}><SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />Set rates</button>}
      </div>
      <FormError message={error} />
      {!rates ? <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" /> : rates.length === 0 ? (
        <EmptyPanel illustration={ILL.rates} title="No rates set" text="Labour for this contractor earns nothing until rates are added. Pay hourly, by hajri or by measurement." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0">
            <thead><tr><th className={th}>Applies to</th><th className={th}>Pay basis</th><th className={th}>Rates</th><th className={th}>From</th>{history && <th className={th}>To</th>}</tr></thead>
            <tbody>
              {rates.map((r, i) => (
                <tr key={r.id ?? i} className={cx(trCls, r.effectiveTo ? 'text-fg-muted' : '')}>
                  <td className={td}><div className="font-semibold">{siteName(r.siteId)}</div><div className="text-[11px] text-fg-muted">{catName(r.categoryId, r.subcategoryId)}</div>{r.note && <div className="text-[11px] text-fg-muted">{r.note}</div>}</td>
                  <td className={td}><Pill tone={(r.payBasis || 'hourly') === 'hourly' ? 'neutral' : 'dark'}>{basisLabel(r.payBasis || 'hourly')}</Pill></td>
                  <td className={`${td} tabular-nums`}><RateCell r={r} /></td>
                  <td className={td}>{fmtDate(r.effectiveFrom)}</td>
                  {history && <td className={td}>{r.effectiveTo ? fmtDate(r.effectiveTo) : <Pill tone="good">Open</Pill>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <SetRatesDialog contractorId={contractorId} current={rates?.filter((r) => !r.effectiveTo) || []} sites={sites} categories={categories} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </div>
  );
}

/** The money a rate row carries for its basis. */
export function RateCell({ r }: { r: { payBasis?: string | null; dayRate?: number; nightRate?: number; overtimeRate?: number; hajriRate?: number } }) {
  const basis = r.payBasis || 'hourly';
  if (basis === 'hajri') return <span><span className="font-semibold text-fg">{money(r.hajriRate)}</span> <span className="text-[11px] text-fg-muted">per hajri</span></span>;
  if (basis === 'measurement') return <span className="text-xs text-fg-muted">Paid from the measurement book</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      <span><span className="text-fg-muted">Day</span> <span className="font-semibold text-fg">{money(r.dayRate)}</span></span>
      <span><span className="text-fg-muted">Night</span> {money(r.nightRate)}</span>
      <span><span className="text-fg-muted">OT</span> {money(r.overtimeRate)}</span>
      <span className="text-[11px] text-fg-muted">per hour</span>
    </span>
  );
}
