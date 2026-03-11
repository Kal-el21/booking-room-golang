// Auth Types
export type UserRole = 'user' | 'room_admin' | 'GA';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  division?: string;
  is_active: boolean;
  avatar?: string;           // URL path e.g. /uploads/users/filename.jpg
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notification_24h: boolean;
  notification_3h: boolean;
  notification_30m: boolean;
  email_notifications: boolean;
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
  division?: string;
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
  error?: any;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  error?: any;
}

// Room Types
export interface Room {
  id: number;
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  image_url?: string;        // URL path e.g. /uploads/rooms/filename.jpg
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
  user_name?: string;
  user?: UserResponse;
  required_capacity: number;
  purpose: string;
  notes?: string;
  has_consumption: boolean;
  consumption_note?: string;
  booking_date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_type?: 'daily' | 'weekly' | 'monthly';
  recurring_days?: string;
  recurring_end_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  assigned_by?: number;
  assigner?: UserResponse;
  rejected_reason?: string;
  bookings?: Booking[];
  created_at: string;
  updated_at: string;
}

// Create Request Input
export interface CreateRequestInput {
  required_capacity: number;
  purpose: string;
  notes?: string;
  has_consumption?: boolean;
  consumption_note?: string;
  booking_date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
  recurring_type?: 'daily' | 'weekly' | 'monthly';
  recurring_days?: string;
  recurring_end_date?: string;
}

// Booking Types
export interface RoomResponse {
  id: number;
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  image_url?: string;        // URL path e.g. /uploads/rooms/filename.jpg
  status: 'available' | 'occupied' | 'maintenance';
  is_active: boolean;
  created_by: number;
  created_at: string;
  creator?: UserResponse;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  division?: string;
  is_active: boolean;
  avatar?: string;           // URL path e.g. /uploads/users/filename.jpg
  email_verified_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Booking {
  id: number;
  request_id: number;
  room_id: number;
  room_name?: string;
  room?: RoomResponse;
  booked_by: number;
  booked_by_user?: UserResponse;
  booking_date: string;
  end_date?: string;
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
  request_id?: number;
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
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

// Request Filters
export type RequestStatusFilter = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface RequestFilters {
  page?: number;
  page_size?: number;
  status?: RequestStatusFilter;
}