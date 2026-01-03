import { useState, useEffect, useCallback } from 'react';
import { TournamentNotification, NotificationPreferences } from '@/types/notifications';
import { notificationManager } from '@/utils/notification-manager';

interface UseNotificationsReturn {
  notifications: TournamentNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  remove: (id: string) => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<TournamentNotification[]>(
    notificationManager.getNotifications()
  );
  const [unreadCount, setUnreadCount] = useState(notificationManager.getUnreadCount());
  const [preferences, setPreferences] = useState(notificationManager.getPreferences());

  useEffect(() => {
    // Subscribe to new notifications
    const unsubscribe = notificationManager.subscribe((notification) => {
      setNotifications(notificationManager.getNotifications());
      setUnreadCount(notificationManager.getUnreadCount());
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = useCallback((id: string) => {
    notificationManager.markAsRead(id);
    setNotifications(notificationManager.getNotifications());
    setUnreadCount(notificationManager.getUnreadCount());
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
    setNotifications(notificationManager.getNotifications());
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    notificationManager.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const remove = useCallback((id: string) => {
    notificationManager.remove(id);
    setNotifications(notificationManager.getNotifications());
    setUnreadCount(notificationManager.getUnreadCount());
  }, []);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    notificationManager.savePreferences(prefs);
    setPreferences(notificationManager.getPreferences());
  }, []);

  return {
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    clearAll,
    remove,
    updatePreferences,
  };
}
