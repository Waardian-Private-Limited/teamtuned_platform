/**
 * Wire shapes for /auth endpoints — exactly what the backend sends and expects.
 * Nothing in the UI reads these directly; auth.mapper.ts converts them into the
 * domain models in auth.model.ts, so a backend rename only touches this layer.
 */

// snake/camel mix below mirrors the current backend responses as-is.
export interface AccountDto {
  id: string;
  username: string;
  email: string;
  phone: string;
  userType: string;
  societyId: string;
  societyName: string | null;
  flatNumber: string | null;
  wingName: string | null;
  status: string;
}

export interface OrganizationFeatureDto {
  id: number;
  code: string;
  name: string;
}

export interface AuthUserDto {
  id: number | string;
  email: string;
  societyId?: string;
  name?: string;
}

// Returned by every endpoint that can complete a login.
export interface AuthResultDto {
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  token?: string;
  role?: string;
  user?: AuthUserDto;
  accounts?: AccountDto[];
  organization_features?: OrganizationFeatureDto[];
}

export interface CheckAccountsResponseDto {
  message?: string;
  error?: string;
  detail?: string;
  accounts?: AccountDto[];
  account?: AccountDto;
}

export interface QrGenerateResponseDto {
  success: boolean;
  token: string;
}

// Polling response doubles as an AuthResultDto once status is 'confirmed'.
export interface QrStatusResponseDto extends AuthResultDto {
  status?: 'pending' | 'scanned' | 'confirmed' | 'expired';
}

export interface SessionResponseDto {
  authenticated: boolean;
  role?: string;
  user?: AuthUserDto & { societyId?: string };
}

/* ---------- Requests ---------- */

export interface CheckAccountsRequestDto {
  email?: string;
  phone?: string;
  country_code?: string;
}

// passwordEnc is the RSA-OAEP ciphertext; password stays for legacy fallback.
export interface PasswordLoginRequestDto {
  accountId?: string;
  email?: string;
  password: string;
  passwordEnc: string;
}

export interface SendOtpRequestDto {
  mobile?: string;
  phone_number?: string;
  accountId?: string;
  country_code?: string;
}

export interface VerifyOtpRequestDto {
  mobile?: string;
  phone_number?: string;
  accountId?: string;
  otp: string;
  country_code?: string;
}

export interface ForgotPasswordResetRequestDto {
  email: string;
  otp: string;
  newPassword: string;
}
