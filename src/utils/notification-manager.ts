// Notification manager for tournament events

import { TournamentNotification, NotificationType, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_SOUNDS } from '@/types/notifications';

type NotificationCallback = (notification: TournamentNotification) => void;

class NotificationManager {
  private static instance: NotificationManager;
  private notifications: TournamentNotification[] = [];
  private listeners: Set<NotificationCallback> = new Set();
  private preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  private audioContext: AudioContext | null = null;
  private maxNotifications = 100;

  private constructor() {
    this.loadPreferences();
    this.loadNotifications();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Load preferences from localStorage
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('notification_preferences');
      if (stored) {
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load notification preferences:', e);
    }
  }

  // Save preferences to localStorage
  savePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Load notifications from localStorage
  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem('tournament_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: TournamentNotification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  }

  // Save notifications to localStorage
  private saveNotifications(): void {
    try {
      // Keep only recent notifications
      const toSave = this.notifications.slice(0, this.maxNotifications);
      localStorage.setItem('tournament_notifications', JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }

  // Subscribe to notifications
  subscribe(callback: NotificationCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  private notifyListeners(notification: TournamentNotification): void {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (e) {
        console.error('Notification listener error:', e);
      }
    });
  }

  // Create and emit notification
  notify(
    type: NotificationType,
    title: string,
    message: string,
    options: Partial<TournamentNotification> = {}
  ): TournamentNotification {
    const notification: TournamentNotification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      priority: options.priority || this.getPriorityForType(type),
      sound: options.sound ?? this.shouldPlaySound(type),
      vibrate: options.vibrate ?? this.preferences.vibrate,
      ...options,
    };

    // Add to beginning of array
    this.notifications.unshift(notification);
    
    // Trim old notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Save to storage
    this.saveNotifications();

    // Notify listeners
    this.notifyListeners(notification);

    // Play sound if enabled
    if (notification.sound && this.preferences.sound) {
      this.playSound(type);
    }

    // Vibrate if enabled
    if (notification.vibrate && this.preferences.vibrate && 'vibrate' in navigator) {
      this.vibrate(notification.priority);
    }

    return notification;
  }

  // Get priority for notification type
  private getPriorityForType(type: NotificationType): TournamentNotification['priority'] {
    const highPriority: NotificationType[] = [
      'you_eliminated',
      'prize_won',
      'final_table',
      'bubble_burst',
    ];
    const criticalPriority: NotificationType[] = [
      'deal_proposed',
    ];
    const mediumPriority: NotificationType[] = [
      'tournament_starting',
      'level_change',
      'hand_for_hand',
      'rebuy_available',
      'addon_available',
    ];

    if (criticalPriority.includes(type)) return 'critical';
    if (highPriority.includes(type)) return 'high';
    if (mediumPriority.includes(type)) return 'medium';
    return 'low';
  }

  // Check if should play sound
  private shouldPlaySound(type: NotificationType): boolean {
    const silentTypes: NotificationType[] = ['balance_update'];
    return !silentTypes.includes(type);
  }

  // Play notification sound
  private playSound(type: NotificationType): void {
    try {
      let soundUrl: string = NOTIFICATION_SOUNDS.default;
      
      if (type === 'prize_won' || type === 'ticket_issued') {
        soundUrl = NOTIFICATION_SOUNDS.prize;
      } else if (type === 'level_change') {
        soundUrl = NOTIFICATION_SOUNDS.level;
      } else if (type.includes('tournament')) {
        soundUrl = NOTIFICATION_SOUNDS.tournament;
      } else if (type === 'you_eliminated' || type === 'deal_proposed') {
        soundUrl = NOTIFICATION_SOUNDS.alert;
      }

      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Audio play failed, likely due to user not interacting with page
      });
    } catch (e) {
      console.error('Failed to play notification sound:', e);
    }
  }

  // Vibrate device
  private vibrate(priority: TournamentNotification['priority']): void {
    try {
      const patterns: Record<TournamentNotification['priority'], number[]> = {
        low: [50],
        medium: [100],
        high: [100, 50, 100],
        critical: [200, 100, 200, 100, 200],
      };
      navigator.vibrate(patterns[priority]);
    } catch (e) {
      // Vibration not supported
    }
  }

  // Get all notifications
  getNotifications(): TournamentNotification[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Mark notification as read
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notifications.forEach(n => (n.read = true));
    this.saveNotifications();
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications = [];
    this.saveNotifications();
  }

  // Remove single notification
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveNotifications();
  }

  // Convenience methods for common notifications
  tournamentStarting(tournamentName: string, minutes: number, tournamentId?: string): void {
    this.notify(
      'tournament_starting',
      'Турнир скоро начнется',
      `${tournamentName} начнется через ${minutes} минут`,
      { tournamentId, tournamentName }
    );
  }

  levelChange(level: number, sb: number, bb: number, ante: number, tournamentId?: string): void {
    this.notify(
      'level_change',
      `Уровень ${level}`,
      `Блайнды: ${sb}/${bb}${ante ? ` (анте ${ante})` : ''}`,
      { tournamentId }
    );
  }

  breakStart(duration: number, tournamentId?: string): void {
    this.notify(
      'break_start',
      'Перерыв',
      `Перерыв ${duration} минут`,
      { tournamentId }
    );
  }

  handForHand(playersLeft: number, tournamentId?: string): void {
    this.notify(
      'hand_for_hand',
      'Hand-for-Hand',
      `Режим синхронной игры. Осталось ${playersLeft} игроков`,
      { tournamentId, priority: 'high' }
    );
  }

  bubbleBurst(tournamentId?: string): void {
    this.notify(
      'bubble_burst',
      'Баббл лопнул!',
      'Все оставшиеся игроки в призах!',
      { tournamentId, priority: 'high' }
    );
  }

  finalTable(tournamentId?: string): void {
    this.notify(
      'final_table',
      'Финальный стол!',
      'Вы попали на финальный стол',
      { tournamentId, priority: 'high' }
    );
  }

  playerEliminated(name: string, position: number, tournamentId?: string): void {
    this.notify(
      'player_eliminated',
      'Игрок выбыл',
      `${name} занял ${position} место`,
      { tournamentId }
    );
  }

  youEliminated(position: number, prize?: number, tournamentId?: string): void {
    const prizeText = prize ? ` Приз: ${prize.toLocaleString()} 💎` : '';
    this.notify(
      'you_eliminated',
      'Вы выбыли',
      `Вы заняли ${position} место.${prizeText}`,
      { tournamentId, priority: 'high' }
    );
  }

  prizeWon(amount: number, position: number, tournamentId?: string): void {
    this.notify(
      'prize_won',
      'Поздравляем! 🎉',
      `Вы выиграли ${amount.toLocaleString()} 💎 (${position} место)`,
      { tournamentId, priority: 'high' }
    );
  }

  ticketIssued(value: number, tournamentName: string): void {
    this.notify(
      'ticket_issued',
      'Получен билет! 🎫',
      `Билет на ${value.toLocaleString()} 💎 за ${tournamentName}`,
      { priority: 'high' }
    );
  }

  dealProposed(tournamentId?: string): void {
    this.notify(
      'deal_proposed',
      'Предложена сделка',
      'Рассмотрите предложение о разделе призового фонда',
      { tournamentId, priority: 'critical' }
    );
  }
}

export const notificationManager = NotificationManager.getInstance();
