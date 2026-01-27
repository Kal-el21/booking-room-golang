import api from './api';
import type { User, ApiResponse, PaginatedResponse } from '@/types';

const USER_PREFIX = '/api/v1/users';

export interface UserFilters {
  page?: number;
  page_size?: number;
  role?: string;
  is_active?: boolean;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface UpdatePreferencesData {
  notification_24h?: boolean;
  notification_3h?: boolean;
  notification_30m?: boolean;
  email_notifications?: boolean;
}

export const userService = {
  // Get my profile
  getMyProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`${USER_PREFIX}/me`);
    return response.data.data;
  },

  // Change password
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    await api.put(`${USER_PREFIX}/change-password`, data);
  },

  // Update preferences
  updatePreferences: async (data: UpdatePreferencesData): Promise<void> => {
    await api.put(`${USER_PREFIX}/preferences`, data);
  },

  // Get all users (room_admin, GA)
  getUsers: async (filters?: UserFilters): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.role) params.append('role', filters.role);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const response = await api.get<PaginatedResponse<User>>(
      `${USER_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get user by ID (room_admin, GA)
  getUserById: async (id: number): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`${USER_PREFIX}/${id}`);
    return response.data.data;
  },

  // Update user (room_admin)
  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`${USER_PREFIX}/${id}`, data);
    return response.data.data;
  },

  // Reset user password (room_admin)
  resetUserPassword: async (id: number, newPassword: string): Promise<void> => {
    await api.post(`${USER_PREFIX}/${id}/reset-password`, {
      new_password: newPassword,
    });
  },

  // Delete user (room_admin)
  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`${USER_PREFIX}/${id}`);
  },
};