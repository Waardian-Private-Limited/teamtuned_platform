'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { ReceiptPicker } from '@/features/expense-bills/components/ReceiptPicker';
import { PAYMENT_MODES } from '@/features/expense-bills/constants/bill.constants';
import { sentFiles } from '@/features/expense-bills/types/bill.mapper';
import type { LineAttachment, PaymentMode } from '@/features/expense-bills/types/bill.model';
import { useMutation } from '@/features/reimbursement/hooks/useClaimActions';
import { orgToday } from '@/lib/datetime';
import * as api from '../../api/petty-cash.api';
import { useAttachmentStore } from '../../hooks/useAttachmentStore';
import type { Wallet } from '../../types/petty-cash.model';
import { leftoverError } from '../../utils/formError';
import { money, parseDecimal } from '../../utils/format';
import { FormError } from './Primitives';

export type WalletAction = 'top_up' | 'return' | 'adjust' | 'freeze' | 'unfreeze' | 'close' | 'reopen';

interface ActionProps {
  wallet: Wallet;
  onClose: () => void;
  onDone: () => void;
}

/** Shared bits of one money dialog: the mutation, field errors from the form or the API, and the cleared-on-open state. */
function useActionForm(open: boolean, onClose: () => void, onDone: () => void, reset: () => void) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const done = React.useCallback(() => {
    onDone();
    onClose();
  }, [onDone, onClose]);
  const m = useMutation(done);
  const { clearError } = m;
  const resetRef = React.useRef(reset);
  resetRef.current = reset;
  React.useEffect(() => {
    if (!open) return;
    resetRef.current();
    setErrors({});
    clearError();
  }, [open, clearError]);
  const err = (f: string) => errors[f] || m.error?.fields[f];
  const clear = (f: string) => setErrors((e) => (e[f] ? { ...e, [f]: '' } : e));
  return { m, errors, setErrors, err, clear };
}

function Footer({ onClose, busy, cta, disabled, onSubmit }: { onClose: () => void; busy: boolean; cta: string; disabled?: boolean; onSubmit: () => void }) {
  return (
    <>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" busy={busy} disabled={disabled} onClick={onSubmit}>
        {cta}
      </Btn>
    </>
  );
}

export function TopUpDialog({ wallet, open, onClose, onDone }: ActionProps & { open: boolean }) {
  const store = useAttachmentStore('hr');
  const [amount, setAmount] = React.useState('');
  const [mode, setMode] = React.useState<PaymentMode | null>('cash');
  const [reference, setReference] = React.useState('');
  const [date, setDate] = React.useState(orgToday());
  const [note, setNote] = React.useState('');
  const [files, setFiles] = React.useState<LineAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const f = useActionForm(open, onClose, onDone, () => {
    setAmount('');
    setMode('cash');
    setReference('');
    setDate(orgToday());
    setNote('');
    setFiles([]);
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!(Number(amount) > 0)) next.amount = 'Enter the amount';
    if (!mode) next.payment_mode = 'Choose how it was paid';
    if (date > orgToday()) next.date = 'The date cannot be in the future';
    f.setErrors(next);
    if (Object.keys(next).length || !mode) return;
    f.m.run(
      () => api.topUpWallet(wallet.id, { amount: Number(amount), payment_mode: mode, reference: reference.trim() || undefined, date: date || undefined, note: note.trim() || undefined, files: sentFiles(files) }),
      'Wallet topped up'
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-lg" title="Top up wallet" footer={<Footer onClose={onClose} busy={f.m.busy} disabled={uploading} cta="Top up" onSubmit={submit} />}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Add cash to <span className="font-semibold text-fg">{wallet.name}</span>. It has {money(wallet.balance)} now.
        </p>
        <TextField label="Amount" required inputMode="decimal" prefix="₹" value={amount} onChange={(v) => { setAmount(parseDecimal(v)); f.clear('amount'); }} placeholder="0" error={f.err('amount')} />
        <SelectField<PaymentMode>
          label="Paid by"
          required
          value={mode}
          onChange={(v) => { setMode(v); f.clear('payment_mode'); }}
          options={PAYMENT_MODES.map((p) => ({ value: p.value, label: p.label }))}
          placeholder="Choose how it was paid"
          error={f.err('payment_mode')}
        />
        {mode !== 'cash' && <TextField label="Reference" value={reference} onChange={(v) => { setReference(v); f.clear('reference'); }} placeholder="UTR, cheque or transfer number" maxLength={120} error={f.err('reference')} />}
        <TextField label="Date" type="date" value={date} max={orgToday()} onChange={(v) => { setDate(v); f.clear('date'); }} error={f.err('date')} />
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} error={f.err('note')} />
        <ReceiptPicker label="Proof" value={files} onChange={setFiles} max={3} store={store} onBusyChange={setUploading} error={f.err('files')} addLabel="Attach proof" />
        <FormError message={leftoverError(f.m.error, ['amount', 'payment_mode', 'reference', 'date', 'note', 'files'])} />
      </div>
    </Dialog>
  );
}

export function ReturnDialog({ wallet, open, onClose, onDone }: ActionProps & { open: boolean }) {
  const [amount, setAmount] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [note, setNote] = React.useState('');
  const f = useActionForm(open, onClose, onDone, () => {
    setAmount('');
    setReference('');
    setNote('');
  });

  const submit = () => {
    const next: Record<string, string> = {};
    const n = Number(amount);
    if (!(n > 0)) next.amount = 'Enter the amount';
    else if (n > wallet.balance) next.amount = `The wallet only has ${money(wallet.balance)}`;
    f.setErrors(next);
    if (Object.keys(next).length) return;
    f.m.run(() => api.returnFromWallet(wallet.id, { amount: n, reference: reference.trim() || undefined, note: note.trim() || undefined }), 'Cash taken back');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-md" title="Take cash back" footer={<Footer onClose={onClose} busy={f.m.busy} cta="Take back" onSubmit={submit} />}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Cash returned from <span className="font-semibold text-fg">{wallet.name}</span> to Accounts. It cannot take the balance below zero; the wallet has {money(wallet.balance)}.
        </p>
        <TextField label="Amount" required inputMode="decimal" prefix="₹" value={amount} onChange={(v) => { setAmount(parseDecimal(v)); f.clear('amount'); }} placeholder="0" error={f.err('amount')} />
        <TextField label="Reference" value={reference} onChange={setReference} placeholder="Deposit slip or receipt number" maxLength={120} error={f.err('reference')} />
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} error={f.err('note')} />
        <FormError message={leftoverError(f.m.error, ['amount', 'reference', 'note'])} />
      </div>
    </Dialog>
  );
}

export function AdjustDialog({ wallet, open, onClose, onDone }: ActionProps & { open: boolean }) {
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const f = useActionForm(open, onClose, onDone, () => {
    setAmount('');
    setNote('');
  });

  const submit = () => {
    const next: Record<string, string> = {};
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n === 0) next.amount = 'Enter an amount, with a minus sign to take cash off';
    if (!note.trim()) next.note = 'Say why the balance is being adjusted';
    f.setErrors(next);
    if (Object.keys(next).length) return;
    f.m.run(() => api.adjustWallet(wallet.id, { amount: n, note: note.trim() }), 'Balance adjusted');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-md" title="Adjust balance" footer={<Footer onClose={onClose} busy={f.m.busy} cta="Adjust" onSubmit={submit} />}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Correct the book balance of <span className="font-semibold text-fg">{wallet.name}</span> ({money(wallet.balance)}). Use a minus sign to reduce it.
        </p>
        <TextField label="Amount" required inputMode="decimal" prefix="₹" value={amount} onChange={(v) => { setAmount(v.replace(/[^\d.-]/g, '').replace(/(?!^)-/g, '')); f.clear('amount'); }} placeholder="e.g. -250" error={f.err('amount')} />
        <Textarea label="Reason" required value={note} onChange={(e) => { setNote(e.target.value); f.clear('note'); }} rows={2} maxLength={300} error={f.err('note')} />
        <FormError message={leftoverError(f.m.error, ['amount', 'note'])} />
      </div>
    </Dialog>
  );
}

const STATE: Record<'freeze' | 'unfreeze' | 'close' | 'reopen', { title: string; body: string; cta: string; needsNote: boolean }> = {
  freeze: { title: 'Freeze wallet', body: 'No new expenses can be added while it is frozen. Top-ups are still allowed.', cta: 'Freeze', needsNote: true },
  unfreeze: { title: 'Unfreeze wallet', body: 'Expenses can be added to this wallet again.', cta: 'Unfreeze', needsNote: false },
  close: { title: 'Close wallet', body: 'A wallet can close only with no cash, no pending expenses and no open fund requests.', cta: 'Close wallet', needsNote: true },
  reopen: { title: 'Reopen wallet', body: 'The wallet becomes active again.', cta: 'Reopen', needsNote: false },
};

/** Freeze, unfreeze, close or reopen. Freeze and close need a note. */
export function StateDialog({ action, wallet, onClose, onDone }: ActionProps & { action: 'freeze' | 'unfreeze' | 'close' | 'reopen' | null }) {
  const open = action !== null;
  const [note, setNote] = React.useState('');
  const f = useActionForm(open, onClose, onDone, () => setNote(''));
  const cfg = STATE[action ?? 'freeze'];

  const submit = () => {
    if (!action) return;
    if (cfg.needsNote && !note.trim()) {
      f.setErrors({ note: 'Give a reason' });
      return;
    }
    f.m.run(() => api.setWalletState(wallet.id, action, note.trim() || undefined), action === 'freeze' ? 'Wallet frozen' : action === 'close' ? 'Wallet closed' : action === 'reopen' ? 'Wallet reopened' : 'Wallet unfrozen');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidthClassName="max-w-md" title={cfg.title} footer={<Footer onClose={onClose} busy={f.m.busy} cta={cfg.cta} onSubmit={submit} />}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">{cfg.body}</p>
        <Textarea label="Note" required={cfg.needsNote} value={note} onChange={(e) => { setNote(e.target.value); f.clear('note'); }} rows={2} maxLength={300} error={f.err('note')} />
        <FormError message={leftoverError(f.m.error, ['note'])} />
      </div>
    </Dialog>
  );
}
