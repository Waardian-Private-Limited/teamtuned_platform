/**
 * Every /auth HTTP call, in one place. Transport comes from lib/apiClient;
 * this module only knows endpoints and DTOs — no React, no state, no routing.
 */

import { apiClient } from '@/lib/apiClient';
import { encryptPassword } from '@/lib/crypto';
import type {
  AuthResultDto,
  CheckAccountsResponseDto,
  QrGenerateResponseDto,
  QrStatusResponseDto,
  SessionResponseDto,
} from '../dto/auth.dto';

/** Finds the accounts tied to an email or phone before any credential is sent. */
export function checkAccounts(email?: string, phone?: string, country_code: string = '+91') {
  return apiClient.post<CheckAccountsResponseDto>('/auth/check-web-accounts', {
    email,
    phone,
    country_code: phone ? country_code : undefined,
  });
}

/** Password login for a chosen account. */
export async function loginWithAccount(accountId: string, password: string) {
  const passwordEnc = await encryptPassword(password);
  return apiClient.post<AuthResultDto>('/auth/weblogin', { accountId, password, passwordEnc });
}

/** Password login for superadmins, who have no account picker. */
export async function loginWithEmail(email: string, password: string) {
  const passwordEnc = await encryptPassword(password);
  return apiClient.post<AuthResultDto>('/auth/login', { email, password, passwordEnc });
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

export function verifyMobileOtp(mobile: string, otp: string, country_code: string = '+91') {
  return apiClient.post<AuthResultDto>('/auth/verify-otp', {
    mobile,
    phone_number: mobile,
    otp,
    country_code,
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

/* ---------- QR login ---------- */

export function generateQrSession() {
  return apiClient.get<QrGenerateResponseDto>('/auth/qr/generate');
}

export function fetchQrStatus(token: string) {
  return apiClient.get<QrStatusResponseDto>(`/auth/qr/status/${token}`);
}

/** QR login returns a bearer token; ask the backend to mint the httpOnly cookie. */
export function exchangeQrTokenForCookie(token: string) {
  return apiClient.post('/auth/qr/set-cookie', { token });
}

/* ---------- Session ---------- */

export async function fetchSession(): Promise<SessionResponseDto> {
  try {
    return await apiClient.get<SessionResponseDto>('/auth/session');
  } catch {
    // A rejected session check just means "not logged in" — never a hard error.
    return { authenticated: false };
  }
}
