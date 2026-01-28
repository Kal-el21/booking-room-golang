import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Notification } from '@/types';
import { notificationService } from '@/services/notification.service';
import { sseService } from '@/services/sse.service';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications({ page: 1, page_size: 50 });
      setNotifications(response.data);
      
      const countResponse = await notificationService.getUnreadCount();
      setUnreadCount(countResponse);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to SSE when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      sseService.disconnect();
      return;
    }

    // Fetch initial notifications
    fetchNotifications();

    // Connect to SSE
    sseService.connect(
      // onMessage
      (data) => {
        if (data.type === 'notification') {
          // New notification received
          const newNotification: Notification = data.notification;
          
          // Only add if it belongs to current user
          if (newNotification.user_id === user.id) {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            
            // Show toast notification
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
            });
          }
        } else if (data.type === 'unread_count') {
          // Unread count update
          setUnreadCount(data.count);
        }
      },
      // onError
      (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
      },
      // onOpen
      () => {
        setIsConnected(true);
      }
    );

    // Cleanup on unmount
    return () => {
      sseService.disconnect();
    };
  }, [isAuthenticated, user]);

  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await notificationService.deleteNotification(id);
      
      const notification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete notification');
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook harus di export setelah component
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}