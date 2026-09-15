'use client';

import { Lock, Mail } from 'lucide-react';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { OtpCodeInput } from '../components/OtpCodeInput';
import { StepShell } from './StepShell';
import { FORGOT_OTP_LENGTH } from '../../constants/auth.constants';
import { button } from '@/theme/tokens';

export function ForgotEmailStep({
  email,
  onEmailChange,
  onSubmit,
  onBack,
  isLoading,
  error,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string;
}) {
  return (
    <StepShell title="Reset your password" subtitle="We'll email you a verification code." onSubmit={onSubmit}>
      <AuthField
        label="Email"
        icon={<Mail className="h-5 w-5" />}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={error}
        value={email}
        disabled={isLoading}
        onChange={(e) => onEmailChange(e.target.value)}
      />
      <AuthButton type="submit" loading={isLoading} loadingLabel="Sending…">
        Send code
      </AuthButton>
      <button type="button" onClick={onBack} className={`${button.link} w-full`} disabled={isLoading}>
        Back to sign in
      </button>
    </StepShell>
  );
}

export function ForgotOtpStep({
  otp,
  onOtpChange,
  email,
  onSubmit,
  onBack,
  isLoading,
  error,
}: {
  otp: string;
  onOtpChange: (value: string) => void;
  email: string;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string;
}) {
  return (
    <StepShell title="Check your email" subtitle={`We sent a ${FORGOT_OTP_LENGTH}-digit code to ${email}.`} onSubmit={onSubmit}>
      <OtpCodeInput
        value={otp}
        onChange={onOtpChange}
        length={FORGOT_OTP_LENGTH}
        disabled={isLoading}
        error={error}
        onComplete={onSubmit}
      />
      <AuthButton type="submit" loading={isLoading} loadingLabel="Verifying…">
        Verify code
      </AuthButton>
      <button type="button" onClick={onBack} className={`${button.link} w-full`} disabled={isLoading}>
        Back
      </button>
    </StepShell>
  );
}

export function ForgotResetStep({
  password,
  onPasswordChange,
  onSubmit,
  onBack,
  isLoading,
  error,
}: {
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  error?: string;
}) {
  return (
    <StepShell title="Set a new password" onSubmit={onSubmit}>
      <AuthField
        label="New password"
        icon={<Lock className="h-5 w-5" />}
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={error}
        value={password}
        disabled={isLoading}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
      <AuthButton type="submit" loading={isLoading} loadingLabel="Updating…">
        Update password
      </AuthButton>
      <button type="button" onClick={onBack} className={`${button.link} w-full`} disabled={isLoading}>
        Back
      </button>
    </StepShell>
  );
}
