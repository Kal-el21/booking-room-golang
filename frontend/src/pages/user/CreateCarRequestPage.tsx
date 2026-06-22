import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useCarRequest, useCreateCarRequest, useUpdateCarRequest } from '@/hooks/useCars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CalendarDays, Repeat, Calendar, CarIcon, Fuel, Navigation, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { CreateCarRequestInput } from '@/types';

type BookingType = 'single' | 'multi' | 'recurring';

interface FormState {
  required_capacity: string;
  purpose: string;
  notes: string;
  destination: string;
  pickup_location: string;
  driver_required: boolean;
  estimated_distance_km: string;
  passenger_count: string;
  needs_fuel_reimbursement: boolean;
  fuel_note: string;
  has_consumption: boolean;
  consumption_note: string;
  departure_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_type: CreateCarRequestInput['recurring_type'];
  recurring_days: string[];
  recurring_end_date: string;
}

const DAYS_OF_WEEK = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '7', label: 'Sun' },
];

export const CreateCarRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestId = id ? parseInt(id) : undefined;
  const isEditMode = !!requestId;
  const { data: existingRequest, isLoading: isLoadingRequest } = useCarRequest(requestId || 0);
  const createCarRequest = useCreateCarRequest();
  const updateCarRequest = useUpdateCarRequest();

  // Get initial values from location state (if coming from car card)
  const initialCapacity = location.state?.capacity?.toString() || '';
  const initialCarId = location.state?.carId?.toString() || searchParams.get('car_id') || '';

  const [bookingType, setBookingType] = useState<BookingType>('single');
  const [formData, setFormData] = useState<FormState>({
    required_capacity: initialCapacity || '',
    purpose: '',
    notes: '',
    destination: '',
    pickup_location: '',
    driver_required: false,
    estimated_distance_km: '',
    passenger_count: '',
    needs_fuel_reimbursement: false,
    fuel_note: '',
    has_consumption: false,
    consumption_note: '',
    departure_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    is_recurring: false,
    recurring_type: 'weekly',
    recurring_days: [],
    recurring_end_date: '',
  });

  useEffect(() => {
    if (!existingRequest) return;

    const nextBookingType: BookingType = existingRequest.is_recurring
      ? 'recurring'
      : existingRequest.end_date
        ? 'multi'
        : 'single';

    setBookingType(nextBookingType);
    setFormData({
      required_capacity: existingRequest.required_capacity?.toString() || '',
      purpose: existingRequest.purpose || '',
      notes: existingRequest.notes || '',
      destination: existingRequest.destination || '',
      pickup_location: existingRequest.pickup_location || '',
      driver_required: existingRequest.driver_required || false,
      estimated_distance_km: existingRequest.estimated_distance_km?.toString() || '',
      passenger_count: existingRequest.passenger_count?.toString() || '',
      needs_fuel_reimbursement: existingRequest.needs_fuel_reimbursement || false,
      fuel_note: existingRequest.fuel_note || '',
      has_consumption: existingRequest.has_consumption || false,
      consumption_note: existingRequest.consumption_note || '',
      departure_date: existingRequest.departure_date || existingRequest.booking_date || format(new Date(), 'yyyy-MM-dd'),
      end_date: existingRequest.end_date || '',
      start_time: existingRequest.start_time || '09:00',
      end_time: existingRequest.end_time || '17:00',
      is_recurring: existingRequest.is_recurring || false,
      recurring_type: existingRequest.recurring_type || 'weekly',
      recurring_days: existingRequest.recurring_days
        ? existingRequest.recurring_days.split(',').map((day) => day.trim()).filter(Boolean)
        : [],
      recurring_end_date: existingRequest.recurring_end_date || '',
    });
  }, [existingRequest]);

  const handleBookingTypeChange = (type: BookingType) => {
    setBookingType(type);
    setFormData((prev) => ({
      ...prev,
      end_date: type === 'multi' ? prev.end_date : '',
      is_recurring: type === 'recurring',
      recurring_type: type === 'recurring' ? (prev.recurring_type || 'weekly') : 'weekly',
      recurring_days: type === 'recurring' ? prev.recurring_days : [],
      recurring_end_date: type === 'recurring' ? prev.recurring_end_date : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requestData: CreateCarRequestInput = {
      required_capacity: parseInt(formData.required_capacity),
      purpose: formData.purpose,
      notes: formData.notes || undefined,
      destination: formData.destination || undefined,
      pickup_location: formData.pickup_location || undefined,
      driver_required: formData.driver_required,
      estimated_distance_km: formData.estimated_distance_km
        ? parseInt(formData.estimated_distance_km)
        : undefined,
      passenger_count: formData.passenger_count
        ? parseInt(formData.passenger_count)
        : undefined,
      needs_fuel_reimbursement: formData.needs_fuel_reimbursement,
      fuel_note: formData.needs_fuel_reimbursement ? formData.fuel_note || undefined : undefined,
      has_consumption: formData.has_consumption,
      consumption_note: formData.has_consumption ? formData.consumption_note || undefined : undefined,
      booking_date: formData.departure_date,
      departure_date: formData.departure_date,
      end_date: bookingType === 'multi' ? formData.end_date : undefined,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_recurring: bookingType === 'recurring',
      recurring_type: bookingType === 'recurring' ? formData.recurring_type : undefined,
      recurring_days:
        bookingType === 'recurring' && formData.recurring_type === 'weekly'
          ? formData.recurring_days.join(',')
          : undefined,
      recurring_end_date: bookingType === 'recurring' ? formData.recurring_end_date : undefined,
    };

    try {
      if (isEditMode && requestId) {
        await updateCarRequest.mutateAsync({ id: requestId, data: requestData });
      } else {
        await createCarRequest.mutateAsync(requestData);
      }
      navigate('/user/car-requests');
    } catch {
      // Error handled in hook
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(day)
        ? prev.recurring_days.filter(d => d !== day)
        : [...prev.recurring_days, day],
    }));
  };

  const minEndDate = bookingType === 'multi' ? formData.departure_date : undefined;
  const requiredCapacity = parseInt(formData.required_capacity);
  const passengerCount = formData.passenger_count ? parseInt(formData.passenger_count) : undefined;
  const estimatedDistance = formData.estimated_distance_km ? parseInt(formData.estimated_distance_km) : undefined;
  const isPassengerCountValid =
    passengerCount === undefined ||
    (!Number.isNaN(passengerCount) && passengerCount >= 1 && passengerCount <= requiredCapacity);
  const isEstimatedDistanceValid =
    estimatedDistance === undefined || (!Number.isNaN(estimatedDistance) && estimatedDistance >= 0);
  const isBaseFormValid =
    !Number.isNaN(requiredCapacity) &&
    requiredCapacity >= 1 &&
    formData.purpose.trim() !== '' &&
    formData.departure_date !== '' &&
    formData.start_time !== '' &&
    formData.end_time !== '' &&
    formData.end_time > formData.start_time &&
    isPassengerCountValid &&
    isEstimatedDistanceValid;
  const isMultiDayValid =
    bookingType !== 'multi' || (formData.end_date !== '' && formData.end_date >= formData.departure_date);
  const isRecurringValid =
    bookingType !== 'recurring' ||
    (
      !!formData.recurring_type &&
      formData.recurring_end_date !== '' &&
      formData.recurring_end_date >= formData.departure_date &&
      (formData.recurring_type !== 'weekly' || formData.recurring_days.length > 0)
    );
  const isFormValid = isBaseFormValid && isMultiDayValid && isRecurringValid;
  const isSaving = createCarRequest.isPending || updateCarRequest.isPending;
  const canEditRequest = !isEditMode || existingRequest?.status === 'pending';

  if (isEditMode && isLoadingRequest) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Car Request' : 'Request Car'}</h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update your pending vehicle request' : 'Submit a request to book a vehicle'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>
            {isEditMode ? 'Review and adjust request details' : 'Fill in the details for your car booking request'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditMode && !canEditRequest && (
            <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Only pending car requests can be edited.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Type Tabs */}
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bookingType === 'single' ? 'default' : 'outline'}
                  onClick={() => handleBookingTypeChange('single')}
                  className="flex-1"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Single Day
                </Button>
                <Button
                  type="button"
                  variant={bookingType === 'multi' ? 'default' : 'outline'}
                  onClick={() => handleBookingTypeChange('multi')}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Multi-day
                </Button>
                <Button
                  type="button"
                  variant={bookingType === 'recurring' ? 'default' : 'outline'}
                  onClick={() => handleBookingTypeChange('recurring')}
                  className="flex-1"
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Recurring
                </Button>
              </div>
            </div>

            {/* Capacity & Car Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Required Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="Number of people"
                  value={formData.required_capacity}
                  onChange={(e) => setFormData({ ...formData, required_capacity: e.target.value })}
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passenger_count">Passenger Count</Label>
                <Input
                  id="passenger_count"
                  type="number"
                  placeholder="Actual passengers"
                  value={formData.passenger_count}
                  onChange={(e) => setFormData({ ...formData, passenger_count: e.target.value })}
                  min="1"
                  max={formData.required_capacity || undefined}
                />
                {!isPassengerCountValid && (
                  <p className="text-xs text-destructive">
                    Passenger count cannot exceed required capacity
                  </p>
                )}
              </div>
              {initialCarId && (
                <div className="space-y-2">
                  <Label>Pre-selected Car</Label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <CarIcon className="h-4 w-4" />
                    <span className="text-sm">Car ID: {initialCarId}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trip Information */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <Label className="text-base">Trip Information</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="e.g., Client office, airport"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_location">Pickup Location</Label>
                  <Input
                    id="pickup_location"
                    placeholder="e.g., Main lobby"
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_distance_km">Estimated Distance (km)</Label>
                  <Input
                    id="estimated_distance_km"
                    type="number"
                    placeholder="Optional"
                    value={formData.estimated_distance_km}
                    onChange={(e) => setFormData({ ...formData, estimated_distance_km: e.target.value })}
                    min="0"
                  />
                  {!isEstimatedDistanceValid && (
                    <p className="text-xs text-destructive">
                      Estimated distance cannot be negative
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="driver_required">Need Driver</Label>
                  </div>
                  <Switch
                    id="driver_required"
                    checked={formData.driver_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, driver_required: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="needs_fuel_reimbursement">Fuel Reimbursement</Label>
                  </div>
                  <Switch
                    id="needs_fuel_reimbursement"
                    checked={formData.needs_fuel_reimbursement}
                    onCheckedChange={(checked) => setFormData({ ...formData, needs_fuel_reimbursement: checked })}
                  />
                </div>
              </div>
              {formData.needs_fuel_reimbursement && (
                <div className="space-y-2">
                  <Label htmlFor="fuel_note">Fuel Note</Label>
                  <Textarea
                    id="fuel_note"
                    placeholder="Add fuel reimbursement details..."
                    value={formData.fuel_note}
                    onChange={(e) => setFormData({ ...formData, fuel_note: e.target.value })}
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure_date">Departure Date *</Label>
                <Input
                  id="departure_date"
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
              {bookingType === 'multi' && (
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={minEndDate}
                    required
                  />
                </div>
              )}
              {bookingType === 'recurring' && (
                <div className="space-y-2">
                  <Label htmlFor="recurring_end_date">Recurring End Date *</Label>
                  <Input
                    id="recurring_end_date"
                    type="date"
                    value={formData.recurring_end_date}
                    onChange={(e) => setFormData({ ...formData, recurring_end_date: e.target.value })}
                    min={formData.departure_date}
                    required={bookingType === 'recurring'}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Recurring Options */}
            {bookingType === 'recurring' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Recurring Type</Label>
                  <Select
                    value={formData.recurring_type || ''}
                    onValueChange={(value: any) => setFormData({ ...formData, recurring_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recurring type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurring_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={formData.recurring_days.includes(day.value) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Purpose & Notes */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                placeholder="e.g., Client meeting, team offsite"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Consumption */}
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="space-y-1">
                <Label htmlFor="has_consumption" className="text-base">
                  Will this booking require consumption (food/beverages)?
                </Label>
                <p className="text-sm text-muted-foreground">Toggle if you need catering or refreshments</p>
              </div>
              <Switch
                id="has_consumption"
                checked={formData.has_consumption}
                onCheckedChange={(checked) => setFormData({ ...formData, has_consumption: checked })}
              />
            </div>

            {formData.has_consumption && (
              <div className="space-y-2">
                <Label htmlFor="consumption_note">Consumption Note</Label>
                <Textarea
                  id="consumption_note"
                  placeholder="e.g., Coffee and snacks for 10 people, vegetarian options needed"
                  value={formData.consumption_note}
                  onChange={(e) => setFormData({ ...formData, consumption_note: e.target.value })}
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={!isFormValid || !canEditRequest || isSaving} className="flex-1">
                {isSaving ? (
                  <>
                    <Repeat className="h-4 w-4 mr-2 animate-spin" />
                    {isEditMode ? 'Saving...' : 'Submitting...'}
                  </>
                ) : (
                  isEditMode ? 'Save Changes' : 'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
