import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { carService, carRequestService } from '@/services/car.service';
import { carBookingService } from '@/services/car-booking.service';
import type { Car, CreateCarRequestInput, ApproveCarRequestInput, RejectCarRequestInput, CarRequestFilters, CarBookingFilters, CarBookingStatus, PickUpBookingInput, ReturnBookingInput, AssignDriverInput } from '@/types';
import { toast } from 'sonner';

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as { message?: string; error?: unknown };
  if (typeof apiError.error === 'string') return apiError.error;
  return apiError.message || fallback;
};

// ─── Car Management Hooks ────────────────────────────────────────────

export const useCars = (filters?: any) => {
  return useQuery({
    queryKey: ['cars', filters],
    queryFn: () => carService.getCars(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCar = (id: number) => {
  return useQuery({
    queryKey: ['car', id],
    queryFn: () => carService.getCarById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Car>) => carService.createCar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
};

export const useUpdateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Car> }) =>
      carService.updateCar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
};

export const useDeleteCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => carService.deleteCar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
};

export const useUploadCarImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      carService.uploadCarImage(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['car', id] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
    },
  });
};

export const useCheckCarAvailability = () => {
  return useMutation({
    mutationFn: ({
      carId,
      data,
    }: {
      carId: number;
      data: { booking_date: string; start_time: string; end_time: string };
    }) => carService.checkAvailability(carId, data),
  });
};

export const useAvailableCars = () => {
  return useMutation({
    mutationFn: ({
      capacity,
      bookingDate,
      startTime,
      endTime,
    }: {
      capacity: number;
      bookingDate: string;
      startTime: string;
      endTime: string;
    }) => carService.getAvailableCars(capacity, bookingDate, startTime, endTime),
  });
};

// ─── Car Request Hooks ──────────────────────────────────────────────

export const useCarRequests = (filters?: CarRequestFilters) => {
  return useQuery({
    queryKey: ['carRequests', filters],
    queryFn: () => carRequestService.getMyCarRequests(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCarRequest = (id: number) => {
  return useQuery({
    queryKey: ['carRequest', id],
    queryFn: () => carRequestService.getCarRequestById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCarRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCarRequestInput) => carRequestService.createCarRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
      toast.success('Car request submitted successfully');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to submit car request'));
    },
  });
};

export const useUpdateCarRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCarRequestInput> }) =>
      carRequestService.updateCarRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
      queryClient.invalidateQueries({ queryKey: ['carRequest', id] });
      toast.success('Car request updated successfully');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update car request'));
    },
  });
};

export const useDeleteCarRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => carRequestService.deleteCarRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
    },
  });
};

export const useApproveCarRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data: ApproveCarRequestInput;
    }) => carRequestService.approveCarRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
      queryClient.invalidateQueries({ queryKey: ['myCarBookings'] });
    },
  });
};

export const useRejectCarRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: number;
      data: RejectCarRequestInput;
    }) => carRequestService.rejectCarRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
    },
  });
};

export const useAvailableCarsForRequest = (requestId?: number) => {
  return useQuery({
    queryKey: ['availableCarsForRequest', requestId],
    queryFn: () => carRequestService.getAvailableCarsForRequest(requestId!),
    enabled: !!requestId,
  });
};

export const useCarCalendar = () => {
  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      carId,
    }: {
      startDate: string;
      endDate: string;
      carId?: number;
    }) => carRequestService.getCarCalendar(startDate, endDate, carId),
  });
};

// ─── Car Booking Lifecycle Hooks ─────────────────────────────────────────────

export const useCarBookings = (filters?: CarBookingFilters) => {
  return useQuery({
    queryKey: ['carBookings', filters],
    queryFn: () => carBookingService.listAllCarBookings(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMyCarBookings = (filters?: CarBookingFilters) => {
  return useQuery({
    queryKey: ['myCarBookings', filters],
    queryFn: () => carBookingService.listMyCarBookings(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCarBooking = (id: number) => {
  return useQuery({
    queryKey: ['carBooking', id],
    queryFn: () => carBookingService.getCarBooking(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePickUpBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PickUpBookingInput }) =>
      carBookingService.pickUpBooking(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carBooking', id] });
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
      queryClient.invalidateQueries({ queryKey: ['fleetStatus'] });
    },
  });
};

export const useReturnBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReturnBookingInput }) =>
      carBookingService.returnBooking(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carBooking', id] });
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
      queryClient.invalidateQueries({ queryKey: ['fleetStatus'] });
    },
  });
};

export const useUpdateCarBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: CarBookingStatus }) =>
      carBookingService.updateBookingStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carBooking', id] });
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
      queryClient.invalidateQueries({ queryKey: ['fleetStatus'] });
    },
  });
};

export const useAssignDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignDriverInput }) =>
      carBookingService.assignDriver(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['carBooking', id] });
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
    },
  });
};

export const useUnassignDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => carBookingService.unassignDriver(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['carBooking', id] });
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
    },
  });
};

export const useCancelCarBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => carBookingService.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carBookings'] });
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
      queryClient.invalidateQueries({ queryKey: ['fleetStatus'] });
      toast.success('Booking cancelled successfully');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to cancel booking'));
    },
  });
};

export const useFleetStatus = () => {
  return useQuery({
    queryKey: ['fleetStatus'],
    queryFn: () => carBookingService.getFleetStatus(),
    staleTime: 2 * 60 * 1000,
  });
};

// ─── Driver-Specific Hooks ───────────────────────────────────────────────────

export const useDriverBookings = (filters?: CarBookingFilters) => {
  return useQuery({
    queryKey: ['driverBookings', filters],
    queryFn: () => carBookingService.getDriverBookings(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useDriverBooking = (id: number) => {
  return useQuery({
    queryKey: ['driverBooking', id],
    queryFn: () => carBookingService.getCarBooking(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};
