'use client';

import React from 'react';
import { usePlanPreview } from '../hooks/usePlanPreview';
import { toPlanBody } from '../types/salaryAdvance.mapper';
import type { PlanRequestDto } from '../types/salaryAdvance.dto';
import { Block } from './components/StatusBadges';
import { RepaymentPlanFields } from './components/RepaymentPlanFields';

/**
 * Shown when approving a salary advance: the approver decides the repayment plan, which is sent
 * with the approval. Approvers without salary-advance access approve the plan as it stands.
 */
export function ApprovalPlanSection({ advanceId, onChange }: { advanceId: number; onChange: (plan: PlanRequestDto | null, valid: boolean) => void }) {
  const plan = usePlanPreview(advanceId);
  const { context, input } = plan;

  React.useEffect(() => {
    if (!context || !input) {
      onChange(null, true);
      return;
    }
    onChange(toPlanBody(input), !plan.isLoading && Object.keys(context.errors).length === 0);
  }, [context, input, plan.isLoading, onChange]);

  if (plan.forbidden) return <p className="text-xs text-fg-muted sm:text-sm">The repayment plan is set by HR; approving keeps it as it is.</p>;
  if (!context || !input) {
    return plan.error ? <p className="text-xs text-[var(--tt-danger)]">{plan.error}</p> : <Block className="h-40 w-full" />;
  }
  return <RepaymentPlanFields context={context} value={input} onChange={plan.setInput} loading={plan.isLoading} />;
}
