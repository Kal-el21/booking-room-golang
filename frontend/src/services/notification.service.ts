import api from './api';
import type { Notification, ApiResponse, PaginatedResponse } from '@/types';

const NOTIFICATION_PREFIX = '/api/v1/notifications';

export interface NotificationFilters {
  page?: number;
  page_size?: number;
}

export const notificationService = {
  // Get my notifications
  getNotifications: async (filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const response = await api.get<PaginatedResponse<Notification>>(
      `${NOTIFICATION_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ count: number }>>(
      `${NOTIFICATION_PREFIX}/unread-count`
    );
    return response.data.data.count;
  },

  // Mark as read
  markAsRead: async (id: number): Promise<void> => {
    await api.put(`${NOTIFICATION_PREFIX}/${id}/mark-as-read`);
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.post(`${NOTIFICATION_PREFIX}/mark-all-as-read`);
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`${NOTIFICATION_PREFIX}/${id}`);
  },
};