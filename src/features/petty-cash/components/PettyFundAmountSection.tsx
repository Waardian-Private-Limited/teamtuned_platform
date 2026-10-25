'use client';

import React from 'react';
import { TextField } from '@/components/ui/FormControls';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/petty-cash.api';
import { FUND_MODE_LABEL } from '../constants/petty-cash.constants';
import { toFundRequestDetail } from '../types/petty-cash.mapper';
import type { FundRequestDetail } from '../types/petty-cash.model';
import { money, parseDecimal } from '../utils/format';

interface Props {
  fundRequestId: number | null;
  requested: number;
  /** `{ approved_amount }` when lowered, null when approved as asked. */
  onChange: (approvedAmount: number | null, valid: boolean) => void;
  /** The approve call refused the amount (400 `errors.approved_amount`). */
  serverError?: string;
  /** The amount was edited (clears `serverError`). */
  onEdit?: () => void;
}

/** Shown when approving a petty cash fund request: the wallet, why, and the amount (the approver may approve less). */
export function PettyFundAmountSection({ fundRequestId, requested, onChange, serverError, onEdit }: Props) {
  const [value, setValue] = React.useState(String(requested));
  const [fund, setFund] = React.useState<FundRequestDetail | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => setValue(String(requested)), [requested]);

  React.useEffect(() => {
    setFund(null);
    setError('');
    if (!fundRequestId) return;
    let cancelled = false;
    api
      .getFundRequest(fundRequestId)
      .then((dto) => !cancelled && setFund(toFundRequestDetail(dto)))
      .catch((e) => !cancelled && setError(messageOf(e)));
    return () => {
      cancelled = true;
    };
  }, [fundRequestId]);

  const n = Number(value);
  const err = value.trim() === '' ? 'Enter the amount to approve' : !Number.isFinite(n) || n <= 0 ? 'Enter an amount above zero' : n > requested ? `Cannot be more than the ${money(requested)} asked for` : '';

  React.useEffect(() => {
    if (err) onChange(null, false);
    else {
      const v = Math.round(n * 100) / 100;
      onChange(v === requested ? null : v, true);
    }
  }, [err, n, requested, onChange]);

  return (
    <div className="space-y-3">
      {fund && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line p-3 text-xs sm:text-sm">
          <div className="min-w-0">
            <dt className="text-fg-muted">Wallet</dt>
            <dd className="truncate font-semibold text-fg">{fund.wallet.name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-fg-muted">{fund.wallet.hasFloat ? 'Cash now / float' : 'Cash now'}</dt>
            <dd className="font-semibold tabular-nums text-fg">
              {money(fund.wallet.balance)}{fund.wallet.hasFloat ? ` / ${money(fund.wallet.floatAmount)}` : ''}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-fg-muted">Request</dt>
            <dd className="font-semibold text-fg">{FUND_MODE_LABEL[fund.mode]}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-fg-muted">Asked by</dt>
            <dd className="truncate font-semibold text-fg">{fund.requestedBy.name}</dd>
          </div>
          {fund.reason && (
            <div className="col-span-2 min-w-0">
              <dt className="text-fg-muted">Reason</dt>
              <dd className="break-words text-fg">{fund.reason}</dd>
            </div>
          )}
        </dl>
      )}
      {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      <TextField
        label="Amount to approve"
        required
        inputMode="decimal"
        prefix="₹"
        value={value}
        onChange={(v) => {
          setValue(parseDecimal(v));
          onEdit?.();
        }}
        error={err || serverError || undefined}
        hint={`Asked for ${money(requested)}. The wallet is credited when Accounts pays it.`}
      />
    </div>
  );
}
