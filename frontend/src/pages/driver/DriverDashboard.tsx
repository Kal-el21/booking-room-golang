import { useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Fuel,
  Gauge,
  MapPin,
  Navigation,
  Route,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useDriverBookings } from '@/hooks/useCars';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CarBooking } from '@/types';
import {
  formatPickupTime,
  formatReturnTime,
  getCarBookingStatusConfig,
  getCarBookingStatusLabel,
  getKmTraveled,
} from '@/utils/dateHelpers';

const activeStatuses = new Set<CarBooking['status']>(['confirmed', 'picked_up', 'in_use', 'late_return']);
const inProgressStatuses = new Set<CarBooking['status']>(['picked_up', 'in_use', 'late_return']);
const historyStatuses = new Set<CarBooking['status']>(['returned', 'completed', 'cancelled']);

const getBookingDate = (booking: CarBooking) => booking.departure_date || booking.booking_date;

const getBookingTimeValue = (booking: CarBooking) => {
  const date = getBookingDate(booking);
  if (!date) return Number.MAX_SAFE_INTEGER;

  const value = new Date(`${date}T${booking.start_time || '00:00'}`).getTime();
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
};

const sortByScheduleAsc = (a: CarBooking, b: CarBooking) => getBookingTimeValue(a) - getBookingTimeValue(b);
const sortByScheduleDesc = (a: CarBooking, b: CarBooking) => getBookingTimeValue(b) - getBookingTimeValue(a);

const isBookingToday = (booking: CarBooking) => {
  const date = getBookingDate(booking);
  if (!date) return false;
  return isToday(parseISO(date));
};

const formatAssignmentDate = (booking: CarBooking) => {
  const date = getBookingDate(booking);
  return date ? format(parseISO(date), 'MMM dd, yyyy') : 'Date not set';
};

const getCarName = (booking: CarBooking) =>
  booking.car_name_snapshot || booking.car_name || booking.car?.car_name || 'Assigned car';

const getPlateNumber = (booking: CarBooking) =>
  booking.plate_number_snapshot || booking.plate_number || booking.car?.plate_number || 'No plate';

const getRequesterName = (booking: CarBooking) =>
  booking.request?.user?.name || booking.request?.user_name || booking.booked_by_user?.name || 'Requester';

const getAssignerName = (booking: CarBooking) => booking.request?.assigner?.name;

const getPurpose = (booking: CarBooking) => booking.request?.purpose || 'Drive assignment';

const getDestination = (booking: CarBooking) => booking.request?.destination || 'Destination not set';

const getPickupPoint = (booking: CarBooking) =>
  booking.request?.pickup_location || booking.pickup_location || booking.car?.location || 'Pickup not set';

const getPassengerText = (booking: CarBooking) => {
  const passengerCount = booking.request?.passenger_count;
  if (passengerCount != null) return `${passengerCount} passenger${passengerCount === 1 ? '' : 's'}`;

  const requiredCapacity = booking.request?.required_capacity;
  if (requiredCapacity != null) return `Up to ${requiredCapacity} seats`;

  return 'Passenger count not set';
};

const getDistanceText = (booking: CarBooking) => {
  const distance = booking.request?.estimated_distance_km;
  return distance != null ? `${distance.toLocaleString()} km estimated` : 'Distance not set';
};

const getStartOdometerText = (booking: CarBooking) => {
  if (booking.start_odometer != null) return `${booking.start_odometer.toLocaleString()} km`;
  if (booking.car?.current_odometer != null) return `${booking.car.current_odometer.toLocaleString()} km current`;
  return 'Odometer not recorded';
};

const getNextStepLabel = (status: CarBooking['status']) => {
  switch (status) {
    case 'confirmed':
      return 'Ready for pickup';
    case 'picked_up':
    case 'in_use':
      return 'Trip in progress';
    case 'late_return':
      return 'Return overdue';
    case 'returned':
      return 'Returned';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return getCarBookingStatusLabel(status);
  }
};

const getOperationalNote = (booking: CarBooking) => {
  switch (booking.status) {
    case 'confirmed':
      return 'Pickup record pending from GA';
    case 'picked_up':
    case 'in_use':
      return 'Return record pending from GA';
    case 'late_return':
      return 'Past scheduled return time';
    case 'returned':
    case 'completed':
      return 'Trip record closed';
    case 'cancelled':
      return 'Assignment cancelled';
    default:
      return 'Assignment updated';
  }
};

const StatTile = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const DetailItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="flex min-w-0 items-start gap-2 text-sm">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  </div>
);

const BookingCard = ({ booking, compact = false }: { booking: CarBooking; compact?: boolean }) => {
  const statusVariant = getCarBookingStatusConfig(booking.status);
  const assignerName = getAssignerName(booking);
  const kmTravelled = getKmTraveled(booking.start_odometer, booking.end_odometer);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="break-words text-lg">{getCarName(booking)}</CardTitle>
              <Badge variant={statusVariant}>{getCarBookingStatusLabel(booking.status)}</Badge>
              <Badge variant={booking.status === 'late_return' ? 'destructive' : 'outline'}>
                {getNextStepLabel(booking.status)}
              </Badge>
            </div>
            <CardDescription className="break-words">
              {getPlateNumber(booking)} - {getPurpose(booking)}
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground lg:text-right">
            <p className="font-medium text-foreground">{formatAssignmentDate(booking)}</p>
            <p>{booking.start_time} - {booking.end_time}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DetailItem icon={CalendarDays} label="Date" value={formatAssignmentDate(booking)} />
          <DetailItem icon={Clock} label="Time" value={`${booking.start_time} - ${booking.end_time}`} />
          <DetailItem icon={MapPin} label="Pickup" value={getPickupPoint(booking)} />
          <DetailItem icon={Navigation} label="Destination" value={getDestination(booking)} />
          <DetailItem icon={Users} label="Passengers" value={getPassengerText(booking)} />
          <DetailItem icon={Route} label="Distance" value={getDistanceText(booking)} />
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <User className="h-4 w-4" />
              {getRequesterName(booking)}
            </span>
            {assignerName && (
              <span className="inline-flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Assigned by {assignerName}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              {getStartOdometerText(booking)}
            </span>
          </div>
        )}

        {(booking.picked_up_at || booking.returned_at || booking.end_odometer != null || booking.fuel_level_return != null) && (
          <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-2">
            {booking.picked_up_at && (
              <DetailItem icon={Gauge} label="Picked up" value={formatPickupTime(booking.picked_up_at)} />
            )}
            {booking.returned_at && (
              <DetailItem icon={CheckCircle2} label="Returned" value={formatReturnTime(booking.returned_at)} />
            )}
            {booking.end_odometer != null && (
              <DetailItem
                icon={Route}
                label="Trip distance"
                value={kmTravelled != null ? `${kmTravelled.toLocaleString()} km travelled` : `${booking.end_odometer.toLocaleString()} km end`}
              />
            )}
            {booking.fuel_level_return != null && (
              <DetailItem icon={Fuel} label="Fuel return" value={`${booking.fuel_level_return}%`} />
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {booking.status === 'late_return' ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}
          <span>{getOperationalNote(booking)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const AssignmentSection = ({
  title,
  bookings,
  emptyTitle,
  compact,
}: {
  title: string;
  bookings: CarBooking[];
  emptyTitle: string;
  compact?: boolean;
}) => (
  <section className="space-y-3">
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{bookings.length} assignment{bookings.length === 1 ? '' : 's'}</p>
    </div>
    {bookings.length === 0 ? (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <Car className="h-5 w-5" />
          <span>{emptyTitle}</span>
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} compact={compact} />
        ))}
      </div>
    )}
  </section>
);

export const DriverDashboard = () => {
  const { data: bookingsData, isLoading, isError } = useDriverBookings({ page: 1, page_size: 100 });
  const bookings = useMemo(() => bookingsData?.data ?? [], [bookingsData?.data]);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => activeStatuses.has(booking.status)).sort(sortByScheduleAsc),
    [bookings],
  );
  const todayReadyBookings = useMemo(
    () => activeBookings.filter((booking) => booking.status === 'confirmed' && isBookingToday(booking)),
    [activeBookings],
  );
  const inProgressBookings = useMemo(
    () => activeBookings.filter((booking) => inProgressStatuses.has(booking.status)),
    [activeBookings],
  );
  const upcomingBookings = useMemo(
    () => activeBookings.filter((booking) => booking.status === 'confirmed' && !isBookingToday(booking)),
    [activeBookings],
  );
  const closedBookings = useMemo(
    () => bookings.filter((booking) => historyStatuses.has(booking.status)).sort(sortByScheduleDesc),
    [bookings],
  );
  const historyBookings = useMemo(() => closedBookings.slice(0, 6), [closedBookings]);
  const todayCount = useMemo(
    () => activeBookings.filter(isBookingToday).length,
    [activeBookings],
  );
  const lateCount = useMemo(
    () => bookings.filter((booking) => booking.status === 'late_return').length,
    [bookings],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-semibold">Unable to load assignments</h3>
          <p className="text-sm text-muted-foreground">Please refresh the page or check your driver access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Driver Dashboard</h2>
        <p className="text-muted-foreground">Assigned vehicle trips, schedules, and trip records</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile title="Active" value={activeBookings.length} icon={Car} description="Confirmed or in progress" />
        <StatTile title="Today" value={todayCount} icon={CalendarDays} description="Scheduled for today" />
        <StatTile title="On Trip" value={inProgressBookings.length} icon={Gauge} description="Picked up or in use" />
        <StatTile title="Late" value={lateCount} icon={AlertTriangle} description="Past return time" />
        <StatTile title="Closed" value={closedBookings.length} icon={CheckCircle2} description="Completed or cancelled" />
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="mb-4 h-16 w-16 text-muted-foreground opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No assigned drives</h3>
            <p className="text-sm text-muted-foreground">
              Assigned car bookings will appear here after GA assigns you as driver.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {inProgressBookings.length > 0 && (
            <AssignmentSection
              title="In Progress"
              bookings={inProgressBookings}
              emptyTitle="No active trip records"
            />
          )}

          <AssignmentSection
            title="Today"
            bookings={todayReadyBookings}
            emptyTitle="No ready assignments today"
          />

          {upcomingBookings.length > 0 && (
            <AssignmentSection
              title="Upcoming"
              bookings={upcomingBookings}
              emptyTitle="No upcoming assignments"
            />
          )}

          {historyBookings.length > 0 && (
            <AssignmentSection
              title="Recent History"
              bookings={historyBookings}
              emptyTitle="No completed assignments"
              compact
            />
          )}
        </>
      )}
    </div>
  );
};
