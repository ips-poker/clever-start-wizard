import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  VolumeX, 
  Volume2, 
  ChevronDown,
  ChevronUp,
  Settings2,
  Bomb
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'dealer' | 'action';
  isModerated?: boolean;
}

interface TableChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onMutePlayer?: (playerId: string, mute: boolean) => void;
  onTriggerBombPot?: () => void;
  mutedPlayers?: Set<string>;
  isChatEnabled?: boolean;
  isSlowMode?: boolean;
  slowModeInterval?: number;
  currentPlayerId?: string;
  bombPotEnabled?: boolean;
  className?: string;
}

export const TableChat: React.FC<TableChatProps> = ({
  messages,
  onSendMessage,
  onMutePlayer,
  onTriggerBombPot,
  mutedPlayers = new Set(),
  isChatEnabled = true,
  isSlowMode = false,
  slowModeInterval = 5,
  currentPlayerId,
  bombPotEnabled = false,
  className
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<number>(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const handleSend = () => {
    if (!inputText.trim() || !isChatEnabled || cooldownRemaining > 0) return;

    onSendMessage(inputText.trim());
    setInputText('');
    lastMessageTime.current = Date.now();

    // Set cooldown
    if (isSlowMode) {
      setCooldownRemaining(slowModeInterval);
    } else {
      setCooldownRemaining(2);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = (type: ChatMessage['type']) => {
    switch (type) {
      case 'dealer':
        return 'text-amber-400 italic';
      case 'system':
        return 'text-blue-400 italic';
      case 'action':
        return 'text-green-400';
      default:
        return 'text-foreground';
    }
  };

  const unreadCount = messages.filter(m => 
    m.timestamp > lastMessageTime.current && m.playerId !== currentPlayerId
  ).length;

  if (!isExpanded) {
    return (
      <div className={cn("absolute bottom-4 right-4 z-50", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="bg-background/80 backdrop-blur-sm border-border/50 relative"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Чат
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "absolute bottom-4 right-4 z-50 w-72 bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Чат стола</span>
          {isSlowMode && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              Slow
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {bombPotEnabled && onTriggerBombPot && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-amber-500 hover:text-amber-400"
              onClick={onTriggerBombPot}
              title="Запустить Bomb Pot"
            >
              <Bomb className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Volume2 className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-48 p-2" ref={scrollRef}>
        <div className="space-y-1.5">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Нет сообщений
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "text-xs",
                  mutedPlayers.has(msg.playerId) && 'opacity-40'
                )}
              >
                <span className="text-muted-foreground text-[10px] mr-1">
                  {formatTime(msg.timestamp)}
                </span>
                {msg.type === 'chat' && (
                  <>
                    <span 
                      className="font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => onMutePlayer?.(msg.playerId, !mutedPlayers.has(msg.playerId))}
                      title={mutedPlayers.has(msg.playerId) ? 'Размутить' : 'Замутить'}
                    >
                      {msg.playerName}:
                    </span>
                    <span className={cn(
                      "ml-1",
                      msg.isModerated && "text-muted-foreground line-through"
                    )}>
                      {msg.message}
                    </span>
                  </>
                )}
                {msg.type !== 'chat' && (
                  <span className={getMessageStyle(msg.type)}>
                    {msg.message}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      {isChatEnabled ? (
        <div className="p-2 border-t border-border/30">
          <div className="flex gap-1">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={cooldownRemaining > 0 ? `Подождите ${cooldownRemaining}с...` : "Сообщение..."}
              disabled={cooldownRemaining > 0}
              className="h-7 text-xs bg-background/50"
              maxLength={200}
            />
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleSend}
              disabled={!inputText.trim() || cooldownRemaining > 0}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Чат отключен
          </p>
        </div>
      )}
    </div>
  );
};

export default TableChat;
