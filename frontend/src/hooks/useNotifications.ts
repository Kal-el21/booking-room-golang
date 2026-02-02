import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService,type NotificationFilters } from '@/services/notification.service';
import { toast } from 'sonner';

export const useNotifications = (filters?: NotificationFilters) => {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.getNotifications(filters),
    // Removed refetchInterval - SSE will handle real-time updates
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    // Removed refetchInterval - SSE will handle real-time updates
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark as read');
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mark all as read');
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('Notification deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete notification');
    },
  });
};