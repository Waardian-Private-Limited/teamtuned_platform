'use client';

import { Lock, ShieldCheck } from 'lucide-react';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { StepShell } from './StepShell';
import { button, surface, text } from '@/theme/tokens';

// Superadmins bypass the org account picker and sign in with email + password.
export function SuperAdminPasswordStep({
  email,
  password,
  onPasswordChange,
  onSubmit,
  onBack,
  onForgotPassword,
  isLoading,
  error,
}: {
  email: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
  isLoading: boolean;
  error?: string;
}) {
  return (
    <StepShell onSubmit={onSubmit}>
      <div className={`${surface.panel} flex items-center gap-3 px-4 py-3`}>
        <ShieldCheck className="h-5 w-5 shrink-0 text-fg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">Platform administrator</p>
          <p className={`${text.caption} truncate`}>{email}</p>
        </div>
      </div>
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
      <div className="flex justify-end">
        <button type="button" onClick={onForgotPassword} className={button.link} disabled={isLoading}>
          Forgot password?
        </button>
      </div>
      <AuthButton type="submit" loading={isLoading} loadingLabel="Signing in…">
        Sign in
      </AuthButton>
      <AuthButton variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </AuthButton>
    </StepShell>
  );
}
