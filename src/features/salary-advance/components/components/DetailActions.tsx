'use client';

import { Ban, Banknote, CalendarX2, HandCoins, PauseCircle, SlidersHorizontal, XCircle } from 'lucide-react';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import type { AdvanceAction } from '../../hooks/useAdvanceActions';
import type { AdvanceDetail } from '../../types/salaryAdvance.model';

export function DetailActions({ detail, onAction }: { detail: AdvanceDetail; onAction: (a: AdvanceAction) => void }) {
  const c = detail.can;
  const icon = 'h-3.5 w-3.5';
  const any = c.disburse || c.adjust || c.repay || c.waive || c.cancel;
  if (!any) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {c.disburse && (
        <Btn variant="primary" icon={<Banknote className={icon} />} onClick={() => onAction('disburse')}>
          Mark as paid out
        </Btn>
      )}
      {c.adjust && (
        <>
          <Btn icon={<CalendarX2 className={icon} />} onClick={() => onAction('skip')}>Skip month</Btn>
          <Btn icon={<PauseCircle className={icon} />} onClick={() => onAction('pause')}>Pause</Btn>
          <Btn icon={<SlidersHorizontal className={icon} />} onClick={() => onAction('reshape')}>Redesign instalments</Btn>
        </>
      )}
      {c.repay && (
        <Btn icon={<HandCoins className={icon} />} onClick={() => onAction('repay')}>Record repayment</Btn>
      )}
      {c.waive && (
        <Btn icon={<Ban className={icon} />} onClick={() => onAction('waive')} className="hover:text-[var(--tt-danger)]">Waive / write off</Btn>
      )}
      {c.cancel && (
        <Btn icon={<XCircle className={icon} />} onClick={() => onAction('cancel')} className="hover:text-[var(--tt-danger)]">Cancel</Btn>
      )}
    </div>
  );
}
