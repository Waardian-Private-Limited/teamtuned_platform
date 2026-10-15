'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/reimbursement.api';
import { MAX_LINE_FILES } from '../../constants/reimbursement.constants';
import type { LineAttachment } from '../../types/reimbursement.model';
import { placeErrors } from '../../utils/errors';
import { money, parseDecimal } from '../../utils/format';
import { FormError } from './Primitives';
import { ReceiptPicker } from './ReceiptPicker';

const FIELDS = ['amount', 'reason', 'attachments'];
/** `attachments[2]` and the like are shown under the file picker. */
const fieldOf = (key: string) => (key.startsWith('attachments') ? 'attachments' : key);

/**
 * The dialog opens on its intro sentence rather than the first field, so nothing looks selected or
 * flagged before the employee starts. Runs before the dialog's own focus step (layout effect).
 */
function Intro({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  React.useLayoutEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <p ref={ref} tabIndex={-1} className="text-sm text-fg-muted outline-none">
      {children}
    </p>
  );
}

export function AskFundsDialog({ open, balance, onClose, onDone }: { open: boolean; balance: number; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [files, setFiles] = React.useState<LineAttachment[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setAmount('');
    setReason('');
    setFiles([]);
    setErrors({});
    setFormError('');
  }, [open]);

  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!(Number(amount) > 0)) next.amount = 'Enter how much you need';
    if (!reason.trim()) next.reason = 'Say what the money is for';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const attachments = files.filter((f) => f.key).map((f) => ({ key: f.key as string, name: f.name, size: f.size, type: f.type }));
      await api.askForFunds({ amount: Number(amount), reason: reason.trim(), ...(attachments.length ? { attachments } : {}) });
      showSuccess('Request sent for approval');
      onDone();
      onClose();
    } catch (err) {
      const placed = placeErrors(err, (k) => FIELDS.includes(fieldOf(k)));
      setErrors(Object.fromEntries(Object.entries(placed.fields).map(([k, v]) => [fieldOf(k), v])));
      setFormError(placed.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title="Ask for funds"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} disabled={uploading} onClick={submit}>
            Send request
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Intro>
            {balance < 0 ? 'Once approved and paid, the amount is added to your wallet.' : <>Your wallet holds <span className="font-semibold text-fg">{money(balance)}</span>. Once approved and paid, the amount is added to it.</>}
          </Intro>
          {balance < 0 && <p className="text-xs text-fg-muted">Your wallet is {money(Math.abs(balance))} below zero.</p>}
        </div>
        <TextField label="Amount" required inputMode="decimal" prefix="₹" placeholder="0" value={amount} onChange={(v) => { setAmount(parseDecimal(v)); clear('amount'); }} error={errors.amount || undefined} />
        <Textarea label="What is it for" required rows={3} value={reason} onChange={(e) => { setReason(e.target.value); clear('reason'); }} error={errors.reason || undefined} />
        <ReceiptPicker
          label="Attach quotation or supporting files"
          addLabel="Attach a file"
          value={files}
          onChange={(v) => { setFiles(v); clear('attachments'); }}
          max={MAX_LINE_FILES}
          error={errors.attachments || undefined}
          hint="PDF, JPG or PNG, up to 5 MB each, up to 5 files"
          scope="me"
          onBusyChange={setUploading}
        />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
