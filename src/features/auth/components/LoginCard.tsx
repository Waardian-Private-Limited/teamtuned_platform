'use client';

import { useLoginFlow } from '../hooks/useLoginFlow';
import { useQrLogin } from '../hooks/useQrLogin';
import { STEPS_WITH_TABS, STEP_PRIMARY_FIELD, type FieldName } from '../constants/auth.constants';
import { Alert } from '@/components/ui/Alert';
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

export function LoginCard() {
  const flow = useLoginFlow();
  const qr = useQrLogin();

  const showChrome = STEPS_WITH_TABS.includes(flow.step);

  // A field-scoped error goes on its field; a general one goes on whatever
  // input this step is about. Only an error with nowhere to land is shown as
  // standalone text, so nothing is ever silently dropped.
  const primaryField = STEP_PRIMARY_FIELD[flow.step];
  const errorFor = (field: FieldName) => {
    if (flow.fieldError?.field === field) return flow.fieldError.message;
    if (flow.error && primaryField === field) return flow.error;
    return undefined;
  };
  const unattachedError = flow.error && !primaryField ? flow.error : '';

  return (
    <div className="flex w-full flex-col gap-4">
      {showChrome && (
        <AuthTabs value={flow.tab} onChange={flow.switchTab} disabled={flow.isLoading} />
      )}

      <Alert message={unattachedError} tone="error" />
      <Alert message={flow.success} tone="success" />

      <div key={flow.step} className="tt-fade-in">
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
            mode={flow.isOtpAccountChoice ? 'otp-continue' : 'credentials'}
            onSelect={flow.selectAccount}
            onSelectForOtp={flow.selectAccountForOtp}
            onContinue={flow.chooseOtpAccount}
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
            rememberMe={flow.rememberMe}
            onRememberMeChange={flow.setRememberMe}
            isLoading={flow.isLoading}
          />
        )}

        {flow.step === 'otp' && (
          <OtpRequestStep
            mobile={flow.mobile}
            onMobileChange={(v) => { flow.setMobile(v); flow.clearFeedback(); }}
            onSubmit={flow.requestMobileOtp}
            rememberMe={flow.rememberMe}
            onRememberMeChange={flow.setRememberMe}
            isLoading={flow.isLoading}
            error={errorFor('mobile')}
          />
        )}

        {flow.step === 'account-otp' && flow.selectedAccount && (
          <AccountOtpStep
            account={flow.selectedAccount}
            onSubmit={flow.requestAccountOtp}
            onBack={flow.backFromPassword}
            rememberMe={flow.rememberMe}
            onRememberMeChange={flow.setRememberMe}
            isLoading={flow.isLoading}
          />
        )}

        {flow.step === 'verify' && (
          <OtpVerifyStep
            otp={flow.otp}
            onOtpChange={(v) => { flow.setOtp(v); flow.clearFeedback(); }}
            destination={flow.mobile}
            onSubmit={flow.verifyOtp}
            onResend={flow.resendOtp}
            onBack={flow.resetToStart}
            rememberMe={flow.rememberMe}
            onRememberMeChange={flow.setRememberMe}
            isLoading={flow.isLoading}
            error={errorFor('otp')}
            resendCooldown={flow.resendCooldown}
          />
        )}

        {flow.step === 'forgot-email' && (
          <ForgotEmailStep
            email={flow.email}
            onEmailChange={(v) => { flow.setEmail(v); flow.clearFeedback(); }}
            onSubmit={flow.submitForgotEmail}
            onBack={flow.resetToStart}
            isLoading={flow.isLoading}
            error={errorFor('email')}
          />
        )}

        {flow.step === 'forgot-otp' && (
          <ForgotOtpStep
            otp={flow.otp}
            onOtpChange={(v) => { flow.setOtp(v); flow.clearFeedback(); }}
            email={flow.email}
            onSubmit={flow.submitForgotOtp}
            onBack={() => flow.setStep('forgot-email')}
            isLoading={flow.isLoading}
            error={errorFor('otp')}
          />
        )}

        {flow.step === 'forgot-reset' && (
          <ForgotResetStep
            password={flow.password}
            onPasswordChange={(v) => { flow.setPassword(v); flow.clearFeedback(); }}
            onSubmit={flow.submitNewPassword}
            onBack={() => flow.setStep('forgot-email')}
            isLoading={flow.isLoading}
            error={errorFor('password')}
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
