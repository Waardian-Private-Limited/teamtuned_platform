'use client';

import { useLoginFlow } from '../hooks/useLoginFlow';
import { useQrLogin } from '../hooks/useQrLogin';
import { STEPS_WITH_TABS } from '../constants/auth.constants';
import { AuthAlert } from './components/AuthAlert';
import { AuthTabs } from './components/AuthTabs';
import { QrLoginPanel } from './components/QrLoginPanel';
import { EmailStep } from './steps/EmailStep';
import { AccountsStep } from './steps/AccountsStep';
import { PasswordStep } from './steps/PasswordStep';
import { SuperAdminPasswordStep } from './steps/SuperAdminPasswordStep';
import { OtpRequestStep } from './steps/OtpRequestStep';
import { AccountOtpStep } from './steps/AccountOtpStep';
import { OtpVerifyStep } from './steps/OtpVerifyStep';
import { ForgotEmailStep, ForgotOtpStep, ForgotResetStep } from './steps/ForgotPasswordSteps';
import { RememberedAccountsStep } from './steps/RememberedAccountsStep';

/**
 * Renders whichever step the flow is on. All state lives in useLoginFlow, so
 * this component is a router from `step` to a screen and nothing more.
 */
export function LoginCard() {
  const flow = useLoginFlow();
  const qr = useQrLogin();

  const showChrome = STEPS_WITH_TABS.includes(flow.step);

  // A validation message belongs under its own input, so hand it only to that
  // step and keep the banner above for card-level failures.
  const errorFor = (field: string) =>
    flow.fieldError?.field === field ? flow.fieldError.message : undefined;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-1.5 sm:gap-2">
      {showChrome && (
        <AuthTabs value={flow.tab} onChange={flow.switchTab} disabled={flow.isLoading} />
      )}

      <AuthAlert message={flow.error} tone="error" />
      <AuthAlert message={flow.success} tone="success" />

      {/* The email and OTP steps have matching structure */}
      <div>
      {flow.step === 'remembered' && (
        <RememberedAccountsStep
          accounts={flow.rememberedAccounts}
          onSelect={flow.useRemembered}
          onForget={flow.forgetRemembered}
          onUseAnother={flow.addAnotherAccount}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'email' && (
        <EmailStep
          email={flow.email}
          onEmailChange={(v) => { flow.setEmail(v); flow.clearFeedback(); }}
          onSubmit={flow.submitEmail}
          isLoading={flow.isLoading}
          error={errorFor('email')}
        />
      )}

      {flow.step === 'accounts' && (
        <AccountsStep
          accounts={flow.accounts}
          onSelect={flow.selectAccount}
          onSelectForOtp={flow.selectAccountForOtp}
          onBack={flow.resetToStart}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'password' && flow.selectedAccount && (
        <PasswordStep
          account={flow.selectedAccount}
          password={flow.password}
          onPasswordChange={(v) => { flow.setPassword(v); flow.clearFeedback(); }}
          error={errorFor('password')}
          onSubmit={flow.submitPassword}
          onBack={flow.backFromPassword}
          onForgotPassword={flow.startForgotPassword}
          rememberMe={flow.rememberMe}
          onRememberMeChange={flow.setRememberMe}
          isRemembered={flow.isRememberedLogin}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'superadmin-password' && (
        <SuperAdminPasswordStep
          email={flow.email}
          password={flow.password}
          onPasswordChange={(v) => { flow.setPassword(v); flow.clearFeedback(); }}
          error={errorFor('password')}
          onSubmit={flow.submitSuperAdminPassword}
          onBack={flow.resetToStart}
          onForgotPassword={flow.startForgotPassword}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'otp' && (
        <OtpRequestStep
          mobile={flow.mobile}
          onMobileChange={(v) => { flow.setMobile(v); flow.clearFeedback(); }}
          onSubmit={flow.requestMobileOtp}
          isLoading={flow.isLoading}
          error={errorFor('mobile')}
        />
      )}

      {flow.step === 'account-otp' && flow.selectedAccount && (
        <AccountOtpStep
          account={flow.selectedAccount}
          onSubmit={flow.requestAccountOtp}
          onBack={flow.resetToStart}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'verify' && (
        <OtpVerifyStep
          otp={flow.otp}
          onOtpChange={flow.setOtp}
          destination={flow.mobile}
          onSubmit={flow.verifyOtp}
          onResend={flow.resendOtp}
          onBack={flow.resetToStart}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'forgot-email' && (
        <ForgotEmailStep
          email={flow.email}
          onEmailChange={flow.setEmail}
          onSubmit={flow.submitForgotEmail}
          onBack={flow.resetToStart}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'forgot-otp' && (
        <ForgotOtpStep
          otp={flow.otp}
          onOtpChange={flow.setOtp}
          email={flow.email}
          onSubmit={flow.submitForgotOtp}
          onBack={() => flow.setStep('forgot-email')}
          isLoading={flow.isLoading}
        />
      )}

      {flow.step === 'forgot-reset' && (
        <ForgotResetStep
          password={flow.password}
          onPasswordChange={flow.setPassword}
          onSubmit={flow.submitNewPassword}
          onBack={() => flow.setStep('forgot-email')}
          isLoading={flow.isLoading}
        />
      )}
      </div>

      {showChrome && (
        <QrLoginPanel
          token={qr.token}
          status={qr.status}
          isLoading={qr.isLoading}
          onRefresh={qr.refresh}
        />
      )}
    </div>
  );
}
