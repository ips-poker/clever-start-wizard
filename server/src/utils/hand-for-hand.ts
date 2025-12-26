/**
 * Hand-for-Hand System
 * Синхронизация всех столов на баббле
 */

import { EventEmitter } from 'events';

interface TableHandState {
  tableId: string;
  handInProgress: boolean;
  handNumber: number;
  lastCompletedAt: number;
  playersRemaining: number;
}

interface HandForHandState {
  tournamentId: string;
  active: boolean;
  startedAt: number;
  bubblePosition: number; // Позиция баббла (первое место вне призов)
  tablesState: Map<string, TableHandState>;
  waitingForTables: Set<string>;
  completedHands: number;
}

type HandForHandEventType = 
  | 'hfh_started'
  | 'hfh_ended'
  | 'hfh_table_waiting'
  | 'hfh_all_tables_ready'
  | 'hfh_hand_completed'
  | 'hfh_bubble_burst';

interface HandForHandEvent {
  type: HandForHandEventType;
  tournamentId: string;
  data?: any;
}

export class HandForHandManager extends EventEmitter {
  private tournaments: Map<string, HandForHandState> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startCheckLoop();
  }

  private startCheckLoop(): void {
    // Проверяем состояние каждые 500ms
    this.checkInterval = setInterval(() => {
      this.checkAllTournaments();
    }, 500);
  }

  private checkAllTournaments(): void {
    for (const [tournamentId, state] of this.tournaments) {
      if (state.active) {
        this.checkTournamentState(tournamentId, state);
      }
    }
  }

  private checkTournamentState(tournamentId: string, state: HandForHandState): void {
    // Проверяем, все ли столы завершили раздачи
    const allTablesReady = state.waitingForTables.size === state.tablesState.size;
    
    if (allTablesReady && state.tablesState.size > 0) {
      // Все столы готовы - можно начинать новую раздачу
      this.emit('event', {
        type: 'hfh_all_tables_ready',
        tournamentId,
        data: {
          tablesCount: state.tablesState.size,
          completedHands: state.completedHands
        }
      } as HandForHandEvent);

      // Сбрасываем ожидающие столы для новой раздачи
      state.waitingForTables.clear();
      state.completedHands++;
    }
  }

  /**
   * Начать режим hand-for-hand для турнира
   */
  startHandForHand(tournamentId: string, bubblePosition: number, tableIds: string[]): void {
    console.log(`[HFH] Starting hand-for-hand for tournament ${tournamentId}, bubble at position ${bubblePosition}`);

    const tablesState = new Map<string, TableHandState>();
    for (const tableId of tableIds) {
      tablesState.set(tableId, {
        tableId,
        handInProgress: false,
        handNumber: 0,
        lastCompletedAt: Date.now(),
        playersRemaining: 0
      });
    }

    const state: HandForHandState = {
      tournamentId,
      active: true,
      startedAt: Date.now(),
      bubblePosition,
      tablesState,
      waitingForTables: new Set(),
      completedHands: 0
    };

    this.tournaments.set(tournamentId, state);

    this.emit('event', {
      type: 'hfh_started',
      tournamentId,
      data: {
        bubblePosition,
        tablesCount: tableIds.length
      }
    } as HandForHandEvent);
  }

  /**
   * Завершить режим hand-for-hand
   */
  endHandForHand(tournamentId: string, reason: 'bubble_burst' | 'cancelled' = 'bubble_burst'): void {
    const state = this.tournaments.get(tournamentId);
    if (!state) return;

    console.log(`[HFH] Ending hand-for-hand for tournament ${tournamentId}, reason: ${reason}`);

    state.active = false;
    this.tournaments.delete(tournamentId);

    this.emit('event', {
      type: reason === 'bubble_burst' ? 'hfh_bubble_burst' : 'hfh_ended',
      tournamentId,
      data: {
        duration: Date.now() - state.startedAt,
        handsPlayed: state.completedHands
      }
    } as HandForHandEvent);
  }

  /**
   * Проверить, активен ли HFH для турнира
   */
  isActive(tournamentId: string): boolean {
    return this.tournaments.get(tournamentId)?.active ?? false;
  }

  /**
   * Уведомить о начале раздачи на столе
   */
  handStarted(tournamentId: string, tableId: string, handNumber: number): boolean {
    const state = this.tournaments.get(tournamentId);
    if (!state?.active) return true; // Если HFH не активен, разрешаем

    const tableState = state.tablesState.get(tableId);
    if (!tableState) return true;

    // Проверяем, все ли столы готовы начать новую раздачу
    // Если есть столы, которые еще играют, нужно подождать
    for (const [id, ts] of state.tablesState) {
      if (id !== tableId && ts.handInProgress) {
        // Другой стол еще играет - нельзя начинать
        console.log(`[HFH] Table ${tableId} must wait - table ${id} still playing`);
        return false;
      }
    }

    tableState.handInProgress = true;
    tableState.handNumber = handNumber;
    state.waitingForTables.delete(tableId);

    console.log(`[HFH] Table ${tableId} started hand ${handNumber}`);
    return true;
  }

  /**
   * Уведомить о завершении раздачи на столе
   */
  handCompleted(tournamentId: string, tableId: string, playersRemaining: number): void {
    const state = this.tournaments.get(tournamentId);
    if (!state?.active) return;

    const tableState = state.tablesState.get(tableId);
    if (!tableState) return;

    tableState.handInProgress = false;
    tableState.lastCompletedAt = Date.now();
    tableState.playersRemaining = playersRemaining;
    state.waitingForTables.add(tableId);

    console.log(`[HFH] Table ${tableId} completed hand, ${playersRemaining} players remaining`);

    this.emit('event', {
      type: 'hfh_table_waiting',
      tournamentId,
      data: {
        tableId,
        waitingCount: state.waitingForTables.size,
        totalTables: state.tablesState.size
      }
    } as HandForHandEvent);

    this.emit('event', {
      type: 'hfh_hand_completed',
      tournamentId,
      data: {
        tableId,
        playersRemaining
      }
    } as HandForHandEvent);
  }

  /**
   * Игрок выбыл - проверяем, не лопнул ли баббл
   */
  playerEliminated(tournamentId: string, totalPlayersRemaining: number): void {
    const state = this.tournaments.get(tournamentId);
    if (!state?.active) return;

    console.log(`[HFH] Player eliminated, ${totalPlayersRemaining} remaining, bubble at ${state.bubblePosition}`);

    // Если игроков осталось меньше или равно позиции баббла - баббл лопнул
    if (totalPlayersRemaining < state.bubblePosition) {
      this.endHandForHand(tournamentId, 'bubble_burst');
    }
  }

  /**
   * Добавить стол (при разделении)
   */
  addTable(tournamentId: string, tableId: string): void {
    const state = this.tournaments.get(tournamentId);
    if (!state?.active) return;

    state.tablesState.set(tableId, {
      tableId,
      handInProgress: false,
      handNumber: 0,
      lastCompletedAt: Date.now(),
      playersRemaining: 0
    });

    console.log(`[HFH] Added table ${tableId} to tournament ${tournamentId}`);
  }

  /**
   * Удалить стол (при консолидации)
   */
  removeTable(tournamentId: string, tableId: string): void {
    const state = this.tournaments.get(tournamentId);
    if (!state) return;

    state.tablesState.delete(tableId);
    state.waitingForTables.delete(tableId);

    console.log(`[HFH] Removed table ${tableId} from tournament ${tournamentId}`);
  }

  /**
   * Получить статус HFH
   */
  getStatus(tournamentId: string): {
    active: boolean;
    waitingTables: number;
    totalTables: number;
    tablesPlaying: string[];
    tablesWaiting: string[];
  } | null {
    const state = this.tournaments.get(tournamentId);
    if (!state) return null;

    const tablesPlaying: string[] = [];
    const tablesWaiting: string[] = [];

    for (const [tableId, tableState] of state.tablesState) {
      if (tableState.handInProgress) {
        tablesPlaying.push(tableId);
      } else {
        tablesWaiting.push(tableId);
      }
    }

    return {
      active: state.active,
      waitingTables: state.waitingForTables.size,
      totalTables: state.tablesState.size,
      tablesPlaying,
      tablesWaiting
    };
  }

  /**
   * Получить статистику
   */
  getStats(): {
    activeTournaments: number;
    totalTables: number;
  } {
    let totalTables = 0;
    for (const state of this.tournaments.values()) {
      if (state.active) {
        totalTables += state.tablesState.size;
      }
    }

    return {
      activeTournaments: Array.from(this.tournaments.values()).filter(s => s.active).length,
      totalTables
    };
  }

  /**
   * Остановка менеджера
   */
  shutdown(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Завершаем все активные HFH сессии
    for (const tournamentId of this.tournaments.keys()) {
      this.endHandForHand(tournamentId, 'cancelled');
    }

    this.tournaments.clear();
    console.log('[HFH] Hand-for-hand manager shutdown');
  }
}

// Singleton instance
export const handForHandManager = new HandForHandManager();
