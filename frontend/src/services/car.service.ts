import api from './api';
import type { Car, CarRequest, CarBooking, ApiResponse, PaginatedResponse, CreateCarRequestInput, ApproveCarRequestInput, RejectCarRequestInput } from '@/types';

const CAR_PREFIX = '/api/v1/cars';
const CAR_REQUEST_PREFIX = '/api/v1/car-requests';

export interface CarFilters {
  page?: number;
  page_size?: number;
  status?: 'available' | 'occupied' | 'maintenance';
  min_capacity?: number;
  location?: string;
  is_active?: boolean;
}

export interface CarRequestFilters {
  page?: number;
  page_size?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export interface CheckCarAvailabilityRequest {
  booking_date: string;
  start_time: string;
  end_time: string;
}

export const carService = {
  // Get all cars (public)
  getCars: async (filters?: CarFilters): Promise<PaginatedResponse<Car>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.min_capacity) params.append('min_capacity', filters.min_capacity.toString());
    if (filters?.location) params.append('location', filters.location);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const response = await api.get<PaginatedResponse<Car>>(
      `${CAR_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get car by ID
  getCarById: async (id: number): Promise<Car> => {
    const response = await api.get<ApiResponse<Car>>(`${CAR_PREFIX}/${id}`);
    return response.data.data;
  },

  // Check car availability
  checkAvailability: async (
    carId: number,
    data: CheckCarAvailabilityRequest
  ): Promise<boolean> => {
    const response = await api.post<ApiResponse<{ available: boolean }>>(
      `${CAR_PREFIX}/${carId}/availability`,
      data
    );
    return response.data.data.available;
  },

  // Get available cars for booking
  getAvailableCars: async (
    capacity: number,
    bookingDate: string,
    startTime: string,
    endTime: string
  ): Promise<Car[]> => {
    const params = new URLSearchParams({
      capacity: capacity.toString(),
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
    });

    const response = await api.get<ApiResponse<Car[]>>(
      `${CAR_PREFIX}/available?${params.toString()}`
    );
    return response.data.data;
  },

  // Create car (room_admin only)
  createCar: async (data: Partial<Car>): Promise<Car> => {
    const response = await api.post<ApiResponse<Car>>(CAR_PREFIX, data);
    return response.data.data;
  },

  // Update car (room_admin only)
  updateCar: async (id: number, data: Partial<Car>): Promise<Car> => {
    const response = await api.put<ApiResponse<Car>>(`${CAR_PREFIX}/${id}`, data);
    return response.data.data;
  },

  // Delete car (room_admin only)
  deleteCar: async (id: number): Promise<void> => {
    await api.delete(`${CAR_PREFIX}/${id}`);
  },

  // Upload car image (room_admin only)
  uploadCarImage: async (
    carId: number,
    file: File
  ): Promise<{ image_url: string; car: Car }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<ApiResponse<{ image_url: string; car: Car }>>(
      `${CAR_PREFIX}/${carId}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },
};

export const carRequestService = {
  // Get my car requests (user)
  getMyCarRequests: async (filters?: CarRequestFilters): Promise<PaginatedResponse<CarRequest>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get<PaginatedResponse<CarRequest>>(
      `${CAR_REQUEST_PREFIX}?${params.toString()}`
    );
    return response.data;
  },

  // Get car request by ID
  getCarRequestById: async (id: number): Promise<CarRequest> => {
    const response = await api.get<ApiResponse<CarRequest>>(`${CAR_REQUEST_PREFIX}/${id}`);
    return response.data.data;
  },

  // Create car request (user)
  createCarRequest: async (data: CreateCarRequestInput): Promise<CarRequest> => {
    const response = await api.post<ApiResponse<CarRequest>>(CAR_REQUEST_PREFIX, data);
    return response.data.data;
  },

  // Update car request (user)
  updateCarRequest: async (id: number, data: Partial<CreateCarRequestInput>): Promise<CarRequest> => {
    const response = await api.put<ApiResponse<CarRequest>>(`${CAR_REQUEST_PREFIX}/${id}`, data);
    return response.data.data;
  },

  // Delete car request (user)
  deleteCarRequest: async (id: number): Promise<void> => {
    await api.delete(`${CAR_REQUEST_PREFIX}/${id}`);
  },

  // Approve car request (GA)
  approveCarRequest: async (
    requestId: number,
    data: ApproveCarRequestInput
  ): Promise<CarBooking> => {
    const response = await api.post<ApiResponse<CarBooking>>(
      `${CAR_REQUEST_PREFIX}/${requestId}/approve`,
      data
    );
    return response.data.data;
  },

  // Reject car request (GA)
  rejectCarRequest: async (
    requestId: number,
    data: RejectCarRequestInput
  ): Promise<void> => {
    await api.post(`${CAR_REQUEST_PREFIX}/${requestId}/reject`, data);
  },

  // Get available cars for request (GA)
  getAvailableCarsForRequest: async (requestId: number): Promise<Car[]> => {
    const response = await api.get<ApiResponse<Car[]>>(
      `${CAR_REQUEST_PREFIX}/${requestId}/available-cars`
    );
    return response.data.data;
  },
};
