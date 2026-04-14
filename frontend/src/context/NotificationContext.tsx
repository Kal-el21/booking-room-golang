import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getSSEService } from '@/services/sse.service';
import type { Notification } from '@/types';
import { toast } from 'sonner';
import api from '@/services/api';

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

/**
 * Minta short-lived ticket dari server.
 * JWT dikirim via Authorization header (tidak terlihat di URL / Network tab).
 * Tiket berlaku 30 detik dan hanya bisa dipakai sekali.
 */
async function fetchSSETicket(): Promise<string> {
  const response = await api.post<{ success: boolean; data: { ticket: string } }>(
    '/api/v1/notifications/stream-ticket'
  );
  return response.data.data.ticket;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const sseService = getSSEService();

    const handleNotification = (data: any) => {
      if (!data.notification) return;
      const notification: Notification = data.notification;

      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      if (!notification.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    };

    const handleConnectionFailed = () => {
      setIsConnected(false);
      console.error('SSE: Connection failed after multiple attempts');
    };

    sseService.on('notification', handleNotification);
    sseService.on('connection-failed', handleConnectionFailed);

    /**
     * Passing fetchSSETicket sebagai callback (TicketProvider).
     * SSEService akan memanggil callback ini setiap reconnect
     * sehingga selalu mendapat tiket baru yang valid.
     */
    sseService.connect(fetchSSETicket).then(() => {
      setIsConnected(true);
    });

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

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isConnected, addNotification, clearNotifications }}
    >
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