import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { CalendarDays, DoorOpen, FileText, Clock } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useRequests } from '@/hooks/useRequests';
import { useRooms } from '@/hooks/useRooms';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export const UserDashboard = () => {
  // Fetch data
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
    page: 1,
    page_size: 100,
  });
  
  const { data: requestsData, isLoading: requestsLoading } = useRequests({
    page: 1,
    page_size: 100,
  });
  
  const { data: roomsData, isLoading: roomsLoading } = useRooms({
    status: 'available',
    page: 1,
    page_size: 100,
  });

  // Calculate stats
  const activeBookings = bookingsData?.data.filter(
    (b) => b.status === 'confirmed'
  ).length || 0;

  const pendingRequests = requestsData?.data.filter(
    (r) => r.status === 'pending'
  ).length || 0;

  const availableRooms = roomsData?.data.length || 0;

  // Get upcoming bookings (next 7 days)
  const today = startOfDay(new Date());
  const upcomingBookings = bookingsData?.data.filter((b) => {
    if (b.status !== 'confirmed') return false;
    const bookingDate = parseISO(b.booking_date);
    return isAfter(bookingDate, today);
  }).length || 0;

  // Get recent bookings for table
  const recentBookings = bookingsData?.data
    .filter((b) => b.status === 'confirmed')
    .slice(0, 5) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Bookings"
          value={activeBookings}
          description="Active bookings"
          icon={CalendarDays}
          isLoading={bookingsLoading}
        />

        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          description="Awaiting approval"
          icon={FileText}
          isLoading={requestsLoading}
        />

        <StatCard
          title="Available Rooms"
          value={availableRooms}
          description="Ready to book"
          icon={DoorOpen}
          isLoading={roomsLoading}
        />

        <StatCard
          title="Upcoming"
          value={upcomingBookings}
          description="Next 7 days"
          icon={Clock}
          isLoading={bookingsLoading}
        />
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>
            Your latest confirmed room bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bookings yet</p>
              <p className="text-sm">Create a room request to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{booking.room_name || `Room #${booking.room_id}`}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{format(parseISO(booking.booking_date), 'MMM dd, yyyy')}</span>
                      <span>
                        {booking.start_time} - {booking.end_time}
                      </span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            What you can do from here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <DoorOpen className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Browse Rooms</h4>
                <p className="text-sm text-muted-foreground">
                  View all available rooms and their facilities
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Create Request</h4>
                <p className="text-sm text-muted-foreground">
                  Submit a new room booking request
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};