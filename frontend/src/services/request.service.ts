import api from './api';
import type { RoomRequest, Room, ApiResponse, PaginatedResponse, CreateRequestInput } from '@/types';

const REQUEST_PREFIX = '/api/v1/room-requests';

export interface RequestFilters {
  page?: number;
  page_size?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export const requestService = {
  // Get my requests (user)
  getMyRequests: async (filters?: RequestFilters): Promise<PaginatedResponse<RoomRequest>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get<PaginatedResponse<RoomRequest>>(
      `${REQUEST_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get request by ID
  getRequestById: async (id: number): Promise<RoomRequest> => {
    const response = await api.get<ApiResponse<RoomRequest>>(`${REQUEST_PREFIX}/${id}`);
    return response.data.data;
  },

  // Create request (user)
  createRequest: async (data: CreateRequestInput): Promise<RoomRequest> => {
    const response = await api.post<ApiResponse<RoomRequest>>(REQUEST_PREFIX, data);
    return response.data.data;
  },

  // Update request (user)
  updateRequest: async (id: number, data: Partial<CreateRequestInput>): Promise<RoomRequest> => {
    const response = await api.put<ApiResponse<RoomRequest>>(`${REQUEST_PREFIX}/${id}`, data);
    return response.data.data;
  },

  // Delete request (user)
  deleteRequest: async (id: number): Promise<void> => {
    await api.delete(`${REQUEST_PREFIX}/${id}`);
  },

  // Get available rooms for request (GA)
  getAvailableRooms: async (requestId: number): Promise<Room[]> => {
    const response = await api.get<ApiResponse<Room[]>>(
      `${REQUEST_PREFIX}/${requestId}/available-rooms`
    );
    return response.data.data;
  },

  // Approve request (GA)
  approveRequest: async (requestId: number, data: { room_id: number; consumption_note?: string }): Promise<any> => {
    const response = await api.post<ApiResponse<any>>(
      `${REQUEST_PREFIX}/${requestId}/approve`,
      data
    );
    return response.data.data;
  },

  // Reject request (GA)
  rejectRequest: async (requestId: number, data: { reason: string }): Promise<void> => {
    await api.post(`${REQUEST_PREFIX}/${requestId}/reject`, data);
  },
};