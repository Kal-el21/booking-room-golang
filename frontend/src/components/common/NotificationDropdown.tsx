import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/useNotifications';
import { useNotificationContext } from '@/context/NotificationContext';
import type { Notification } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, CheckCheck, Trash2, Wifi, WifiOff, RefreshCw, FileText, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { data: notificationsData, isLoading, refetch } = useNotifications({
    page: 1,
    page_size: 20,
  });
  const { unreadCount, isConnected } = useNotificationContext();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Merge API notifications with realtime notifications
  const allNotifications = notificationsData?.data || [];
  
  const handleMarkAsRead = async (id: number) => {
    await markAsRead.mutateAsync(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification.mutateAsync(id);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.booking_id) {
      navigate(`/user/bookings/${notification.booking_id}`);
    } else if (notification.request_id) {
      navigate(`/user/requests/${notification.request_id}`);
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      booking_confirmed: <Calendar className="h-4 w-4" />,
      reminder: <Clock className="h-4 w-4" />,
      cancellation: <Calendar className="h-4 w-4" />,
      room_changed: <Calendar className="h-4 w-4" />,
      request_submitted: <FileText className="h-4 w-4" />,
      request_approved: <FileText className="h-4 w-4" />,
      request_rejected: <FileText className="h-4 w-4" />,
    };
    return icons[type] || <Bell className="h-4 w-4" />;
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      booking_confirmed: 'text-blue-600 bg-blue-100',
      reminder: 'text-yellow-600 bg-yellow-100',
      cancellation: 'text-red-600 bg-red-100',
      room_changed: 'text-orange-600 bg-orange-100',
      request_submitted: 'text-purple-600 bg-purple-100',
      request_approved: 'text-green-600 bg-green-100',
      request_rejected: 'text-red-600 bg-red-100',
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Notifications</span>
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-600" aria-label="Connected" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-600" aria-label="Disconnected" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-auto p-1 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : allNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {allNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start gap-2 p-4 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-accent/70' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <Badge variant="default" className="bg-blue-600 text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(notification.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};