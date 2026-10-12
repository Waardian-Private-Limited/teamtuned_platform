'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/salaryAdvance.api';
import { usePlanPreview } from '../../hooks/usePlanPreview';
import { toPlanBody } from '../../types/salaryAdvance.mapper';
import type { AdvanceDetail, PlanContext } from '../../types/salaryAdvance.model';
import { RepaymentPlanFields } from './RepaymentPlanFields';

export function PlanDialog({ advance, open, onClose, onSaved }: { advance: AdvanceDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-xl" title="Repayment plan">
      {open && advance.planContext && <PlanEditor advance={advance} initial={advance.planContext} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function PlanEditor({ advance, initial, onClose, onSaved }: { advance: AdvanceDetail; initial: PlanContext; onClose: () => void; onSaved: () => void }) {
  const plan = usePlanPreview(advance.id, initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  if (!plan.context || !plan.input) return null;
  const input = plan.input;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.savePlan(advance.id, toPlanBody(input));
      showSuccess('Repayment plan saved');
      onSaved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <RepaymentPlanFields context={plan.context} value={input} onChange={plan.setInput} loading={plan.isLoading} />
      {(error || plan.error) && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{error || plan.error}</p>}
      <div className="flex justify-end gap-2.5 border-t border-line pt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" busy={busy} disabled={plan.isLoading || Object.keys(plan.context.errors).length > 0} onClick={save}>
          Save plan
        </Btn>
      </div>
    </div>
  );
}
