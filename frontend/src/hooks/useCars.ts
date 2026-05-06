import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { carService, carRequestService } from '@/services/car.service';
import type { Car, CreateCarRequestInput, ApproveCarRequestInput, RejectCarRequestInput, CarRequestFilters } from '@/types';

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
    },
  });
};

export const useUpdateCarRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCarRequestInput> }) =>
      carRequestService.updateCarRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carRequests'] });
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

export const useAvailableCarsForRequest = () => {
  return useMutation({
    mutationFn: (requestId: number) => carRequestService.getAvailableCarsForRequest(requestId),
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
