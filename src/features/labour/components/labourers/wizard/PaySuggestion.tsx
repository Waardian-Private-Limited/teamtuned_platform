'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IndianRupee } from 'lucide-react';
import * as api from '../../../api/labour.api';
import { LP } from '../../../constants/labour.constants';
import { useLabourAccess, useLabourBasePath } from '../../../hooks/useLabourAccess';
import type { PaySuggestion as Suggestion } from '../../../types/labour.types';
import { parseLabourError } from '../../../utils/errors';
import { fmtDate } from '../../../utils/format';
import { rateLine, slabSummary } from '../../../utils/pay';

interface Props {
  contractorId: number | null;
  siteId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  /** Editing: the labourer's personal rate is taken into account. */
  labourerId?: number | null;
  contractorName?: string;
  tradeName?: string;
}

/**
 * The rate this labourer will be paid, looked up (GET /pay/suggest) once the contractor and site are chosen:
 * "Mason at Sai Infra: Hajri ₹900 per hajri · ½ from 4 h · 1 from 8 h", or a nudge to set the contractor's rates.
 */
export function PaySuggestion({ contractorId, siteId, categoryId, subcategoryId, labourerId, contractorName, tradeName }: Props) {
  const { can } = useLabourAccess();
  const base = useLabourBasePath();
  const [data, setData] = useState<Suggestion | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contractorId) { setData(null); return; }
    let off = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.paySuggest({ contractorId, siteId, categoryId, subcategoryId, labourerId: labourerId || null })
        .then((r) => { if (!off) { setData(r); setError(''); } })
        .catch((e) => { if (!off) { setData(null); setError(parseLabourError(e).status === 403 ? '' : parseLabourError(e).message); } })
        .finally(() => { if (!off) setLoading(false); });
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [contractorId, siteId, categoryId, subcategoryId, labourerId]);

  if (!contractorId) return null;
  if (loading && !data) return <div className="h-16 animate-pulse rounded-xl bg-bg-subtle" aria-hidden />;
  if (error) return <p className="rounded-xl border border-line px-3 py-2 text-xs text-fg-muted">Could not look up the pay rate: {error}</p>;
  if (!data) return null;

  const who = [tradeName || 'This labourer', contractorName ? `at ${contractorName}` : ''].filter(Boolean).join(' ');
  const eff = data.effective;
  return (
    <section aria-label="Pay rate" className="flex items-start gap-3 rounded-xl border border-line bg-bg-subtle/60 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-fg"><IndianRupee className="h-4 w-4" aria-hidden /></span>
      <div className="min-w-0 text-xs sm:text-sm">
        {eff ? (
          <>
            <p className="font-semibold text-fg">
              {who}: {eff.payBasis === 'measurement' ? 'Paid by measurement' : rateLine(eff)}
              {eff.payBasis === 'hajri' && data.hajriSlabs?.length ? <span className="font-normal text-fg-muted"> · {slabSummary(data.hajriSlabs, ', ')}</span> : null}
            </p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {eff.source === 'personal'
                ? `Personal rate from ${fmtDate(eff.effectiveFrom)}${data.contractorRate ? ` (contractor rate: ${rateLine(data.contractorRate)})` : ''}.`
                : `Contractor rate${eff.scope && (eff.scope.siteId || eff.scope.categoryId) ? ' for this site / category' : ' for all sites and categories'}, from ${fmtDate(eff.effectiveFrom)}.`}
              {eff.payBasis === 'measurement' && ' Attendance earns nothing by itself; approved measurement entries are paid.'}
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-fg">No rate set for this contractor{categoryId ? ' and trade' : ''}.</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              Attendance earns nothing until a rate is set.{' '}
              {can(LP.CONTRACTORS) ? <Link href={`${base}/contractors`} className="font-semibold text-fg underline underline-offset-2">Set rates</Link> : 'Ask someone who manages contractors to set rates.'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
