'use client';

import { AuthButton } from '../components/AuthButton';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { StepShell } from './StepShell';
import { OTP_LENGTH } from '../../constants/auth.constants';
import { button } from '@/theme/tokens';

// Code entry. Auto-submits on the final digit; the button is the manual fallback.
export function OtpVerifyStep({
  otp,
  onOtpChange,
  destination,
  onSubmit,
  onResend,
  onBack,
  isLoading,
}: {
  otp: string;
  onOtpChange: (value: string) => void;
  destination: string;
  onSubmit: (code?: string) => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
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
        onComplete={(code) => onSubmit(code)}
      />
      <AuthButton type="submit" loading={isLoading} loadingLabel="Verifying…">
        Verify
      </AuthButton>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className={button.link} disabled={isLoading}>
          Back
        </button>
        <button type="button" onClick={onResend} className={button.link} disabled={isLoading}>
          Resend code
        </button>
      </div>
    </StepShell>
  );
}
