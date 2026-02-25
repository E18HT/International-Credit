// Profile and 2FA related types
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface TwoFactorSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFactorEnableRequest {
  token: string;
  secret: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  token?: string;
}

export interface TwoFactorVerifyRequest {
  email: string;
  password: string;
  twoFactorToken: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: any;
    tokens: {
      accessToken: string;
      refreshToken?: string;
    };
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
