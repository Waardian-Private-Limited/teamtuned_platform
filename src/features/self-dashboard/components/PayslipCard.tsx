'use client';

import { useState } from 'react';
import { Download, Receipt } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn } from '@/features/data-collection/components/shared/Ui';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as payslips from '@/features/my-payslips/api/myPayslips.api';
import { toMyPayslips } from '@/features/my-payslips/types/myPayslips.mapper';
import type { MyPayslip } from '@/features/my-payslips/types/myPayslips.model';
import { money, monthLabel, shortDate } from '@/features/salary-slips/utils/format';
import { DashCard, EmptyLine } from './DashCard';

/** The newest released month (this year, else last year). Paid by more than one company = one slip each. */
async function latest(year: number): Promise<MyPayslip[]> {
  let list = toMyPayslips((await payslips.listMyPayslips(year)).payslips || []);
  if (!list.length) list = toMyPayslips((await payslips.listMyPayslips(year - 1)).payslips || []);
  return list.filter((p) => p.month === list[0]?.month);
}

export function PayslipCard({ year }: { year: number }) {
  const q = useAsync(() => latest(year), [year]);
  const { track } = useDownloadCenter();
  const [busy, setBusy] = useState<number | null>(null);
  const slips = q.data;
  const total = (slips || []).reduce((n, p) => n + p.netPay, 0);

  const download = async (slip: MyPayslip) => {
    setBusy(slip.id);
    try {
      track(await payslips.exportMyPayslips({ itemIds: [slip.id] }));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashCard
      title="Latest payslip"
      subtitle={slips ? (slips.length ? monthLabel(slips[0].month) : 'None released yet') : null}
      icon={Receipt}
      href="/employee/my-payslips"
      loading={q.loading && !slips}
      error={!slips ? q.error : ''}
      onRetry={() => void q.refetch()}
    >
      {slips && (slips.length === 0 ? (
        <EmptyLine icon={Receipt} title="No payslips yet" hint="Released payslips show here" />
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Net pay{slips.length > 1 ? ' (all companies)' : ''}</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-fg">{money(total)}</p>
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {slips.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {slips.length > 1 && <p className="truncate text-sm font-bold text-fg">{p.companyName || 'Company'} · {money(p.netPay)}</p>}
                  <p className="truncate text-xs text-fg-muted">
                    {[p.periodLabel, p.payDate ? `Paid ${shortDate(p.payDate)}` : null, `${p.payableDays}/${p.cycleDays} days`, p.lopDays ? `${p.lopDays} LOP` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Btn busy={busy === p.id} icon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={() => void download(p)} aria-label={`Download payslip ${p.periodLabel}`}>
                  <span className="hidden sm:inline">PDF</span>
                </Btn>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </DashCard>
  );
}
