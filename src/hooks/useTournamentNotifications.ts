import { useEffect, useRef } from 'react';
import { notificationManager } from '@/utils/notification-manager';

interface UseTournamentNotificationsProps {
  tournamentId?: string;
  playerId?: string;
  enabled?: boolean;
}

// WebSocket event types that trigger notifications
type TournamentEvent = {
  type: string;
  data: Record<string, unknown>;
};

export function useTournamentNotifications({
  tournamentId,
  playerId,
  enabled = true,
}: UseTournamentNotificationsProps) {
  const previousLevel = useRef<number | null>(null);
  const previousStatus = useRef<string | null>(null);

  // Handle tournament events from WebSocket or state changes
  const handleTournamentEvent = (event: TournamentEvent) => {
    if (!enabled) return;

    switch (event.type) {
      case 'level_changed':
        const { level, small_blind, big_blind, ante } = event.data as {
          level: number;
          small_blind: number;
          big_blind: number;
          ante: number;
        };
        if (previousLevel.current !== null && level !== previousLevel.current) {
          notificationManager.levelChange(level, small_blind, big_blind, ante, tournamentId);
        }
        previousLevel.current = level;
        break;

      case 'break_started':
        const { duration } = event.data as { duration: number };
        notificationManager.breakStart(duration, tournamentId);
        break;

      case 'break_ended':
        notificationManager.notify(
          'break_end',
          'Перерыв окончен',
          'Игра продолжается',
          { tournamentId }
        );
        break;

      case 'hand_for_hand_started':
        const { players_remaining } = event.data as { players_remaining: number };
        notificationManager.handForHand(players_remaining, tournamentId);
        break;

      case 'bubble_burst':
        notificationManager.bubbleBurst(tournamentId);
        break;

      case 'final_table':
        notificationManager.finalTable(tournamentId);
        break;

      case 'player_eliminated':
        const { player_name, position, player_id, prize } = event.data as {
          player_name: string;
          position: number;
          player_id: string;
          prize?: number;
        };
        
        if (player_id === playerId) {
          notificationManager.youEliminated(position, prize, tournamentId);
          if (prize && prize > 0) {
            notificationManager.prizeWon(prize, position, tournamentId);
          }
        } else {
          notificationManager.playerEliminated(player_name, position, tournamentId);
        }
        break;

      case 'deal_proposed':
        notificationManager.dealProposed(tournamentId);
        break;

      case 'deal_accepted':
        notificationManager.notify(
          'deal_accepted',
          'Сделка принята',
          'Призовой фонд будет распределен согласно договоренности',
          { tournamentId, priority: 'high' }
        );
        break;

      case 'tournament_completed':
        const { winner_name } = event.data as { winner_name?: string };
        notificationManager.notify(
          'tournament_completed',
          'Турнир завершен',
          winner_name ? `Победитель: ${winner_name}` : 'Турнир окончен',
          { tournamentId }
        );
        break;

      case 'rebuy_available':
        notificationManager.notify(
          'rebuy_available',
          'Ребай доступен',
          'Вы можете сделать ребай',
          { tournamentId, priority: 'medium' }
        );
        break;

      case 'addon_available':
        notificationManager.notify(
          'addon_available',
          'Аддон доступен',
          'Период аддона начался',
          { tournamentId, priority: 'medium' }
        );
        break;

      case 'ticket_issued':
        const { value, tournament_name } = event.data as { value: number; tournament_name: string };
        notificationManager.ticketIssued(value, tournament_name);
        break;
    }
  };

  // Monitor tournament status changes
  const updateTournamentStatus = (status: string, tournamentName?: string) => {
    if (!enabled) return;

    if (previousStatus.current !== status) {
      switch (status) {
        case 'starting':
          notificationManager.notify(
            'tournament_started',
            'Турнир начинается',
            tournamentName || 'Приготовьтесь к игре',
            { tournamentId }
          );
          break;

        case 'running':
          if (previousStatus.current === 'paused') {
            notificationManager.notify(
              'break_end',
              'Игра продолжается',
              'Турнир возобновлен',
              { tournamentId }
            );
          }
          break;

        case 'hand_for_hand':
          notificationManager.handForHand(0, tournamentId);
          break;

        case 'final_table':
          notificationManager.finalTable(tournamentId);
          break;
      }
      previousStatus.current = status;
    }
  };

  return {
    handleTournamentEvent,
    updateTournamentStatus,
  };
}
