'use client';

import { Mail } from 'lucide-react';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { StepShell } from './StepShell';

// Entry point: look up which accounts belong to this email.
export function EmailStep({
  email,
  onEmailChange,
  onSubmit,
  isLoading,
  error,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error?: string;
}) {
  return (
    <StepShell onSubmit={onSubmit}>
      <AuthField
        label="Email"
        icon={<Mail className="h-5 w-5" />}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        hint="We'll find the organizations linked to it."
        error={error}
        value={email}
        disabled={isLoading}
        onChange={(e) => onEmailChange(e.target.value)}
      />
      <AuthButton type="submit" loading={isLoading} loadingLabel="Checking…">
        Continue
      </AuthButton>
    </StepShell>
  );
}
