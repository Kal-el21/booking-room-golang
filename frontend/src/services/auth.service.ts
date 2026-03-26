import api from './api';
import type { LoginRequest, RegisterRequest, AuthResponse, ApiResponse, User } from '@/types';

const AUTH_PREFIX = '/api/v1/auth';

// ── Response types for OTP flows ──────────────────────────────────────────────

export interface LoginOTPPendingResponse {
  otp_required: true;
  user_id: number;
  email: string;
  remember_me: boolean;
}

export interface RegisterPendingResponse {
  verification_required: true;
  user_id: number;
  email: string;
}

// ── Auth service ──────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Login — two possible responses depending on backend feature flags:
   *   • OTP disabled → AuthResponse (contains access_token)
   *   • OTP enabled  → LoginOTPPendingResponse (frontend must redirect to OTP page)
   */
  login: async (data: LoginRequest): Promise<AuthResponse | { data: LoginOTPPendingResponse }> => {
    const response = await api.post<AuthResponse | { success: boolean; message: string; data: LoginOTPPendingResponse }>(
      `${AUTH_PREFIX}/login`,
      data,
    );

    const payload = response.data;

    // OTP flow: backend returned user_id instead of tokens
    if ('data' in payload && (payload.data as LoginOTPPendingResponse).otp_required) {
      return payload as { data: LoginOTPPendingResponse };
    }

    // Classic flow: save tokens
    const auth = payload as AuthResponse;
    if (auth.data?.access_token) {
      localStorage.setItem('access_token', auth.data.access_token);
      localStorage.setItem('user', JSON.stringify(auth.data.user));
      if (auth.data.refresh_token) {
        localStorage.setItem('refresh_token', auth.data.refresh_token);
      }
    }

    return auth;
  },

  /**
   * Register — two possible responses:
   *   • Email verification disabled → AuthResponse-like (user data)
   *   • Email verification enabled  → RegisterPendingResponse
   */
  register: async (
    data: RegisterRequest,
  ): Promise<{ data: RegisterPendingResponse } | { success: boolean; message: string; data: User }> => {
    const response = await api.post(`${AUTH_PREFIX}/register`, data);
    return response.data;
  },

  // ── OTP: login verification ─────────────────────────────────────────────────

  /** Step 2 of OTP login: submit the code received by email. Returns JWT tokens. */
  verifyLoginOTP: async (params: {
    user_id: number;
    code: string;
    remember_me: boolean;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/verify-login-otp`, params);

    const auth = response.data;
    if (auth.data?.access_token) {
      localStorage.setItem('access_token', auth.data.access_token);
      localStorage.setItem('user', JSON.stringify(auth.data.user));
      if (auth.data.refresh_token) {
        localStorage.setItem('refresh_token', auth.data.refresh_token);
      }
    }

    return auth;
  },

  /** Request a new login OTP (e.g. the previous one expired). */
  resendLoginOTP: async (user_id: number): Promise<void> => {
    await api.post(`${AUTH_PREFIX}/resend-login-otp`, { user_id });
  },

  // ── OTP: email verification ─────────────────────────────────────────────────

  /** Submit the email-verification code received after registration. Auto-logs the user in. */
  verifyEmail: async (params: { user_id: number; code: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/verify-email`, params);

    const auth = response.data;
    if (auth.data?.access_token) {
      localStorage.setItem('access_token', auth.data.access_token);
      localStorage.setItem('user', JSON.stringify(auth.data.user));
      if (auth.data.refresh_token) {
        localStorage.setItem('refresh_token', auth.data.refresh_token);
      }
    }

    return auth;
  },

  /** Request a new email-verification OTP. */
  resendVerificationEmail: async (user_id: number): Promise<void> => {
    await api.post(`${AUTH_PREFIX}/resend-verification`, { user_id });
  },

  // ── Classic helpers ─────────────────────────────────────────────────────────

  logout: async (): Promise<void> => {
    try {
      await api.post(`${AUTH_PREFIX}/logout`);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/api/v1/users/me');
    localStorage.setItem('user', JSON.stringify(response.data.data));
    return response.data.data;
  },

  isAuthenticated: (): boolean => !!localStorage.getItem('access_token'),

  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};