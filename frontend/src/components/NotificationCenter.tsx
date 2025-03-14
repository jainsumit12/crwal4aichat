import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent
} from '@/components/ui/dropdown-menu';
import { 
  Notification as ApiNotification, 
  setNotificationCenter,
  isNotificationsMuted,
  toggleNotificationsMuted
} from '@/utils/notifications';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import NotificationPanel from './NotificationPanel';

export interface Notification extends ApiNotification {
  read?: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

// Store notifications in memory
const notifications: Notification[] = [];
const MAX_NOTIFICATIONS = 50;
let lastNotificationTime = 0;
const NOTIFICATION_THROTTLE_MS = 1000; // Prevent notifications from being added more than once per second

// Function to add a notification to the global store
export function addNotification(notification: Notification) {
  const now = Date.now();
  
  // Filter out "Loading Sites" notifications
  if (notification.title === "Loading Sites" || notification.title === "Sites Loaded") {
    return;
  }
  
  // Throttle notifications of the same type and title
  const isDuplicate = notifications.some(n => 
    n.type === notification.type && 
    n.title === notification.title &&
    now - n.timestamp < 5000
  );
  
  if (isDuplicate || now - lastNotificationTime < NOTIFICATION_THROTTLE_MS) {
    return;
  }
  
  lastNotificationTime = now;
  notifications.unshift(notification);
  
  // Limit the number of stored notifications
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.pop();
  }
  
  // Notify all listeners
  notificationListeners.forEach(listener => listener(notifications));
}

// Register the addNotification function with the notifications utility
setNotificationCenter(addNotification);

// Notification listeners for components
type NotificationStoreListener = (notifications: Notification[]) => void;
const notificationListeners: NotificationStoreListener[] = [];

// Hook to access notifications
export function useNotifications() {
  const [notificationList, setNotificationList] = useState<Notification[]>(notifications);
  
  useEffect(() => {
    const listener = (updatedNotifications: Notification[]) => {
      setNotificationList([...updatedNotifications]);
    };
    
    notificationListeners.push(listener);
    
    return () => {
      const index = notificationListeners.indexOf(listener);
      if (index > -1) {
        notificationListeners.splice(index, 1);
      }
    };
  }, []);
  
  return notificationList;
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return 'just now';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
}

// NotificationItem component
const NotificationItem = ({ notification }: { notification: Notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500/10 dark:bg-green-500/5';
      case 'error':
        return 'bg-destructive/10 dark:bg-destructive/5';
      case 'pending':
        return 'bg-yellow-500/10 dark:bg-yellow-500/5';
      default:
        return 'bg-blue-500/10 dark:bg-blue-500/5';
    }
  };
  
  return (
    <div className={cn(
      "p-4 mb-2 rounded-lg border border-border/40",
      getBgColor()
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
          <div className="text-xs text-muted-foreground/70 mt-2">
            {formatRelativeTime(notification.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

// NotificationBell component
export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationList = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Clear all notifications when component mounts
  useEffect(() => {
    // Don't clear existing notifications on mount
    // This was preventing notifications from showing
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Update unread count
  useEffect(() => {
    // Count notifications in the last 5 minutes as "unread"
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const count = notificationList.filter(n => n.timestamp > fiveMinutesAgo).length;
    setUnreadCount(count);
  }, [notificationList]);
  
  // Clear all notifications
  const clearNotifications = () => {
    notifications.length = 0;
    notificationListeners.forEach(listener => listener(notifications));
  };
  
  // Handle notification click
  const handleNotificationClick = (id: string) => {
    // Mark notification as read
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index] = { ...notifications[index], read: true };
      notificationListeners.forEach(listener => listener(notifications));
    }
  };
  
  // Mark all as read
  const handleMarkAllAsRead = () => {
    // Mark all notifications as read
    for (let i = 0; i < notifications.length; i++) {
      notifications[i] = { ...notifications[i], read: true };
    }
    notificationListeners.forEach(listener => listener(notifications));
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50">
          <NotificationPanel 
            notifications={notificationList}
            onClose={() => setIsOpen(false)}
            onClearAll={clearNotifications}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
          />
        </div>
      )}
    </div>
  );
};

const NotificationCenter: React.FC<NotificationCenterProps> = () => {
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  
  // Update local state when notifications change
  useEffect(() => {
    const handleNotificationsChange = () => {
      setLocalNotifications([...notifications]);
      // Count notifications in the last 5 minutes as "unread"
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const count = notifications.filter(n => n.timestamp > fiveMinutesAgo).length;
      setUnreadCount(count);
    };
    
    notificationListeners.push(handleNotificationsChange);
    
    return () => {
      const index = notificationListeners.indexOf(handleNotificationsChange);
      if (index > -1) {
        notificationListeners.splice(index, 1);
      }
    };
  }, []);
  
  const handleNotificationClick = (id: string) => {
    // Mark notification as read
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index] = { ...notifications[index], read: true };
      setLocalNotifications([...notifications]);
    }
  };
  
  const handleMarkAllAsRead = () => {
    // Mark all notifications as read
    for (let i = 0; i < notifications.length; i++) {
      notifications[i] = { ...notifications[i], read: true };
    }
    setLocalNotifications([...notifications]);
    setUnreadCount(0);
  };
  
  const handleClearAll = () => {
    // Clear all notifications
    notifications.length = 0;
    setLocalNotifications([]);
    setUnreadCount(0);
    notificationListeners.forEach(listener => listener(notifications));
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-300 hover:text-white hover:bg-white/[0.06]">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        forceMount
        className="p-0 border-0 bg-transparent shadow-none"
      >
        <NotificationPanel 
          notifications={localNotifications}
          onClose={() => setOpen(false)}
          onClearAll={handleClearAll}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={handleNotificationClick}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter; 