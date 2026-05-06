import { useState, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core/index.js';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCarCalendar } from '@/hooks/useCalendar';
import { useCars } from '@/hooks/useCars';
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isWithinInterval, getDay } from 'date-fns';
import { Calendar as CalendarIcon, CarIcon, User, Clock, FileText, Repeat, MapPin } from 'lucide-react';
import type { CalendarEvent, Car } from '@/types';

/**
 * Expand a multi-day or recurring event into individual calendar events
 */
const expandCalendarEvent = (event: CalendarEvent, calendarStart: Date, calendarEnd: Date): CalendarEvent[] => {
  const expandedEvents: CalendarEvent[] = [];

  if (event.type === 'booking' || event.type === 'car_booking') {
    return [event];
  }

  const eventStart = parseISO(event.start);
  const eventStartDay = new Date(eventStart);
  eventStartDay.setHours(0, 0, 0, 0);

  const eventEnd = event.end_date ? parseISO(event.end_date) : eventStartDay;
  const recurringEndDate = event.recurring_end_date ? parseISO(event.recurring_end_date) : null;

  if (!event.is_recurring && !event.end_date) {
    return [event];
  }

  if (event.is_recurring && event.recurring_type) {
    const daysMap: Record<string, number> = {
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 0,
    };

    const recurringDays = event.recurring_days?.split(',').map(d => daysMap[d.trim()]) || [];
    const effectiveEnd = recurringEndDate || eventEnd;

    if (effectiveEnd < eventStartDay) {
      return [event];
    }

    const allDays = eachDayOfInterval({ start: eventStartDay, end: effectiveEnd });

    for (const day of allDays) {
      const shouldInclude = (
        (event.recurring_type === 'daily') ||
        (recurringDays.includes(getDay(day)))
      );

      if (shouldInclude) {
        if (isWithinInterval(day, { start: calendarStart, end: calendarEnd })) {
          const dayStart = new Date(day);
          dayStart.setHours(eventStart.getHours(), eventStart.getMinutes());

          const dayEnd = new Date(day);
          const originalEnd = parseISO(event.end);
          dayEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes());

          expandedEvents.push({
            ...event,
            id: `${event.id}_${format(day, 'yyyy-MM-dd')}`,
            start: dayStart.toISOString(),
            end: dayEnd.toISOString(),
            title: `${event.car_name || event.room_name || 'Resource'} - ${event.title || event.purpose || 'Booking'} (${format(day, 'MMM dd')})`,
          });
        }
      }
    }

    return expandedEvents;
  }

  if (event.end_date) {
    if (eventEnd < eventStartDay) {
      return [event];
    }

    const allDays = eachDayOfInterval({ start: eventStartDay, end: eventEnd });

    for (const day of allDays) {
      if (isWithinInterval(day, { start: calendarStart, end: calendarEnd })) {
        const dayStart = new Date(day);
        dayStart.setHours(eventStart.getHours(), eventStart.getMinutes());

        const dayEnd = new Date(day);
        const originalEnd = parseISO(event.end);
        dayEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes());

        expandedEvents.push({
          ...event,
          id: `${event.id}_${format(day, 'yyyy-MM-dd')}`,
          start: dayStart.toISOString(),
          end: dayEnd.toISOString(),
          title: `${event.car_name || event.room_name || 'Resource'} - ${event.title || event.purpose || 'Booking'} (${format(day, 'MMM dd')})`,
        });
      }
    }

    return expandedEvents;
  }

  return [event];
};

const CarCalendarPageContent = () => {
  const [currentDate] = useState(new Date());
  const [currentView] = useState('dayGridMonth');
  const [selectedCarId, setSelectedCarId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  });

  const [debouncedDateRange, setDebouncedDateRange] = useState(dateRange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use car calendar hook with car_id filter
  const { data: events, isLoading: eventsLoading } = useCarCalendar({
    start_date: debouncedDateRange.start,
    end_date: debouncedDateRange.end,
    car_id: selectedCarId !== 'all' ? parseInt(selectedCarId) : undefined,
  });

  const { data: carsData, isLoading: carsLoading } = useCars({
    page: 1,
    page_size: 100,
    is_active: true,
  });

  const carCalendarEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];

    const calendarStart = parseISO(debouncedDateRange.start);
    const calendarEnd = parseISO(debouncedDateRange.end);

    const expandedEvents: CalendarEvent[] = [];

    for (const event of events) {
      if (!event) continue;
      const expanded = expandCalendarEvent(event, calendarStart, calendarEnd);
      expandedEvents.push(...expanded);
    }

    return expandedEvents.map((event, idx) => {
      let backgroundColor = '#059669';
      let borderColor = '#059669';
      const textColor = '#ffffff';

      if (event.type === 'car_request' || event.type === 'request') {
        backgroundColor = '#d97706';
        borderColor = '#d97706';
      } else if (event.type === 'car_booking' || event.type === 'booking') {
        if (event.status === 'cancelled') {
          backgroundColor = '#dc2626';
          borderColor = '#dc2626';
        } else if (event.status === 'completed') {
          backgroundColor = '#4b5563';
          borderColor = '#4b5563';
        } else {
          backgroundColor = '#059669';
          borderColor = '#059669';
        }
      }

      return {
        id: event.id?.toString() || `event-${idx}`,
        title: `${event.car_name || event.room_name || 'Vehicle'} - ${event.title || event.purpose || 'Booking'}`,
        start: event.start,
        end: event.end,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          ...event,
        },
      };
    });
  }, [events, debouncedDateRange]);

  const handleEventClick = (info: EventClickArg) => {
    setSelectedEvent(info.event.extendedProps as CalendarEvent);
    setEventDialogOpen(true);
  };

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    const newStart = format(dateInfo.start, 'yyyy-MM-dd');
    const newEnd = format(dateInfo.end, 'yyyy-MM-dd');
    setDateRange({ start: newStart, end: newEnd });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedDateRange({ start: newStart, end: newEnd });
    }, 300);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Car Calendar</h1>
            <p className="text-muted-foreground">View and manage vehicle bookings</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">View</label>
                <Select value={currentView} onValueChange={setCurrentView}>
                  <SelectTrigger>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dayGridMonth">Month</SelectItem>
                    <SelectItem value="timeGridWeek">Week</SelectItem>
                    <SelectItem value="timeGridDay">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Car</label>
                <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                  <SelectTrigger>
                    <CarIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Cars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cars</SelectItem>
                    {carsLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                       carsData?.data?.map((car: Car) => (
                        <SelectItem key={car.id} value={car.id.toString()}>
                          {car.car_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="p-0">
            {(eventsLoading || carsLoading) && (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
            )}
            {!eventsLoading && (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={currentView}
                initialDate={currentDate}
                events={carCalendarEvents}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                height="auto"
                contentHeight="auto"
                eventContent={(eventInfo) => (
                  <div className="p-1 text-xs">
                    <div className="font-medium truncate">{eventInfo.event.title}</div>
                    {eventInfo.timeText && (
                      <div className="text-[10px] opacity-75">{eventInfo.timeText}</div>
                    )}
                  </div>
                )}
                loading={(isLoading) => {
                  if (isLoading) {
                    // Loading state handled above
                  }
                }}
                eventClassNames={(arg) => {
                  const event = arg.event.extendedProps;
                  if (event.type === 'car_request' || event.type === 'request') {
                    return ['border-dashed', 'opacity-75'];
                  }
                  return [];
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Event Details Dialog */}
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CarIcon className="h-5 w-5" />
                {selectedEvent?.type?.includes('request') ? 'Request Details' : 'Booking Details'}
              </DialogTitle>
              <DialogDescription>
                {selectedEvent?.type?.includes('request') ? 'Car booking request information' : 'Confirmed car booking details'}
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedEvent.car_name || selectedEvent.room_name || 'Vehicle'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedEvent.user_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedEvent.start && format(parseISO(selectedEvent.start), 'MMM dd, yyyy h:mm a')}
                    {' - '}
                    {selectedEvent.end && format(parseISO(selectedEvent.end), 'h:mm a')}
                  </span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedEvent.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedEvent.purpose || selectedEvent.title || 'No description'}</span>
                </div>
                {selectedEvent.is_recurring && (
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Recurring: {selectedEvent.recurring_type || 'N/A'} {selectedEvent.recurring_days && `(${selectedEvent.recurring_days})`}
                    </span>
                  </div>
                )}
                <Badge variant="secondary" className="mt-2">
                  {selectedEvent.status}
                </Badge>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export const CarCalendarPage = () => {
  return <CarCalendarPageContent />;
};
