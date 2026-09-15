'use client';

import { Button } from '@/components/ui/Button';
import { AccountSummary } from '../components/AccountSummary';
import { RememberMeField } from '../components/RememberMeField';
import { StepShell } from './StepShell';
import type { Account } from '../../types/auth.model';

export function AccountOtpStep({
  account,
  onSubmit,
  onBack,
  rememberMe,
  onRememberMeChange,
  isLoading,
}: {
  account: Account;
  onSubmit: () => void;
  onBack: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  isLoading: boolean;
}) {
  return (
    <StepShell title="Send a one-time code" subtitle="We'll send it to the mobile number on this account.">
      <AccountSummary account={account} />
      <RememberMeField checked={rememberMe} onChange={onRememberMeChange} disabled={isLoading} />
      <Button onClick={onSubmit} loading={isLoading} loadingLabel="Sending…">
        Send code
      </Button>
      <Button variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </Button>
    </StepShell>
  );
}
