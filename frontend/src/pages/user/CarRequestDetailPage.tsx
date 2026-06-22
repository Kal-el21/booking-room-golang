import { useNavigate, useParams } from 'react-router-dom';
import type { ElementType, ReactNode } from 'react';
import {
  ArrowLeft,
  Calendar,
  Car,
  Clock,
  Coffee,
  Edit,
  Fuel,
  MapPin,
  Navigation,
  Repeat,
  Users,
} from 'lucide-react';
import { useCarRequest } from '@/hooks/useCars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCarRequestDateRange,
  formatTimeRange,
  getCarRequestTypeLabel,
} from '@/utils/dateHelpers';
import type { CarRequest } from '@/types';

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive'; label: string }> = {
    pending: { variant: 'outline', label: 'Pending' },
    approved: { variant: 'default', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
    cancelled: { variant: 'secondary', label: 'Cancelled' },
  };
  const config = variants[status] || variants.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const valueOrDash = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return '-';
  return value;
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
}) => (
  <div className="flex items-start gap-3 rounded-md border p-3">
    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  </div>
);

const BookingList = ({ request }: { request: CarRequest }) => {
  const bookings = request.bookings ?? [];
  if (bookings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Bookings</CardTitle>
        <CardDescription>Bookings created after GA approval</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{booking.car_name_snapshot || booking.car?.car_name || `Car #${booking.car_id}`}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.departure_date || booking.booking_date} · {booking.start_time} - {booking.end_time}
                </p>
              </div>
              <Badge variant="outline">{booking.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const CarRequestDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const requestId = id ? parseInt(id) : 0;
  const { data: request, isLoading, error } = useCarRequest(requestId);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => navigate('/user/car-requests')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="mb-4 h-16 w-16 text-muted-foreground opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">Car request not found</h3>
            <p className="text-sm text-muted-foreground">The request may have been deleted or is unavailable.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/user/car-requests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{request.purpose}</h1>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-muted-foreground">Car request #{request.id}</p>
          </div>
        </div>
        {request.status === 'pending' && (
          <Button onClick={() => navigate(`/user/car-requests/${request.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Request
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Requested date, time, and recurrence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailRow icon={Calendar} label="Date" value={formatCarRequestDateRange(request)} />
            <DetailRow icon={Clock} label="Time" value={formatTimeRange(request.start_time, request.end_time)} />
            <DetailRow icon={Repeat} label="Type" value={getCarRequestTypeLabel(request)} />
            <DetailRow icon={Users} label="Required Capacity" value={`${request.required_capacity} people`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
          <CardDescription>Destination, pickup, driver, and travel estimates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow icon={Navigation} label="Destination" value={valueOrDash(request.destination)} />
            <DetailRow icon={MapPin} label="Pickup Location" value={valueOrDash(request.pickup_location)} />
            <DetailRow icon={Users} label="Passenger Count" value={valueOrDash(request.passenger_count)} />
            <DetailRow icon={Navigation} label="Estimated Distance" value={request.estimated_distance_km != null ? `${request.estimated_distance_km} km` : '-'} />
            <DetailRow icon={Car} label="Need Driver" value={request.driver_required ? 'Yes' : 'No'} />
            <DetailRow icon={Fuel} label="Fuel Reimbursement" value={request.needs_fuel_reimbursement ? 'Yes' : 'No'} />
          </div>
          {request.fuel_note && (
            <div className="mt-4 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Fuel Note</p>
              <p className="text-sm">{request.fuel_note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Additional request information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Request Notes</p>
            <p className="text-sm">{valueOrDash(request.notes)}</p>
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Coffee className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Consumption</p>
              <p className="text-sm font-medium">{request.has_consumption ? 'Required' : 'Not required'}</p>
              {request.consumption_note && (
                <p className="mt-1 text-sm text-muted-foreground">{request.consumption_note}</p>
              )}
            </div>
          </div>
          {request.rejected_reason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {request.rejected_reason}
            </div>
          )}
        </CardContent>
      </Card>

      <BookingList request={request} />
    </div>
  );
};
