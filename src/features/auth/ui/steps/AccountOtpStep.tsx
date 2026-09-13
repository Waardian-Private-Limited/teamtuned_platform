'use client';

import { AuthButton } from '../components/AuthButton';
import { AccountSummary } from '../components/AccountSummary';
import { StepShell } from './StepShell';
import type { Account } from '../../model/auth.model';

// Confirms which account the OTP goes to before sending it.
export function AccountOtpStep({
  account,
  onSubmit,
  onBack,
  isLoading,
}: {
  account: Account;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <StepShell title="Send a one-time code" subtitle="We'll send it to the mobile number on this account.">
      <AccountSummary account={account} />
      <AuthButton onClick={onSubmit} loading={isLoading} loadingLabel="Sending…">
        Send code
      </AuthButton>
      <AuthButton variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </AuthButton>
    </StepShell>
  );
}
