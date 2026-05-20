import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateCarRequest } from '@/hooks/useCars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CalendarDays, Repeat, Calendar, CarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { CreateCarRequestInput } from '@/types';

type BookingType = 'single' | 'multi' | 'recurring';

interface FormState {
  required_capacity: string;
  purpose: string;
  notes: string;
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
  const createCarRequest = useCreateCarRequest();

  // Get initial values from location state (if coming from car card)
  const initialCapacity = location.state?.capacity || '';
  const initialCarId = location.state?.carId || '';

  const [bookingType, setBookingType] = useState<BookingType>('single');
  const [formData, setFormData] = useState<FormState>({
    required_capacity: initialCapacity || '',
    purpose: '',
    notes: '',
    has_consumption: false,
    consumption_note: '',
    departure_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    is_recurring: false,
    recurring_type: undefined,
    recurring_days: [],
    recurring_end_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requestData: CreateCarRequestInput = {
      required_capacity: parseInt(formData.required_capacity),
      purpose: formData.purpose,
      notes: formData.notes || undefined,
      has_consumption: formData.has_consumption,
      consumption_note: formData.consumption_note || undefined,
      departure_date: formData.departure_date,
      end_date: bookingType === 'multi' ? formData.end_date : undefined,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_recurring: bookingType === 'recurring',
      recurring_type: bookingType === 'recurring' ? formData.recurring_type : undefined,
      recurring_days: bookingType === 'recurring' ? formData.recurring_days.join(',') : undefined,
      recurring_end_date: bookingType === 'recurring' ? formData.recurring_end_date : undefined,
    };

    try {
      await createCarRequest.mutateAsync(requestData);
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Request Car</h1>
          <p className="text-muted-foreground">Submit a request to book a vehicle</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Fill in the details for your car booking request</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Type Tabs */}
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bookingType === 'single' ? 'default' : 'outline'}
                  onClick={() => setBookingType('single')}
                  className="flex-1"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Single Day
                </Button>
                <Button
                  type="button"
                  variant={bookingType === 'multi' ? 'default' : 'outline'}
                  onClick={() => setBookingType('multi')}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Multi-day
                </Button>
                <Button
                  type="button"
                  variant={bookingType === 'recurring' ? 'default' : 'outline'}
                  onClick={() => setBookingType('recurring')}
                  className="flex-1"
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Recurring
                </Button>
              </div>
            </div>

            {/* Capacity & Car Info */}
            <div className="grid grid-cols-2 gap-4">
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
              <Button type="submit" disabled={createCarRequest.isPending} className="flex-1">
                {createCarRequest.isPending ? (
                  <>
                    <Repeat className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
