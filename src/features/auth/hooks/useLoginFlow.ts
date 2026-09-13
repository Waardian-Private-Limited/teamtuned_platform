'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as authApi from '../api/auth.api';
import { toAccountLookup, toAuthOutcome } from '../model/auth.mapper';
import type { Account } from '../model/auth.model';
import type { FieldError, FieldName, LoginStep, LoginTab } from '../constants/auth.constants';
import { isValidEmail, isValidMobile } from '../constants/auth.constants';
import { useAuthSuccess } from './useAuthSuccess';
import { useRememberedAccounts } from './useRememberedAccounts';

/** Indian numbers are stored E.164; accept the bare 10 digits users actually type. */
function toE164(mobile: string): string {
  const trimmed = mobile.trim();
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('91')) return `+${trimmed}`;
  return `+91${trimmed}`;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

/**
 * An error that belongs under a specific input rather than in the banner at the
 * top of the card. `run` unpacks it and routes the message to that field.
 */
class FieldValidationError extends Error {
  constructor(readonly field: FieldName, message: string) {
    super(message);
  }
}

/**
 * Statuses that mean "the value you typed is wrong", as opposed to "the request
 * failed". These belong under the input; anything else is a card-level banner.
 */
const REJECTED_INPUT_STATUSES = new Set([400, 404, 422]);

function isRejectedInput(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status !== undefined && REJECTED_INPUT_STATUSES.has(status);
}

/**
 * The whole login state machine: which step is on screen, the values typed into
 * it, and the handlers that move between steps. Owns no markup — the UI layer
 * renders whatever `step` says.
 */
export function useLoginFlow() {
  const [tab, setTab] = useState<LoginTab>('password');
  const [step, setStep] = useState<LoginStep>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<FieldError | null>(null);
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onAuthSuccess = useAuthSuccess();
  const {
    accounts: rememberedAccounts,
    isRestored,
    remember,
    forget,
    forgetAll,
  } = useRememberedAccounts();

  /** True while the user is signing in via a saved account rather than an email. */
  const [isRememberedLogin, setIsRememberedLogin] = useState(false);

  // Open on the saved accounts once storage has been read. One saved account
  // goes straight to its password step; several show the picker.
  useEffect(() => {
    if (!isRestored || !rememberedAccounts.length) return;
    setIsRememberedLogin(true);
    setRememberMe(true);
    if (rememberedAccounts.length === 1) {
      const only = rememberedAccounts[0];
      setSelectedAccount(only.account);
      setEmail(only.email || only.account.email);
      setStep('password');
    } else {
      setStep('remembered');
    }
  }, [isRestored, rememberedAccounts]);

  const clearFeedback = useCallback(() => {
    setError('');
    setSuccess('');
    setFieldError(null);
  }, []);

  // Guards against a second submission landing before isLoading has rendered —
  // the OTP step can auto-submit and be tapped in the same frame.
  const inFlightRef = useRef(false);

  /** Wraps a handler with the loading flag and one error surface. */
  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    clearFeedback();
    setIsLoading(true);
    try {
      await action();
    } catch (err) {
      // Validation lands under its input; anything else is a card-level banner.
      if (err instanceof FieldValidationError) setFieldError({ field: err.field, message: err.message });
      else setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [clearFeedback]);

  const resetToStart = useCallback(() => {
    setIsRememberedLogin(false);
    setStep(tab === 'otp' ? 'otp' : 'email');
    setAccounts([]);
    setSelectedAccount(null);
    setPassword('');
    setOtp('');
    setMobile('');
    setEmail('');
    clearFeedback();
  }, [clearFeedback, tab]);

  const switchTab = useCallback((next: LoginTab) => {
    setIsRememberedLogin(false);
    setTab(next);
    setStep(next === 'otp' ? 'otp' : 'email');
    setAccounts([]);
    setSelectedAccount(null);
    setEmail('');
    setPassword('');
    setOtp('');
    setMobile('');
    clearFeedback();
  }, [clearFeedback]);

  /** Picks one of the saved accounts and jumps to its password step. */
  const useRemembered = useCallback((entry: (typeof rememberedAccounts)[number]) => {
    setSelectedAccount(entry.account);
    setEmail(entry.email || entry.account.email);
    setIsRememberedLogin(true);
    setRememberMe(true);
    setStep('password');
    clearFeedback();
  }, [clearFeedback]);

  /** Removes one saved account; returns to the email step if none are left. */
  const forgetRemembered = useCallback((accountId: string) => {
    forget(accountId);
    if (rememberedAccounts.length <= 1) {
      setRememberMe(false);
      setSelectedAccount(null);
      resetToStart();
    }
  }, [forget, rememberedAccounts.length, resetToStart]);

  /** "Use a different account" — keeps the saved list, goes back to email entry. */
  const addAnotherAccount = useCallback(() => {
    setRememberMe(true);
    resetToStart();
  }, [resetToStart]);

  /** Back from a password step to whichever screen the user came from.
   *  Any saved account routes to the list, including a single one — that list
   *  is the only place an account can be removed. */
  const backFromPassword = useCallback(() => {
    if (isRememberedLogin && rememberedAccounts.length > 0) {
      setSelectedAccount(null);
      setPassword('');
      setStep('remembered');
      clearFeedback();
      return;
    }
    resetToStart();
  }, [clearFeedback, isRememberedLogin, rememberedAccounts.length, resetToStart]);

  /** Routes to the picker, the superadmin step, or straight to credentials. */
  const applyAccounts = useCallback((found: Account[], nextTab: LoginTab) => {
    if (found.length > 1) {
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

    // The backend answers an unknown address with 404, so a rejected lookup is
    // a validation result, not a failure — it belongs under the field.
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

  /** Shared tail for every credential submission. */
  const settle = useCallback((result: Awaited<ReturnType<typeof authApi.loginWithAccount>>, fallbackName: string) => {
    const outcome = toAuthOutcome(result, fallbackName);
    if (outcome.kind === 'authenticated') {
      onAuthSuccess(outcome.user, outcome.token, outcome.raw);
      return true;
    }
    if (outcome.kind === 'account-choice') {
      setAccounts(outcome.accounts);
      setStep('accounts');
      return false;
    }
    setError(outcome.message);
    return false;
  }, [onAuthSuccess]);

  const submitSuperAdminPassword = useCallback(() => run(async () => {
    if (!email || !password) throw new Error('Please enter email and password');
    settle(await authApi.loginWithEmail(email, password), email);
  }), [email, password, run, settle]);

  const submitPassword = useCallback(() => run(async () => {
    if (!selectedAccount) throw new Error('Select an account first');
    if (!password) throw new FieldValidationError('password', 'Enter your password');

    const result = await authApi.loginWithAccount(selectedAccount.id, password);
    const loggedIn = settle(result, selectedAccount.username);
    // Persist the choice only once the credentials are known good.
    if (loggedIn) {
      if (rememberMe) remember(selectedAccount, email || selectedAccount.email);
      else forget(selectedAccount.id);
    }
  }), [email, forget, password, remember, rememberMe, run, selectedAccount, settle]);

  const requestMobileOtp = useCallback(() => run(async () => {
    if (!mobile.trim()) throw new FieldValidationError('mobile', 'Enter your mobile number');
    if (!isValidMobile(mobile)) {
      throw new FieldValidationError('mobile', 'Enter a valid 10-digit mobile number');
    }
    const cleanDigits = mobile.replace(/\D/g, '').slice(-10);
    const formatted = `+91${cleanDigits}`;
    const result = await authApi.sendOtpToMobile(formatted, '+91');
    if (!result.success) throw new Error(result.message || 'Failed to send OTP');
    setMobile(formatted);
    setOtp('');
    setStep('verify');
  }), [mobile, run]);

  const requestAccountOtp = useCallback(() => run(async () => {
    if (!selectedAccount) throw new Error('Select an account first');
    const result = await authApi.sendOtpToAccount(selectedAccount.id, '+91');
    if (!result.success) throw new Error(result.message || 'Failed to send OTP');
    setOtp('');
    setStep('verify');
  }), [run, selectedAccount]);

  /** `code` lets the OTP input auto-submit before its state update lands. */
  const verifyOtp = useCallback((code?: string) => run(async () => {
    const value = code || otp;
    if (!value) throw new Error('Please enter the OTP');
    const result = selectedAccount
      ? await authApi.verifyAccountOtp(selectedAccount.id, value, '+91')
      : await authApi.verifyMobileOtp(mobile, value, '+91');
    settle(result, selectedAccount?.username || '');
  }), [mobile, otp, run, selectedAccount, settle]);

  const resendOtp = useCallback(() => run(async () => {
    const result = selectedAccount
      ? await authApi.sendOtpToAccount(selectedAccount.id, '+91')
      : await authApi.sendOtpToMobile(mobile, '+91');
    if (!result.success) throw new Error(result.message || 'Failed to resend OTP');
    setOtp('');
    setSuccess(result.message || 'OTP sent again.');
  }), [mobile, run, selectedAccount]);

  /* ---------- Forgot password ---------- */

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
  }), [email, run]);

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
    // state
    tab, step, email, password, mobile, otp,
    accounts, selectedAccount, error, fieldError, success, isLoading,
    rememberMe, isRememberedLogin, rememberedAccounts,
    // setters used by controlled inputs
    setEmail, setPassword, setMobile, setOtp, setRememberMe, setStep,
    // actions
    switchTab, resetToStart, clearFeedback,
    useRemembered, forgetRemembered, forgetAllRemembered: forgetAll,
    addAnotherAccount, backFromPassword,
    submitEmail, selectAccount, selectAccountForOtp,
    submitPassword, submitSuperAdminPassword,
    requestMobileOtp, requestAccountOtp, verifyOtp, resendOtp,
    startForgotPassword, submitForgotEmail, submitForgotOtp, submitNewPassword,
  };
}
