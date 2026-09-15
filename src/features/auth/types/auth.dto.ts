export interface AccountDto {
  id: string;
  username: string;
  email: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
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

export interface OrganizationDto {
  id: number | string;
  name: string;
  logo_url?: string | null;
}

export interface AuthUserDto {
  id: number | string;
  email: string;
  societyId?: string;
  name?: string;
}

export interface AuthResultDto {
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  token?: string;
  role?: string;
  user?: AuthUserDto;
  accounts?: AccountDto[];
  organization?: OrganizationDto;
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

export interface QrStatusResponseDto extends AuthResultDto {
  status?: 'pending' | 'scanned' | 'confirmed' | 'expired';
}

export interface SessionResponseDto {
  authenticated: boolean;
  role?: string;
  user?: AuthUserDto & { societyId?: string };
}

export interface CheckAccountsRequestDto {
  email?: string;
  phone?: string;
  country_code?: string;
}

export interface PasswordLoginRequestDto {
  accountId?: string;
  email?: string;
  password?: string;
  passwordEnc?: string;
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
