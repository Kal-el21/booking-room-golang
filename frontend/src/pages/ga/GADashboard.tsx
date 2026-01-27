import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { CalendarDays, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useRequests } from '@/hooks/useRequests';
import { useBookings } from '@/hooks/useBookings';
import { format, parseISO, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const GADashboard = () => {
  const navigate = useNavigate();

  // Fetch data
  const { data: allRequests, isLoading: requestsLoading } = useRequests({
    page: 1,
    page_size: 100,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useBookings({
    page: 1,
    page_size: 100,
  });

  // Calculate stats
  const pendingRequests = allRequests?.data.filter(
    (r) => r.status === 'pending'
  ).length || 0;

  const approvedToday = allRequests?.data.filter((r) => {
    if (r.status !== 'approved') return false;
    return isToday(parseISO(r.updated_at));
  }).length || 0;

  const rejectedToday = allRequests?.data.filter((r) => {
    if (r.status !== 'rejected') return false;
    return isToday(parseISO(r.updated_at));
  }).length || 0;

  const totalBookings = bookingsData?.meta.total || 0;

  // Get pending requests for table
  const recentPendingRequests = allRequests?.data
    .filter((r) => r.status === 'pending')
    .slice(0, 5) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'outline',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          description="Needs review"
          icon={FileText}
          isLoading={requestsLoading}
        />

        <StatCard
          title="Approved Today"
          value={approvedToday}
          description="Last 24 hours"
          icon={CheckCircle}
          isLoading={requestsLoading}
        />

        <StatCard
          title="Rejected Today"
          value={rejectedToday}
          description="Last 24 hours"
          icon={XCircle}
          isLoading={requestsLoading}
        />

        <StatCard
          title="Total Bookings"
          value={totalBookings}
          description="All time"
          icon={CalendarDays}
          isLoading={bookingsLoading}
        />
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              Room requests awaiting your approval
            </CardDescription>
          </div>
          {pendingRequests > 0 && (
            <Button onClick={() => navigate('/ga/requests')}>
              View All ({pendingRequests})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentPendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending requests</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.user_name || 'Unknown User'}</p>
                      <Badge variant="outline" className="text-xs">
                        Capacity: {request.required_capacity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {request.purpose}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{format(parseISO(request.booking_date), 'MMM dd, yyyy')}</span>
                      <span>
                        {request.start_time} - {request.end_time}
                      </span>
                      <span>Requested {format(parseISO(request.created_at), 'MMM dd')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <Button
                      size="sm"
                      onClick={() => navigate('/ga/requests')}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>
            Overview of request handling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{allRequests?.meta.total || 0}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Approval Rate</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {allRequests?.data
                  ? Math.round(
                      (allRequests.data.filter((r) => r.status === 'approved').length /
                        allRequests.meta.total) *
                        100
                    )
                  : 0}%
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Active Bookings</span>
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {bookingsData?.data.filter((b) => b.status === 'confirmed').length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};