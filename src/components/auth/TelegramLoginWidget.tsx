import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { useTelegramAuth } from '@/hooks/useTelegramAuth';

interface TelegramLoginWidgetProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

// Telegram Login Widget component
export const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({ onSuccess, disabled }) => {
  const { loading, authenticateWithTelegram, openTelegramBot } = useTelegramAuth();

  const handleTelegramAuth = async (telegramData: any) => {
    if (disabled || loading) return;
    
    const result = await authenticateWithTelegram(telegramData);
    
    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  const handleManualTelegramLogin = () => {
    if (disabled || loading) return;
    openTelegramBot('EPC_Poker_Bot'); // Замените на имя вашего бота
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">или</span>
        </div>
      </div>
      
      <Button
        onClick={handleManualTelegramLogin}
        disabled={disabled || loading}
        variant="outline"
        className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white border-[#0088cc] hover:border-[#0077b3]"
      >
        {loading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Авторизация...
          </div>
        ) : (
          <div className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Войти через Telegram
            <ExternalLink className="w-3 h-3 ml-2" />
          </div>
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        При входе через Telegram будет создан аккаунт автоматически
      </p>
    </div>
  );
};