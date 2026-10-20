'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Section } from '@/components/ui/FormControls';
import { formatDate, formatDateTime, orgToday } from '@/lib/datetime';
import { contractCountdown } from '../../utils/contract';
import { useEmployeeContract } from '../../hooks/useEmployeeContract';
import type { ContractTermKind } from '../../types/employees.dto';
import { RenewContractDialog } from './RenewContractDialog';

const KIND_LABEL: Record<ContractTermKind, string> = { initial: 'First term', renewal: 'Renewal', change: 'Dates changed' };

interface ContractCardProps {
  employeeId: number;
  start: string | null;
  end: string;
  canRenew: boolean;
  onRenewed: (start: string, end: string) => void;
}

/** Current contract term of a fixed-term employee, its renewal, and the term history. */
export function ContractCard({ employeeId, start, end, canRenew, onRenewed }: ContractCardProps) {
  const contract = useEmployeeContract(employeeId, true);
  const [open, setOpen] = React.useState(false);

  const openRenew = () => {
    contract.clearRenewErrors();
    setOpen(true);
  };

  const renew = async (body: { end_date?: string; months?: number; reason?: string }) => {
    const result = await contract.renew(body);
    if (!result) return;
    onRenewed(result.contract_start, result.contract_end);
    setOpen(false);
  };

  return (
    <Section
      title="Contract"
      description={`${start ? `${formatDate(start)} – ` : 'Until '}${formatDate(end)}`}
      aside={canRenew ? (
        <button type="button" onClick={openRenew} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle">
          <RefreshCw className="h-3.5 w-3.5" />
          Renew
        </button>
      ) : undefined}
    >
      <p className="text-sm font-semibold text-fg">{contractCountdown(end, orgToday())}</p>

      <h4 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Term history</h4>
      {contract.error ? (
        <p className="mt-2 text-sm text-[var(--tt-danger)]">{contract.error}</p>
      ) : contract.terms === null ? (
        <div className="mt-2 h-12 animate-pulse rounded-lg bg-bg-subtle" />
      ) : contract.terms.length === 0 ? (
        <p className="mt-2 text-xs text-fg-muted">No terms recorded yet.</p>
      ) : (
        <ol className="ml-1 mt-3 space-y-4 border-l border-line pl-3">
          {contract.terms.map((t) => (
            <li key={t.id} className="relative">
              <span className="absolute -left-[16.5px] top-1.5 h-2 w-2 rounded-full bg-fg ring-4 ring-surface" />
              <p className="text-sm font-semibold text-fg">{KIND_LABEL[t.kind] || t.kind} · {formatDate(t.start_date)} – {formatDate(t.end_date)}</p>
              <p className="text-xs text-fg-muted">{formatDateTime(t.created_at)}{t.created_by_name ? ` · by ${t.created_by_name}` : ''}</p>
              {t.reason && <p className="mt-0.5 text-xs text-fg">{t.reason}</p>}
            </li>
          ))}
        </ol>
      )}

      <RenewContractDialog
        open={open}
        currentEnd={end}
        busy={contract.renewing}
        errors={contract.renewErrors}
        onClose={() => setOpen(false)}
        onRenew={renew}
      />
    </Section>
  );
}
