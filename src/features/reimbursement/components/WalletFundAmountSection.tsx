'use client';

import React from 'react';
import { TextField } from '@/components/ui/FormControls';
import { money } from '@/features/salary-slips/utils/format';
import * as api from '../api/reimbursement.api';
import { FileChip, useLinkOpener } from './components/FileLinks';

function cleanAmount(raw: string) {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

interface WalletFundAmountSectionProps {
  requested: number;
  onChange: (approvedAmount: number | null, valid: boolean) => void;
  /** `decision_form.fund_request_id`: opens the attached files. */
  fundRequestId?: number | null;
  /** `decision_form.files`: quotation or supporting files the employee attached. */
  files?: Array<{ index: number; name?: string | null }>;
}

/** Shown when approving a wallet fund request: the approver may approve less than asked, and sees what was attached. */
export function WalletFundAmountSection({ requested, onChange, fundRequestId = null, files = [] }: WalletFundAmountSectionProps) {
  const opener = useLinkOpener();
  const [value, setValue] = React.useState(String(requested));

  React.useEffect(() => setValue(String(requested)), [requested]);

  const n = Number(value);
  const error =
    value.trim() === '' ? 'Enter the amount to approve' : !Number.isFinite(n) || n <= 0 ? 'Enter an amount above zero' : n > requested ? `Cannot be more than the ${money(requested)} asked for` : '';

  React.useEffect(() => {
    if (error) onChange(null, false);
    else {
      const v = Math.round(n * 100) / 100;
      onChange(v === requested ? null : v, true);
    }
  }, [error, n, requested, onChange]);

  return (
    <div className="space-y-3">
      <TextField
        label="Amount to approve"
        required
        inputMode="decimal"
        prefix="₹"
        value={value}
        onChange={(v) => setValue(cleanAmount(v))}
        error={error || undefined}
        hint={`Asked for ${money(requested)}. The wallet is credited when Accounts pays it.`}
      />
      {fundRequestId !== null && files.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Attached</p>
          <div className="flex flex-wrap gap-1.5">
            {files.map((f) => (
              <FileChip
                key={f.index}
                name={f.name || `File ${f.index + 1}`}
                busy={opener.opening === String(f.index)}
                onClick={() => opener.open(String(f.index), () => api.fundRequestFileUrl('hr', fundRequestId, f.index))}
              />
            ))}
          </div>
          {opener.error && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{opener.error}</p>}
        </div>
      )}
    </div>
  );
}
