
import type { ApiResponse, PaginationParams } from '@/types/api.types';
import type { UpdateUserRequest, ChangePasswordRequest, UserPreference } from '../types/user.types';
import { api } from '@/lib/api';
import type { User } from '@/types/auth.types';

export const userService = {
  async getUsers(params?: PaginationParams): Promise<{
    users: User[];
    meta: any;
  }> {
    const response = await api.get<ApiResponse<User[]>>('/users', { params });
    return {
      users: response.data.data || [],
      meta: response.data.meta,
    };
  },

  async getUser(id: number): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data!;
  },

  async getCurrentUser(): Promise<{ user: User; preferences: UserPreference }> {
    const response = await api.get<ApiResponse<{ user: User; preferences: UserPreference }>>(
      '/users/me'
    );
    return response.data.data!;
  },

  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data!;
  },

  async deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.put('/users/change-password', data);
  },

  async resetPassword(id: number, newPassword: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`, { new_password: newPassword });
  },

  async updatePreferences(data: Partial<UserPreference>): Promise<UserPreference> {
    const response = await api.put<ApiResponse<UserPreference>>('/users/preferences', data);
    return response.data.data!;
  },
};
