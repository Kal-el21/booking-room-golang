
export interface UserPreference {
  id: number;
  user_id: number;
  notification_24h: boolean;
  notification_3h: boolean;
  notification_30m: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  division?: string;
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}