import api from './api';
import type { ApiResponse } from '@/types';

const CALENDAR_PREFIX = '/api/v1/calendar';

export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  room_id: number;
  room_name: string;
  status: string;
  type: 'booking' | 'request';
  user_name?: string;
  purpose?: string;
}

export interface CalendarFilters {
  start_date: string;
  end_date: string;
  room_id?: number;
}

export const calendarService = {
  // Get calendar events
  getCalendarEvents: async (filters: CalendarFilters): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.room_id) params.append('room_id', filters.room_id.toString());

    const response = await api.get<ApiResponse<CalendarEvent[]>>(
      `${CALENDAR_PREFIX}?${params.toString()}`
    );
    return response.data.data;
  },
};