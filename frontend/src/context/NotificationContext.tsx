import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getSSEService } from '@/services/sse.service';
import type { Notification } from '@/types';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }

    const sseService = getSSEService();

    // Handle new notifications
    const handleNotification = (data: any) => {
      console.log('SSE: New notification received', data);
      
      if (data.notification) {
        const notification: Notification = data.notification;
        
        // Add to notifications list
        setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
        
        // Update unread count
        if (!notification.is_read) {
          setUnreadCount((prev) => prev + 1);
        }

        // Show toast notification
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      }
    };

    // Handle connection status
    const handleConnectionFailed = () => {
      setIsConnected(false);
      console.error('SSE: Connection failed after multiple attempts');
    };

    // Register event handlers
    sseService.on('notification', handleNotification);
    sseService.on('connection-failed', handleConnectionFailed);

    // Connect to SSE
    sseService.connect(token);
    setIsConnected(true);

    // Cleanup on unmount
    return () => {
      sseService.off('notification', handleNotification);
      sseService.off('connection-failed', handleConnectionFailed);
      sseService.disconnect();
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}