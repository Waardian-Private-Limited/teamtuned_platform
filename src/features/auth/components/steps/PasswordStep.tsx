'use client';

import { Lock } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { AccountSummary } from '../components/AccountSummary';
import { RememberMeField } from '../components/RememberMeField';
import { StepShell } from './StepShell';
import { button } from '@/theme/tokens';
import type { Account } from '../../types/auth.model';

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
      <Field
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
        <RememberMeField checked={rememberMe} onChange={onRememberMeChange} disabled={isLoading} />
        <button type="button" onClick={onForgotPassword} className={button.link} disabled={isLoading}>
          Forgot password?
        </button>
      </div>
      <Button type="submit" loading={isLoading} loadingLabel="Signing in…">
        Sign in
      </Button>
      {!isRemembered && (
        <Button variant="ghost" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
      )}
    </StepShell>
  );
}
