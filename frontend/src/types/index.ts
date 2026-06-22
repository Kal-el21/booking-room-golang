// Auth Types
export type UserRole = 'user' | 'room_admin' | 'GA' | 'driver';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  division?: string;
  driver_license?: string;
  is_active: boolean;
  avatar?: string;
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
  otp_login_enabled: boolean;
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

// ─── API Wrappers ─────────────────────────────────────────────────────────────

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

// User Types
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  division?: string;
  driver_license?: string;
  is_active: boolean;
  avatar?: string;
  email_verified_at?: string;
  created_at: string;
  updated_at?: string;
}

// Room Types
export interface Room {
  id: number;
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  image_url?: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface RoomResponse {
  id: number;
  room_name: string;
  capacity: number;
  location: string;
  description?: string;
  image_url?: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_active: boolean;
  created_by: number;
  created_at: string;
  creator?: UserResponse;
}

// Car Types
export interface Car {
  id: number;
  car_name: string;
  plate_number?: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  transmission?: string;
  fuel_type?: string;
  seat_capacity: number;
  capacity: number;
  location: string;
  description?: string;
  image_url?: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_active: boolean;
  created_by: number;
  creator?: UserResponse;
  current_odometer?: number;
  created_at: string;
  updated_at?: string;
}

export interface CarResponse {
  id: number;
  car_name: string;
  plate_number?: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  transmission?: string;
  fuel_type?: string;
  seat_capacity: number;
  capacity: number;
  location: string;
  description?: string;
  image_url?: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_active: boolean;
  created_by: number;
  creator?: UserResponse;
  current_odometer?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateCarInput {
  car_name: string;
  plate_number?: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  transmission?: string;
  fuel_type?: string;
  seat_capacity?: number;
  capacity: number;
  location?: string;
  current_odometer?: number;
  description?: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_active?: boolean;
}

export interface CarFilters {
  page?: number;
  page_size?: number;
  status?: 'available' | 'occupied' | 'maintenance';
  min_capacity?: number;
  location?: string;
  is_active?: boolean;
}

export interface CarAvailabilityCheck {
  car_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
}

export interface AvailableCar extends CarResponse {}

// Car Request Types
export interface CarRequest {
  id: number;
  user_id: number;
  user_name?: string;
  user?: UserResponse;
  required_capacity: number;
  purpose: string;
  notes?: string;
  destination?: string;
  pickup_location?: string;
  driver_required: boolean;
  estimated_distance_km?: number;
  passenger_count?: number;
  needs_fuel_reimbursement: boolean;
  fuel_note?: string;
  has_consumption: boolean;
  consumption_note?: string;
  departure_date: string;
  booking_date?: string;
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
  bookings?: CarBooking[];
  created_at: string;
  updated_at: string;
}

export interface CreateCarRequestInput {
  required_capacity: number;
  purpose: string;
  notes?: string;
  destination?: string;
  pickup_location?: string;
  driver_required?: boolean;
  estimated_distance_km?: number;
  passenger_count?: number;
  needs_fuel_reimbursement?: boolean;
  fuel_note?: string;
  has_consumption?: boolean;
  consumption_note?: string;
  booking_date?: string;
  departure_date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
  recurring_type?: 'daily' | 'weekly' | 'monthly';
  recurring_days?: string;
  recurring_end_date?: string;
}

export interface ApproveCarRequestInput {
  car_id: number;
  ga_consumption_note?: string;
  driver_id?: number;
}

export interface RejectCarRequestInput {
  reason: string;
}

export interface CarRequestFilters {
  page?: number;
  page_size?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

// ─── Car Booking Lifecycle Types ───────────────────────────────────────────────

export interface CarBooking {
  id: number;
  request_id: number;
  car_id: number;
  car_name?: string;
  car_name_snapshot?: string;
  plate_number?: string;
  plate_number_snapshot?: string;
  car?: CarResponse;
  booked_by: number;
  booked_by_user?: UserResponse;
  request?: Partial<CarRequest>;
  departure_date: string;
  booking_date?: string;
  end_date?: string;
  request_booking_date?: string;
  request_end_date?: string;
  request_is_recurring?: boolean;
  request_recurring_end_date?: string;
  request_duration?: number;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'picked_up' | 'in_use' | 'returned' | 'late_return' | 'cancelled' | 'completed';
  driver_id?: number;
  driver_name?: string;
  driver?: UserResponse;
  pickup_location?: string;
  picked_up_at?: string;
  returned_at?: string;
  start_odometer?: number;
  end_odometer?: number;
  fuel_level_return?: number;
  return_notes?: string;
  created_at: string;
  updated_at: string;
}

export type CarBookingStatus = CarBooking['status'];

export interface PickUpBookingInput {
  driver_id?: number;
  pickup_location?: string;
  start_odometer: number;
}

export interface ReturnBookingInput {
  end_odometer: number;
  fuel_level_return: number;
  return_notes?: string;
}

export interface AssignDriverInput {
  driver_id: number;
}

export interface FleetStatusSummary {
  total_cars: number;
  available_cars: number;
  occupied_cars: number;
  maintenance_cars: number;
  confirmed_bookings: number;
  picked_up_bookings: number;
  in_use_bookings: number;
}

export interface FleetStatusItem {
  car_id: number;
  car_name: string;
  plate_num: string;
  car_status: 'available' | 'occupied' | 'maintenance';
  current_booking_id?: number;
  current_booking_status?: string;
}

export interface FleetStatusResponse {
  summary: FleetStatusSummary;
  car_status: FleetStatusItem[];
}

export interface CarBookingFilters {
  page?: number;
  page_size?: number;
  status?: CarBookingStatus;
  car_id?: number;
  booking_date?: string;
  departure_date?: string;
}

export interface PaginatedCarResponse extends ApiResponse<CarResponse[]> {
  meta: PaginationMeta;
}

export interface PaginatedCarBookingResponse extends ApiResponse<CarBooking[]> {
  meta: PaginationMeta;
}

// ─── Room Booking / Request Types ─────────────────────────────────────────────

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

export type RequestStatusFilter = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface RequestFilters {
  page?: number;
  page_size?: number;
  status?: RequestStatusFilter;
}

// ─── Calendar ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: number | string;
  type: 'booking' | 'request' | 'car_booking' | 'car_request';
  title: string;
  start: string;
  end: string;
  room_id?: number;
  room_name?: string;
  car_id?: number;
  car_name?: string;
  location?: string;
  status: string;
  user_name: string;
  purpose: string;
  end_date?: string;
  is_recurring?: boolean;
  recurring_type?: string;
  recurring_days?: string;
  recurring_end_date?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_confirmed'
  | 'reminder'
  | 'cancellation'
  | 'room_changed'
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'new_car_request'
  | 'car_booking_confirmed'
  | 'car_booking_rejected'
  | 'car_booking_cancelled';

export type NotificationChannel = 'email' | 'in_app' | 'both';

export interface Notification {
  id: number;
  user_id: number;
  booking_id?: number;
  car_booking_id?: number;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  is_read: boolean;
  read_at?: string;
  sent_at?: string;
  created_at: string;
}
