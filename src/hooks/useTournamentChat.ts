/**
 * Hook for tournament chat with moderation
 * Integrates with the TournamentChatModeration component
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useTournamentChat(tournamentId: string | null, currentPlayerId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [playerStatuses, setPlayerStatuses] = useState<PlayerModerationStatus[]>([]);
  const [autoModEnabled, setAutoModEnabled] = useState(true);
  const [isChatEnabled, setIsChatEnabled] = useState(true);

  // Local storage for moderation (in production, this would be in the database)
  const [mutedPlayers, setMutedPlayers] = useState<Map<string, number>>(new Map());
  const [bannedPlayers, setBannedPlayers] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<Map<string, number>>(new Map());

  // Add a new message
  const sendMessage = useCallback((text: string) => {
    if (!currentPlayerId || !text.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId: currentPlayerId,
      playerName: 'You', // In production, fetch from player data
      message: text,
      timestamp: Date.now(),
      type: 'chat'
    };

    setMessages(prev => [...prev, newMessage]);
  }, [currentPlayerId]);

  // Delete a message
  const deleteMessage = useCallback((messageId: string, reason?: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, isModerated: true, moderationReason: reason || 'Removed' }
        : m
    ));
  }, []);

  // Mute a player
  const mutePlayer = useCallback((playerId: string, duration: number) => {
    if (duration === 0) {
      // Unmute
      setMutedPlayers(prev => {
        const next = new Map(prev);
        next.delete(playerId);
        return next;
      });
    } else {
      // Mute for duration
      const muteUntil = Date.now() + duration * 1000;
      setMutedPlayers(prev => new Map(prev).set(playerId, muteUntil));
    }

    // Update player statuses
    setPlayerStatuses(prev => prev.map(p => 
      p.playerId === playerId 
        ? { ...p, isMuted: duration > 0, mutedUntil: duration > 0 ? Date.now() + duration * 1000 : undefined }
        : p
    ));
  }, []);

  // Ban a player
  const banPlayer = useCallback((playerId: string, reason: string) => {
    setBannedPlayers(prev => new Set(prev).add(playerId));
    
    // Add warning message
    const warningMessage: ChatMessage = {
      id: `warning-${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: `Player has been banned: ${reason}`,
      timestamp: Date.now(),
      type: 'warning'
    };
    setMessages(prev => [...prev, warningMessage]);

    // Update player statuses
    setPlayerStatuses(prev => prev.map(p => 
      p.playerId === playerId 
        ? { ...p, isBanned: true }
        : p
    ));

    toast.success('Игрок заблокирован');
  }, []);

  // Warn a player
  const warnPlayer = useCallback((playerId: string, message: string) => {
    setWarnings(prev => {
      const next = new Map(prev);
      next.set(playerId, (next.get(playerId) || 0) + 1);
      return next;
    });

    // Add warning message
    const warningMessage: ChatMessage = {
      id: `warning-${Date.now()}`,
      playerId: 'system',
      playerName: 'Модератор',
      message: `⚠️ Предупреждение: ${message}`,
      timestamp: Date.now(),
      type: 'warning'
    };
    setMessages(prev => [...prev, warningMessage]);

    // Update player statuses
    setPlayerStatuses(prev => prev.map(p => 
      p.playerId === playerId 
        ? { ...p, warningCount: (p.warningCount || 0) + 1 }
        : p
    ));

    toast.info('Предупреждение отправлено');
  }, []);

  // Report a message
  const reportMessage = useCallback((messageId: string, reason: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, isReported: true, reportCount: (m.reportCount || 0) + 1 }
        : m
    ));
  }, []);

  // Toggle auto-mod
  const toggleAutoMod = useCallback((enabled: boolean) => {
    setAutoModEnabled(enabled);
    toast.success(enabled ? 'Авто-модерация включена' : 'Авто-модерация выключена');
  }, []);

  // Check mute expiration
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMutedPlayers(prev => {
        const next = new Map(prev);
        for (const [playerId, muteUntil] of next.entries()) {
          if (muteUntil <= now) {
            next.delete(playerId);
            toast.info('Мут истёк');
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initial system message
  useEffect(() => {
    if (tournamentId) {
      setMessages([{
        id: 'welcome',
        playerId: 'system',
        playerName: 'System',
        message: 'Добро пожаловать в турнирный чат! Соблюдайте правила.',
        timestamp: Date.now(),
        type: 'system'
      }]);
    }
  }, [tournamentId]);

  return {
    messages,
    playerStatuses,
    autoModEnabled,
    isChatEnabled,
    sendMessage,
    deleteMessage,
    mutePlayer,
    banPlayer,
    warnPlayer,
    reportMessage,
    toggleAutoMod,
    currentPlayerMuted: mutedPlayers.has(currentPlayerId),
    currentPlayerBanned: bannedPlayers.has(currentPlayerId)
  };
}
