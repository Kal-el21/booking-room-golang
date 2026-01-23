import api from '../lib/api';
import type { ApiResponse, PaginationParams } from '@/types/api.types';
import type { RoomRequest, CreateRequestInput } from '../types/request.types';
import type { Room } from '@/types/room.types';

export const requestService = {
  async getRequests(params?: PaginationParams & { status?: string }): Promise<{
    requests: RoomRequest[];
    meta: any;
  }> {
    const response = await api.get<ApiResponse<RoomRequest[]>>('/room-requests', { params });
    return {
      requests: response.data.data || [],
      meta: response.data.meta,
    };
  },

  async getRequest(id: number): Promise<RoomRequest> {
    const response = await api.get<ApiResponse<RoomRequest>>(`/room-requests/${id}`);
    return response.data.data!;
  },

  async createRequest(data: CreateRequestInput): Promise<RoomRequest> {
    const response = await api.post<ApiResponse<RoomRequest>>('/room-requests', data);
    return response.data.data!;
  },

  async updateRequest(id: number, data: CreateRequestInput): Promise<RoomRequest> {
    const response = await api.put<ApiResponse<RoomRequest>>(`/room-requests/${id}`, data);
    return response.data.data!;
  },

  async deleteRequest(id: number): Promise<void> {
    await api.delete(`/room-requests/${id}`);
  },

  async approveRequest(id: number, roomId: number): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/room-requests/${id}/approve`, {
      room_id: roomId,
    });
    return response.data.data!;
  },

  async rejectRequest(id: number, reason: string): Promise<RoomRequest> {
    const response = await api.post<ApiResponse<RoomRequest>>(`/room-requests/${id}/reject`, {
      reason,
    });
    return response.data.data!;
  },

  async getAvailableRooms(id: number): Promise<Room[]> {
    const response = await api.get<ApiResponse<Room[]>>(`/room-requests/${id}/available-rooms`);
    return response.data.data || [];
  },
};
