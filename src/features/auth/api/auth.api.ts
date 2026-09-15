import { apiClient } from '@/lib/apiClient';
import { encryptPassword } from '@/lib/crypto';
import type {
  AuthResultDto,
  CheckAccountsResponseDto,
  PasswordLoginRequestDto,
  QrGenerateResponseDto,
  QrStatusResponseDto,
  SessionResponseDto,
} from '../types/auth.dto';

async function passwordPayload(password: string): Promise<Pick<PasswordLoginRequestDto, 'password' | 'passwordEnc'>> {
  try {
    return { passwordEnc: await encryptPassword(password) };
  } catch (err) {
    console.warn('Password encryption unavailable, sending plaintext over HTTPS', err);
    return { password };
  }
}

export function checkAccounts(email?: string, phone?: string, country_code: string = '+91') {
  return apiClient.post<CheckAccountsResponseDto>('/auth/check-web-accounts', {
    email,
    phone,
    country_code: phone ? country_code : undefined,
  });
}

export async function loginWithAccount(accountId: string, password: string) {
  const payload = await passwordPayload(password);
  return apiClient.post<AuthResultDto>('/auth/weblogin', { accountId, ...payload });
}

export async function loginWithEmail(email: string, password: string) {
  const payload = await passwordPayload(password);
  return apiClient.post<AuthResultDto>('/auth/login', { email, ...payload });
}

export function sendOtpToMobile(mobile: string, country_code: string = '+91') {
  return apiClient.post<AuthResultDto>('/auth/send-otp', {
    mobile,
    phone_number: mobile,
    country_code,
  });
}

export function sendOtpToAccount(accountId: string, country_code: string = '+91') {
  return apiClient.post<AuthResultDto>('/auth/send-web-otp', { accountId, country_code });
}

export function verifyMobileOtp(mobile: string, otp: string, country_code: string = '+91', accountId?: string) {
  return apiClient.post<AuthResultDto>('/auth/verify-otp', {
    mobile,
    phone_number: mobile,
    otp,
    country_code,
    accountId,
  });
}

export function verifyAccountOtp(accountId: string, otp: string, country_code: string = '+91') {
  return apiClient.post<AuthResultDto>('/auth/verify-web-otp', { accountId, otp, country_code });
}

export function sendForgotPasswordOtp(email: string) {
  return apiClient.post<AuthResultDto>('/auth/forgot-password/send', { email });
}

export function verifyForgotPasswordOtp(email: string, otp: string) {
  return apiClient.post<AuthResultDto>('/auth/forgot-password/verify', { email, otp });
}

export function resetPassword(email: string, otp: string, newPassword: string) {
  return apiClient.post<AuthResultDto>('/auth/forgot-password/reset', { email, otp, newPassword });
}

export function generateQrSession() {
  return apiClient.get<QrGenerateResponseDto>('/auth/qr/generate');
}

export function fetchQrStatus(token: string) {
  return apiClient.get<QrStatusResponseDto>(`/auth/qr/status/${token}`);
}

export function exchangeQrTokenForCookie(token: string) {
  return apiClient.post('/auth/qr/set-cookie', { token });
}

export async function fetchSession(): Promise<SessionResponseDto> {
  try {
    return await apiClient.get<SessionResponseDto>('/auth/session');
  } catch {
    return { authenticated: false };
  }
}
