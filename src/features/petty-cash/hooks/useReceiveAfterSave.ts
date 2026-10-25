'use client';

import { useCallback, useState } from 'react';
import type { ExpenseDetail } from '../types/petty-cash.model';
import { needsGoodsReceipt } from '../components/components/ReceiveGoodsDialog';

/**
 * After an expense is saved: runs `after` right away, or, when the goods still need receiving and the caller may
 * receive them, opens the receive popup first and runs `after` once it closes. Spread `dialogProps` on <ReceiveGoodsDialog />.
 */
export function useReceiveAfterSave(after: (d: ExpenseDetail) => void) {
  const [pending, setPending] = useState<ExpenseDetail | null>(null);
  const handle = useCallback(
    (d: ExpenseDetail) => {
      if (needsGoodsReceipt(d)) setPending(d);
      else after(d);
    },
    [after]
  );
  const onClose = useCallback(() => {
    setPending((p) => {
      if (p) setTimeout(() => after(p), 0);
      return null;
    });
  }, [after]);
  return { handle, dialogProps: { open: pending !== null, detail: pending, onClose } };
}
