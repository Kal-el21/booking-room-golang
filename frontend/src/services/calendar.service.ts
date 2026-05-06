import api from './api';
import type { ApiResponse, CalendarEvent } from '@/types';

const CALENDAR_PREFIX = '/api/v1/calendar';
const CAR_CALENDAR_PREFIX = '/api/v1/car-calendar';

export interface CalendarFilters {
  start_date: string;
  end_date: string;
  room_id?: number;
}

export interface CarCalendarFilters {
  start_date: string;
  end_date: string;
  car_id?: number;
}

export const calendarService = {
  // Get room calendar events
  getCalendarEvents: async (filters: CalendarFilters): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.room_id) params.append('room_id', filters.room_id.toString());

    const response = await api.get<ApiResponse<CalendarEvent[]>>(
      `${CALENDAR_PREFIX}?${params.toString()}`
    );
    return response.data.data ?? [];
  },

  // Get car calendar events
  getCarCalendarEvents: async (filters: CarCalendarFilters): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.car_id) params.append('car_id', filters.car_id.toString());

    const response = await api.get<ApiResponse<CalendarEvent[]>>(
      `${CAR_CALENDAR_PREFIX}?${params.toString()}`
    );
    return response.data.data ?? [];
  },
};
