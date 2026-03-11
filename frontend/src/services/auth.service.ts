import api from './api';
import type{ 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ApiResponse, 
  User 
} from '@/types';

const AUTH_PREFIX = '/api/v1/auth';

export const authService = {
  // Login
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/login`, data);
    
    // Save tokens to localStorage
    if (response.data.data.access_token) {
      localStorage.setItem('access_token', response.data.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      if (response.data.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.data.refresh_token);
      }
    }
    
    return response.data;
  },

  // Register
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_PREFIX}/register`, data);
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await api.post(`${AUTH_PREFIX}/logout`);
    } finally {
      // Clear localStorage regardless of API response
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/api/v1/users/me');
    
    // Update user in localStorage
    localStorage.setItem('user', JSON.stringify(response.data.data));
    
    return response.data.data;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // Get stored user
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