import { useState } from 'react';
import { useCarBookings, usePickUpBooking, useReturnBooking, useUpdateCarBookingStatus, useAssignDriver, useUnassignDriver } from '@/hooks/useCars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search, Car as CarIcon, Calendar, Clock, MapPin, User, Gauge, Fuel,
  CheckCircle, XCircle, RefreshCw, UserPlus, UserMinus, FileText, Car,
} from 'lucide-react';
import { format, parseISO, isFuture, isToday, startOfDay } from 'date-fns';
import {
  formatCarBookingDateRange, formatPickupTime, formatReturnTime,
  getKmTraveled, getCarBookingStatusLabel, getCarBookingStatusConfig,
} from '@/utils/dateHelpers';
import { toast } from 'sonner';
import type { CarBooking, CarBookingStatus, PickUpBookingInput, ReturnBookingInput } from '@/types';

export const AllCarBookingsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [statusOverrideOpen, setStatusOverrideOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<CarBooking | null>(null);
  const [pickupInput, setPickupInput] = useState<PickUpBookingInput>({ start_odometer: 0 });
  const [returnInput, setReturnInput] = useState<ReturnBookingInput>({ end_odometer: 0, fuel_level_return: 100 });
  const [overrideStatus, setOverrideStatus] = useState<string>('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: allBookingsData } = useCarBookings({ page: 1, page_size: 1000 });
  const { data: bookingsData, isLoading } = useCarBookings({
    page: 1,
    page_size: 100,
    status: statusFilter !== 'all' ? (statusFilter as CarBookingStatus) : undefined,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const pickUpBooking = usePickUpBooking();
  const returnBooking = useReturnBooking();
  const updateBookingStatus = useUpdateCarBookingStatus();
  const assignDriver = useAssignDriver();
  const unassignDriver = useUnassignDriver();

  // ── Pickup handler ────────────────────────────────────────────────────────

  const handlePickupClick = (booking: CarBooking) => {
    setSelectedBooking(booking);
    setPickupInput({
      driver_id: booking.driver_id ?? undefined,
      pickup_location: booking.pickup_location ?? '',
      start_odometer: booking.start_odometer ?? 0,
    });
    setPickupDialogOpen(true);
  };

  const handlePickupSubmit = async () => {
    if (!selectedBooking) return;
    try {
      await pickUpBooking.mutateAsync({ id: selectedBooking.id, data: pickupInput });
      toast.success('Pickup recorded successfully');
      setPickupDialogOpen(false);
      setSelectedBooking(null);
    } catch {
      toast.error('Failed to record pickup');
    }
  };

  // ── Return handler ─────────────────────────────────────────────────────────

  const handleReturnClick = (booking: CarBooking) => {
    setSelectedBooking(booking);
    setReturnInput({
      end_odometer: booking.end_odometer ?? booking.start_odometer ?? 0,
      fuel_level_return: booking.fuel_level_return ?? 100,
      return_notes: booking.return_notes ?? '',
    });
    setReturnDialogOpen(true);
  };

  const handleReturnSubmit = async () => {
    if (!selectedBooking) return;
    try {
      await returnBooking.mutateAsync({ id: selectedBooking.id, data: returnInput });
      toast.success('Return recorded successfully');
      setReturnDialogOpen(false);
      setSelectedBooking(null);
    } catch {
      toast.error('Failed to record return');
    }
  };

  // ── Status override handler ─────────────────────────────────────────────────

  const handleStatusOverrideClick = (booking: CarBooking) => {
    setSelectedBooking(booking);
    setOverrideStatus(booking.status);
    setStatusOverrideOpen(true);
  };

  const handleStatusOverrideSubmit = async () => {
    if (!selectedBooking || !overrideStatus) return;
    try {
      await updateBookingStatus.mutateAsync({ id: selectedBooking.id, status: overrideStatus as CarBookingStatus });
      toast.success('Status updated successfully');
      setStatusOverrideOpen(false);
      setSelectedBooking(null);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Assign / Unassign handler ──────────────────────────────────────────────

  const handleAssignDriver = async (booking: CarBooking) => {
    // In a real app this would open a user-select dialog; for now we use the existing driver
    if (!booking.driver_id) {
      toast.error('No driver ID available — use assign endpoint from car-booking page');
      return;
    }
    try {
      await assignDriver.mutateAsync({ id: booking.id, data: { driver_id: booking.driver_id } });
      toast.success('Driver assigned');
    } catch {
      toast.error('Failed to assign driver');
    }
  };

  const handleUnassignDriver = async (booking: CarBooking) => {
    try {
      await unassignDriver.mutateAsync(booking.id);
      toast.success('Driver unassigned');
    } catch {
      toast.error('Failed to unassign driver');
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const bookings = bookingsData?.data || [];
  const allBookings = allBookingsData?.data || [];

  const filteredBookings = bookings.filter((b: CarBooking) =>
    (b.car_name_snapshot || b.car?.car_name || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ── Status badge ───────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => (
    <Badge variant={getCarBookingStatusConfig(status)}>
      {getCarBookingStatusLabel(status)}
    </Badge>
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Car Bookings</h2>
          <p className="text-muted-foreground">
            View and manage all vehicle bookings — pickup, return, and lifecycle status
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Car</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by car name or plate number..."
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
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="late_return">Late Return</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        {[
          { label: 'Total', value: allBookings.length },
          { label: 'Confirmed', value: allBookings.filter((b: CarBooking) => b.status === 'confirmed').length },
          { label: 'Picked Up', value: allBookings.filter((b: CarBooking) => b.status === 'picked_up').length },
          { label: 'In Use', value: allBookings.filter((b: CarBooking) => b.status === 'in_use').length },
          { label: 'Returned', value: allBookings.filter((b: CarBooking) => b.status === 'returned').length },
          { label: 'Late', value: allBookings.filter((b: CarBooking) => b.status === 'late_return').length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{filteredBookings.length}</span> bookings
      </p>

      {/* Booking Cards */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CarIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No car bookings found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {searchTerm
                ? 'Try adjusting your search term'
                : statusFilter !== 'all'
                ? `No ${statusFilter} bookings at the moment`
                : 'No car bookings have been created yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking: CarBooking) => {
            const km = getKmTraveled(booking.start_odometer, booking.end_odometer);
            const canPickUp = booking.status === 'confirmed';
            const canReturn = booking.status === 'picked_up' || booking.status === 'in_use';
            const isReturned = !!booking.returned_at;

            return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CarIcon className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-lg truncate">
                          {booking.car_name_snapshot || booking.car?.car_name || `Car #${booking.car_id}`}
                        </CardTitle>
                        {getStatusBadge(booking.status)}
                        {booking.driver_id && (
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {booking.driver_name || 'Driver assigned'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatCarBookingDateRange(booking)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.start_time} – {booking.end_time}
                          </span>
                        </div>
                        {booking.plate_number_snapshot && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {booking.plate_number_snapshot}
                          </div>
                        )}
                        {booking.driver_name && (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            Driver: {booking.driver_name}
                          </div>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Lifecycle info */}
                  {booking.picked_up_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gauge className="h-4 w-4 text-green-600" />
                      <span>
                        Picked up at {booking.pickup_location || '—'} · Odometer {booking.start_odometer?.toLocaleString()} km
                        {' '}({formatPickupTime(booking.picked_up_at)})
                      </span>
                    </div>
                  )}

                  {isReturned && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        <span>
                          Returned · End odometer {booking.end_odometer?.toLocaleString()} km
                          {km !== null && (
                            <span className="ml-1 font-medium">({km.toLocaleString()} km travelled)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Fuel className="h-4 w-4" />
                        <span>Fuel on return: {booking.fuel_level_return}%</span>
                      </div>
                      {booking.return_notes && (
                        <p className="text-xs text-muted-foreground italic">
                          Note: {booking.return_notes}
                        </p>
                      )}
                    </>
                  )}

                  {/* GA Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                    {canPickUp && (
                      <Button size="sm" onClick={() => handlePickupClick(booking)}>
                        <Gauge className="h-4 w-4 mr-2" />
                        Record Pickup
                      </Button>
                    )}
                    {canReturn && (
                      <Button size="sm" variant="outline" onClick={() => handleReturnClick(booking)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Record Return
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleStatusOverrideClick(booking)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Override Status
                    </Button>
                    {booking.driver_id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnassignDriver(booking)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unassign Driver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAssignDriver(booking)}
                        disabled={!booking.driver_id}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign Driver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Pickup Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Pickup</DialogTitle>
            <DialogDescription>
              Record the pickup details for this car booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Car:</span> {selectedBooking.car_name_snapshot || selectedBooking.car?.car_name}</p>
                <p><span className="font-medium">Departure:</span> {formatCarBookingDateRange(selectedBooking)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_location">Pickup Location</Label>
                <Input
                  id="pickup_location"
                  placeholder="e.g., Office Parking Lot A"
                  value={pickupInput.pickup_location}
                  onChange={(e) => setPickupInput({ ...pickupInput, pickup_location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_odometer">Start Odometer (km) *</Label>
                <Input
                  id="start_odometer"
                  type="number"
                  placeholder="0"
                  value={pickupInput.start_odometer}
                  onChange={(e) => setPickupInput({ ...pickupInput, start_odometer: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePickupSubmit} disabled={pickUpBooking.isPending}>
              {pickUpBooking.isPending ? 'Recording…' : 'Record Pickup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Return</DialogTitle>
            <DialogDescription>
              Record the return details for this car booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Car:</span> {selectedBooking.car_name_snapshot || selectedBooking.car?.car_name}</p>
                <p><span className="font-medium">Start odometer:</span> {selectedBooking.start_odometer?.toLocaleString()} km</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_odometer">End Odometer (km) *</Label>
                <Input
                  id="end_odometer"
                  type="number"
                  placeholder="0"
                  value={returnInput.end_odometer}
                  onChange={(e) => setReturnInput({ ...returnInput, end_odometer: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel_level_return">Fuel Level on Return (%) *</Label>
                <Input
                  id="fuel_level_return"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0–100"
                  value={returnInput.fuel_level_return}
                  onChange={(e) => setReturnInput({ ...returnInput, fuel_level_return: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return_notes">Return Notes</Label>
                <Textarea
                  id="return_notes"
                  placeholder="Any damage, issues, or remarks..."
                  value={returnInput.return_notes}
                  onChange={(e) => setReturnInput({ ...returnInput, return_notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnSubmit} disabled={returnBooking.isPending}>
              {returnBooking.isPending ? 'Recording…' : 'Record Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status Override Dialog ─────────────────────────────────────────────── */}
      <Dialog open={statusOverrideOpen} onOpenChange={setStatusOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override Booking Status</DialogTitle>
            <DialogDescription>
              Manually override the booking status. Use with caution.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Car:</span> {selectedBooking.car_name_snapshot || selectedBooking.car?.car_name}</p>
                <p><span className="font-medium">Current status:</span> {selectedBooking.status}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="override_status">New Status</Label>
                <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                  <SelectTrigger id="override_status">
                    <SelectValue placeholder="Select new status…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="late_return">Late Return</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusOverrideSubmit} disabled={updateBookingStatus.isPending || !overrideStatus}>
              {updateBookingStatus.isPending ? 'Updating…' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
