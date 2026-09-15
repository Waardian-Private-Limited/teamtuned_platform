'use client';

import { Button } from '@/components/ui/Button';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { RememberMeField } from '../components/RememberMeField';
import { StepShell } from './StepShell';
import { OTP_LENGTH } from '../../constants/auth.constants';
import { button, text } from '@/theme/tokens';

export function OtpVerifyStep({
  otp,
  onOtpChange,
  destination,
  onSubmit,
  onResend,
  onBack,
  rememberMe,
  onRememberMeChange,
  isLoading,
  error,
  resendCooldown,
}: {
  otp: string;
  onOtpChange: (value: string) => void;
  destination: string;
  onSubmit: (code?: string) => void;
  onResend: () => void;
  onBack: () => void;
  rememberMe: boolean;
  onRememberMeChange: (value: boolean) => void;
  isLoading: boolean;
  error?: string;
  resendCooldown: number;
}) {
  const canResend = resendCooldown <= 0 && !isLoading;

  return (
    <StepShell
      title="Enter your code"
      subtitle={destination ? `Sent to ${destination}` : undefined}
      onSubmit={() => onSubmit()}
    >
      <OtpCodeInput
        value={otp}
        onChange={onOtpChange}
        length={OTP_LENGTH}
        disabled={isLoading}
        error={error}
        onComplete={(code) => onSubmit(code)}
      />
      <RememberMeField checked={rememberMe} onChange={onRememberMeChange} disabled={isLoading} />
      <Button type="submit" loading={isLoading} loadingLabel="Verifying…">
        Verify
      </Button>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className={button.link} disabled={isLoading}>
          Back
        </button>
        {canResend ? (
          <button type="button" onClick={onResend} className={button.link}>
            Resend code
          </button>
        ) : (
          <span className={text.caption}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </span>
        )}
      </div>
    </StepShell>
  );
}
