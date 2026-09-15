'use client';

import { Mail } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { StepShell } from './StepShell';

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
      <Field
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
      <Button type="submit" loading={isLoading} loadingLabel="Checking…">
        Continue
      </Button>
    </StepShell>
  );
}
