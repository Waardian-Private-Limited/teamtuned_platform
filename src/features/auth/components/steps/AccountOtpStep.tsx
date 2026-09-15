'use client';

import { AuthButton } from '../components/AuthButton';
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
      <AuthButton onClick={onSubmit} loading={isLoading} loadingLabel="Sending…">
        Send code
      </AuthButton>
      <AuthButton variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </AuthButton>
    </StepShell>
  );
}
