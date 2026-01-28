import { useQuery } from '@tanstack/react-query';
import { calendarService, type CalendarFilters } from '@/services/calendar.service';

export const useCalendar = (filters: CalendarFilters) => {
  return useQuery({
    queryKey: ['calendar', filters],
    queryFn: () => calendarService.getCalendarEvents(filters),
    enabled: !!filters.start_date && !!filters.end_date,
  });
};