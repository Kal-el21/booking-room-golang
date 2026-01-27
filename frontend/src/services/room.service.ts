import api from './api';
import type { Room, ApiResponse, PaginatedResponse } from '@/types';

const ROOM_PREFIX = '/api/v1/rooms';

export interface RoomFilters {
  page?: number;
  page_size?: number;
  status?: 'available' | 'occupied' | 'maintenance';
  min_capacity?: number;
  location?: string;
}

export interface CheckAvailabilityRequest {
  booking_date: string;
  start_time: string;
  end_time: string;
}

export const roomService = {
  // Get all rooms (public)
  getRooms: async (filters?: RoomFilters): Promise<PaginatedResponse<Room>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.min_capacity) params.append('min_capacity', filters.min_capacity.toString());
    if (filters?.location) params.append('location', filters.location);

    const response = await api.get<PaginatedResponse<Room>>(
      `${ROOM_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get room by ID
  getRoomById: async (id: number): Promise<Room> => {
    const response = await api.get<ApiResponse<Room>>(`${ROOM_PREFIX}/${id}`);
    return response.data.data;
  },

  // Check room availability (public)
  checkAvailability: async (
    roomId: number,
    data: CheckAvailabilityRequest
  ): Promise<boolean> => {
    const response = await api.post<ApiResponse<{ available: boolean }>>(
      `${ROOM_PREFIX}/${roomId}/availability`,
      data
    );
    return response.data.data.available;
  },

  // Create room (room_admin only)
  createRoom: async (data: Partial<Room>): Promise<Room> => {
    const response = await api.post<ApiResponse<Room>>(ROOM_PREFIX, data);
    return response.data.data;
  },

  // Update room (room_admin only)
  updateRoom: async (id: number, data: Partial<Room>): Promise<Room> => {
    const response = await api.put<ApiResponse<Room>>(`${ROOM_PREFIX}/${id}`, data);
    return response.data.data;
  },

  // Delete room (room_admin only)
  deleteRoom: async (id: number): Promise<void> => {
    await api.delete(`${ROOM_PREFIX}/${id}`);
  },
};