import React, { useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { resolveActionUrl } from '@/utils/userDashboardLinks';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    await markAsRead(notification.id);
    
    if (notification.action_url) {
      setOpen(false);
      const resolvedUrl = resolveActionUrl(notification.action_url);
      navigate(resolvedUrl);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-destructive';
      case 'account': return 'bg-orange-500';
      default: return 'bg-primary';
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={markAllAsRead}
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-accent transition-colors group relative ${
                    !notification.is_read ? 'bg-accent/50' : ''
                  }`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2 pr-8">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getNotificationColor(notification.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at || new Date()).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Badge variant="secondary" className="text-xs absolute top-3 right-10">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, notification.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
