import { useBookings } from '@/hooks/useBookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoorOpen, Calendar, Clock, Repeat } from 'lucide-react';
import { format, parseISO, isPast, isToday, isFuture, startOfDay } from 'date-fns';
import { formatBookingDateRange, formatTimeRange, isMultiDayBooking } from '@/utils/dateHelpers';
import type { Booking } from '@/types';

export const MyBookingsPage = () => {
  const { data: bookingsData, isLoading } = useBookings({
    page: 1,
    page_size: 100,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive'; label: string }> = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      completed: { variant: 'secondary', label: 'Completed' },
    };
    const config = variants[status] || variants.confirmed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const bookings = bookingsData?.data || [];

  // Filter bookings by date
  const upcomingBookings = bookings.filter((b: Booking) => {
    if (b.status !== 'confirmed') return false;
    const bookingDate = startOfDay(parseISO(b.booking_date));
    return isFuture(bookingDate) || isToday(bookingDate);
  });

  const pastBookings = bookings.filter((b: Booking) => {
    const bookingDate = startOfDay(parseISO(b.booking_date));
    return isPast(bookingDate) && !isToday(bookingDate);
  });

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <DoorOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {booking.room_name || `Room #${booking.room_id}`}
              </CardTitle>
            </div>
            {/* Multi-day badge */}
            {isMultiDayBooking(booking) && (
              <div className="flex items-center gap-1 mb-1">
                <Repeat className="h-3 w-3 text-primary" />
                <Badge variant="outline" className="text-xs">
                  Multi-day
                </Badge>
              </div>
            )}
            <CardDescription className="space-y-1 mt-2">
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {formatBookingDateRange(booking)}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-3 w-3" />
                {formatTimeRange(booking.start_time, booking.end_time)}
              </div>
            </CardDescription>
          </div>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Booked on {format(parseISO(booking.created_at), 'MMM dd, yyyy')}
          </div>
          {isToday(parseISO(booking.booking_date)) && booking.status === 'confirmed' && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Today
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <p className="text-muted-foreground">
          View all your room bookings
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b) => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({bookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No upcoming bookings</h3>
                <p className="text-sm text-muted-foreground text-center">
                  You don't have any confirmed bookings scheduled
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No past bookings</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Your booking history will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Create a room request to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};