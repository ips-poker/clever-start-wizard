/**
 * Realtime Events Broadcaster
 * Broadcasts game events for real-time dashboard monitoring
 */

import { logger } from './logger.js';

export interface RealtimeEvent {
  type: 'hand_start' | 'hand_end' | 'player_join' | 'player_leave' | 
        'big_pot' | 'all_in' | 'tournament_start' | 'tournament_end' |
        'level_change' | 'bubble' | 'final_table' | 'showdown';
  tableId?: string;
  tournamentId?: string;
  playerId?: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

type EventCallback = (event: RealtimeEvent) => void;

class RealtimeEventBroadcaster {
  private listeners: Set<EventCallback> = new Set();
  private recentEvents: RealtimeEvent[] = [];
  private readonly maxRecentEvents = 100;
  
  /**
   * Subscribe to realtime events
   */
  subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Broadcast an event to all listeners
   */
  broadcast(event: Omit<RealtimeEvent, 'timestamp'>): void {
    const fullEvent: RealtimeEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    
    // Store in recent events
    this.recentEvents.unshift(fullEvent);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(0, this.maxRecentEvents);
    }
    
    // Notify all listeners
    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (error) {
        logger.error('Error in realtime event listener', { error: String(error) });
      }
    }
    
    logger.debug('Realtime event broadcasted', { type: event.type, message: event.message });
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): RealtimeEvent[] {
    return this.recentEvents.slice(0, limit);
  }
  
  /**
   * Convenience methods for common events
   */
  handStarted(tableId: string, handNumber: number): void {
    this.broadcast({
      type: 'hand_start',
      tableId,
      message: `Hand #${handNumber} started`,
      data: { handNumber }
    });
  }
  
  handCompleted(tableId: string, handNumber: number, pot: number, winnerId?: string): void {
    this.broadcast({
      type: 'hand_end',
      tableId,
      playerId: winnerId,
      message: `Hand #${handNumber} completed (pot: ${pot})`,
      data: { handNumber, pot, winnerId }
    });
  }
  
  playerJoined(tableId: string, playerId: string, playerName: string, seat: number): void {
    this.broadcast({
      type: 'player_join',
      tableId,
      playerId,
      message: `${playerName} joined seat ${seat}`,
      data: { playerName, seat }
    });
  }
  
  playerLeft(tableId: string, playerId: string, playerName: string): void {
    this.broadcast({
      type: 'player_leave',
      tableId,
      playerId,
      message: `${playerName} left the table`,
      data: { playerName }
    });
  }
  
  bigPot(tableId: string, amount: number, handNumber: number): void {
    this.broadcast({
      type: 'big_pot',
      tableId,
      message: `Big pot: ${amount.toLocaleString()} chips`,
      data: { amount, handNumber }
    });
  }
  
  allIn(tableId: string, playerId: string, playerName: string, amount: number): void {
    this.broadcast({
      type: 'all_in',
      tableId,
      playerId,
      message: `${playerName} is ALL-IN for ${amount.toLocaleString()}!`,
      data: { playerName, amount }
    });
  }
  
  tournamentStarted(tournamentId: string, name: string, players: number): void {
    this.broadcast({
      type: 'tournament_start',
      tournamentId,
      message: `🏆 Tournament "${name}" started with ${players} players`,
      data: { name, players }
    });
  }
  
  tournamentEnded(tournamentId: string, name: string, winnerId?: string, winnerName?: string): void {
    this.broadcast({
      type: 'tournament_end',
      tournamentId,
      playerId: winnerId,
      message: winnerName 
        ? `Tournament "${name}" won by ${winnerName}!` 
        : `Tournament "${name}" finished`,
      data: { name, winnerId, winnerName }
    });
  }
  
  levelChanged(tournamentId: string, level: number, smallBlind: number, bigBlind: number): void {
    this.broadcast({
      type: 'level_change',
      tournamentId,
      message: `Level ${level}: Blinds ${smallBlind}/${bigBlind}`,
      data: { level, smallBlind, bigBlind }
    });
  }
  
  bubbleBurst(tournamentId: string, eliminatedPlayer: string): void {
    this.broadcast({
      type: 'bubble',
      tournamentId,
      message: `💔 Bubble burst! ${eliminatedPlayer} eliminated`,
      data: { eliminatedPlayer }
    });
  }
  
  finalTableReached(tournamentId: string, players: number): void {
    this.broadcast({
      type: 'final_table',
      tournamentId,
      message: `🏆 Final table reached with ${players} players!`,
      data: { players }
    });
  }
  
  showdown(tableId: string, players: string[], pot: number): void {
    this.broadcast({
      type: 'showdown',
      tableId,
      message: `Showdown between ${players.length} players for ${pot.toLocaleString()}`,
      data: { players, pot }
    });
  }
  
  /**
   * Get stats
   */
  getStats(): { listeners: number; recentEvents: number } {
    return {
      listeners: this.listeners.size,
      recentEvents: this.recentEvents.length
    };
  }
}

export const realtimeEventBroadcaster = new RealtimeEventBroadcaster();

logger.info('Realtime Event Broadcaster initialized');
