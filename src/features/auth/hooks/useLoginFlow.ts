'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as authApi from '../api/auth.api';
import { toAccountLookup, toAccounts, toAuthOutcome } from '../types/auth.mapper';
import type { Account, RememberedAccount } from '../types/auth.model';
import type { AuthResultDto } from '../types/auth.dto';
import type { FieldError, FieldName, LoginStep, LoginTab } from '../constants/auth.constants';
import { RESEND_COOLDOWN_SECONDS } from '../constants/auth.constants';
import { isValidEmail, isValidMobile } from '../utils/validators';
import { isRejectedInput, messageOf, statusOf } from '@/lib/api/errors';
import { useAuthSuccess } from './useAuthSuccess';
import { useRememberedAccounts } from './useRememberedAccounts';

class FieldValidationError extends Error {
  constructor(readonly field: FieldName, message: string) {
    super(message);
  }
}

function asFieldError(err: unknown, field: FieldName, extraStatuses: number[] = []): never {
  const status = statusOf(err);
  const belongsToField =
    isRejectedInput(err) || (status !== undefined && extraStatuses.includes(status));
  if (belongsToField) throw new FieldValidationError(field, messageOf(err));
  throw err;
}

function accountFromResult(dto: AuthResultDto, phone: string): Account | null {
  if (!dto.user) return null;
  const role = (dto.role || '').toLowerCase();
  return {
    id: `acc-${dto.user.id}`,
    username: dto.user.email,
    email: dto.user.email,
    phone,
    displayName: dto.user.name || dto.user.email,
    userType: role,
    organizationId: dto.user.societyId || '',
    organizationName: dto.organization?.name || 'Account',
    status: 'active',
    isSuperAdmin: role === 'superadmin',
  };
}

export function useLoginFlow() {
  const [tab, setTab] = useState<LoginTab>('password');
  const [step, setStep] = useState<LoginStep>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isOtpAccountChoice, setIsOtpAccountChoice] = useState(false);

  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<FieldError | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const onAuthSuccess = useAuthSuccess();
  const {
    accounts: rememberedAccounts,
    isRestored,
    remember,
    forget,
    forgetAll,
  } = useRememberedAccounts();

  const [isRememberedLogin, setIsRememberedLogin] = useState(false);

  const appliedRememberedRef = useRef(false);
  useEffect(() => {
    if (!isRestored || appliedRememberedRef.current) return;
    appliedRememberedRef.current = true;
    if (!rememberedAccounts.length) return;

    setIsRememberedLogin(true);
    setRememberMe(true);
    if (rememberedAccounts.length === 1) {
      const only = rememberedAccounts[0];
      setSelectedAccount(only.account);
      setEmail(only.email || only.account.email);
      if (only.phone) setMobile(only.phone);
      setStep(only.method === 'otp' ? 'account-otp' : 'password');
    } else {
      setStep('remembered');
    }
  }, [isRestored, rememberedAccounts]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const startResendCooldown = useCallback(() => setResendCooldown(RESEND_COOLDOWN_SECONDS), []);

  const clearFeedback = useCallback(() => {
    setError('');
    setSuccess('');
    setFieldError(null);
  }, []);

  const inFlightRef = useRef(false);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    clearFeedback();
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      if (err instanceof FieldValidationError) setFieldError({ field: err.field, message: err.message });
      else setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [clearFeedback]);

  const resetToStart = useCallback(() => {
    setIsRememberedLogin(false);
    setIsOtpAccountChoice(false);
    setStep(tab === 'otp' ? 'otp' : 'email');
    setAccounts([]);
    setSelectedAccount(null);
    setPassword('');
    setOtp('');
    setMobile('');
    setEmail('');
    setResendCooldown(0);
    clearFeedback();
  }, [clearFeedback, tab]);

  const switchTab = useCallback((next: LoginTab) => {
    setIsRememberedLogin(false);
    setIsOtpAccountChoice(false);
    setTab(next);
    setStep(next === 'otp' ? 'otp' : 'email');
    setAccounts([]);
    setSelectedAccount(null);
    setEmail('');
    setPassword('');
    setOtp('');
    setMobile('');
    setResendCooldown(0);
    clearFeedback();
  }, [clearFeedback]);

  const useRemembered = useCallback((entry: RememberedAccount) => {
    setSelectedAccount(entry.account);
    setEmail(entry.email || entry.account.email);
    if (entry.phone) setMobile(entry.phone);
    setIsRememberedLogin(true);
    setRememberMe(true);
    setStep(entry.method === 'otp' ? 'account-otp' : 'password');
    clearFeedback();
  }, [clearFeedback]);

  const forgetRemembered = useCallback((accountId: string) => {
    const next = forget(accountId);
    if (!next.length) {
      setRememberMe(false);
      setSelectedAccount(null);
      resetToStart();
    }
  }, [forget, resetToStart]);

  const addAnotherAccount = useCallback(() => {
    setRememberMe(true);
    resetToStart();
  }, [resetToStart]);

  const backFromRememberedAccount = useCallback(() => {
    if (isRememberedLogin && rememberedAccounts.length > 0) {
      setSelectedAccount(null);
      setPassword('');
      setStep('remembered');
      clearFeedback();
      return;
    }
    resetToStart();
  }, [clearFeedback, isRememberedLogin, rememberedAccounts.length, resetToStart]);

  const applyAccounts = useCallback((found: Account[], nextTab: LoginTab) => {
    if (found.length > 1) {
      setIsOtpAccountChoice(false);
      setAccounts(found);
      setStep('accounts');
      return;
    }
    const [account] = found;
    if (!account) return;
    setSelectedAccount(account);
    setMobile(account.phone || account.email);
    setStep(account.isSuperAdmin ? 'superadmin-password' : nextTab === 'password' ? 'password' : 'account-otp');
  }, []);

  const submitEmail = useCallback(() => run(async () => {
    const value = email.trim();
    if (!value) throw new FieldValidationError('email', 'Enter your email address');
    if (!isValidEmail(value)) throw new FieldValidationError('email', 'Enter a valid email address');

    const response = await authApi.checkAccounts(value).catch((err: unknown) => {
      if (isRejectedInput(err)) return null;
      throw err;
    });

    const lookup = response ? toAccountLookup(response) : { accounts: [], error: undefined };
    if (lookup.error) throw new FieldValidationError('email', lookup.error);
    if (!lookup.accounts.length) {
      throw new FieldValidationError('email', 'No account found for this email address');
    }
    applyAccounts(lookup.accounts, tab);
  }), [applyAccounts, email, run, tab]);

  const selectAccount = useCallback((account: Account) => {
    setSelectedAccount(account);
    setMobile(account.phone || account.email);
    setStep('password');
    clearFeedback();
  }, [clearFeedback]);

  const selectAccountForOtp = useCallback((account: Account) => {
    setSelectedAccount(account);
    setMobile(account.phone || account.email);
    setStep('account-otp');
    clearFeedback();
  }, [clearFeedback]);

  const settle = useCallback((
    result: AuthResultDto,
    fallbackName: string,
    method: 'password' | 'otp',
    accountOverride?: Account
  ) => {
    const outcome = toAuthOutcome(result, fallbackName);
    if (outcome.kind === 'authenticated') {
      onAuthSuccess(outcome.user, outcome.token, outcome.raw);

      const account = accountOverride ?? selectedAccount ?? accountFromResult(result, mobile);
      if (rememberMe) {
        if (account) remember(account, outcome.user.email, method, mobile || account.phone);
      } else if (account) {
        forget(account.id);
      }
      return true;
    }
    if (outcome.kind === 'account-choice') {
      setIsOtpAccountChoice(false);
      setAccounts(outcome.accounts);
      setStep('accounts');
      return false;
    }
    setError(outcome.message);
    return false;
  }, [onAuthSuccess, rememberMe, selectedAccount, remember, forget, mobile]);

  const submitSuperAdminPassword = useCallback(() => run(async () => {
    if (!email) throw new FieldValidationError('email', 'Enter your email address');
    if (!password) throw new FieldValidationError('password', 'Enter your password');
    const result = await authApi
      .loginWithEmail(email, password)
      .catch((err: unknown) => asFieldError(err, 'password', [401]));
    settle(result, email, 'password');
  }), [email, password, run, settle]);

  const submitPassword = useCallback(() => run(async () => {
    if (!selectedAccount) throw new Error('Select an account first');
    if (!password) throw new FieldValidationError('password', 'Enter your password');

    const result = await authApi
      .loginWithAccount(selectedAccount.id, password)
      .catch((err: unknown) => asFieldError(err, 'password', [401]));

    settle(result, selectedAccount.username, 'password');
  }), [password, run, selectedAccount, settle]);

  const requestMobileOtp = useCallback(() => run(async () => {
    if (!mobile.trim()) throw new FieldValidationError('mobile', 'Enter your mobile number');
    if (!isValidMobile(mobile)) {
      throw new FieldValidationError('mobile', 'Enter a valid 10-digit mobile number');
    }
    const cleanDigits = mobile.replace(/\D/g, '').slice(-10);
    const formatted = `+91${cleanDigits}`;
    const result = await authApi
      .sendOtpToMobile(formatted, '+91')
      .catch((err: unknown) => asFieldError(err, 'mobile'));
    if (!result.success) throw new FieldValidationError('mobile', result.message || 'Failed to send OTP');
    setMobile(formatted);
    setOtp('');
    setStep('verify');
    startResendCooldown();
  }), [mobile, run, startResendCooldown]);

  const requestAccountOtp = useCallback(() => run(async () => {
    if (!selectedAccount) throw new Error('Select an account first');
    const result = await authApi.sendOtpToAccount(selectedAccount.id, '+91');
    if (!result.success) throw new Error(result.message || 'Failed to send OTP');
    setOtp('');
    setStep('verify');
    startResendCooldown();
  }), [run, selectedAccount, startResendCooldown]);

  const verifyOtp = useCallback((code?: string) => run(async () => {
    const value = code || otp;
    if (!value) throw new FieldValidationError('otp', 'Enter the code we sent you');

    const result = selectedAccount
      ? await authApi
          .verifyAccountOtp(selectedAccount.id, value, '+91')
          .catch((err: unknown) => asFieldError(err, 'otp'))
      : await authApi
          .verifyMobileOtp(mobile, value, '+91')
          .catch((err: unknown) => asFieldError(err, 'otp'));

    if (result.accounts && result.accounts.length > 1) {
      setIsOtpAccountChoice(true);
      setAccounts(toAccounts(result.accounts));
      setStep('accounts');
      return;
    }
    settle(result, selectedAccount?.username || '', 'otp');
  }), [mobile, otp, run, selectedAccount, settle]);

  const chooseOtpAccount = useCallback((account: Account) => run(async () => {
    const result = await authApi
      .verifyMobileOtp(mobile, otp, '+91', account.id)
      .catch((err: unknown) => asFieldError(err, 'otp'));
    setIsOtpAccountChoice(false);
    settle(result, account.username, 'otp', account);
  }), [mobile, otp, run, settle]);

  const resendOtp = useCallback(() => run(async () => {
    const result = selectedAccount
      ? await authApi.sendOtpToAccount(selectedAccount.id, '+91')
      : await authApi.sendOtpToMobile(mobile, '+91');
    if (!result.success) throw new Error(result.message || 'Failed to resend OTP');
    setOtp('');
    setSuccess(result.message || 'OTP sent again.');
    startResendCooldown();
  }), [mobile, run, selectedAccount, startResendCooldown]);

  const startForgotPassword = useCallback(() => {
    setOtp('');
    setPassword('');
    setStep('forgot-email');
    clearFeedback();
  }, [clearFeedback]);

  const submitForgotEmail = useCallback(() => run(async () => {
    if (!email) throw new Error('Please enter your email');
    const result = await authApi.sendForgotPasswordOtp(email);
    if (!result.success) throw new Error(result.message || 'Failed to send reset code');
    setStep('forgot-otp');
    startResendCooldown();
  }), [email, run, startResendCooldown]);

  const submitForgotOtp = useCallback(() => run(async () => {
    if (!otp) throw new Error('Please enter the reset code');
    const result = await authApi.verifyForgotPasswordOtp(email, otp);
    if (!result.success) throw new Error(result.message || 'Invalid reset code');
    setStep('forgot-reset');
  }), [email, otp, run]);

  const submitNewPassword = useCallback(() => run(async () => {
    if (!password) throw new Error('Please enter a new password');
    const result = await authApi.resetPassword(email, otp, password);
    if (!result.success) throw new Error(result.message || 'Failed to reset password');
    setPassword('');
    setOtp('');
    setStep('email');
    setSuccess('Password updated. Sign in with your new password.');
  }), [email, otp, password, run]);

  return {
    tab, step, email, password, mobile, otp,
    accounts, selectedAccount, error, fieldError, success, isLoading,
    rememberMe, isRememberedLogin, rememberedAccounts,
    isOtpAccountChoice, resendCooldown,
    setEmail, setPassword, setMobile, setOtp, setRememberMe, setStep,
    switchTab, resetToStart, clearFeedback,
    useRemembered, forgetRemembered, forgetAllRemembered: forgetAll,
    addAnotherAccount, backFromPassword: backFromRememberedAccount,
    submitEmail, selectAccount, selectAccountForOtp,
    submitPassword, submitSuperAdminPassword,
    requestMobileOtp, requestAccountOtp, verifyOtp, chooseOtpAccount, resendOtp,
    startForgotPassword, submitForgotEmail, submitForgotOtp, submitNewPassword,
  };
}
