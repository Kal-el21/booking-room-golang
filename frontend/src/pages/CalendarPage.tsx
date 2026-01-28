import { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCalendar } from '@/hooks/useCalendar';
import { useRooms } from '@/hooks/useRooms';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, DoorOpen, User, Clock, FileText } from 'lucide-react';

export const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  // Calculate date range for current month view
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Fetch calendar events
  const { data: events, isLoading: eventsLoading } = useCalendar({
    start_date: startDate,
    end_date: endDate,
    room_id: selectedRoomId !== 'all' ? parseInt(selectedRoomId) : undefined,
  });

  // Fetch rooms for filter
  const { data: roomsData, isLoading: roomsLoading } = useRooms({
    page: 1,
    page_size: 100,
  });

  // Format events for FullCalendar
  const calendarEvents = useMemo(() => {
    if (!events) return [];

    return events.map((event) => {
      let backgroundColor = '#3b82f6'; // Blue - default
      let borderColor = '#3b82f6';
      let textColor = '#ffffff';

      // Color coding based on status
      if (event.type === 'request') {
        // Pending requests - Yellow
        backgroundColor = '#eab308';
        borderColor = '#eab308';
      } else if (event.status === 'confirmed') {
        // Confirmed bookings - Blue
        backgroundColor = '#3b82f6';
        borderColor = '#3b82f6';
      } else if (event.status === 'cancelled') {
        // Cancelled - Red
        backgroundColor = '#ef4444';
        borderColor = '#ef4444';
      } else if (event.status === 'completed') {
        // Completed - Gray
        backgroundColor = '#6b7280';
        borderColor = '#6b7280';
      }

      return {
        id: event.id.toString(),
        title: `${event.room_name} - ${event.title || event.purpose || 'Booking'}`,
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
  }, [events]);

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setEventDialogOpen(true);
  };

  const handleDatesSet = (dateInfo: any) => {
    setCurrentDate(dateInfo.view.currentStart);
  };

  const getStatusBadge = (status: string, type: string) => {
    if (type === 'request') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Request</Badge>;
    }

    const config: Record<string, any> = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      completed: { variant: 'secondary', label: 'Completed' },
    };
    const { variant, label } = config[status] || config.confirmed;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (eventsLoading || roomsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar</h2>
          <p className="text-muted-foreground">
            View all room bookings and requests
          </p>
        </div>
      </div>

      {/* Filters & Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Room Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Room</label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {roomsData?.data.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.room_name} - {room.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Legend</label>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span>Cancelled</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-gray-500" />
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            height="auto"
            firstDay={1} // Monday
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

      {/* Event Details Dialog */}
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
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedEvent.status, selectedEvent.type)}
              </div>

              {/* Room */}
              <div className="flex items-start gap-3">
                <DoorOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">Room</div>
                  <div className="font-medium">{selectedEvent.room_name}</div>
                </div>
              </div>

              {/* User Name (for GA/Admin) */}
              {selectedEvent.user_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground">Requested By</div>
                    <div className="font-medium">{selectedEvent.user_name}</div>
                  </div>
                </div>
              )}

              {/* Purpose */}
              {selectedEvent.purpose && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground">Purpose</div>
                    <div className="font-medium">{selectedEvent.purpose}</div>
                  </div>
                </div>
              )}

              {/* Date & Time */}
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

              {/* Type Indicator */}
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