import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService, type BookingFilters } from '@/services/booking.service';
import { toast } from 'sonner';
import type { ApiError } from '@/types';

export const useBookings = (filters?: BookingFilters) => {
  return useQuery({
    queryKey: ['bookings', 'my', filters],
    queryFn: () => bookingService.getMyBookings(filters),
    retry: 1,
  });
};

export const useAllBookings = (filters?: BookingFilters) => {
  return useQuery({
    queryKey: ['bookings', 'all', filters],
    queryFn: () => bookingService.getAllBookings(filters),
    retry: 1,
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
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Failed to cancel booking');
    },
  });
};