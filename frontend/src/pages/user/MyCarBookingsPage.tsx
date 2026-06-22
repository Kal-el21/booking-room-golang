import { useState } from 'react';
import { useMyCarBookings } from '@/hooks/useCars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Car as CarIcon, Fuel, Gauge, MapPin, User } from 'lucide-react';
import { parseISO, isPast, isToday, isFuture, startOfDay } from 'date-fns';
import { formatCarBookingDateRange, formatPickupTime, getKmTraveled, getCarBookingStatusLabel, getCarBookingStatusConfig } from '@/utils/dateHelpers';
import type { CarBooking } from '@/types';

export const MyCarBookingsPage = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('all');
  const { data: bookingsData, isLoading } = useMyCarBookings();

  const bookings = (bookingsData?.data || []) as CarBooking[];

  // ── Categorise bookings ────────────────────────────────────────────────────

  const getCarBookingDate = (b: CarBooking): Date => {
    const d = b.picked_up_at ? parseISO(b.picked_up_at) : parseISO(b.departure_date || b.booking_date || '');
    return startOfDay(d);
  };

  const upcomingBookings = bookings.filter((b: CarBooking) => {
    if (b.status === 'returned' || b.status === 'late_return' || b.status === 'cancelled') return false;
    return isFuture(getCarBookingDate(b)) || isToday(getCarBookingDate(b));
  });

  const pastBookings = bookings.filter((b: CarBooking) => {
    return isPast(getCarBookingDate(b)) && !isToday(getCarBookingDate(b));
  });

  // When "upcoming" tab is selected filter inside the tab
  const displayedBookings = (() => {
    switch (activeTab) {
      case 'upcoming': return upcomingBookings;
      case 'past':      return pastBookings;
      default:          return bookings;
    }
  })();

  // ── Card component ─────────────────────────────────────────────────────────

  const BookingCard = ({ booking }: { booking: CarBooking }) => {
    const km = getKmTraveled(booking.start_odometer, booking.end_odometer);
    const isPickedUp = !!booking.picked_up_at;
    const isReturned = !!booking.returned_at;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CarIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  {booking.car_name_snapshot || booking.car?.car_name || `Car #${booking.car_id}`}
                </CardTitle>
              </div>
              <CardDescription className="space-y-1 mt-2">
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  {formatCarBookingDateRange(booking)}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {booking.start_time} – {booking.end_time}
                </div>
                {booking.plate_number_snapshot && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3" />
                    {booking.plate_number_snapshot}
                  </div>
                )}
              </CardDescription>
            </div>
            <Badge variant={getCarBookingStatusConfig(booking.status)}>
              {getCarBookingStatusLabel(booking.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Driver info */}
          {(booking.driver_name || booking.driver) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Driver: {booking.driver_name || booking.driver?.name || '—'}</span>
            </div>
          )}

          {/* Pickup info */}
          {isPickedUp && booking.start_odometer != null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" />
              <span>
                Picked up at {booking.pickup_location || '—'} · Odometer {booking.start_odometer.toLocaleString()} km
                {' '}({formatPickupTime(booking.picked_up_at)})
              </span>
            </div>
          )}

          {/* Return info */}
          {isReturned && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" />
              <span>
                Returned · Odometer {booking.end_odometer?.toLocaleString()} km
                {km !== null && (
                  <span className="ml-1">({km.toLocaleString()} km travelled)</span>
                )}
              </span>
            </div>
          )}

          {isReturned && booking.fuel_level_return != null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Fuel className="h-4 w-4" />
              <span>Fuel on return: {booking.fuel_level_return}%</span>
            </div>
          )}

          {booking.return_notes && (
            <p className="text-xs text-muted-foreground italic">
              Note: {booking.return_notes}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">My Car Bookings</h2>
        <p className="text-muted-foreground">
          View all your vehicle bookings — pickup, return, and travel records
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b: CarBooking) => b.status === 'in_use' || b.status === 'picked_up').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Returned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter((b: CarBooking) => b.status === 'returned' || b.status === 'late_return').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'past' | 'all')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {displayedBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CarIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No car bookings yet</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Your car bookings will appear here once approved by the GA team
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {displayedBookings.map((booking: CarBooking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
