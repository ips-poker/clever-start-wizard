/**
 * Tournament Chat Moderation Component
 * 5.5 - Advanced chat moderation with filters, warnings, and admin controls
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Shield, 
  AlertTriangle, 
  Ban, 
  Clock,
  Send,
  VolumeX,
  Volume2,
  Filter,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Flag,
  UserX,
  MessageCircleWarning,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Profanity filter patterns (basic Russian + English)
const PROFANITY_PATTERNS = [
  /б[л]+[яеэ]+/gi,
  /х[уyу]+[йияе]/gi,
  /п[иеэ]+зд/gi,
  /[её]+б[аоуыи]/gi,
  /сук[аи]/gi,
  /fuck/gi,
  /shit/gi,
  /asshole/gi,
  /bitch/gi,
];

// Spam detection
const SPAM_PATTERNS = [
  /(.)\1{4,}/g, // Repeated characters
  /(.{3,})\1{2,}/g, // Repeated phrases
];

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'dealer' | 'action' | 'warning';
  isModerated?: boolean;
  moderatedBy?: string;
  moderationReason?: string;
  isReported?: boolean;
  reportCount?: number;
}

interface PlayerModerationStatus {
  playerId: string;
  playerName: string;
  isMuted: boolean;
  mutedUntil?: number;
  warningCount: number;
  isBanned: boolean;
}

interface TournamentChatModerationProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onDeleteMessage: (messageId: string, reason?: string) => void;
  onMutePlayer: (playerId: string, duration: number) => void; // duration in seconds, 0 = unmute
  onBanPlayer: (playerId: string, reason: string) => void;
  onWarnPlayer: (playerId: string, message: string) => void;
  onReportMessage: (messageId: string, reason: string) => void;
  playerModerationStatus: PlayerModerationStatus[];
  currentPlayerId: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  isChatEnabled?: boolean;
  slowModeInterval?: number;
  autoModEnabled?: boolean;
  onToggleAutoMod?: (enabled: boolean) => void;
  className?: string;
}

// Filter message for profanity
const filterMessage = (text: string): { filtered: string; hasProfanity: boolean } => {
  let filtered = text;
  let hasProfanity = false;
  
  PROFANITY_PATTERNS.forEach(pattern => {
    if (pattern.test(filtered)) {
      hasProfanity = true;
      filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
    }
  });
  
  return { filtered, hasProfanity };
};

// Detect spam
const isSpam = (text: string): boolean => {
  return SPAM_PATTERNS.some(pattern => pattern.test(text));
};

export const TournamentChatModeration: React.FC<TournamentChatModerationProps> = ({
  messages,
  onSendMessage,
  onDeleteMessage,
  onMutePlayer,
  onBanPlayer,
  onWarnPlayer,
  onReportMessage,
  playerModerationStatus,
  currentPlayerId,
  isAdmin = false,
  isModerator = false,
  isChatEnabled = true,
  slowModeInterval = 5,
  autoModEnabled = true,
  onToggleAutoMod,
  className
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showModTools, setShowModTools] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [showOnlyReported, setShowOnlyReported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const canModerate = isAdmin || isModerator;
  
  // Get current player mute status
  const currentPlayerStatus = useMemo(() => 
    playerModerationStatus.find(s => s.playerId === currentPlayerId),
    [playerModerationStatus, currentPlayerId]
  );
  
  const isMuted = currentPlayerStatus?.isMuted || false;
  const isBanned = currentPlayerStatus?.isBanned || false;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Handle send with auto-moderation
  const handleSend = useCallback(() => {
    if (!inputText.trim() || !isChatEnabled || cooldownRemaining > 0 || isMuted || isBanned) return;
    
    const text = inputText.trim();
    
    // Auto-mod checks
    if (autoModEnabled) {
      const { filtered, hasProfanity } = filterMessage(text);
      
      if (isSpam(text)) {
        toast.error('Сообщение выглядит как спам');
        return;
      }
      
      if (hasProfanity) {
        onSendMessage(filtered);
        toast.warning('Нецензурные слова были отфильтрованы');
      } else {
        onSendMessage(text);
      }
    } else {
      onSendMessage(text);
    }
    
    setInputText('');
    setCooldownRemaining(slowModeInterval);
  }, [inputText, isChatEnabled, cooldownRemaining, isMuted, isBanned, autoModEnabled, slowModeInterval, onSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const handleQuickMute = (playerId: string, duration: number) => {
    onMutePlayer(playerId, duration);
    toast.success(`Игрок заглушен на ${duration / 60} мин.`);
  };

  const filteredMessages = useMemo(() => {
    if (showOnlyReported) {
      return messages.filter(m => m.isReported);
    }
    return messages;
  }, [messages, showOnlyReported]);

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn("fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm", className)}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Чат
        {messages.filter(m => m.isReported).length > 0 && canModerate && (
          <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
            {messages.filter(m => m.isReported).length}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-xl",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Турнирный чат</span>
          {autoModEnabled && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/20 text-emerald-400">
              <Shield className="h-2.5 w-2.5 mr-0.5" />
              Auto
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {canModerate && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-3 w-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Авто-модерация</span>
                    <Switch 
                      checked={autoModEnabled}
                      onCheckedChange={onToggleAutoMod}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Фильтр мата</span>
                    <Switch 
                      checked={filterEnabled}
                      onCheckedChange={setFilterEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Только жалобы</span>
                    <Switch 
                      checked={showOnlyReported}
                      onCheckedChange={setShowOnlyReported}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(false)}
          >
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Muted/Banned Banner */}
      {(isMuted || isBanned) && (
        <div className={cn(
          "p-2 text-xs flex items-center gap-2",
          isBanned ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
        )}>
          {isBanned ? <Ban className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          {isBanned ? 'Вы заблокированы в чате' : 'Вы временно заглушены'}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="h-56 p-2" ref={scrollRef}>
        <div className="space-y-2">
          {filteredMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {showOnlyReported ? 'Нет жалоб' : 'Нет сообщений'}
            </p>
          ) : (
            filteredMessages.map((msg) => {
              const playerStatus = playerModerationStatus.find(s => s.playerId === msg.playerId);
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "group relative text-xs p-1.5 rounded",
                    msg.isModerated && "bg-red-500/10 line-through opacity-50",
                    msg.isReported && "bg-amber-500/10 border-l-2 border-amber-500",
                    selectedMessageId === msg.id && "ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Avatar */}
                    <img 
                      src={msg.playerAvatar || '/placeholder.svg'}
                      alt=""
                      className="w-5 h-5 rounded-full flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                        <span className={cn(
                          "font-medium truncate",
                          msg.type === 'system' && "text-blue-400",
                          msg.type === 'dealer' && "text-amber-400",
                          msg.type === 'warning' && "text-red-400",
                          playerStatus?.isMuted && "text-muted-foreground"
                        )}>
                          {msg.playerName}
                        </span>
                        {playerStatus?.isMuted && (
                          <VolumeX className="h-2.5 w-2.5 text-muted-foreground" />
                        )}
                        {playerStatus?.warningCount && playerStatus.warningCount > 0 && (
                          <Badge variant="destructive" className="h-3 text-[8px] px-1">
                            {playerStatus.warningCount}⚠
                          </Badge>
                        )}
                      </div>
                      
                      {/* Message */}
                      <p className={cn(
                        "text-foreground break-words",
                        msg.type === 'warning' && "text-red-400 font-medium"
                      )}>
                        {filterEnabled ? filterMessage(msg.message).filtered : msg.message}
                      </p>
                      
                      {/* Moderation info */}
                      {msg.isModerated && (
                        <p className="text-[9px] text-red-400 mt-0.5">
                          Удалено: {msg.moderationReason}
                        </p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      {/* Report button for all users */}
                      {msg.playerId !== currentPlayerId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            onReportMessage(msg.id, 'Inappropriate content');
                            toast.info('Жалоба отправлена');
                          }}
                        >
                          <Flag className="h-3 w-3 text-amber-400" />
                        </Button>
                      )}
                      
                      {/* Mod actions */}
                      {canModerate && msg.playerId !== currentPlayerId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <Shield className="h-3 w-3 text-blue-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onDeleteMessage(msg.id, 'Rule violation')}>
                              <Trash2 className="h-3 w-3 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onWarnPlayer(msg.playerId, 'Пожалуйста, соблюдайте правила чата')}>
                              <MessageCircleWarning className="h-3 w-3 mr-2" />
                              Предупредить
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleQuickMute(msg.playerId, 60)}>
                              <Clock className="h-3 w-3 mr-2" />
                              Мут 1 мин
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuickMute(msg.playerId, 300)}>
                              <Clock className="h-3 w-3 mr-2" />
                              Мут 5 мин
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuickMute(msg.playerId, 1800)}>
                              <Clock className="h-3 w-3 mr-2" />
                              Мут 30 мин
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-400"
                              onClick={() => onBanPlayer(msg.playerId, 'Chat abuse')}
                            >
                              <UserX className="h-3 w-3 mr-2" />
                              Забанить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      {isChatEnabled && !isBanned ? (
        <div className="p-2 border-t border-border/30">
          <div className="flex gap-1">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isMuted ? 'Вы заглушены...' :
                cooldownRemaining > 0 ? `Подождите ${cooldownRemaining}с...` : 
                'Сообщение...'
              }
              disabled={cooldownRemaining > 0 || isMuted}
              className="h-7 text-xs bg-background/50"
              maxLength={200}
            />
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={handleSend}
              disabled={!inputText.trim() || cooldownRemaining > 0 || isMuted}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            {isBanned ? 'Вы заблокированы' : 'Чат отключен'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TournamentChatModeration;
