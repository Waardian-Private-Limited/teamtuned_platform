'use client';

import { Button } from '@/components/ui/Button';
import { StepShell } from './StepShell';
import { surface, text } from '@/theme/tokens';
import type { Account } from '../../types/auth.model';

export function AccountsStep({
  accounts,
  mode = 'credentials',
  onSelect,
  onSelectForOtp,
  onContinue,
  onBack,
  isLoading,
}: {
  accounts: Account[];
  mode?: 'credentials' | 'otp-continue';
  onSelect: (account: Account) => void;
  onSelectForOtp: (account: Account) => void;
  onContinue: (account: Account) => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const isOtpContinue = mode === 'otp-continue';

  return (
    <StepShell
      title="Choose an account"
      subtitle={
        isOtpContinue
          ? 'This number is linked to more than one organization.'
          : 'This email is linked to more than one organization.'
      }
    >
      <ul className="space-y-3">
        {accounts.map((account) => (
          <li key={account.id} className={`${surface.card} p-4`}>
            <p className="text-sm font-semibold text-fg">
              {account.displayName || account.username}
            </p>
            <p className={`${text.caption} truncate`}>{account.email}</p>
            <p className={`${text.caption} truncate`}>{account.organizationName}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {isOtpContinue ? (
                <Button onClick={() => onContinue(account)} disabled={isLoading}>
                  Continue
                </Button>
              ) : (
                <>
                  <Button onClick={() => onSelect(account)} disabled={isLoading}>
                    Use password
                  </Button>
                  <Button variant="secondary" onClick={() => onSelectForOtp(account)} disabled={isLoading}>
                    Use OTP
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Button variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </Button>
    </StepShell>
  );
}
