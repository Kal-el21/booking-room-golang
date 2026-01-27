import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { DoorOpen, Users, Calendar, Activity } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import { useUsers } from '@/hooks/useUsers';
import { useBookings } from '@/hooks/useBookings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  // Fetch data
  const { data: roomsData, isLoading: roomsLoading } = useRooms({
    page: 1,
    page_size: 100,
  });

  const { data: usersData, isLoading: usersLoading } = useUsers({
    page: 1,
    page_size: 100,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
    page: 1,
    page_size: 100,
  });

  // Calculate stats
  const totalRooms = roomsData?.meta.total || 0;
  const activeRooms = roomsData?.data.filter((r) => r.is_active).length || 0;
  const totalUsers = usersData?.meta.total || 0;
  const activeUsers = usersData?.data.filter((u) => u.is_active).length || 0;

  // Calculate room usage (this month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const bookingsThisMonth = bookingsData?.data.filter((b) => {
    const bookingDate = new Date(b.booking_date);
    return (
      bookingDate.getMonth() === currentMonth &&
      bookingDate.getFullYear() === currentYear &&
      b.status === 'confirmed'
    );
  }).length || 0;

  // Rough calculation: assume 30 days, 8 working hours per day
  const maxPossibleBookings = totalRooms * 30 * 8; // rooms * days * hours
  const roomUsagePercent = maxPossibleBookings > 0
    ? Math.round((bookingsThisMonth / maxPossibleBookings) * 100)
    : 0;

  // Room status breakdown
  const roomsByStatus = roomsData?.data.reduce((acc, room) => {
    acc[room.status] = (acc[room.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // User role breakdown
  const usersByRole = usersData?.data.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'text-green-600',
      occupied: 'text-yellow-600',
      maintenance: 'text-red-600',
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Rooms"
          value={totalRooms}
          description={`${activeRooms} active`}
          icon={DoorOpen}
          isLoading={roomsLoading}
        />

        <StatCard
          title="Total Users"
          value={totalUsers}
          description={`${activeUsers} active`}
          icon={Users}
          isLoading={usersLoading}
        />

        <StatCard
          title="Room Usage"
          value={`${roomUsagePercent}%`}
          description="This month"
          icon={Calendar}
          isLoading={bookingsLoading || roomsLoading}
        />

        <StatCard
          title="System Status"
          value="Online"
          description="All systems operational"
          icon={Activity}
          isLoading={false}
        />
      </div>

      {/* Room Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Room Status</CardTitle>
              <CardDescription>
                Current status of all rooms
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/rooms')}
            >
              Manage Rooms
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(roomsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${
                      status === 'available' ? 'bg-green-600' :
                      status === 'occupied' ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`} />
                    <span className="text-sm font-medium capitalize">{status}</span>
                  </div>
                  <Badge variant="secondary">{count} rooms</Badge>
                </div>
              ))}
              {Object.keys(roomsByStatus).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No rooms created yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>
                Distribution of user roles
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/users')}
            >
              Manage Users
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {role === 'room_admin' ? 'Room Admin' : role.toUpperCase()}
                    </span>
                  </div>
                  <Badge variant="secondary">{count} users</Badge>
                </div>
              ))}
              {Object.keys(usersByRole).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>
            Latest room bookings in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!bookingsData || bookingsData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bookings yet</p>
              <p className="text-sm">Bookings will appear here once users start requesting rooms</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookingsData.data.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{booking.room_name || `Room #${booking.room_id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.booking_date} • {booking.start_time} - {booking.end_time}
                      </p>
                    </div>
                  </div>
                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};