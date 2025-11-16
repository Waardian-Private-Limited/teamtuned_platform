'use client';

import { useState } from 'react';
import { Mail, Lock, Smartphone, Building2 } from 'lucide-react';
import { login, verifyOtp, checkAccounts, loginWithAccount, sendWebOtp, Account } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/store/userStore';

type LoginStep = 'email' | 'accounts' | 'password' | 'otp' | 'verify' | 'account-otp' | 'superadmin-password';

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
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

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

      // Check if there's a single superadmin account - direct login
      if (response.account && (response.account.userType || '').toLowerCase() === 'superadmin') {
        setSelectedAccount(response.account);
        setStep('superadmin-password'); // Special step for superadmin direct login
        setMobile(response.account.phone || response.account.email);
      } else if (response.accounts && response.accounts.length > 1) {
        // Check if all accounts are superadmin - if so, show account selection
        const superadminAccounts = response.accounts.filter((acc: any) => (acc.userType || '').toLowerCase() === 'superadmin');
        if (superadminAccounts.length === response.accounts.length) {
          setAccounts(response.accounts);
          setStep('accounts');
        } else {
          // Mixed accounts or only societyAdmin accounts
          setAccounts(response.accounts);
          setStep('accounts');
        }
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

  // Select an account for login (password or OTP)
  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setStep(tab === 'password' ? 'password' : 'otp');
    setMobile(account.phone || account.email);
  };

  // Select an account and move to account-specific OTP request step
  const handleAccountOtpSelect = (account: Account) => {
    setSelectedAccount(account);
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
          role: response.role || '',
          name: response.user.name || email,
        };
        setUser(user);

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
        const user = {
          ...response.user,
          role: response.role || '',
          name: response.user.name || selectedAccount.username,
          societyName: selectedAccount.societyName || '',
        };
        setUser(user);

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

  // Generic OTP request for the 'With OTP' tab
  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!mobile) throw new Error('Please enter your mobile number');

      const response = await login({ type: 'otp', mobile });
      if (response.success) {
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

  // Account-specific OTP sender (when an account is chosen)
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

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!otp) throw new Error('Please enter the OTP');

      const response = await verifyOtp(mobile, otp, selectedAccount?.id);

      if (response.success && response.user) {
        const user = {
          ...response.user,
          role: response.role || '',
          name: response.user.name || selectedAccount?.username || '',
        };
        setUser(user);

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
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (!mobile) throw new Error('Mobile number is required');

      const response = await login({ type: 'otp', mobile });
      if (response.success) setError(response.message || 'OTP resent successfully');
      else setError(response.message || 'Failed to resend OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  // ----- Render -----
  return (
    <div className="w-full max-w-sm mx-auto px-4">
      {/* Tab Switcher */}
      <div className="flex justify-center mb-6 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => handleTabSwitch('password')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            tab === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          disabled={isLoading}
        >
          With Password
        </button>
        <button
          onClick={() => handleTabSwitch('otp')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            tab === 'otp'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          disabled={isLoading}
        >
          With OTP
        </button>
      </div>

      {/* Step Content */}
      {step === 'email' && tab === 'password' && (
        <form className="space-y-5" onSubmit={handleEmailSubmit}>
          {error && <ErrorBox message={error} />}
          <InputWithIcon
            label="Email"
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">
            {isLoading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'accounts' && (
        <AccountsStep accounts={accounts} error={error} onSelect={handleAccountSelect} onOtpSelect={handleAccountOtpSelect} onBack={resetToStep} isLoading={isLoading} />
      )}

      {step === 'account-otp' && selectedAccount && (
        <AccountOtpStep selectedAccount={selectedAccount} onSubmit={handleAccountOtpRequest} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'superadmin-password' && (
        <SuperadminPasswordStep email={email} password={password} setPassword={setPassword} onSubmit={handleSuperadminLogin} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'password' && selectedAccount && (
        <PasswordStep selectedAccount={selectedAccount} password={password} setPassword={setPassword} onSubmit={handlePasswordLogin} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'otp' && (
        <OtpRequestStep mobile={mobile} setMobile={setMobile} onSubmit={handleOtpRequest} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}

      {step === 'verify' && (
        <OtpVerifyStep otp={otp} setOtp={setOtp} onSubmit={handleOtpVerify} onResend={handleResendOtp} onBack={resetToStep} error={error} isLoading={isLoading} />
      )}
    </div>
  );
}

// ---------------- Subcomponents ----------------

const ErrorBox = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">{message}</div>
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

const SuperadminPasswordStep = ({ email, password, setPassword, onSubmit, onBack, error, isLoading }: { email: string, password: string, setPassword: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onBack: () => void, error: string, isLoading: boolean }) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="font-medium text-gray-900">Superadmin Login</p>
      <p className="text-sm text-gray-500">{email}</p>
    </div>
    <InputWithIcon label="Password" icon={<Lock className="w-5 h-5 text-gray-400" />} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Logging in...' : 'Login'}</button>
    <button type="button" onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </form>
);

const PasswordStep = ({ selectedAccount, password, setPassword, onSubmit, onBack, error, isLoading }: { selectedAccount: Account, password: string, setPassword: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onBack: () => void, error: string, isLoading: boolean }) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <InputWithIcon label="Password" icon={<Lock className="w-5 h-5 text-gray-400" />} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Logging in...' : 'Login'}</button>
    <button type="button" onClick={onBack} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </form>
);

const OtpRequestStep = ({ mobile, setMobile, onSubmit, onBack, error, isLoading }: { mobile: string, setMobile: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onBack: () => void, error: string, isLoading: boolean }) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <InputWithIcon label="Mobile" icon={<Smartphone className="w-5 h-5 text-gray-400" />} type="tel" placeholder="+91 XXXXX-XXXXX" value={mobile} onChange={e => setMobile(e.target.value)} disabled={isLoading} />
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

const OtpVerifyStep = ({ otp, setOtp, onSubmit, onResend, onBack, error, isLoading }: { otp: string, setOtp: (v: string) => void, onSubmit: (e: React.FormEvent) => void, onResend: () => void, onBack: () => void, error: string, isLoading: boolean }) => (
  <form className="space-y-5" onSubmit={onSubmit}>
    {error && <ErrorBox message={error} />}
    <InputWithIcon label="OTP" icon={<Smartphone className="w-5 h-5 text-gray-400" />} type="tel" placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} disabled={isLoading} />
    <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl">{isLoading ? 'Verifying...' : 'Verify OTP'}</button>
    <button type="button" onClick={onResend} className="w-full text-blue-600 py-3 rounded-xl text-sm" disabled={isLoading}>Resend OTP</button>
    <button type="button" onClick={onBack} className="w-full text-gray-600 py-3 rounded-xl text-sm" disabled={isLoading}>Back</button>
  </form>
);

// ----- Input With Icon -----

type InputProps = {
  label: string;
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
};

function InputWithIcon({ label, icon, type, placeholder, value, onChange, disabled }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className={`relative flex items-center px-4 py-3 bg-white rounded-lg border transition-all duration-200 ${isFocused ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-gray-200 hover:border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
        <span className={`mr-2.5 transition-colors duration-200 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`}>{icon}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} className="flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none border-none focus:ring-0 focus:outline-none" />
      </div>
    </div>
  );
}