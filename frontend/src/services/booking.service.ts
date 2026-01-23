
import type { ApiResponse, PaginationParams } from '@/types/api.types';
import type { RoomBooking } from '../types/booking.types';
import { api } from '@/lib/api';

export const bookingService = {
  async getBookings(params?: PaginationParams): Promise<{
    bookings: RoomBooking[];
    meta: any;
  }> {
    const response = await api.get<ApiResponse<RoomBooking[]>>('/bookings', { params });
    return {
      bookings: response.data.data || [],
      meta: response.data.meta,
    };
  },

  async getBooking(id: number): Promise<RoomBooking> {
    const response = await api.get<ApiResponse<RoomBooking>>(`/bookings/${id}`);
    return response.data.data!;
  },

  async cancelBooking(id: number): Promise<void> {
    await api.delete(`/bookings/${id}`);
  },

  async getCalendar(startDate: string, endDate: string, roomId?: number): Promise<RoomBooking[]> {
    const params: any = { start_date: startDate, end_date: endDate };
    if (roomId) {
      params.room_id = roomId;
    }
    const response = await api.get<ApiResponse<RoomBooking[]>>('/calendar', { params });
    return response.data.data || [];
  },
};