import api from './api';
import type { ApiResponse } from '@/types';

const ADMIN_SETTINGS_PREFIX = '/api/v1/admin/settings';

export interface SystemSettings {
  email_verification_enabled: boolean;
}

export const systemSettingService = {
  /** Fetch all system settings (room_admin only). */
  getSettings: async (): Promise<SystemSettings> => {
    const response = await api.get<ApiResponse<SystemSettings>>(ADMIN_SETTINGS_PREFIX);
    return response.data.data;
  },

  /** Partially update system settings (room_admin only). */
  updateSettings: async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await api.put<ApiResponse<SystemSettings>>(ADMIN_SETTINGS_PREFIX, data);
    return response.data.data;
  },
};