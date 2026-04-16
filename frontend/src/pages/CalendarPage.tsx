import { useState, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCalendar } from '@/hooks/useCalendar';
import { useRooms } from '@/hooks/useRooms';
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isWithinInterval, getDay } from 'date-fns';
import { Calendar as CalendarIcon, DoorOpen, User, Clock, FileText, Repeat, Loader2 } from 'lucide-react';
import type { CalendarEvent } from '@/services/calendar.service';

/**
 * Expand a multi-day or recurring event into individual calendar events
 */
const expandCalendarEvent = (event: CalendarEvent, calendarStart: Date, calendarEnd: Date): CalendarEvent[] => {
  const expandedEvents: CalendarEvent[] = [];
  
  if (event.type === 'booking') {
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
            title: `${event.room_name || 'Room'} - ${event.title || event.purpose || 'Booking'} (${format(day, 'MMM dd')})`,
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
          title: `${event.room_name || 'Room'} - ${event.title || event.purpose || 'Booking'} (${format(day, 'MMM dd')})`,
        });
      }
    }
    
    return expandedEvents;
  }

  return [event];
};

const CalendarPageContent = () => {
  const calendarRef = useRef<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
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

  const { data: events, isLoading: eventsLoading, isFetching: eventsFetching } = useCalendar({
    start_date: debouncedDateRange.start,
    end_date: debouncedDateRange.end,
    room_id: selectedRoomId !== 'all' ? parseInt(selectedRoomId) : undefined,
  });

  const { data: roomsData, isLoading: roomsLoading } = useRooms({
    page: 1,
    page_size: 100,
  });

  const calendarEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];

    const calendarStart = parseISO(debouncedDateRange.start);
    const calendarEnd = parseISO(debouncedDateRange.end);

    const expandedEvents: CalendarEvent[] = [];

    for (const event of events) {
      if (!event) continue;
      const expanded = expandCalendarEvent(event, calendarStart, calendarEnd);
      expandedEvents.push(...expanded);
    }

    return expandedEvents.map((event) => {
      let backgroundColor = '#2563eb';
      let borderColor = '#2563eb';
      const textColor = '#ffffff';

      if (event.type === 'request') {
        backgroundColor = '#d97706';
        borderColor = '#d97706';
      } else if (event.status === 'confirmed') {
        backgroundColor = '#2563eb';
        borderColor = '#2563eb';
      } else if (event.status === 'cancelled') {
        backgroundColor = '#dc2626';
        borderColor = '#dc2626';
      } else if (event.status === 'completed') {
        backgroundColor = '#4b5563';
        borderColor = '#4b5563';
      }

      return {
        id: event.id?.toString() || Math.random().toString(),
        title: `${event.room_name || 'Deleted Room'} - ${event.title || event.purpose || 'Booking'}`,
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

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setEventDialogOpen(true);
  };

  const handleDatesSet = (dateInfo: any) => {
    const newStart = format(dateInfo.start, 'yyyy-MM-dd');
    const newEnd = format(dateInfo.end, 'yyyy-MM-dd');
    
    setCurrentDate(dateInfo.start);
    setCurrentView(dateInfo.view.type);
    
    if (newStart !== dateRange.start || newEnd !== dateRange.end) {
      setDateRange({ start: newStart, end: newEnd });

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedDateRange({ start: newStart, end: newEnd });
      }, 300);
    }
  };

  const getStatusBadge = (status: string, type: string, event: CalendarEvent) => {
    if (type === 'request') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Request</Badge>;
    }

    if (event.is_recurring || event.end_date) {
      return (
        <div className="flex gap-1">
          <Badge variant="outline">
            {event.is_recurring ? (
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {event.recurring_type === 'daily' ? 'Daily' : event.recurring_type === 'weekly' ? 'Weekly' : 'Monthly'}
              </span>
            ) : (
              'Multi-day'
            )}
          </Badge>
          <Badge variant="default">Confirmed</Badge>
        </div>
      );
    }

    const config: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive'; label: string }> = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      completed: { variant: 'secondary', label: 'Completed' },
    };
    const { variant, label } = config[status] || config.confirmed;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isInitialLoading = (eventsLoading && !events) || roomsLoading;
  const isFetchingMore = eventsFetching && !!events;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const rooms = Array.isArray(roomsData?.data) ? roomsData.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold">Calendar</h2>
            <p className="text-muted-foreground">
              View all room bookings and requests
            </p>
          </div>
          {isFetchingMore && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium animate-in fade-in duration-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Room</label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.length > 0 ? (
                    rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.room_name} - {room.location}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No rooms available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Legend</label>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-blue-600" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-amber-600" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-red-600" />
                  <span>Cancelled</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-gray-600" />
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            initialDate={currentDate}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            height="auto"
            firstDay={1}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Booking Details
            </DialogTitle>
            <DialogDescription>
              Information about this booking
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedEvent.status, selectedEvent.type, selectedEvent)}
              </div>

              {(selectedEvent.is_recurring || selectedEvent.end_date) && (
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4" />
                    <span className="font-medium">Booking Details</span>
                  </div>
                  {selectedEvent.is_recurring ? (
                    <div className="text-sm text-muted-foreground">
                      <p>Type: {selectedEvent.recurring_type?.charAt(0).toUpperCase() + selectedEvent.recurring_type?.slice(1)} recurring</p>
                      {selectedEvent.recurring_days && (
                        <p>Days: {selectedEvent.recurring_days.split(',').map((d: string) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][parseInt(d)-1] || '').join(', ')}</p>
                      )}
                      {selectedEvent.recurring_end_date && (
                        <p>Until: {format(parseISO(selectedEvent.recurring_end_date), 'MMM dd, yyyy')}</p>
                      )}
                    </div>
                  ) : selectedEvent.end_date ? (
                    <div className="text-sm text-muted-foreground">
                      <p>Multi-day booking</p>
                      <p>From: {format(parseISO(selectedEvent.start), 'MMM dd, yyyy')}</p>
                      <p>To: {format(parseISO(selectedEvent.end_date), 'MMM dd, yyyy')}</p>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-start gap-3">
                <DoorOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">Room</div>
                  <div className="font-medium">{selectedEvent.room_name}</div>
                </div>
              </div>

              {selectedEvent.user_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground">Requested By</div>
                    <div className="font-medium">{selectedEvent.user_name}</div>
                  </div>
                </div>
              )}

              {selectedEvent.purpose && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground">Purpose</div>
                    <div className="font-medium">{selectedEvent.purpose}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">Date & Time</div>
                  <div className="font-medium">
                    {format(new Date(selectedEvent.start), 'EEEE, MMMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedEvent.start), 'HH:mm')} -{' '}
                    {format(new Date(selectedEvent.end), 'HH:mm')}
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-3 text-sm">
                {selectedEvent.type === 'request' ? (
                  <p className="text-muted-foreground">
                    ⏳ This is a pending request waiting for GA approval
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    ✓ This booking has been confirmed
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const CalendarPage = () => {
  return (
    <ErrorBoundary>
      <CalendarPageContent />
    </ErrorBoundary>
  );
};
