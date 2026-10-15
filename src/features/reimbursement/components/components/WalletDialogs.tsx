'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { OptionCard, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import { orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/reimbursement.api';
import type { LineAttachment, Wallet } from '../../types/reimbursement.model';
import { placeErrors } from '../../utils/errors';
import { money, parseDecimal } from '../../utils/format';
import { ReceiptPicker } from './ReceiptPicker';
import { FormError } from './Primitives';

export type WalletAction = 'top_up' | 'return' | 'adjust' | 'freeze' | 'unfreeze' | 'close' | 'reopen';

const TITLES: Record<WalletAction, string> = {
  top_up: 'Top up wallet',
  return: 'Take money back',
  adjust: 'Adjust balance',
  freeze: 'Freeze wallet',
  unfreeze: 'Unfreeze wallet',
  close: 'Close wallet',
  reopen: 'Reopen wallet',
};

const SUCCESS: Record<WalletAction, string> = {
  top_up: 'Wallet topped up',
  return: 'Money taken back',
  adjust: 'Balance adjusted',
  freeze: 'Wallet frozen',
  unfreeze: 'Wallet unfrozen',
  close: 'Wallet closed',
  reopen: 'Wallet reopened',
};

const KNOWN = ['amount', 'reference', 'date', 'note', 'proof'];

/** One dialog for every wallet action; the fields shown depend on the action. */
export function WalletActionDialog({ action, wallet, onClose, onDone }: { action: WalletAction | null; wallet: Wallet; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = React.useState('');
  const [direction, setDirection] = React.useState<'add' | 'remove'>('add');
  const [reference, setReference] = React.useState('');
  const [date, setDate] = React.useState(orgToday());
  const [note, setNote] = React.useState('');
  const [proof, setProof] = React.useState<LineAttachment[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!action) return;
    setAmount(action === 'top_up' && wallet.balance < 0 ? String(Math.abs(wallet.balance)) : '');
    setDirection('add');
    setReference('');
    setDate(orgToday());
    setNote('');
    setProof([]);
    setErrors({});
    setFormError('');
  }, [action, wallet.balance]);

  if (!action) return null;
  const moves = action === 'top_up' || action === 'return' || action === 'adjust';
  const needsNote = action === 'adjust' || action === 'freeze' || action === 'close';
  const clear = (k: string) => setErrors((e) => ({ ...e, [k]: '' }));

  const submit = async () => {
    const next: Record<string, string> = {};
    const value = Number(amount);
    if (moves && !(value > 0)) next.amount = 'Enter the amount';
    if (action === 'return' && value > wallet.balance) next.amount = `At most ${money(Math.max(0, wallet.balance))} can be taken back`;
    if (action === 'top_up' && !reference.trim()) next.reference = 'Enter the bank or transfer reference';
    if ((action === 'top_up' || action === 'return') && date > orgToday()) next.date = 'The date cannot be in the future';
    if (needsNote && !note.trim()) next.note = action === 'adjust' ? 'Say why the balance changes' : 'Add a note for the employee';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFormError('');
    try {
      if (action === 'top_up') await api.topUpWallet(wallet.id, { amount: value, reference: reference.trim(), date, note: note.trim() || undefined, proof: proof[0]?.key || undefined });
      else if (action === 'return') await api.takeBackFromWallet(wallet.id, { amount: value, reference: reference.trim() || undefined, date, note: note.trim() || undefined });
      else if (action === 'adjust') await api.adjustWallet(wallet.id, { amount: direction === 'add' ? value : -value, note: note.trim() });
      else await api.setWalletState(wallet.id, action, note.trim() || undefined);
      showSuccess(SUCCESS[action]);
      onDone();
      onClose();
    } catch (err) {
      const placed = placeErrors(err, (k) => KNOWN.includes(k));
      setErrors(placed.fields);
      setFormError(placed.form);
    } finally {
      setBusy(false);
    }
  };

  const intro: Record<WalletAction, React.ReactNode> = {
    top_up: 'Record money sent to the employee for expenses. It is added to the wallet balance and covers anything spent below zero first.',
    return: 'Record money the employee returned. The balance cannot go below zero.',
    adjust: 'Correct the balance without a payment, for example after a mistake. The note is kept in the statement.',
    freeze: 'No new wallet expenses can be filed while it is frozen. Top-ups still work.',
    unfreeze: 'The employee can file wallet expenses again.',
    close: 'A wallet can be closed only at a zero balance with nothing waiting for approval.',
    reopen: 'The employee can use the wallet again.',
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={TITLES[action]}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant={action === 'close' || action === 'freeze' ? 'danger' : 'primary'} busy={busy} disabled={uploading} onClick={submit}>
            {TITLES[action]}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          {intro[action]} Balance now: <span className={wallet.balance < 0 ? 'font-semibold text-[var(--tt-danger)]' : 'font-semibold text-fg'}>{money(wallet.balance)}</span>.
        </p>
        {action === 'adjust' && (
          <div className="grid grid-cols-2 gap-2">
            <OptionCard selected={direction === 'add'} onClick={() => setDirection('add')} title="Add" />
            <OptionCard selected={direction === 'remove'} onClick={() => setDirection('remove')} title="Remove" />
          </div>
        )}
        {moves && <TextField label="Amount" required inputMode="decimal" prefix="₹" value={amount} onChange={(v) => { setAmount(parseDecimal(v)); clear('amount'); }} error={errors.amount} />}
        {(action === 'top_up' || action === 'return') && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Reference" required={action === 'top_up'} value={reference} onChange={(v) => { setReference(v); clear('reference'); }} placeholder="UTR or transfer number" maxLength={120} error={errors.reference} />
            <TextField label="Date" type="date" max={orgToday()} value={date} onChange={(v) => { setDate(v); clear('date'); }} error={errors.date} />
          </div>
        )}
        {action === 'top_up' && <ReceiptPicker label="Proof of payment" value={proof} onChange={setProof} max={1} scope="proof" onBusyChange={setUploading} error={errors.proof} />}
        {action !== 'unfreeze' && action !== 'reopen' && (
          <Textarea label="Note" required={needsNote} rows={2} value={note} onChange={(e) => { setNote(e.target.value); clear('note'); }} error={errors.note} />
        )}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

export function OpenWalletsDrawer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [employees, setEmployees] = React.useState<CompEmployeeDto[]>([]);
  const [amount, setAmount] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState('');
  const [skipped, setSkipped] = React.useState<Array<{ name: string; reason: string }>>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmployees([]);
    setAmount('');
    setReference('');
    setErrors({});
    setFormError('');
    setSkipped([]);
  }, [open]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!employees.length) next.employee_ids = 'Choose at least one employee';
    if (Number(amount) > 0 && !reference.trim()) next.reference = 'Enter the reference of the first top-up';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFormError('');
    setSkipped([]);
    try {
      const result = await api.openWallets({
        employee_ids: employees.map((e) => e.id),
        initial_amount: Number(amount) > 0 ? Number(amount) : undefined,
        reference: Number(amount) > 0 ? reference.trim() : undefined,
      });
      const names = new Map(employees.map((e) => [e.id, e.name]));
      const done = Number(result.opened || 0) + Number(result.reopened || 0);
      if (done) showSuccess(`${done} ${done === 1 ? 'wallet' : 'wallets'} opened`);
      onDone();
      if (result.skipped?.length) {
        setSkipped(result.skipped.map((s) => ({ name: names.get(s.employee_id) || `Employee #${s.employee_id}`, reason: s.reason })));
        setEmployees((list) => list.filter((e) => result.skipped.some((s) => s.employee_id === e.id)));
      } else {
        onClose();
      }
    } catch (err) {
      const placed = placeErrors(err, (k) => ['employee_ids', 'initial_amount', 'reference'].includes(k));
      setErrors(placed.fields);
      setFormError(placed.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Open expense wallets" maxWidthClassName="sm:max-w-lg">
      <div className="flex min-h-full flex-col gap-4">
        <p className="text-sm text-fg-muted">Each employee gets a wallet the company funds. Their wallet expenses are taken from it once approved.</p>
        <EmployeePicker multiple label="Employees" value={employees} onChange={(v) => { setEmployees(v); setErrors((e) => ({ ...e, employee_ids: '' })); }} error={errors.employee_ids} />
        <TextField label="First top-up" inputMode="decimal" prefix="₹" value={amount} onChange={(v) => { setAmount(parseDecimal(v)); setErrors((e) => ({ ...e, initial_amount: '' })); }} error={errors.initial_amount} hint="Given to each employee" />
        {Number(amount) > 0 && <TextField label="Reference" required value={reference} onChange={(v) => { setReference(v); setErrors((e) => ({ ...e, reference: '' })); }} placeholder="UTR or transfer number" error={errors.reference} />}
        {skipped.length > 0 && (
          <div className="rounded-lg border border-dashed border-line-strong p-3">
            <p className="text-xs font-semibold text-fg">Not opened</p>
            <ul className="mt-1 space-y-0.5">
              {skipped.map((s) => (
                <li key={s.name} className="text-xs text-fg-muted">
                  <span className="font-semibold text-fg">{s.name}</span> · {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <FormError message={formError} />
        <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:-mb-5 sm:px-6">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" busy={busy} onClick={submit}>
            Open {employees.length > 1 ? `${employees.length} wallets` : 'wallet'}
          </Btn>
        </div>
      </div>
    </Drawer>
  );
}
