import api from './api';
import type { Booking, ApiResponse, PaginatedResponse } from '@/types';

const BOOKING_PREFIX = '/api/v1/bookings';

export interface BookingFilters {
  page?: number;
  page_size?: number;
  room_id?: number;
  status?: 'confirmed' | 'cancelled' | 'completed';
  booking_date?: string;
}

export const bookingService = {
  // Get my bookings (user)
  getMyBookings: async (filters?: BookingFilters): Promise<PaginatedResponse<Booking>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.room_id) params.append('room_id', filters.room_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.booking_date) params.append('booking_date', filters.booking_date);

    const response = await api.get<PaginatedResponse<Booking>>(
      `${BOOKING_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get all bookings (GA/Admin) - uses same endpoint but backend returns all based on role
  getAllBookings: async (filters?: BookingFilters): Promise<PaginatedResponse<Booking>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.room_id) params.append('room_id', filters.room_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.booking_date) params.append('booking_date', filters.booking_date);

    const response = await api.get<PaginatedResponse<Booking>>(
      `${BOOKING_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get booking by ID
  getBookingById: async (id: number): Promise<Booking> => {
    const response = await api.get<ApiResponse<Booking>>(`${BOOKING_PREFIX}/${id}`);
    return response.data.data;
  },

  // Cancel booking (GA only)
  cancelBooking: async (id: number): Promise<void> => {
    await api.delete(`${BOOKING_PREFIX}/${id}`);
  },
};