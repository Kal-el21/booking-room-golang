import { useState } from 'react';
import { useBookings, useCancelBooking } from '@/hooks/useBookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorOpen, Calendar, Clock, XCircle, Search, Repeat } from 'lucide-react';
import { format, parseISO, isPast, startOfDay } from 'date-fns';
import { formatBookingDateRange, formatTimeRange, isMultiDayBooking } from '@/utils/dateHelpers';
import type { Booking } from '@/types';

export const AllBookingsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Fetch all bookings for stats (unfiltered)
  const { data: allBookingsData } = useBookings({
    page: 1,
    page_size: 1000,
  });

  // Fetch filtered bookings for display
  const { data: bookingsData, isLoading } = useBookings({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as Booking['status']) : undefined,
  });

  const cancelBooking = useCancelBooking();

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;

    try {
      await cancelBooking.mutateAsync(selectedBooking.id);
      setCancelDialogOpen(false);
      setSelectedBooking(null);
    } catch {
      // Error handled in hook
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive'; label: string }> = {
      confirmed: { variant: 'default', label: 'Confirmed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      completed: { variant: 'secondary', label: 'Completed' },
    };
    const config = variants[status] || variants.confirmed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canCancel = (booking: Booking) => {
    if (booking.status !== 'confirmed') return false;
    const bookingDate = startOfDay(parseISO(booking.booking_date));
    return !isPast(bookingDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const bookings = bookingsData?.data || [];
  const allBookings = allBookingsData?.data || [];
  
  const filteredBookings = bookings.filter((booking: Booking) =>
    booking.room_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Bookings</h2>
          <p className="text-muted-foreground">
            View and manage all room bookings in the system
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Room</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by room name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allBookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allBookings.filter((b) => b.status === 'confirmed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allBookings.filter((b) => b.status === 'cancelled').length}
            </div>
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
              {allBookings.filter((b) => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{filteredBookings.length}</span> bookings
        </p>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchTerm
                ? 'Try adjusting your search term'
                : statusFilter !== 'all'
                ? `No ${statusFilter} bookings at the moment`
                : 'No bookings have been created yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">
                        {booking.room_name || `Room #${booking.room_id}`}
                      </CardTitle>
                      {getStatusBadge(booking.status)}
                    </div>
                    {/* Multi-day badge */}
                    {isMultiDayBooking(booking) && (
                      <div className="flex items-center gap-1 mb-2">
                        <Repeat className="h-3 w-3 text-primary" />
                        <Badge variant="outline" className="text-xs">
                          Multi-day
                        </Badge>
                      </div>
                    )}
                    <CardDescription className="space-y-2">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatBookingDateRange(booking)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRange(booking.start_time, booking.end_time)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Booked on {format(parseISO(booking.created_at), 'MMM dd, yyyy')}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Booking ID: #{booking.id}
                  </div>
                  {canCancel(booking) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelClick(booking)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="bg-muted rounded-lg p-4 my-4 space-y-2">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedBooking.room_name || `Room #${selectedBooking.room_id}`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatBookingDateRange(selectedBooking)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTimeRange(selectedBooking.start_time, selectedBooking.end_time)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};