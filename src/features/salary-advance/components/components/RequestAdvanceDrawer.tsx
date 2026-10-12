'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Chip, SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { useCreateMyAdvance } from '../../hooks/useCreateAdvance';
import { useRequestPreview } from '../../hooks/useRequestPreview';
import type { MyAdvanceFormInput, MyAdvanceType, UploadedFile } from '../../types/salaryAdvance.model';
import { money, parseAmount } from '../../utils/format';
import { validateMyAdvance } from '../../utils/validators';
import { AttachmentPicker } from './AttachmentPicker';
import { EligibilityPanel } from './EligibilityPanel';
import { InstallmentStepper } from './InstallmentStepper';
import { SchedulePreviewTable } from './SchedulePreviewTable';

interface RequestAdvanceDrawerProps {
  open: boolean;
  types: MyAdvanceType[];
  initialTypeId: number | null;
  onClose: () => void;
  onCreated: () => void;
}

export function RequestAdvanceDrawer({ open, types, initialTypeId, onClose, onCreated }: RequestAdvanceDrawerProps) {
  const eligibleTypes = React.useMemo(() => types.filter((t) => t.eligibility.eligible), [types]);
  const [typeId, setTypeId] = React.useState<number | null>(null);
  const [amount, setAmount] = React.useState('');
  const [installments, setInstallments] = React.useState(1);
  const [startMonth, setStartMonth] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [attachments, setAttachments] = React.useState<UploadedFile[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const mutation = useCreateMyAdvance(onCreated);
  const { clear } = mutation;
  const type = types.find((t) => t.id === typeId) ?? null;
  const e = type?.eligibility ?? null;

  React.useEffect(() => {
    if (!open) return;
    const start = initialTypeId ?? (eligibleTypes.length === 1 ? eligibleTypes[0].id : null);
    setTypeId(start);
    setAmount('');
    setReason('');
    setAttachments([]);
    clear();
  }, [open, initialTypeId, eligibleTypes, clear]);

  React.useEffect(() => {
    if (!e) return;
    setInstallments(1);
    setStartMonth(e.defaultStart || '');
  }, [e]);

  const amountValue = Number(amount);
  const preview = useRequestPreview(typeId, amountValue, installments, startMonth || null, open && Boolean(e?.eligible));

  const fe = mutation.fieldErrors;
  const clearField = (key: keyof typeof fe) => {
    if (fe[key]) mutation.setFieldErrors({ ...fe, [key]: undefined });
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const input: MyAdvanceFormInput = { typeId, amount: amountValue, installments, startMonth: startMonth || null, reason, attachments };
    const errors = validateMyAdvance(input, e);
    if (Object.keys(errors).length) {
      mutation.setFieldErrors(errors);
      return;
    }
    mutation.create(input);
  };

  const showMax = e && !e.hideLimits && e.maxAmount !== null;
  const quick = showMax ? [0.25, 0.5, 1].map((f) => Math.floor((e.maxAmount as number) * f)).filter((v, i, all) => v > 0 && all.indexOf(v) === i) : [];

  return (
    <Drawer open={open} onClose={onClose} title="Request an advance" maxWidthClassName="sm:max-w-lg">
      <form onSubmit={submit} noValidate className="flex min-h-full flex-col gap-4">
        <SelectField<number>
          label="What do you need"
          required
          numeric
          value={typeId}
          onChange={(v) => {
            setTypeId(v);
            clearField('advance_type_id');
          }}
          options={types.map((t) => ({ value: t.id, label: t.eligibility.eligible ? t.name : `${t.name} (not available)` }))}
          error={fe.advance_type_id}
        />

        {e && <EligibilityPanel eligibility={e} loading={false} audience="employee" />}

        {e?.eligible && (
          <>
            <TextField
              label="Amount"
              required
              inputMode="decimal"
              prefix="₹"
              value={amount}
              onChange={(v) => {
                setAmount(parseAmount(v));
                clearField('amount');
              }}
              placeholder="0"
              error={fe.amount || preview.preview?.fieldErrors.amount}
              hint={showMax ? `Up to ${money(e.maxAmount)}` : undefined}
            />
            {quick.length > 0 && (
              <div className="-mt-2 flex flex-wrap gap-1.5">
                {quick.map((v) => (
                  <Chip key={v} active={amountValue === v} onClick={() => { setAmount(String(v)); clearField('amount'); }}>
                    {money(v)}
                  </Chip>
                ))}
              </div>
            )}

            {e.canChooseInstallments && e.maxInstallments > 1 ? (
              <InstallmentStepper
                value={installments}
                onChange={(n) => {
                  setInstallments(n);
                  clearField('installments');
                }}
                max={e.maxInstallments}
                error={fe.installments || preview.preview?.fieldErrors.installments}
                hint="Your preference. HR confirms the final plan."
              />
            ) : (
              <p className="text-xs text-fg-muted sm:text-sm">
                Repaid in <span className="font-semibold text-fg">{installments} {installments === 1 ? 'instalment' : 'monthly instalments'}</span> from your salary.
              </p>
            )}

            {e.earliestStart && (
              <TextField
                label="First deduction from"
                type="month"
                min={e.earliestStart}
                value={startMonth}
                onChange={(v) => {
                  setStartMonth(v);
                  clearField('start_month');
                }}
                error={fe.start_month || preview.preview?.fieldErrors.start_month}
                hint={e.disbursementMode === 'payroll' ? 'Paid with your salary, so next month at the earliest. HR confirms it.' : 'This month or later. HR confirms it.'}
              />
            )}

            {preview.error ? (
              <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{preview.error}</p>
            ) : (
              <SchedulePreviewTable preview={preview.preview} loading={preview.isLoading} />
            )}

            <Textarea
              label="Reason"
              required={e.reasonRequired}
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(ev) => {
                setReason(ev.target.value);
                clearField('reason');
              }}
              placeholder="What is the advance for?"
              error={fe.reason}
            />

            <AttachmentPicker
              label="Supporting document"
              required={e.attachmentRequired}
              value={attachments}
              onChange={(files) => {
                setAttachments(files);
                clearField('attachments');
              }}
              error={fe.attachments}
              onBusyChange={setUploading}
            />
          </>
        )}

        {mutation.formError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{mutation.formError}</p>}

        <div className="mt-auto flex justify-end gap-2.5 border-t border-line pt-4">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" busy={mutation.isSaving} disabled={!e?.eligible || uploading}>
            Send request
          </Btn>
        </div>
      </form>
    </Drawer>
  );
}
