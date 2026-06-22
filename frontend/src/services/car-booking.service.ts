import api from './api';
import type {
  CarBooking,
  CarBookingStatus,
  FleetStatusResponse,
  UserResponse,
  ApiResponse,
  PaginatedResponse,
  AssignDriverInput,
} from '@/types';
import { normalizeCarBooking } from '@/utils/normalize';

const CAR_BOOKING_PREFIX = '/api/v1/car-bookings';
const MY_CAR_BOOKING_PREFIX = '/api/v1/my-car-bookings';
const DRIVER_PREFIX = '/api/v1/driver';
const CAR_FLEET_PREFIX = '/api/v1/admin';

export interface CarBookingFilters {
  page?: number;
  page_size?: number;
  status?: CarBookingStatus;
  car_id?: number;
  booking_date?: string;
}

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

export interface DriverBookingsResponse {
  bookings: CarBooking[];
}

export interface UserOptionsResponse {
  users: UserResponse[];
}

export const carBookingService = {
  // List all car bookings (GA only)
  listAllCarBookings: async (
    filters?: CarBookingFilters
  ): Promise<PaginatedResponse<CarBooking>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.car_id) params.append('car_id', filters.car_id.toString());
    if (filters?.booking_date) params.append('booking_date', filters.booking_date);

    const response = await api.get<PaginatedResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}?${params.toString()}`
    );
    return {
      ...response.data,
      data: response.data.data.map(normalizeCarBooking),
    };
  },

  // List car bookings owned by the logged-in user
  listMyCarBookings: async (
    filters?: CarBookingFilters
  ): Promise<PaginatedResponse<CarBooking>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.car_id) params.append('car_id', filters.car_id.toString());
    if (filters?.booking_date) params.append('booking_date', filters.booking_date);

    const response = await api.get<PaginatedResponse<CarBooking>>(
      `${MY_CAR_BOOKING_PREFIX}?${params.toString()}`
    );
    return {
      ...response.data,
      data: response.data.data.map(normalizeCarBooking),
    };
  },

  // Get single booking by ID
  getCarBooking: async (id: number): Promise<CarBooking> => {
    const response = await api.get<ApiResponse<CarBooking>>(`${CAR_BOOKING_PREFIX}/${id}`);
    return normalizeCarBooking(response.data.data);
  },

  // Record pickup (GA only)
  pickUpBooking: async (
    id: number,
    data: PickUpBookingInput
  ): Promise<CarBooking> => {
    const response = await api.post<ApiResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}/${id}/pickup`,
      data
    );
    return normalizeCarBooking(response.data.data);
  },

  // Record return (GA only)
  returnBooking: async (
    id: number,
    data: ReturnBookingInput
  ): Promise<CarBooking> => {
    const response = await api.post<ApiResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}/${id}/return`,
      data
    );
    return normalizeCarBooking(response.data.data);
  },

  // Override booking status (GA only)
  updateBookingStatus: async (
    id: number,
    status: CarBookingStatus
  ): Promise<CarBooking> => {
    const response = await api.put<ApiResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}/${id}/status`,
      { status }
    );
    return normalizeCarBooking(response.data.data);
  },

  // Assign driver to booking (GA only)
  assignDriver: async (
    id: number,
    data: AssignDriverInput
  ): Promise<CarBooking> => {
    const response = await api.put<ApiResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}/${id}/driver`,
      data
    );
    return normalizeCarBooking(response.data.data);
  },

// Unassign driver from booking (GA only)
  unassignDriver: async (id: number): Promise<CarBooking> => {
    const response = await api.delete<ApiResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}/${id}/driver`
    );
    return normalizeCarBooking(response.data.data);
  },

  // Cancel booking (GA only)
  cancelBooking: async (id: number): Promise<CarBooking> => {
    const response = await api.delete<ApiResponse<CarBooking>>(
      `${CAR_BOOKING_PREFIX}/${id}`
    );
    return normalizeCarBooking(response.data.data);
  },

  // Get fleet status for GA dashboard
  getFleetStatus: async (): Promise<FleetStatusResponse> => {
    const response = await api.get<ApiResponse<FleetStatusResponse>>(
      `${CAR_FLEET_PREFIX}/car-fleet-status`
    );
    return response.data.data;
  },

  // ─── Driver-specific ────────────────────────────────────────────────────────

  // Get bookings assigned to the logged-in driver
  // @route GET /api/v1/driver/bookings
  getDriverBookings: async (
    filters?: CarBookingFilters
  ): Promise<PaginatedResponse<CarBooking>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.car_id) params.append('car_id', filters.car_id.toString());
    if (filters?.booking_date) params.append('booking_date', filters.booking_date!);

    const response = await api.get<ApiResponse<CarBooking[]>>(
      `${DRIVER_PREFIX}/bookings?${params.toString()}`
    );
    const data = (response.data.data ?? []).map(normalizeCarBooking);
    return {
      success: response.data.success,
      message: response.data.message,
      data,
      meta: {
        current_page: filters?.page ?? 1,
        per_page: filters?.page_size ?? data.length,
        total: data.length,
        total_pages: 1,
      },
    };
  },
};
