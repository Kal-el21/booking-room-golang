import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService, type RoomFilters } from '@/services/room.service';
import { toast } from 'sonner';

export const useRooms = (filters?: RoomFilters) => {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => roomService.getRooms(filters),
    retry: 1,
  });
};

export const useRoom = (id: number) => {
  return useQuery({
    queryKey: ['room', id],
    queryFn: () => roomService.getRoomById(id),
    enabled: !!id,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roomService.createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room created successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to create room');
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      roomService.updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room updated successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to update room');
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roomService.deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room deleted successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to delete room');
    },
  });
};