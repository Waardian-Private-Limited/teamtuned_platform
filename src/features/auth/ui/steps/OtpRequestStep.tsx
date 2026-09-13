'use client';

import { Smartphone } from 'lucide-react';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { StepShell } from './StepShell';

// OTP tab entry: collect a mobile number to send the code to.
export function OtpRequestStep({
  mobile,
  onMobileChange,
  onSubmit,
  isLoading,
  error,
}: {
  mobile: string;
  onMobileChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error?: string;
}) {
  const displayMobile = mobile.replace(/^\+?91/, '');

  return (
    <StepShell onSubmit={onSubmit}>
      <AuthField
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
      <AuthButton type="submit" loading={isLoading} loadingLabel="Sending…">
        Send code
      </AuthButton>
    </StepShell>
  );
}
