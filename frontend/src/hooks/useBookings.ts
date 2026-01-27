import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService, type BookingFilters } from '@/services/booking.service';
import { toast } from 'sonner';

export const useBookings = (filters?: BookingFilters) => {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => bookingService.getMyBookings(filters),
  });
};

export const useBooking = (id: number) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingService.getBookingById(id),
    enabled: !!id,
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookingService.cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel booking');
    },
  });
};