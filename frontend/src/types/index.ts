// Auth Types
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
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Room Types
export interface Room {
  id: number;
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Request Types
export interface RoomRequest {
  id: number;
  user_id: number;
  user_name?: string; // Tambahan untuk GA view
  required_capacity: number;
  purpose: string;
  notes?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  assigned_by?: number;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

// Booking Types
export interface Booking {
  id: number;
  request_id: number;
  room_id: number;
  room_name?: string;
  booked_by: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

// Notification Types
export interface Notification {
  id: number;
  user_id: number;
  booking_id?: number;
  title: string;
  message: string;
  type: 'booking_confirmed' | 'reminder' | 'cancellation' | 'room_changed' | 'request_submitted' | 'request_approved' | 'request_rejected';
  channel: 'email' | 'in_app' | 'both';
  is_read: boolean;
  read_at?: string;
  sent_at?: string;
  created_at: string;
}

// Pagination
export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}