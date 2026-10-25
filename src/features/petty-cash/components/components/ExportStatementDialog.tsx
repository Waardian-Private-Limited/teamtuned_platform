'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { DateRangeFields, DeliveryFooter, EmailsField, FILES_HELP, FormatField, parseEmails, ToggleRow, useExportJob, type Delivery } from '@/features/expense-bills/components/ExportParts';
import type { ExportFormatDto } from '@/features/expense-bills/types/bill.dto';
import { monthRange, orgMonth } from '@/lib/datetime';
import * as api from '../../api/petty-cash.api';
import { FormError } from './Primitives';

const PLACED = new Set(['from', 'to', 'wallet_id', 'format', 'emails']);
const END_BEFORE_START = 'The end date is before the start date';

interface ExportStatementDialogProps {
  open: boolean;
  onClose: () => void;
  /** One wallet's statement; omit for every wallet in the caller's scope. */
  walletId?: number | null;
  /** The dates the page shows (the wallet's ledger filter); empty: this month. */
  range?: { from: string; to: string };
}

/** Wallet statement as a Download Centre job: opening balance, ledger, closing balance, then the period's approved expenses. */
export function ExportStatementDialog({ open, onClose, walletId = null, range }: ExportStatementDialogProps) {
  const job = useExportJob(PLACED);
  const { reset, clearField } = job;
  const [format, setFormat] = React.useState<ExportFormatDto>('pdf');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [expenses, setExpenses] = React.useState(true);
  const [files, setFiles] = React.useState(true);
  const [emailOpen, setEmailOpen] = React.useState(false);
  const [emails, setEmails] = React.useState('');
  const emailRef = React.useRef<HTMLInputElement>(null);

  // The page's dates when it has them, read once as the dialog opens.
  const rangeRef = React.useRef(range);
  rangeRef.current = range;
  React.useEffect(() => {
    if (!open) return;
    reset();
    const month = monthRange(orgMonth());
    const shown = rangeRef.current;
    setFormat('pdf');
    setFrom(shown?.from || (shown?.to ? '' : month.from));
    setTo(shown?.to || (shown?.from ? '' : month.to));
    setExpenses(true);
    setFiles(true);
    setEmailOpen(false);
    setEmails('');
  }, [open, reset]);

  React.useEffect(() => {
    if (open && emailOpen) emailRef.current?.focus();
  }, [open, emailOpen]);

  const rangeError = from && to && from > to ? END_BEFORE_START : '';

  const submit = (delivery: Delivery) => {
    if (delivery === 'email' && !emailOpen) {
      setEmailOpen(true);
      return;
    }
    const errs: Record<string, string> = {};
    if (rangeError) errs.to = rangeError;
    let list: string[] = [];
    if (delivery === 'email') {
      const parsed = parseEmails(emails);
      list = parsed.emails;
      if (parsed.error) errs.emails = parsed.error;
    }
    if (Object.keys(errs).length) {
      job.setFields(errs);
      return;
    }
    job.run(
      delivery,
      () =>
        api.exportStatement({
          format,
          from: from || undefined,
          to: to || undefined,
          wallet_id: walletId ?? undefined,
          include_expenses: expenses,
          include_files: expenses && files,
          emails: delivery === 'email' ? list : undefined,
        }),
      list,
      onClose
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={walletId ? 'Wallet statement' : 'Statement of all wallets'}
      footer={<DeliveryFooter emailOpen={emailOpen} busy={job.busy} onCancel={onClose} onDownload={() => submit('download')} onEmail={() => submit('email')} />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateRangeFields label="Dated" from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); clearField('from', 'to'); }} fromError={job.fields.from} toError={rangeError || job.fields.to} />
        </div>
        <FormatField value={format} onChange={(v) => { setFormat(v); clearField('format'); }} error={job.fields.format} hint="Opening balance, every entry, then the closing balance." />
        <ToggleRow title="Include the approved expenses" description="Each approved expense of these dates after the ledger, with its seller, GST and inward number." checked={expenses} onChange={setExpenses} />
        {expenses && <ToggleRow title="Include bill photos and payment proofs" description={FILES_HELP[format]} checked={files} onChange={setFiles} />}
        {emailOpen && <EmailsField value={emails} onChange={(v) => { setEmails(v); clearField('emails'); }} error={job.fields.emails} onHide={() => { setEmailOpen(false); clearField('emails'); }} inputRef={emailRef} />}
        <FormError message={job.form} />
      </div>
    </Dialog>
  );
}
