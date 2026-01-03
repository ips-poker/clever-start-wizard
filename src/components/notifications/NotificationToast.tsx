import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TournamentNotification, PRIORITY_COLORS, NOTIFICATION_ICONS } from '@/types/notifications';
import { notificationManager } from '@/utils/notification-manager';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface NotificationToastProps {
  notification: TournamentNotification;
  onDismiss: (id: string) => void;
  duration?: number;
}

export function NotificationToast({ 
  notification, 
  onDismiss, 
  duration = 5000 
}: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [notification.id, duration, onDismiss]);

  const iconName = NOTIFICATION_ICONS[notification.type] as keyof typeof Icons;
  const IconComponent = (Icons[iconName] as React.ElementType) || Icons.Bell;
  const priorityColor = PRIORITY_COLORS[notification.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-sm',
        'bg-background/95 backdrop-blur-sm',
        notification.priority === 'critical' && 'border-destructive/50 bg-destructive/10',
        notification.priority === 'high' && 'border-amber-500/50 bg-amber-500/10'
      )}
    >
      <div className={cn('p-2 rounded-full bg-background border', priorityColor)}>
        <IconComponent className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>

      <button
        onClick={() => onDismiss(notification.id)}
        className="p-1 hover:bg-muted rounded-full transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

interface NotificationToastContainerProps {
  maxToasts?: number;
}

export function NotificationToastContainer({ maxToasts = 3 }: NotificationToastContainerProps) {
  const [toasts, setToasts] = React.useState<TournamentNotification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notification) => {
      setToasts(prev => {
        const newToasts = [notification, ...prev].slice(0, maxToasts);
        return newToasts;
      });
    });

    return () => unsubscribe();
  }, [maxToasts]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <NotificationToast
            key={toast.id}
            notification={toast}
            onDismiss={dismissToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
