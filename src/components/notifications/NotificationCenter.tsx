import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Settings, 
  Clock,
  TrendingUp,
  Coffee,
  Crown,
  Trophy,
  Ticket,
  UserMinus,
  Skull,
  Sparkles,
  AlertCircle,
  PlayCircle,
  RefreshCw,
  Plus,
  Handshake,
  CheckCircle,
  Flag,
  Wallet,
  Hand,
  UserPlus,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { TournamentNotification, NotificationType, PRIORITY_COLORS } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  tournament_starting: Clock,
  tournament_started: Play,
  level_change: TrendingUp,
  break_start: Coffee,
  break_end: PlayCircle,
  hand_for_hand: Hand,
  bubble_burst: Sparkles,
  final_table: Crown,
  player_eliminated: UserMinus,
  you_eliminated: Skull,
  prize_won: Trophy,
  ticket_issued: Ticket,
  registration_open: UserPlus,
  registration_closing: AlertCircle,
  rebuy_available: RefreshCw,
  addon_available: Plus,
  deal_proposed: Handshake,
  deal_accepted: CheckCircle,
  tournament_completed: Flag,
  balance_update: Wallet,
  system: Bell,
};

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const {
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    clearAll,
    remove,
    updatePreferences,
  } = useNotifications();

  const getIcon = (type: NotificationType) => {
    const IconComponent = ICON_MAP[type] || Bell;
    return IconComponent;
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  };

  const renderNotification = (notification: TournamentNotification) => {
    const Icon = getIcon(notification.type);
    const priorityColor = PRIORITY_COLORS[notification.priority];

    return (
      <motion.div
        key={notification.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer group',
          notification.read
            ? 'bg-background/50 border-border/50'
            : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
        )}
        onClick={() => markAsRead(notification.id)}
      >
        <div className={cn('p-2 rounded-full bg-background', priorityColor)}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'font-medium text-sm truncate',
              notification.read ? 'text-muted-foreground' : 'text-foreground'
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {formatTime(notification.timestamp)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            remove(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </motion.div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Уведомления</span>
        <Switch
          checked={preferences.enabled}
          onCheckedChange={(checked) => updatePreferences({ enabled: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Звук</span>
        <Switch
          checked={preferences.sound}
          onCheckedChange={(checked) => updatePreferences({ sound: checked })}
          disabled={!preferences.enabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Вибрация</span>
        <Switch
          checked={preferences.vibrate}
          onCheckedChange={(checked) => updatePreferences({ vibrate: checked })}
          disabled={!preferences.enabled}
        />
      </div>

      <div className="border-t pt-4 mt-4">
        <p className="text-sm font-medium mb-3">Категории</p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Турниры</span>
            <Switch
              checked={preferences.categories.tournaments}
              onCheckedChange={(checked) => 
                updatePreferences({ 
                  categories: { ...preferences.categories, tournaments: checked } 
                })
              }
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Уровни</span>
            <Switch
              checked={preferences.categories.levels}
              onCheckedChange={(checked) => 
                updatePreferences({ 
                  categories: { ...preferences.categories, levels: checked } 
                })
              }
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Выбывания</span>
            <Switch
              checked={preferences.categories.eliminations}
              onCheckedChange={(checked) => 
                updatePreferences({ 
                  categories: { ...preferences.categories, eliminations: checked } 
                })
              }
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Призы</span>
            <Switch
              checked={preferences.categories.prizes}
              onCheckedChange={(checked) => 
                updatePreferences({ 
                  categories: { ...preferences.categories, prizes: checked } 
                })
              }
              disabled={!preferences.enabled}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const allNotifications = notifications;
  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  variant="destructive" 
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={markAllAsRead}
                  title="Отметить все как прочитанные"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearAll}
                  title="Очистить все"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
              title="Настройки"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {renderSettings()}
            </motion.div>
          ) : (
            <motion.div
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full rounded-none border-b h-9">
                  <TabsTrigger value="all" className="flex-1 h-7 text-xs">
                    Все
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="flex-1 h-7 text-xs">
                    Непрочитанные ({unreadCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-2 space-y-2">
                      <AnimatePresence>
                        {allNotifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Нет уведомлений</p>
                          </div>
                        ) : (
                          allNotifications.map(renderNotification)
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="unread" className="m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-2 space-y-2">
                      <AnimatePresence>
                        {unreadNotifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Check className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Все прочитано</p>
                          </div>
                        ) : (
                          unreadNotifications.map(renderNotification)
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
