'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ReceiptPicker } from '@/features/expense-bills/components/ReceiptPicker';
import { PAYMENT_MODES } from '@/features/expense-bills/constants/bill.constants';
import type { LineAttachment, PaymentMode } from '@/features/expense-bills/types/bill.model';
import { sentFiles } from '@/features/expense-bills/types/bill.mapper';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import { orgToday } from '@/lib/datetime';
import * as api from '../../api/petty-cash.api';
import { useAttachmentStore } from '../../hooks/useAttachmentStore';
import type { FundMode, FundRequest, Wallet } from '../../types/petty-cash.model';
import { leftoverError } from '../../utils/formError';
import { money, parseDecimal } from '../../utils/format';
import { FormError } from './Primitives';

const PAY_FIELDS = ['payment_mode', 'reference', 'paid_on', 'files'];

/** Records that Accounts paid a fund request: the cash is added to the wallet. */
export function FundPayDialog({ request, onClose, onDone }: { request: FundRequest | null; onClose: () => void; onDone: () => void }) {
  const open = request !== null;
  const store = useAttachmentStore('hr');
  const [mode, setMode] = React.useState<PaymentMode | null>(null);
  const [reference, setReference] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(orgToday());
  const [files, setFiles] = React.useState<LineAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const done = React.useCallback(() => {
    onDone();
    onClose();
  }, [onDone, onClose]);
  const m = useMutation(done);
  const { clearError } = m;

  React.useEffect(() => {
    if (!open) return;
    setMode(null);
    setReference('');
    setPaidOn(orgToday());
    setFiles([]);
    setErrors({});
    clearError();
  }, [open, clearError]);

  const err = (f: string) => errors[f] || m.error?.fields[f];
  const clear = (f: string) => setErrors((e) => (e[f] ? { ...e, [f]: '' } : e));
  const amount = request ? request.approvedAmount ?? request.amount : 0;

  const submit = () => {
    if (!request) return;
    const next: Record<string, string> = {};
    if (!mode) next.payment_mode = 'Choose how it was paid';
    if (!paidOn) next.paid_on = 'Pick the date it was paid';
    else if (paidOn > orgToday()) next.paid_on = 'The date cannot be in the future';
    setErrors(next);
    if (Object.keys(next).length || !mode) return;
    m.run(
      () => api.payFundRequest(request.id, { payment_mode: mode, reference: reference.trim() || undefined, paid_on: paidOn, files: sentFiles(files) }),
      'Fund request paid'
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      title="Pay fund request"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={m.busy} disabled={uploading} onClick={submit}>
            Mark as paid
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {request && (
          <p className="text-sm text-fg-muted">
            Record that <span className="font-semibold text-fg">{money(amount)}</span> was given for <span className="font-semibold text-fg">{request.wallet.name}</span>. It is added to the wallet.
          </p>
        )}
        <SelectField<PaymentMode>
          label="Paid by"
          required
          value={mode}
          onChange={(v) => { setMode(v); clear('payment_mode'); }}
          options={PAYMENT_MODES.map((p) => ({ value: p.value, label: p.label }))}
          placeholder="Choose how it was paid"
          error={err('payment_mode')}
        />
        {mode !== 'cash' && (
          <TextField label="Reference" value={reference} onChange={(v) => { setReference(v); clear('reference'); }} placeholder="UTR, cheque or transfer number" maxLength={120} error={err('reference')} />
        )}
        <TextField label="Paid on" required type="date" value={paidOn} max={orgToday()} onChange={(v) => { setPaidOn(v); clear('paid_on'); }} error={err('paid_on')} />
        <ReceiptPicker label="Proof of payment" value={files} onChange={setFiles} max={3} store={store} onBusyChange={setUploading} error={err('files')} addLabel="Attach proof" />
        <FormError message={leftoverError(m.error, PAY_FIELDS) || ''} />
      </div>
    </Dialog>
  );
}

interface AskFundsDialogProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  wallet: Wallet;
}

/** A custodian asks for money: a set amount, or "back up to float" where the server works out the amount. */
export function AskFundsDialog({ open, onClose, onDone, wallet }: AskFundsDialogProps) {
  const [mode, setMode] = React.useState<FundMode>('amount');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const done = React.useCallback(() => {
    onDone();
    onClose();
  }, [onDone, onClose]);
  const m = useMutation(done);
  const { clearError } = m;
  const canReplenish = wallet.hasFloat && wallet.toReplenish > 0;

  React.useEffect(() => {
    if (!open) return;
    setMode(canReplenish ? 'replenish' : 'amount');
    setAmount('');
    setReason('');
    setErrors({});
    clearError();
  }, [open, canReplenish, clearError]);

  const err = (f: string) => errors[f] || m.error?.fields[f];
  const clear = (f: string) => setErrors((e) => (e[f] ? { ...e, [f]: '' } : e));

  const submit = () => {
    const next: Record<string, string> = {};
    if (mode === 'amount') {
      if (!(Number(amount) > 0)) next.amount = 'Enter the amount you need';
      if (!reason.trim()) next.reason = 'Say what the money is for';
    }
    setErrors(next);
    if (Object.keys(next).length || (mode === 'replenish' && !canReplenish)) return;
    m.run(
      () => api.askForFunds({ wallet_id: wallet.id, mode, ...(mode === 'amount' ? { amount: Number(amount) } : {}), reason: reason.trim() || undefined }),
      'Request sent for approval'
    );
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
          <Btn variant="primary" busy={m.busy} disabled={mode === 'replenish' && !canReplenish} onClick={submit}>
            Send request
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          For <span className="font-semibold text-fg">{wallet.name}</span>, which has {money(wallet.balance)}
          {wallet.hasFloat ? ` of its ${money(wallet.floatAmount)} float` : ''}. It goes for approval, then Accounts pays it.
        </p>
        {wallet.hasFloat && (
        <div>
          <FieldLabel label="How much" />
          <SegmentedControl<FundMode>
            options={[
              { value: 'replenish', label: 'Back up to float' },
              { value: 'amount', label: 'An amount' },
            ]}
            value={mode}
            onChange={(v) => { setMode(v); clearError(); }}
          />
          {mode === 'replenish' && (
            <FieldMessage
              error={!canReplenish ? 'The wallet is already at its float, or has no float set.' : undefined}
              hint={canReplenish ? `Asks for ${money(wallet.toReplenish)}, the amount needed to get back to ${money(wallet.floatAmount)}.` : undefined}
            />
          )}
        </div>
        )}
        {mode === 'amount' && <TextField label="Amount" required inputMode="decimal" prefix="₹" value={amount} onChange={(v) => { setAmount(parseDecimal(v)); clear('amount'); }} placeholder="0" error={err('amount')} />}
        <Textarea label="Reason" required={mode === 'amount'} value={reason} onChange={(e) => { setReason(e.target.value); clear('reason'); }} rows={2} maxLength={500} placeholder="What the money is needed for" error={err('reason')} />
        {/* Back up to float has no amount box: the server's answer about the amount shows here. */}
        <FormError message={leftoverError(m.error, mode === 'amount' ? ['amount', 'reason'] : ['reason'])} />
      </div>
    </Dialog>
  );
}
