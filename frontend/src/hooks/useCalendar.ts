import { useQuery } from '@tanstack/react-query';
import { calendarService, type CalendarFilters, type CarCalendarFilters } from '@/services/calendar.service';

export const useCalendar = (filters: CalendarFilters) => {
  return useQuery({
    queryKey: ['calendar', filters],
    queryFn: () => calendarService.getCalendarEvents(filters),
    enabled: !!filters.start_date && !!filters.end_date,
    placeholderData: (previousData) => previousData,
  });
};

export const useCarCalendar = (filters: CarCalendarFilters) => {
  return useQuery({
    queryKey: ['carCalendar', filters],
    queryFn: () => calendarService.getCarCalendarEvents(filters),
    enabled: !!filters.start_date && !!filters.end_date,
    placeholderData: (previousData) => previousData,
  });
};