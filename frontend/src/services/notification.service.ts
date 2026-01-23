
import { api } from '@/lib/api';
import type { Notification } from '../types/notification.types';
import type { ApiResponse, PaginationParams } from '@/types/api.types';

export const notificationService = {
  async getNotifications(params?: PaginationParams): Promise<{
    notifications: Notification[];
    meta: any;
  }> {
    const response = await api.get<ApiResponse<Notification[]>>('/notifications', { params });
    return {
      notifications: response.data.data || [],
      meta: response.data.meta,
    };
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data.data!.count;
  },

  async markAsRead(id: number): Promise<void> {
    await api.put(`/notifications/${id}/mark-as-read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark-all-as-read');
  },

  async deleteNotification(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};