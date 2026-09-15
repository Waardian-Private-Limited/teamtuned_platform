'use client';

import { Lock, ShieldCheck } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { RememberMeField } from '../components/RememberMeField';
import { StepShell } from './StepShell';
import { button, surface, text } from '@/theme/tokens';

export function SuperAdminPasswordStep({
  email,
  password,
  onPasswordChange,
  onSubmit,
  onBack,
  onForgotPassword,
  rememberMe,
  onRememberMeChange,
  isLoading,
  error,
}: {
  email: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
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
      <Button variant="ghost" onClick={onBack} disabled={isLoading}>
        Back
      </Button>
    </StepShell>
  );
}
