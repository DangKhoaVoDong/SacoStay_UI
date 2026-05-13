export interface LoginRequest {
  emailPhoneorUsername: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: UserProfile;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'tenant' | 'landlord';
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResponse {
  message: string;
}

export interface UserProfile {
  id: string;
  userName: string;
  email: string;
  phoneNumber: string;
  roles: string[];
  firstName?: string | null;
  lastName?: string | null;
  /** Chuẩn hóa hiển thị (thường trùng userName). */
  name?: string;
  gender?: boolean | string | null;
  dateOfBirth?: string | null;
  job?: string | null;
  livingArea?: string | null;
  bio?: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

/** Body PUT `/api/Auth/update-profile` (OpenAPI UserProfileDTO). */
export interface UserProfileUpdateDTO {
  firstName?: string | null;
  lastName?: string | null;
  gender?: boolean | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  job?: string | null;
  livingArea?: string | null;
  bio?: string | null;
}
