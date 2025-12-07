import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/hooks/useReconnectManager';

interface ConnectionStatusBannerProps {
  status: ConnectionStatus;
  retryCount?: number;
  maxRetries?: number;
  nextRetryIn?: number | null;
  lastError?: string | null;
  onReconnectNow?: () => void;
  onCancel?: () => void;
}

export const ConnectionStatusBanner = memo(function ConnectionStatusBanner({
  status,
  retryCount = 0,
  maxRetries = 5,
  nextRetryIn,
  lastError,
  onReconnectNow,
  onCancel,
}: ConnectionStatusBannerProps) {
  // Don't show banner when connected
  if (status === 'connected') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Подключение...',
          bgClass: 'bg-blue-500/90',
          showRetry: false,
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: nextRetryIn 
            ? `Переподключение через ${nextRetryIn}с...` 
            : 'Переподключение...',
          bgClass: 'bg-amber-500/90',
          showRetry: true,
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Соединение потеряно',
          bgClass: 'bg-red-500/90',
          showRetry: true,
        };
      case 'failed':
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Не удалось подключиться',
          bgClass: 'bg-red-600/90',
          showRetry: true,
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Нет соединения',
          bgClass: 'bg-gray-500/90',
          showRetry: true,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          "fixed top-12 left-1/2 -translate-x-1/2 z-50",
          "px-4 py-2 rounded-full shadow-lg backdrop-blur-md",
          "flex items-center gap-2",
          config.bgClass
        )}
      >
        {/* Status Icon */}
        <span className="text-white">{config.icon}</span>

        {/* Status Text */}
        <span className="text-white text-sm font-medium">
          {config.text}
        </span>

        {/* Retry count */}
        {status === 'reconnecting' && retryCount > 0 && (
          <span className="text-white/70 text-xs">
            ({retryCount}/{maxRetries})
          </span>
        )}

        {/* Actions */}
        {config.showRetry && (
          <div className="flex items-center gap-1 ml-2">
            {/* Reconnect Now Button */}
            {onReconnectNow && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onReconnectNow}
                className="h-6 px-2 text-white hover:bg-white/20 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Сейчас
              </Button>
            )}

            {/* Cancel Button */}
            {onCancel && status === 'reconnecting' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

export default ConnectionStatusBanner;
