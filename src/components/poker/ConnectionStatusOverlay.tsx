/**
 * Connection Status Overlay Component
 * Phase 4.4 - Visual indicator for connection status with reconnect countdown
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ConnectionStatusType = 
  | 'connected' 
  | 'connecting' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'failed'
  | 'paused';

interface ConnectionStatusOverlayProps {
  status: ConnectionStatusType;
  retryCount?: number;
  nextRetryIn?: number | null;
  latency?: number;
  onReconnectNow?: () => void;
  onDisconnect?: () => void;
  className?: string;
  minimal?: boolean; // Show only icon in corner
}

export function ConnectionStatusOverlay({
  status,
  retryCount = 0,
  nextRetryIn = null,
  latency = 0,
  onReconnectNow,
  onDisconnect,
  className,
  minimal = false
}: ConnectionStatusOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(nextRetryIn || 0);

  // Update countdown
  useEffect(() => {
    if (nextRetryIn !== null && nextRetryIn > 0) {
      setCountdown(nextRetryIn);
    }
  }, [nextRetryIn]);

  // Show overlay for non-connected states
  useEffect(() => {
    if (status === 'connected') {
      // Hide after brief delay to show success animation
      const timer = setTimeout(() => setShowOverlay(false), 1000);
      return () => clearTimeout(timer);
    } else if (status !== 'connecting') {
      setShowOverlay(true);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          title: 'Подключено',
          subtitle: latency > 0 ? `${latency}ms` : undefined
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          title: 'Подключение...',
          subtitle: undefined
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          title: 'Переподключение',
          subtitle: countdown > 0 ? `через ${countdown}с (попытка ${retryCount}/5)` : undefined
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          title: 'Отключено',
          subtitle: 'Соединение потеряно'
        };
      case 'paused':
        return {
          icon: Clock,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          title: 'Сервис перегружен',
          subtitle: countdown > 0 ? `Ожидание ${countdown}с` : 'Пожалуйста, подождите'
        };
      case 'failed':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-600/10',
          borderColor: 'border-red-600/30',
          title: 'Не удалось подключиться',
          subtitle: 'Проверьте интернет-соединение'
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/30',
          title: 'Неизвестно',
          subtitle: undefined
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isSpinning = status === 'connecting' || status === 'reconnecting';

  // Minimal mode - just an icon in the corner
  if (minimal) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-full',
          config.bgColor,
          'border',
          config.borderColor,
          className
        )}
      >
        <Icon 
          className={cn(
            'w-4 h-4',
            config.color,
            isSpinning && 'animate-spin'
          )} 
        />
        {latency > 0 && status === 'connected' && (
          <span className={cn('text-xs', config.color)}>{latency}ms</span>
        )}
        {countdown > 0 && (status === 'reconnecting' || status === 'paused') && (
          <span className={cn('text-xs', config.color)}>{countdown}s</span>
        )}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {(showOverlay || status !== 'connected') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'w-full max-w-sm mx-4 p-6 rounded-xl border shadow-lg',
              config.bgColor,
              config.borderColor,
              'bg-card'
            )}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                config.bgColor
              )}>
                <Icon 
                  className={cn(
                    'w-8 h-8',
                    config.color,
                    isSpinning && 'animate-spin'
                  )} 
                />
              </div>
            </div>

            {/* Title */}
            <h3 className={cn(
              'text-lg font-semibold text-center mb-1',
              config.color
            )}>
              {config.title}
            </h3>

            {/* Subtitle */}
            {config.subtitle && (
              <p className="text-sm text-muted-foreground text-center mb-4">
                {config.subtitle}
              </p>
            )}

            {/* Progress bar for reconnecting */}
            {(status === 'reconnecting' || status === 'paused') && nextRetryIn && nextRetryIn > 0 && (
              <div className="mb-4">
                <Progress 
                  value={(1 - countdown / nextRetryIn) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {(status === 'disconnected' || status === 'failed' || status === 'reconnecting') && (
                <Button 
                  onClick={onReconnectNow}
                  className="w-full"
                  variant={status === 'failed' ? 'default' : 'secondary'}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Подключиться сейчас
                </Button>
              )}
              
              {status === 'failed' && onDisconnect && (
                <Button 
                  onClick={onDisconnect}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  Отменить
                </Button>
              )}
            </div>

            {/* Connection quality indicator for connected state */}
            {status === 'connected' && latency > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  latency < 50 ? 'bg-green-500' : 
                  latency < 150 ? 'bg-yellow-500' : 'bg-red-500'
                )} />
                <span className="text-xs text-muted-foreground">
                  Ping: {latency}ms
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact badge version for use in game UI
export function ConnectionStatusBadge({
  status,
  latency,
  nextRetryIn,
  className
}: {
  status: ConnectionStatusType;
  latency?: number;
  nextRetryIn?: number | null;
  className?: string;
}) {
  return (
    <ConnectionStatusOverlay
      status={status}
      latency={latency}
      nextRetryIn={nextRetryIn}
      minimal
      className={className}
    />
  );
}

export default ConnectionStatusOverlay;