'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Mail, Lock, Smartphone, Building2, Eye, EyeOff, QrCode, Monitor, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { login, verifyOtp, checkAccounts, loginWithAccount, sendWebOtp, verifyWebOtp, Account, sendForgotPasswordOtp, verifyForgotPasswordOtp, resetPassword, apiClient } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';
import { useAuth } from '@/context/AuthContext';
import { getSocket, disconnectSocket } from '@/lib/socket';

type LoginStep = 'email' | 'accounts' | 'password' | 'otp' | 'verify' | 'account-otp' | 'superadmin-password' | 'forgot-email' | 'forgot-otp' | 'forgot-reset';

export default function LoginFormTabs() {
  const [tab, setTab] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<LoginStep>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // QR Login state
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'pending' | 'scanned' | 'confirmed' | 'expired'>('pending');
  const [qrLoading, setQrLoading] = useState(false);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTokenRef = useRef<string | null>(null);
  const requestSeqRef = useRef<number>(0);
  const verifyingRef = useRef<boolean>(false);

  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  const { setAuthState } = useAuth();

  // ---- QR Login Logic ----
  const stopQrPolling = useCallback(() => {
    if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
    if (qrExpireRef.current) { clearTimeout(qrExpireRef.current); qrExpireRef.current = null; }
    disconnectSocket();
  }, []);

  const handleQrLoginSuccess = useCallback(async (response: any) => {
    stopQrPolling();
    const user = {
      ...response.user,
      id: String(response.user.id),
      role: response.role || '',
      name: response.user.name || response.user.email,
      features: response.organization_features ? response.organization_features.map((f: any) => f.code) : [],
    };
    setUser(user);
    if (response.token) {
      localStorage.setItem('token', response.token);
      try {
        await apiClient('/auth/qr/set-cookie', {
          method: 'POST',
          body: { token: response.token }
        });
      } catch (err) {
        console.warn('Failed to set HTTP session cookie via backend:', err);
      }
    }
    setAuthState(response);
    const roleRoutes: Record<string, string> = { superAdmin: '/superadmin', OrgAdmin: '/org-admin', Employee: '/employee', default: '/dashboard' };
    router.push(roleRoutes[response.role || 'default'] || roleRoutes.default);
  }, [router, setAuthState, setUser, stopQrPolling]);

  const generateQrSession = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    try {
      setQrLoading(true);
      setQrStatus('pending');
      stopQrPolling();
      const data = await apiClient<{ success: boolean; token: string }>('/auth/qr/generate');
      if (seq !== requestSeqRef.current) return;
      if (!data.success) return;
      
      currentTokenRef.current = data.token;
      setQrToken(data.token);
      
      // Expire after 5 minutes
      qrExpireRef.current = setTimeout(() => {
        if (currentTokenRef.current !== data.token) return;
        setQrStatus('expired');
        stopQrPolling();
      }, 5 * 60 * 1000);

      // Connect to Socket.io and join QR room for real-time login
      try {
        const socket = getSocket(undefined, true);
        if (socket) {
          const join = () => {
            if (currentTokenRef.current !== data.token) return;
            socket.emit('join_qr', data.token);
            console.log('📤 Emitted join_qr on connect:', data.token);
          };
          if (socket.connected) {
            join();
          } else {
            socket.on('connect', join);
          }

          socket.off('qr_login_success'); // Clear any old listener
          socket.on('qr_login_success', async (response: any) => {
            if (currentTokenRef.current !== data.token) return;
            console.log('📥 received qr_login_success:', response);
            setQrStatus('confirmed');
            stopQrPolling();
            await handleQrLoginSuccess(response);
          });
        }
      } catch (socketErr) {
        console.warn('Failed to initialize QR socket:', socketErr);
      }

      // Check socket status after 2 seconds. Start HTTP polling ONLY if socket is NOT connected!
      setTimeout(() => {
        if (currentTokenRef.current !== data.token) return;

        const socket = getSocket(undefined, true);
        if (socket && socket.connected) {
          console.log('🔌 Socket is connected. Skipping fallback HTTP polling.');
          return;
        }

        console.log('🔌 Socket is not connected. Starting fallback HTTP polling...');
        const intervalId = setInterval(async () => {
          try {
            const poll = await apiClient<any>(`/auth/qr/status/${data.token}`);
            
            if (currentTokenRef.current !== data.token) {
              clearInterval(intervalId);
              return;
            }
            
            if (poll.status === 'scanned') { setQrStatus('scanned'); }
            if (poll.status === 'confirmed') {
              setQrStatus('confirmed');
              stopQrPolling();
              await handleQrLoginSuccess(poll);
            }
            if (poll.success === false) {
              setQrStatus('expired');
              stopQrPolling();
            }
          } catch (pollErr: any) {
            if (currentTokenRef.current !== data.token) {
              clearInterval(intervalId);
              return;
            }
            console.warn('QR poll fallback error (retrying):', pollErr);
            // If the server explicitly says the session is gone/expired, set to expired and stop
            if (pollErr && (pollErr.status === 404 || pollErr.status === 410 || pollErr.status === 400)) {
              setQrStatus('expired');
              stopQrPolling();
            }
          }
        }, 3000); // 3 seconds interval is gentler than 2 seconds
        qrPollRef.current = intervalId;
      }, 2000);
    } catch (e) {
      console.error('QR generate error', e);
    } finally {
      if (seq === requestSeqRef.current) {
        setQrLoading(false);
      }
    }
  }, [handleQrLoginSuccess, stopQrPolling]);

  // Generate QR on mount, clean up on unmount (stable ref wrapper to run exactly once)
  const generateQrRef = useRef(generateQrSession);
  generateQrRef.current = generateQrSession;

  useEffect(() => {
    generateQrRef.current();
    return () => {
      if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
      if (qrExpireRef.current) { clearTimeout(qrExpireRef.current); qrExpireRef.current = null; }
      disconnectSocket();
    };
  }, []);

  // Tab switcher: reset state and set appropriate first step
  const handleTabSwitch = (newTab: 'password' | 'otp') => {
    setTab(newTab);
    setStep(newTab === 'otp' ? 'otp' : 'email');
    setAccounts([]);
    setSelectedAccount(null);
    setEmail('');
    setPassword('');
    setOtp('');
    setMobile('');
    setError('');
  };

  const resetToStep = () => {
    setStep(tab === 'otp' ? 'otp' : 'email');
    setAccounts([]);
    setSelectedAccount(null);
    setEmail('');
    setPassword('');
    setOtp('');
    setMobile('');
    setError('');
  };

  const [rememberMe, setRememberMe] = useState(false);
  const [isRememberedLogin, setIsRememberedLogin] = useState(false);

  // Load remembered account
  useEffect(() => {
    const stored = localStorage.getItem('tt_remembered_account');
    if (stored) {
      try {
        const { account, email: storedEmail } = JSON.parse(stored);
        if (account && account.id) {
          setSelectedAccount(account);
          setEmail(storedEmail || account.email);
          setStep('password');
          setRememberMe(true);
          setIsRememberedLogin(true);
        }
      } catch (e) {
        console.error('Failed to parse remembered account', e);
        localStorage.removeItem('tt_remembered_account');
      }
    }
  }, []);

  // Back handler for remembered login
  const handleSwitchAccount = () => {
    localStorage.removeItem('tt_remembered_account');
    setRememberMe(false);
    setIsRememberedLogin(false);
    resetToStep();
  };

  // ----- Handlers -----
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email) throw new Error('Please enter your email');

      const response = await checkAccounts(email);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.account && (response.account.userType || '').toLowerCase() === 'superadmin') {
        setSelectedAccount(response.account);
        setStep('superadmin-password');
        setMobile(response.account.phone || response.account.email);
      } else if (response.accounts && response.accounts.length > 1) {
        setAccounts(response.accounts);
        setStep('accounts');
      } else if (response.account) {
        setSelectedAccount(response.account);
        setStep(tab === 'password' ? 'password' : 'otp');
        setMobile(response.account.phone || response.account.email);
      } else {
        setError('No valid accounts found');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setStep(tab === 'password' ? 'password' : 'otp');
    setMobile(account.phone || account.email);
  };

  const handleAccountOtpSelect = (account: Account) => {
    setSelectedAccount(account);
    setMobile(account.phone || account.email);
    setStep('account-otp');
    setError('');
  };

  const handleSuperadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!email || !password) throw new Error('Please enter email and password');

      const response = await login({ type: 'password', email, password });

      if (response.success && response.user) {
        const user = {
          ...response.user,
          id: String(response.user.id),
          role: response.role || '',
          name: response.user.name || email,
          features: response.organization_features ? response.organization_features.map((f: any) => f.code) : [],
        };
        setUser(user);

        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        setAuthState(response);
        const roleRoutes: { [key: string]: string } = {
          superAdmin: '/superadmin',
          OrgAdmin: '/org-admin',
          Employee: '/employee',
          default: '/dashboard',
        };
        router.push(roleRoutes[response.role || 'default'] || roleRoutes.default);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!selectedAccount || !password) throw new Error('Please enter your password');

      const response = await loginWithAccount(selectedAccount.id, password);

      if (response.success && response.user) {
        if (rememberMe) {
          localStorage.setItem('tt_remembered_account', JSON.stringify({
            account: selectedAccount,
            email: email || selectedAccount.email
          }));
        } else {
          localStorage.removeItem('tt_remembered_account');
        }

        const user = {
          ...response.user,
          id: String(response.user.id),
          role: response.role || '',
          name: response.user.name || selectedAccount.username,
          societyName: selectedAccount.societyName || '',
          features: response.organization_features ? response.organization_features.map((f: any) => f.code) : [],
        };
        setUser(user);

        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        setAuthState(response);
        const roleRoutes: { [key: string]: string } = {
          superAdmin: '/superadmin',
          OrgAdmin: '/org-admin',
          Employee: '/employee',
          default: '/dashboard',
        };
        router.push(roleRoutes[response.role || 'default'] || roleRoutes.default);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!mobile) throw new Error('Please enter your mobile number');

      let formattedMobile = mobile.trim();
      if (!formattedMobile.startsWith('+91') && !formattedMobile.startsWith('91')) {
        formattedMobile = '+91' + formattedMobile;
      } else if (formattedMobile.startsWith('91') && !formattedMobile.startsWith('+91')) {
        formattedMobile = '+' + formattedMobile;
      }

      const response = await login({ type: 'otp', mobile: formattedMobile });
      if (response.success) {
        setMobile(formattedMobile);
        setStep('verify');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountOtpRequest = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await sendWebOtp(selectedAccount.id);
      if (result.success) {
        setStep('verify');
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent, otpOverride?: string) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    setError('');
    setIsLoading(true);

    const activeOtp = otpOverride || otp;
    try {
      if (!activeOtp) throw new Error('Please enter the OTP');

      const response = selectedAccount 
        ? await verifyWebOtp(selectedAccount.id, activeOtp)
        : await verifyOtp(mobile, activeOtp);

      if (response.success && response.user) {
        const user = {
          ...response.user,
          id: String(response.user.id),
          role: response.role || '',
          name: response.user.name || selectedAccount?.username || '',
          features: response.organization_features ? response.organization_features.map((f: any) => f.code) : [],
        };
        setUser(user);

        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        setAuthState(response);
        const roleRoutes: { [key: string]: string } = {
          superAdmin: '/superadmin',
          OrgAdmin: '/org-admin',
          Employee: '/employee',
          default: '/dashboard',
        };
        router.push(roleRoutes[response.role || 'default'] || roleRoutes.default);
      } else if (response.accounts && response.accounts.length > 1) {
        setAccounts(response.accounts);
        setStep('accounts');
      } else {
        setError(response.message || 'OTP verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      verifyingRef.current = false;
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      if (selectedAccount) {
        const response = await sendWebOtp(selectedAccount.id);
        if (response.success) setError(response.message || 'OTP resent successfully');
        else setError(response.message || 'Failed to resend OTP');
      } else {
        if (!mobile) throw new Error('Mobile number is required');
        const response = await login({ type: 'otp', mobile });
        if (response.success) setError(response.message || 'OTP resent successfully');
        else setError(response.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Forgot Password Handlers -----
  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!email) throw new Error('Please enter your email');
      const res = await sendForgotPasswordOtp(email);
      if (res.success) setStep('forgot-otp');
      else setError(res.message || 'Failed to send OTP');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!otp) throw new Error('Please enter OTP');
      const res = await verifyForgotPasswordOtp(email, otp);
      if (res.success) setStep('forgot-reset');
      else setError(res.message || 'Invalid OTP');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!password) throw new Error('Please enter new password');
      const res = await resetPassword({ email, otp, newPassword: password });
      if (res.success) {
        setSuccess('Password reset successfully. Please login.');
        setStep('email');
      } else {
        setError(res.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      {/* Tab Switcher */}
      {step === 'email' || step === 'otp' || step === 'verify' || step === 'password' || step === 'superadmin-password' ? (
        <div className="flex justify-center mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => handleTabSwitch('password')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            disabled={isLoading}
          >
            With Password
          </button>
          <div className="relative group">
            <button
              onClick={() => handleTabSwitch('otp')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${tab === 'otp' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              disabled={isLoading}
            >
              With OTP
            </button>
          </div>
        </div>
      ) : null}

      {/* Step Content */}
      {step === 'email' && tab === 'password' && (
        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          {error && <ErrorBox message={error} />}
          {success && <SuccessBox message={success} />}
          <InputWithIcon label="Email" icon={<Mail className="w-5 h-5 text-gray-400" />} type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Checking...' : 'Continue'}</button>
        </form>
      )}

      {step === 'accounts' && (
        <AccountsStep accounts={accounts} error={error} onSelect={handleAccountSelect} onOtpSelect={handleAccountOtpSelect} onBack={resetToStep} isLoading={isLoading} />
      )}

      {step === 'account-otp' && selectedAccount && (
        <AccountOtpStep selectedAccount={selectedAccount} onSubmit={handleAccountOtpRequest} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'superadmin-password' && (
        <SuperadminPasswordStep email={email} password={password} setPassword={setPassword} onSubmit={handleSuperadminLogin} onBack={resetToStep} onForgot={() => setStep('forgot-email')} error={error} isLoading={isLoading} />
      )}

      {step === 'password' && selectedAccount && (
        <PasswordStep
          selectedAccount={selectedAccount}
          password={password}
          setPassword={setPassword}
          onSubmit={handlePasswordLogin}
          onBack={isRememberedLogin ? handleSwitchAccount : resetToStep}
          onForgot={() => setStep('forgot-email')}
          error={error}
          isLoading={isLoading}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
          isRemembered={isRememberedLogin}
        />
      )}

      {step === 'otp' && (
        <OtpRequestStep mobile={mobile} setMobile={setMobile} onSubmit={handleOtpRequest} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'verify' && (
        <OtpVerifyStep otp={otp} setOtp={setOtp} onSubmit={handleOtpVerify} onResend={handleResendOtp} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'forgot-email' && (
        <form className="space-y-5" onSubmit={handleForgotEmailSubmit}>
          <h3 className="text-lg font-semibold text-gray-900 text-center">Reset Password</h3>
          {error && <ErrorBox message={error} />}
          <InputWithIcon label="Email" icon={<Mail className="w-5 h-5 text-gray-400" />} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Sending...' : 'Send Reset Code'}</button>
          <button type="button" onClick={() => setStep('email')} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back to Login</button>
        </form>
      )}

      {step === 'forgot-otp' && (
        <form className="space-y-5" onSubmit={handleForgotOtpVerify}>
          <h3 className="text-lg font-semibold text-gray-900 text-center">Verify Reset Code</h3>
          {error && <ErrorBox message={error} />}
          <InputWithIcon label="OTP" icon={<Smartphone className="w-5 h-5 text-gray-400" />} type="tel" placeholder="Enter 6-digit code sent to your Email" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Verify' : 'Verify Code'}</button>
          <button type="button" onClick={() => setStep('forgot-email')} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
        </form>
      )}

      {step === 'forgot-reset' && (
        <form className="space-y-5" onSubmit={handleForgotReset}>
          <h3 className="text-lg font-semibold text-gray-900 text-center">New Password</h3>
          {error && <ErrorBox message={error} />}
          <InputWithIcon label="New Password" icon={<Lock className="w-5 h-5 text-gray-400" />} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Updating...' : 'Update Password'}</button>
          <button type="button" onClick={() => setStep('forgot-email')} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
        </form>
      )}

      {/* QR Login Section — shown on main login steps */}
      {(step === 'email' || step === 'password' || step === 'otp' || step === 'verify' || step === 'superadmin-password') && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          {/* OR divider */}
          <div className="flex items-center gap-2 mb-2 justify-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">or scan to login</span>
          </div>
 
          {/* QR Panel */}
          <div className="flex flex-col items-center">
            <div className="relative p-2 bg-white border border-gray-100 rounded-xl shadow-sm">
              {/* QR Code */}
              {qrToken && qrStatus !== 'expired' ? (
                <>
                  <QRCodeSVG
                    value={`teamtuned://qr-login?token=${qrToken}`}
                    size={110}
                    bgColor="#ffffff"
                    fgColor={qrStatus === 'scanned' ? '#2563eb' : '#111827'}
                    level="M"
                    style={{ borderRadius: 6, display: 'block' }}
                  />
                  {/* Scanned overlay */}
                  {qrStatus === 'scanned' && (
                    <div className="absolute inset-2 rounded-lg bg-blue-600/10 flex flex-col items-center justify-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                        <Smartphone className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[9px] font-bold text-blue-700 text-center leading-tight">Scanned!<br/>Confirm on app</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-28 h-28 flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-lg">
                  {qrLoading ? (
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-6 h-6 text-gray-400" />
                      <p className="text-[10px] text-gray-500 text-center font-medium">QR expired</p>
                    </>
                  )}
                </div>
              )}
            </div>
 
            {/* Refresh button when expired */}
            {qrStatus === 'expired' && (
              <button
                type="button"
                onClick={generateQrSession}
                className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh QR code
              </button>
            )}
 
            {/* Hint */}
            <p className="mt-1.5 text-[10px] text-gray-400 text-center max-w-[220px] leading-tight">
              Open TeamTuned app → tap the QR icon in the top bar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Subcomponents ----------------

const ErrorBox = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">{message}</div>
);

const SuccessBox = ({ message }: { message: string }) => (
  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">{message}</div>
);

const AccountsStep = ({ accounts, error, onSelect, onOtpSelect, onBack, isLoading }: { accounts: Account[], error: string, onSelect: (acc: Account) => void, onOtpSelect: (acc: Account) => void, onBack: () => void, isLoading: boolean }) => (
  <div className="space-y-5">
    <h3 className="text-lg font-semibold text-gray-900 text-center">Select Account</h3>
    {error && <ErrorBox message={error} />}
    {accounts.map(acc => (
      <div key={acc.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <p className="font-medium">{acc.societyName}</p>
          <p className="text-sm text-gray-500">{acc.username} • {acc.email}</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => onSelect(acc)} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700" disabled={isLoading}>
            Login with Password
          </button>
          <button onClick={() => onOtpSelect(acc)} className="flex-1 border border-blue-600 text-blue-600 py-2 px-4 rounded-lg text-sm hover:bg-blue-50" disabled={isLoading}>
            Login with OTP
          </button>
        </div>
      </div>
    ))}
    <button onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </div>
);

const SuperadminPasswordStep = ({ email, password, setPassword, onSubmit, onBack, onForgot, error, isLoading }: { email: string, password: string, setPassword: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onBack: () => void, onForgot: () => void, error: string, isLoading: boolean }) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="font-medium text-gray-900">Superadmin Login</p>
      <p className="text-sm text-gray-500">{email}</p>
    </div>
    <InputWithIcon label="Password" icon={<Lock className="w-5 h-5 text-gray-400" />} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Logging in...' : 'Login'}</button>
    <div className="text-right">
      <button type="button" onClick={onForgot} className="text-sm text-blue-600 hover:text-blue-800">Forgot Password?</button>
    </div>
    <button type="button" onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </form>
);

const PasswordStep = ({
  selectedAccount, password, setPassword, onSubmit, onBack, onForgot, error, isLoading, rememberMe, setRememberMe, isRemembered
}: {
  selectedAccount: Account, password: string, setPassword: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onBack: () => void, onForgot: () => void, error: string, isLoading: boolean,
  rememberMe: boolean, setRememberMe: (v: boolean) => void, isRemembered: boolean
}) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{selectedAccount.societyName || 'Account'}</p>
        <p className="text-sm text-gray-500">{selectedAccount.username}</p>
      </div>
      {isRemembered && (
        <button type="button" onClick={onBack} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Switch</button>
      )}
    </div>
    <InputWithIcon label="Password" icon={<Lock className="w-5 h-5 text-gray-400" />} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label>
      </div>
      <button type="button" onClick={onForgot} className="text-sm text-blue-600 hover:text-blue-800">Forgot Password?</button>
    </div>
    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Logging in...' : 'Login'}</button>
    {!isRemembered && (
      <button type="button" onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
    )}
  </form>
);

const OtpRequestStep = ({ mobile, setMobile, onSubmit, onBack, error, isLoading }: { mobile: string, setMobile: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onBack: () => void, error: string, isLoading: boolean }) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <InputWithIcon 
      label="Mobile" 
      icon={<Smartphone className="w-5 h-5 text-gray-400" />} 
      type="tel" 
      placeholder="Enter 10-digit mobile number" 
      value={mobile} 
      onChange={e => {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length <= 10) {
          setMobile(value);
        }
      }} 
      disabled={isLoading} 
    />
    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Sending...' : 'Send OTP'}</button>
    <button type="button" onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </form>
);

const AccountOtpStep = ({ selectedAccount, onSubmit, onBack, error, isLoading }: { selectedAccount: Account, onSubmit: () => void, onBack: () => void, error: string, isLoading: boolean }) => (
  <div className="space-y-5">
    <h3 className="text-lg font-semibold text-gray-900 text-center">Send OTP</h3>
    {error && <ErrorBox message={error} />}
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="font-medium">{selectedAccount.societyName}</p>
      <p className="text-sm text-gray-500">{selectedAccount.username} • {selectedAccount.email}</p>
    </div>
    <p className="text-sm text-gray-600 text-center">We'll send an OTP to your registered mobile number</p>
    <button onClick={onSubmit} disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">
      {isLoading ? 'Sending...' : 'Send OTP'}
    </button>
    <button onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </div>
);

const OtpVerifyStep = ({ otp, setOtp, onSubmit, onResend, onBack, error, isLoading }: { otp: string, setOtp: (v: string) => void, onSubmit: (e: React.FormEvent, otpVal?: string) => void, onResend: () => void, onBack: () => void, error: string, isLoading: boolean }) => {
  const [otpStatus, setOtpStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const formRef = React.useRef<HTMLFormElement>(null);

  // When verification is successful, trigger success animation
  useEffect(() => {
    if (!isLoading && otpStatus === 'verifying') {
      // If no error after loading completes, assume success for demo; in real app, check result
      if (!error) {
        setOtpStatus('success');
      } else {
        setOtpStatus('failed');
      }
    }
  }, [isLoading, error, otpStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpStatus('verifying');
    onSubmit(e);
  };

  const handleAutoSubmit = (val: string) => {
    setOtpStatus('verifying');
    // Create a synthetic submit event
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    onSubmit(fakeEvent, val);
  };

  return (
    <form ref={formRef} className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex justify-center mb-4">
        <Image src="/assets/LogoBlackText.png" alt="TeamTuned Logo" width={120} height={30} className="h-8 w-auto object-contain" priority quality={100} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 text-center">Verify OTP</h3>
      {error && <ErrorBox message={error} />}
      <PremiumOtpInput 
        otp={otp} 
        setOtp={setOtp} 
        isLoading={isLoading} 
        status={otpStatus} 
        setStatus={setOtpStatus}
        onComplete={handleAutoSubmit}
      />
      <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Verifying...' : 'Verify OTP'}</button>
      <button type="button" onClick={onResend} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Resend OTP</button>
      <button type="button" onClick={onBack} className="w-full text-gray-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
    </form>
  );
};

type OtpStatus = 'idle' | 'verifying' | 'success' | 'failed';

// Premium OTP Input Component with full animation
const PremiumOtpInput = ({ 
  otp, 
  setOtp, 
  isLoading, 
  status, 
  setStatus,
  onComplete,
}: { 
  otp: string, 
  setOtp: (v: string) => void, 
  isLoading: boolean,
  status: OtpStatus,
  setStatus: (s: OtpStatus) => void,
  onComplete?: (val: string) => void,
}) => {
  const [staggerProgress, setStaggerProgress] = useState(0);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [checkmarkProgress, setCheckmarkProgress] = useState(0);
  const [circularProgress, setCircularProgress] = useState(0);

  // Animation sequence
  useEffect(() => {
    if (status === 'verifying') {
      // Stagger animation: each box lights up in sequence
      let startTime = Date.now();
      const duration = 400;
      const animateStagger = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setStaggerProgress(progress);
        if (progress < 1) requestAnimationFrame(animateStagger);
      };
      requestAnimationFrame(animateStagger);
    } else if (status === 'success') {
      // Merge animation
      let startTime = Date.now();
      const duration = 350;
      const animateMerge = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setMergeProgress(progress);
        if (progress < 1) requestAnimationFrame(animateMerge);
        else {
          // Start checkmark after merge completes
          setTimeout(() => {
            let checkStart = Date.now();
            const checkDuration = 500;
            const animateCheck = () => {
              const checkElapsed = Date.now() - checkStart;
              const checkProg = Math.min(checkElapsed / checkDuration, 1);
              setCheckmarkProgress(checkProg);
              if (checkProg < 1) requestAnimationFrame(animateCheck);
            };
            requestAnimationFrame(animateCheck);
          }, 50);
        }
      };
      requestAnimationFrame(animateMerge);
    }
  }, [status]);

  // Continuous circular animation
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      setCircularProgress((prev) => (prev + delta / 1200) % 1);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Calculate box positions for merge animation
  const totalWidth = 260; // 4*56 + 3*16 (gap 4 = 16px)
  const boxSize = 56;
  const targetSize = 60;
  const gap = 16;
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => hiddenInputRef.current?.focus(), 100);
  }, []);

  // Auto-submit when 4 digits are filled
  useEffect(() => {
    if (otp.length === 4 && status === 'idle' && !isLoading && onComplete) {
      onComplete(otp);
    }
  }, [otp, status, isLoading, onComplete]);

  const getBoxProps = (index: number) => {
    const originalLeft = index * (boxSize + gap);
    const targetLeft = (totalWidth - targetSize) / 2;
    const left = originalLeft + (targetLeft - originalLeft) * mergeProgress;
    const size = boxSize + (targetSize - boxSize) * mergeProgress;
    const borderRadius = 12 + (24 - 12) * mergeProgress;
    const opacity = index === 0 ? 1 : 1 - mergeProgress;

    // Border color based on status
    let borderColor = 'border-black';
    let borderWidth = 'border-2';
    if (status === 'failed') {
      borderColor = 'border-red-500';
      borderWidth = 'border-2';
    } else if (status === 'verifying' || status === 'success') {
      if (mergeProgress > 0.8) {
        borderColor = 'border-transparent';
        borderWidth = 'border-0';
      } else {
        const startStagger = index * 0.25;
        if (staggerProgress >= startStagger) {
          borderColor = 'border-blue-600';
          borderWidth = 'border-2';
        }
      }
    } else if (index === otp.length && status === 'idle') {
      borderColor = 'border-transparent';
      borderWidth = 'border-0';
    }

    return {
      style: {
        left: `${left}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        opacity: opacity,
      },
      borderClass: `${borderColor} ${borderWidth}`,
    };
  };

  return (
    <div className="relative w-full" style={{ height: '60px' }}>
      {/* Hidden main input for keyboard capture */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="numeric"
        value={otp}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setOtp(val);
          if (status !== 'idle') {
            setStatus('idle');
          }
        }}
        disabled={status !== 'idle' || isLoading}
        className="absolute inset-0 opacity-0 cursor-default z-10"
        autoFocus
      />
      
      {/* Visual boxes */}
      <div 
        className="relative mx-auto" 
        style={{ width: `${totalWidth}px`, height: '60px' }}
        onClick={() => {
          if (status === 'idle' && !isLoading) {
            hiddenInputRef.current?.focus();
          }
        }}
      >
        {Array.from({ length: 4 }, (_, index) => {
          const { style, borderClass } = getBoxProps(index);
          const isActive = index === otp.length && status === 'idle';
          return (
            <div
              key={index}
              className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center bg-white transition-all ${borderClass}`}
              style={{
                ...style,
                boxShadow: isActive ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
              }}
            >
              {/* Digit */}
              {mergeProgress <= 0.8 && (
                <span 
                  className="text-xl font-bold text-black"
                  style={{ opacity: Math.max(0, 1 - mergeProgress / 0.8) }}
                >
                  {otp[index] || ''}
                </span>
              )}
              
              {/* Success circle */}
              {index === 0 && mergeProgress > 0.8 && (
                <div 
                  className="absolute rounded-full bg-green-500"
                  style={{
                    width: `${targetSize * ((mergeProgress - 0.8) / 0.2) * 0.82}px`,
                    height: `${targetSize * ((mergeProgress - 0.8) / 0.2) * 0.82}px`,
                  }}
                >
                  {/* Checkmark */}
                  <svg 
                    viewBox="0 0 24 24" 
                    className="absolute inset-0 w-full h-full"
                    style={{
                      width: '52%',
                      height: '52%',
                      left: '24%',
                      top: '24%',
                    }}
                  >
                    <path
                      d="M6 12l4 4 8-8"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="24"
                      strokeDashoffset={24 - (24 * checkmarkProgress)}
                    />
                  </svg>
                </div>
              )}

              {/* Circulating border for active idle box */}
              {isActive && status === 'idle' && <CirculatingBorder progress={circularProgress} />}
              {/* If not active and idle, show black border */}
              {!isActive && status === 'idle' && index !== otp.length && (
                <div className="absolute inset-0 pointer-events-none border-2 border-black rounded-xl"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Circulating Border Component
const CirculatingBorder = ({ progress }: { progress: number }) => {
  const dashOffset = -(progress * 180);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      <svg className="w-full h-full" viewBox="0 0 56 56">
        <rect
          x="1"
          y="1"
          width="54"
          height="54"
          rx="12"
          fill="none"
          stroke="rgba(37, 99, 235, 0.3)"
          strokeWidth="2.5"
        />
        <rect
          x="1"
          y="1"
          width="54"
          height="54"
          rx="12"
          fill="none"
          stroke="rgb(37, 99, 235)"
          strokeWidth="2.5"
          strokeDasharray="60 120"
          strokeLinecap="round"
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
    </div>
  );
};

function InputWithIcon({ label, icon, type, placeholder, value, onChange, disabled }: { label: string; icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean }) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className={`relative flex items-center px-4 py-3 bg-white rounded-lg border transition-all duration-200 ${isFocused ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200 hover:border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
        <span className={`mr-2.5 transition-colors duration-200 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`}>{icon}</span>
        <input type={inputType} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} className="flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none border-none focus:ring-0 focus:outline-none" />
        {isPassword && (
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 -mr-1 text-gray-400 hover:text-gray-600 transition-colors" disabled={disabled}>
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}