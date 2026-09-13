'use client';

import { Lock } from 'lucide-react';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { AccountSummary } from '../components/AccountSummary';
import { StepShell } from './StepShell';
import { button } from '@/theme/tokens';
import type { Account } from '../../model/auth.model';

// Password entry for a resolved account, plus remember-me and forgot-password.
export function PasswordStep({
  account,
  password,
  onPasswordChange,
  onSubmit,
  onBack,
  onForgotPassword,
  rememberMe,
  onRememberMeChange,
  isRemembered,
  isLoading,
  error,
}: {
  account: Account;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  isRemembered: boolean;
  isLoading: boolean;
  error?: string;
}) {
  return (
    <StepShell onSubmit={onSubmit}>
      <AccountSummary
        account={account}
        action={
          isRemembered ? (
            <button type="button" onClick={onBack} className={button.link}>
              Switch
            </button>
          ) : undefined
        }
      />
      <AuthField
        label="Password"
        icon={<Lock className="h-5 w-5" />}
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={error}
        value={password}
        disabled={isLoading}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={rememberMe}
            disabled={isLoading}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong accent-[var(--tt-primary)]"
          />
          Remember me
        </label>
        <button type="button" onClick={onForgotPassword} className={button.link} disabled={isLoading}>
          Forgot password?
        </button>
      </div>
      <AuthButton type="submit" loading={isLoading} loadingLabel="Signing in…">
        Sign in
      </AuthButton>
      {!isRemembered && (
        <AuthButton variant="ghost" onClick={onBack} disabled={isLoading}>
          Back
        </AuthButton>
      )}
    </StepShell>
  );
}
