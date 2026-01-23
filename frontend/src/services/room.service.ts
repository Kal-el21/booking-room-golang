import api from '../lib/api';
import type { Room, CreateRoomRequest, UpdateRoomRequest } from '../types/room.types';
import type { ApiResponse, PaginationParams } from '../types/api.types';

export const roomService = {
  async getRooms(params?: PaginationParams & { status?: string; location?: string }): Promise<{
    rooms: Room[];
    meta: any;
  }> {
    const response = await api.get<ApiResponse<Room[]>>('/rooms', { params });
    return {
      rooms: response.data.data || [],
      meta: response.data.meta,
    };
  },

  async getRoom(id: number): Promise<Room> {
    const response = await api.get<ApiResponse<Room>>(`/rooms/${id}`);
    return response.data.data!;
  },

  async createRoom(data: CreateRoomRequest): Promise<Room> {
    const response = await api.post<ApiResponse<Room>>('/rooms', data);
    return response.data.data!;
  },

  async updateRoom(id: number, data: UpdateRoomRequest): Promise<Room> {
    const response = await api.put<ApiResponse<Room>>(`/rooms/${id}`, data);
    return response.data.data!;
  },

  async deleteRoom(id: number): Promise<void> {
    await api.delete(`/rooms/${id}`);
  },

  async checkAvailability(
    id: number,
    data: { booking_date: string; start_time: string; end_time: string }
  ): Promise<boolean> {
    const response = await api.post<ApiResponse<{ available: boolean }>>(
      `/rooms/${id}/availability`,
      data
    );
    return response.data.data!.available;
  },
};
