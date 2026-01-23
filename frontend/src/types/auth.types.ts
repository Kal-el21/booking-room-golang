export type UserRole = 'user' | 'room_admin' | 'GA';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  division?: string;
  is_active: boolean;
  email_verified_at?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  division?: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}