'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { money, monthLabel } from '@/features/salary-slips/utils/format';
import type { OtherDeduction } from '../../types/otherDeductions.model';

interface CancelDeductionDialogProps {
  deduction: OtherDeduction | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelDeductionDialog({ deduction, busy, error, onClose, onConfirm }: CancelDeductionDialogProps) {
  return (
    <Dialog
      open={Boolean(deduction)}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Cancel deduction"
      footer={
        <>
          <Btn onClick={onClose}>Keep</Btn>
          <Btn variant="danger" busy={busy} onClick={onConfirm}>
            Cancel deduction
          </Btn>
        </>
      }
    >
      {deduction && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-fg-muted">
            <span className="font-semibold text-fg">{money(-deduction.amount)}</span> for{' '}
            <span className="font-semibold text-fg">{deduction.employeeName}</span> in {monthLabel(deduction.month)} will not be deducted.
            {deduction.instalmentCount > 1 && ' Other instalments of this deduction stay as they are.'}
          </p>
          {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}
