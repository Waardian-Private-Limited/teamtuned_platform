'use client';

import { Smartphone } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { RememberMeField } from '../components/RememberMeField';
import { StepShell } from './StepShell';

export function OtpRequestStep({
  mobile,
  onMobileChange,
  onSubmit,
  rememberMe,
  onRememberMeChange,
  isLoading,
  error,
}: {
  mobile: string;
  onMobileChange: (value: string) => void;
  onSubmit: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  isLoading: boolean;
  error?: string;
}) {
  const displayMobile = mobile.replace(/^\+?91/, '');

  return (
    <StepShell onSubmit={onSubmit}>
      <Field
        label="Mobile number"
        icon={<Smartphone className="h-5 w-5" />}
        prefix="+91"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="10-digit number"
        hint="We'll text you a one-time code."
        error={error}
        value={displayMobile}
        disabled={isLoading}
        onChange={(e) => {
          let val = e.target.value.replace(/\D/g, '');
          if (val.startsWith('91') && val.length > 10) {
            val = val.slice(2);
          }
          onMobileChange(val.slice(0, 10));
        }}
      />
      <RememberMeField checked={rememberMe} onChange={onRememberMeChange} disabled={isLoading} />
      <Button type="submit" loading={isLoading} loadingLabel="Sending…">
        Send code
      </Button>
    </StepShell>
  );
}
