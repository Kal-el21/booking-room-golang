
export type NotificationType =
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'reminder'
  | 'room_changed'
  | 'new_request';

export type NotificationChannel = 'email' | 'in_app' | 'both';

export interface Notification {
  id: number;
  user_id: number;
  booking_id?: number;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  is_read: boolean;
  read_at?: string;
  sent_at?: string;
  created_at: string;
}