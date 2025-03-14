import React, { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { 
  Notification as ApiNotification,
  isNotificationsMuted,
  toggleNotificationsMuted
} from '@/utils/notifications';
import { useTheme } from '@/context/ThemeContext';

// Extend the ApiNotification interface to include the read property
interface Notification extends ApiNotification {
  read?: boolean;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onClearAll: () => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (id: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onClearAll,
  onMarkAllAsRead,
  onNotificationClick
}) => {
  const [isMuted, setIsMuted] = useState(isNotificationsMuted());
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const handleToggleMute = () => {
    const newState = toggleNotificationsMuted();
    setIsMuted(newState);
  };
  
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const panelStyle: React.CSSProperties = {
    backgroundColor: isDark ? 'hsl(220, 26%, 14%)' : 'white',
    color: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(220, 26%, 14%)',
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'}`,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    width: '320px',
    maxHeight: '400px',
    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
  };
  
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    paddingRight: '0.75rem',
    backgroundColor: isDark ? 'hsl(220, 26%, 18%)' : '#f9fafb',
    borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'}`
  };
  
  const muteToggleStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'}`
  };
  
  const listStyle: React.CSSProperties = {
    overflowY: 'auto',
    maxHeight: '320px'
  };
  
  const itemStyle = (read: boolean = false): React.CSSProperties => ({
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
    backgroundColor: isDark ? 'hsl(220, 26%, 14%)' : 'white',
    cursor: 'pointer',
    opacity: read ? 0.7 : 1
  });
  
  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '2rem 0',
    color: isDark ? 'hsl(215, 20.2%, 75%)' : 'hsl(215.4, 16.3%, 46.9%)'
  };
  
  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 className="text-xs font-medium">Notifications</h3>
        <div className="flex gap-1">
          {notifications.length > 0 && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={onMarkAllAsRead}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs"
                onClick={onClearAll}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 ml-1 mr-1"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div style={muteToggleStyle} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm">Mute popup notifications</span>
        </div>
        <Switch 
          checked={isMuted} 
          onCheckedChange={handleToggleMute}
          aria-label="Toggle notification sounds"
        />
      </div>
      
      <div style={listStyle}>
        {notifications.length === 0 ? (
          <div style={emptyStyle}>
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              style={itemStyle(notification.read)}
              onClick={() => onNotificationClick(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel; 