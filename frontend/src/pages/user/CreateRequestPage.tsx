import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateRequest } from '@/hooks/useRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CalendarDays, Repeat, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { CreateRequestInput } from '@/types';

type BookingType = 'single' | 'multi' | 'recurring';

interface FormState {
  required_capacity: string;
  purpose: string;
  notes: string;
  booking_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurring_type: CreateRequestInput['recurring_type'];
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

export const CreateRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createRequest = useCreateRequest();

  // Get initial values from location state (if coming from room card)
  const initialCapacity = location.state?.capacity || '';

  const [bookingType, setBookingType] = useState<BookingType>('single');

  const [formData, setFormData] = useState<FormState>({
    required_capacity: initialCapacity.toString(),
    purpose: '',
    notes: '',
    booking_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_recurring: false,
    recurring_type: 'weekly' as const,
    recurring_days: [] as string[],
    recurring_end_date: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const currentDays = prev.recurring_days;
      if (currentDays.includes(day)) {
        return { ...prev, recurring_days: currentDays.filter((d) => d !== day) };
      }
      return { ...prev, recurring_days: [...currentDays, day] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: CreateRequestInput = {
      required_capacity: parseInt(formData.required_capacity),
      purpose: formData.purpose,
      notes: formData.notes || undefined,
      booking_date: formData.booking_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
    };

    // Multi-day booking
    if (bookingType === 'multi' && formData.end_date) {
      submitData.end_date = formData.end_date;
    }

    // Recurring booking
    if (bookingType === 'recurring') {
      submitData.is_recurring = true;
      submitData.recurring_type = formData.recurring_type;
      submitData.recurring_days = formData.recurring_days.join(',');
      if (formData.recurring_end_date) {
        submitData.recurring_end_date = formData.recurring_end_date;
      }
    }

    try {
      await createRequest.mutateAsync(submitData);
      navigate('/user/requests');
    } catch {
      // Error handled in hook
    }
  };

  const isSingleDayValid = 
    formData.required_capacity &&
    formData.purpose &&
    formData.booking_date &&
    formData.start_time &&
    formData.end_time;

  const isMultiDayValid = 
    isSingleDayValid &&
    formData.end_date &&
    formData.end_date > formData.booking_date;

  const isRecurringValid = 
    isSingleDayValid &&
    formData.recurring_days.length > 0 &&
    formData.recurring_end_date &&
    formData.recurring_end_date > formData.booking_date;

  const isFormValid = bookingType === 'single' 
    ? isSingleDayValid 
    : bookingType === 'multi' 
      ? isMultiDayValid 
      : isRecurringValid;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Create Room Request</CardTitle>
              <CardDescription>
                Fill in the details for your room booking request
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Type Selector */}
            <div className="space-y-2">
              <Label>Booking Type <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  type="button"
                  variant={bookingType === 'single' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setBookingType('single')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Single Day
                </Button>
                <Button
                  type="button"
                  variant={bookingType === 'multi' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setBookingType('multi')}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Multi-Day
                </Button>
                <Button
                  type="button"
                  variant={bookingType === 'recurring' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setBookingType('recurring')}
                >
                  <Repeat className="h-4 w-4 mr-2" />
                  Recurring
                </Button>
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">
                Purpose <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purpose"
                name="purpose"
                placeholder="e.g., Team Meeting for Q1 Planning"
                value={formData.purpose}
                onChange={handleChange}
                required
              />
            </div>

            {/* Required Capacity */}
            <div className="space-y-2">
              <Label htmlFor="required_capacity">
                Required Capacity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="required_capacity"
                name="required_capacity"
                type="number"
                placeholder="Number of people"
                value={formData.required_capacity}
                onChange={handleChange}
                min="1"
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum number of people the room should accommodate
              </p>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="booking_date">
                {bookingType === 'recurring' ? 'Start Date' : 'Booking Date'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="booking_date"
                name="booking_date"
                type="date"
                value={formData.booking_date}
                onChange={handleChange}
                min={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>

            {/* Multi-Day: End Date */}
            {bookingType === 'multi' && (
              <div className="space-y-2">
                <Label htmlFor="end_date">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  min={formData.booking_date || format(new Date(), 'yyyy-MM-dd')}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The booking will run from the start date to the end date (inclusive)
                </p>
              </div>
            )}

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Recurring Options */}
            {bookingType === 'recurring' && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  <Label className="text-base">Recurring Settings</Label>
                </div>

                {/* Recurring Type */}
                <div className="space-y-2">
                  <Label>Recurring Pattern <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['daily', 'weekly', 'monthly'].map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={formData.recurring_type === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, recurring_type: type as CreateRequestInput['recurring_type'] }))}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Days of Week (for weekly) */}
                {formData.recurring_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Days of Week <span className="text-destructive">*</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <label
                          key={day.value}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            formData.recurring_days.includes(day.value)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.recurring_days.includes(day.value)}
                            onChange={() => handleDayToggle(day.value)}
                            className="w-4 h-4 rounded border-current"
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurring End Date */}
                <div className="space-y-2">
                  <Label htmlFor="recurring_end_date">
                    Recurring End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recurring_end_date"
                    name="recurring_end_date"
                    type="date"
                    value={formData.recurring_end_date}
                    onChange={handleChange}
                    min={formData.booking_date || format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The recurring booking will end on this date
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any special requirements or additional information..."
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!isFormValid || createRequest.isPending}
              >
                {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">📋 What happens next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your request will be sent to the General Admin (GA)</li>
            <li>• GA will review and assign an available room</li>
            <li>• You'll receive a notification once approved or rejected</li>
            <li>• You can track your request status in "My Requests" page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
