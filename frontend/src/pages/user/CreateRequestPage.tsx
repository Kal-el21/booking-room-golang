import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateRequest } from '@/hooks/useRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export const CreateRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createRequest = useCreateRequest();

  // Get initial values from location state (if coming from room card)
  const initialCapacity = location.state?.capacity || '';

  const [formData, setFormData] = useState({
    required_capacity: initialCapacity.toString(),
    purpose: '',
    notes: '',
    booking_date: '',
    start_time: '',
    end_time: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createRequest.mutateAsync({
        required_capacity: parseInt(formData.required_capacity),
        purpose: formData.purpose,
        notes: formData.notes || undefined,
        booking_date: formData.booking_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
      });

      navigate('/user/requests');
    } catch (error) {
      // Error handled in hook
    }
  };

  const isFormValid = 
    formData.required_capacity &&
    formData.purpose &&
    formData.booking_date &&
    formData.start_time &&
    formData.end_time;

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

            {/* Booking Date */}
            <div className="space-y-2">
              <Label htmlFor="booking_date">
                Booking Date <span className="text-destructive">*</span>
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