'use client';

import { AuthButton } from '../components/AuthButton';
import { StepShell } from './StepShell';
import { surface, text } from '@/theme/tokens';
import type { Account } from '../../model/auth.model';

// Shown when one email maps to several organizations.
export function AccountsStep({
  accounts,
  onSelect,
  onSelectForOtp,
  onBack,
  isLoading,
}: {
  accounts: Account[];
  onSelect: (account: Account) => void;
  onSelectForOtp: (account: Account) => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  return (
    <StepShell title="Choose an account" subtitle="This email is linked to more than one organization.">
      <ul className="space-y-3">
        {accounts.map((account) => (
          <li key={account.id} className={`${surface.card} p-4`}>
            <p className="text-sm font-semibold text-fg">{account.organizationName}</p>
            <p className={`${text.caption} truncate`}>{account.username} · {account.email}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <AuthButton onClick={() => onSelect(account)} disabled={isLoading}>
                Use password
              </AuthButton>
              <AuthButton variant="secondary" onClick={() => onSelectForOtp(account)} disabled={isLoading}>
                Use OTP
              </AuthButton>
            </div>
          </li>
        ))}
      </ul>
      <AuthButton variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </AuthButton>
    </StepShell>
  );
}
