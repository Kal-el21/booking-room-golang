import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestService, type RequestFilters } from '@/services/request.service';
import { toast } from 'sonner';

export const useRequests = (filters?: RequestFilters) => {
  return useQuery({
    queryKey: ['requests', filters],
    queryFn: () => requestService.getMyRequests(filters),
    retry: 1,
  });
};

export const useRequest = (id: number) => {
  return useQuery({
    queryKey: ['request', id],
    queryFn: () => requestService.getRequestById(id),
    enabled: !!id,
  });
};

export const useCreateRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestService.createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Room request submitted successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to submit request');
    },
  });
};

export const useUpdateRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      requestService.updateRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request updated successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to update request');
    },
  });
};

export const useDeleteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestService.deleteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request deleted successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to delete request');
    },
  });
};

export const useAvailableRooms = (requestId: number) => {
  return useQuery({
    queryKey: ['available-rooms', requestId],
    queryFn: () => requestService.getAvailableRooms(requestId),
    enabled: !!requestId,
  });
};

export const useApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: any }) =>
      requestService.approveRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Request approved successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to approve request');
    },
  });
};

export const useRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: any }) =>
      requestService.rejectRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request rejected');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to reject request');
    },
  });
};