'use client';

import React from 'react';
import { Check, FileCheck2, FileClock, Undo2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/reimbursement.api';
import { MY_PHYSICAL_COPY_LABEL, PHYSICAL_COPY_LABEL } from '../../constants/reimbursement.constants';
import { useMutation } from '../../hooks/useClaimActions';
import type { PhysicalCopyBulkResultDto } from '../../types/reimbursement.dto';
import type { ClaimDetail, PhysicalCopy } from '../../types/reimbursement.model';
import { splitError } from '../../utils/errors';
import { dateTimeText } from '../../utils/format';
import { FormError } from './Primitives';

const PILL = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs';

const TONE: Record<PhysicalCopy['status'], string> = {
  not_required: 'border-line bg-surface text-fg-subtle',
  optional: 'border-line bg-surface text-fg-muted',
  pending: 'border-dashed border-fg/60 bg-surface text-fg',
  collected: 'border-line-strong bg-bg-subtle text-fg',
};

/** Paper-bill status. `me` uses the employee's wording ("Hand in the paper bill"). */
export function PhysicalCopyPill({ copy, audience = 'hr', className }: { copy: PhysicalCopy; audience?: 'hr' | 'me'; className?: string }) {
  const label = (audience === 'me' ? MY_PHYSICAL_COPY_LABEL : PHYSICAL_COPY_LABEL)[copy.status];
  return (
    <span className={cx(PILL, TONE[copy.status], className)} title={copy.status === 'pending' && copy.holdsPayment ? 'Payment waits for the paper bill' : undefined}>
      {copy.status === 'collected' && <Check className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}

/** Whether payment is held until the paper bill is collected. */
export const waitsForPaperBill = (copy: PhysicalCopy) => copy.holdsPayment && copy.status === 'pending';

// ── Claim detail card ───────────────────────────────────────────────────────

interface PaperBillPanelProps {
  detail: ClaimDetail;
  scope: 'me' | 'hr';
  /** HR: may set the paper bill back to "to collect". */
  canUndo?: boolean;
  onChanged?: () => void;
}

export function PaperBillPanel({ detail, scope, canUndo, onChanged }: PaperBillPanelProps) {
  const copy = detail.physicalCopy;
  const [dialog, setDialog] = React.useState<'collected' | 'pending' | null>(null);
  const Icon = copy.status === 'collected' ? FileCheck2 : FileClock;
  const hr = scope === 'hr';
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-fg">Paper bill</h2>
        <PhysicalCopyPill copy={copy} audience={scope} />
      </header>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 text-xs sm:text-sm">
            {copy.status === 'collected' ? (
              <>
                <p className="font-semibold text-fg">{hr ? 'Collected' : 'Handed in'}</p>
                <p className="mt-0.5 text-fg-muted">{[copy.collectedBy ? `by ${copy.collectedBy}` : null, copy.collectedAt ? dateTimeText(copy.collectedAt) : null].filter(Boolean).join(' · ') || '—'}</p>
              </>
            ) : copy.status === 'pending' ? (
              <>
                <p className="font-semibold text-fg">{hr ? 'Not collected yet' : 'Hand in the paper bill'}</p>
                <p className="mt-0.5 text-fg-muted">
                  {hr ? 'The policy asks for the original bill for this report.' : 'Give the original bills for this report to HR or Accounts.'}
                  {copy.holdsPayment ? (hr ? ' It cannot be paid until the bill is collected.' : ' You are paid back once they have it.') : ''}
                </p>
              </>
            ) : (
              <p className="text-fg-muted">The policy does not ask for the original bill for this report.</p>
            )}
          </div>
        </div>
        {copy.note && <p className="rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{copy.note}</p>}
        {hr && (detail.can.collect && copy.status !== 'collected' ? (
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setDialog('collected')} className="w-full">
            Mark collected
          </Btn>
        ) : canUndo && copy.status === 'collected' ? (
          <Btn icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setDialog('pending')} className="w-full">
            Undo
          </Btn>
        ) : null)}
      </div>
      {hr && <PaperBillDialog open={dialog !== null} status={dialog ?? 'collected'} claimId={detail.id} holdsPayment={copy.holdsPayment} onClose={() => setDialog(null)} onDone={() => { setDialog(null); onChanged?.(); }} />}
    </section>
  );
}

function PaperBillDialog({ open, status, claimId, holdsPayment, onClose, onDone }: { open: boolean; status: 'collected' | 'pending'; claimId: number; holdsPayment: boolean; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = React.useState('');
  const m = useMutation(onDone);
  const { clearError } = m;
  React.useEffect(() => {
    if (!open) return;
    setNote('');
    clearError();
  }, [open, clearError]);
  const collect = status === 'collected';
  const submit = () => m.run(() => api.setPhysicalCopy(claimId, { status, note: note.trim() || undefined }), collect ? 'Paper bill marked collected' : 'Paper bill set back to collect');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={collect ? 'Mark the paper bill collected' : 'Undo collection'}
      footer={
        <>
          <Btn onClick={onClose}>Back</Btn>
          <Btn variant="primary" busy={m.busy} onClick={submit}>
            {collect ? 'Mark collected' : 'Set back to collect'}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {collect
            ? `Records that you have the original bill for this report, with your name and the time.${holdsPayment ? ' It can then be paid.' : ''}`
            : `The paper bill shows as not collected again.${holdsPayment ? ' Payment waits until it is collected.' : ''}`}
        </p>
        <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={collect ? 'e.g. Original bills in file 12' : 'Why it is set back'} error={m.error?.fields.note} />
        <FormError message={m.error ? m.error.form || Object.entries(m.error.fields).filter(([k]) => k !== 'note').map(([, v]) => v).join(' ') : ''} />
      </div>
    </Dialog>
  );
}

// ── Bulk collect (claims list) ──────────────────────────────────────────────

interface BulkCollectDialogProps {
  open: boolean;
  ids: number[];
  /** Claim number by id, for the skipped list. */
  label: (id: number) => string;
  onClose: () => void;
  onDone: () => void;
}

export function BulkCollectDialog({ open, ids, label, onClose, onDone }: BulkCollectDialogProps) {
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<{ fields: Record<string, string>; form: string } | null>(null);
  const [result, setResult] = React.useState<PhysicalCopyBulkResultDto | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setNote('');
    setError(null);
    setResult(null);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.setPhysicalCopies({ ids, status: 'collected', note: note.trim() || undefined });
      const updated = Number(r.updated) || 0;
      const skipped = Array.isArray(r.skipped) ? r.skipped : [];
      onDone();
      if (!skipped.length) {
        showSuccess(`${updated} paper ${updated === 1 ? 'bill' : 'bills'} marked collected`);
        onClose();
      } else setResult({ updated, skipped });
    } catch (err) {
      setError(splitError(err));
    } finally {
      setBusy(false);
    }
  };

  const n = ids.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={result ? 'Paper bills updated' : 'Mark paper bills collected'}
      footer={
        result ? (
          <Btn variant="primary" onClick={onClose}>
            Done
          </Btn>
        ) : (
          <>
            <Btn onClick={onClose}>Back</Btn>
            <Btn variant="primary" busy={busy} disabled={!n} onClick={submit}>
              Mark {n} collected
            </Btn>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="text-fg">
            <span className="font-semibold">{result.updated}</span> marked collected · <span className="font-semibold">{result.skipped.length}</span> skipped
          </p>
          <ul className="max-h-60 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {result.skipped.map((s) => (
              <li key={s.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="shrink-0 text-xs font-semibold text-fg">{label(s.id)}</span>
                <span className="text-xs text-fg-muted sm:text-right">{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Records that you have the original bills for {n} selected {n === 1 ? 'report' : 'reports'}. Reports that do not need a paper bill, or already have it, are skipped.
          </p>
          <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Received at the front desk" error={error?.fields.note} />
          <FormError message={error ? error.form || Object.entries(error.fields).filter(([k]) => k !== 'note').map(([, v]) => v).join(' ') : ''} />
        </div>
      )}
    </Dialog>
  );
}
