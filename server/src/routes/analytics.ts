/**
 * Analytics API Routes
 * Provides HUD stats, player analytics, and real-time monitoring data
 */

import { Express, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { calculateRealHUDStats, getPlayerStyle, detectLeaks, realtimeHUDTracker } from '../utils/hud-stats-calculator.js';
import { handHistoryService } from '../utils/hand-history-service.js';

export function setupAnalyticsRoutes(app: Express, supabase: SupabaseClient): void {
  
  /**
   * Get HUD stats for a player
   */
  app.get('/api/analytics/hud/:playerId', async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const { tableId, limit = '500' } = req.query;
      
      // First check in-memory stats from hand history service
      const memoryStats = handHistoryService.getPlayerStats(playerId);
      
      // Get hands from database
      const query = supabase
        .from('poker_hands')
        .select(`
          id,
          hand_number,
          pot,
          phase,
          community_cards,
          dealer_seat,
          small_blind_seat,
          big_blind_seat,
          winners,
          poker_tables!inner (
            small_blind,
            big_blind
          ),
          poker_hand_players!inner (
            player_id,
            seat_number,
            stack_start,
            stack_end,
            hole_cards,
            is_folded,
            is_all_in,
            won_amount,
            bet_amount
          ),
          poker_actions (
            player_id,
            seat_number,
            phase,
            action_type,
            amount
          )
        `)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit as string));
      
      if (tableId) {
        query.eq('table_id', tableId);
      }
      
      const { data: handsData, error } = await query;
      
      if (error) {
        logger.error('Failed to fetch hands for HUD stats', { error: String(error) });
        throw error;
      }
      
      // Transform to HandRecord format
      const hands = (handsData || []).map(h => ({
        id: h.id,
        handNumber: h.hand_number,
        pot: h.pot,
        phase: h.phase,
        communityCards: h.community_cards || [],
        dealerSeat: h.dealer_seat,
        smallBlindSeat: h.small_blind_seat,
        bigBlindSeat: h.big_blind_seat,
        actions: (h.poker_actions || []).map((a: any) => ({
          phase: a.phase,
          playerId: a.player_id,
          seatNumber: a.seat_number,
          actionType: a.action_type,
          amount: a.amount
        })),
        players: (h.poker_hand_players || []).map((p: any) => ({
          playerId: p.player_id,
          seatNumber: p.seat_number,
          stackStart: p.stack_start,
          stackEnd: p.stack_end,
          holeCards: p.hole_cards || [],
          isFolded: p.is_folded,
          isAllIn: p.is_all_in,
          wonAmount: p.won_amount,
          betAmount: p.bet_amount
        })),
        winners: (h.winners || []) as any[],
        bigBlind: (h.poker_tables as any)?.big_blind || 20,
        smallBlind: (h.poker_tables as any)?.small_blind || 10
      }));
      
      // Calculate stats
      const stats = calculateRealHUDStats(hands, playerId);
      const style = getPlayerStyle(stats);
      const leaks = detectLeaks(stats);
      
      res.json({
        success: true,
        playerId,
        stats,
        style,
        leaks,
        handsAnalyzed: hands.length,
        memoryStats: memoryStats || null
      });
    } catch (error) {
      logger.error('Failed to get HUD stats', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to get HUD stats' });
    }
  });
  
  /**
   * Get table HUD stats for all players
   */
  app.get('/api/analytics/table/:tableId/hud', async (req: Request, res: Response) => {
    try {
      const { tableId } = req.params;
      const { limit = '200' } = req.query;
      
      // Get all players at the table
      const { data: tablePlayers, error: playersError } = await supabase
        .from('poker_table_players')
        .select('player_id, players!inner(name)')
        .eq('table_id', tableId)
        .eq('status', 'active');
      
      if (playersError) throw playersError;
      
      if (!tablePlayers || tablePlayers.length === 0) {
        return res.json({ success: true, players: [] });
      }
      
      const playerIds = tablePlayers.map(p => p.player_id);
      
      // Get hands
      const { data: handsData, error: handsError } = await supabase
        .from('poker_hands')
        .select(`
          id, hand_number, pot, phase, community_cards, dealer_seat,
          small_blind_seat, big_blind_seat, winners,
          poker_tables!inner (small_blind, big_blind),
          poker_hand_players!inner (
            player_id, seat_number, stack_start, stack_end,
            hole_cards, is_folded, is_all_in, won_amount, bet_amount
          ),
          poker_actions (player_id, seat_number, phase, action_type, amount)
        `)
        .eq('table_id', tableId)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit as string));
      
      if (handsError) throw handsError;
      
      // Transform hands
      const hands = (handsData || []).map(h => ({
        id: h.id,
        handNumber: h.hand_number,
        pot: h.pot,
        phase: h.phase,
        communityCards: h.community_cards || [],
        dealerSeat: h.dealer_seat,
        smallBlindSeat: h.small_blind_seat,
        bigBlindSeat: h.big_blind_seat,
        actions: (h.poker_actions || []).map((a: any) => ({
          phase: a.phase, playerId: a.player_id, seatNumber: a.seat_number,
          actionType: a.action_type, amount: a.amount
        })),
        players: (h.poker_hand_players || []).map((p: any) => ({
          playerId: p.player_id, seatNumber: p.seat_number,
          stackStart: p.stack_start, stackEnd: p.stack_end,
          holeCards: p.hole_cards || [], isFolded: p.is_folded,
          isAllIn: p.is_all_in, wonAmount: p.won_amount, betAmount: p.bet_amount
        })),
        winners: (h.winners || []) as any[],
        bigBlind: (h.poker_tables as any)?.big_blind || 20,
        smallBlind: (h.poker_tables as any)?.small_blind || 10
      }));
      
      // Calculate stats for each player
      const playersStats = tablePlayers.map(p => {
        const stats = calculateRealHUDStats(hands, p.player_id);
        const style = getPlayerStyle(stats);
        return {
          playerId: p.player_id,
          playerName: (p.players as any)?.name || 'Unknown',
          stats,
          style
        };
      });
      
      res.json({
        success: true,
        tableId,
        players: playersStats,
        handsAnalyzed: hands.length
      });
    } catch (error) {
      logger.error('Failed to get table HUD stats', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to get table HUD stats' });
    }
  });
  
  /**
   * Get tournament analytics
   */
  app.get('/api/analytics/tournament/:playerId', async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      
      // Get tournament results
      const { data: results, error } = await supabase
        .from('online_poker_tournament_participants')
        .select(`
          id,
          finish_position,
          prize_amount,
          rebuys_count,
          addons_count,
          status,
          registered_at,
          eliminated_at,
          online_poker_tournaments!inner (
            id, name, buy_in, prize_pool, max_players, status
          )
        `)
        .eq('player_id', playerId)
        .order('registered_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Calculate tournament stats
      const completed = (results || []).filter(r => 
        ['finished', 'eliminated'].includes(r.status)
      );
      
      const totalBuyIns = completed.reduce((sum, r) => {
        const buyIn = (r.online_poker_tournaments as any)?.buy_in || 0;
        const rebuys = (r.rebuys_count || 0) * buyIn;
        const addons = (r.addons_count || 0) * buyIn;
        return sum + buyIn + rebuys + addons;
      }, 0);
      
      const totalPrizes = completed.reduce((sum, r) => sum + (r.prize_amount || 0), 0);
      
      const itm = completed.filter(r => (r.prize_amount || 0) > 0).length;
      
      const positions = completed
        .filter(r => r.finish_position != null)
        .map(r => r.finish_position!);
      
      const avgPosition = positions.length > 0 
        ? positions.reduce((a, b) => a + b, 0) / positions.length 
        : 0;
      
      res.json({
        success: true,
        playerId,
        stats: {
          tournamentsPlayed: completed.length,
          totalBuyIns,
          totalPrizes,
          profit: totalPrizes - totalBuyIns,
          roi: totalBuyIns > 0 ? ((totalPrizes - totalBuyIns) / totalBuyIns) * 100 : 0,
          itmCount: itm,
          itmPercent: completed.length > 0 ? (itm / completed.length) * 100 : 0,
          avgPosition,
          wins: positions.filter(p => p === 1).length,
          finalTables: positions.filter(p => p <= 9).length
        },
        recentResults: (results || []).slice(0, 20).map(r => ({
          tournamentId: (r.online_poker_tournaments as any)?.id,
          tournamentName: (r.online_poker_tournaments as any)?.name,
          buyIn: (r.online_poker_tournaments as any)?.buy_in,
          prizePool: (r.online_poker_tournaments as any)?.prize_pool,
          position: r.finish_position,
          prize: r.prize_amount,
          date: r.registered_at
        }))
      });
    } catch (error) {
      logger.error('Failed to get tournament analytics', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to get tournament analytics' });
    }
  });
  
  /**
   * Get realtime dashboard data
   */
  app.get('/api/analytics/realtime', async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Parallel queries
      const [
        { count: activePlayers },
        { count: activeTables },
        { count: activeHands },
        { count: handsLastMinute },
        { count: handsLastHour },
        { data: recentPots },
        { data: activeTournaments }
      ] = await Promise.all([
        supabase.from('poker_table_players').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('poker_tables').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
        supabase.from('poker_hands').select('*', { count: 'exact', head: true }).is('completed_at', null),
        supabase.from('poker_hands').select('*', { count: 'exact', head: true }).gte('created_at', oneMinuteAgo.toISOString()),
        supabase.from('poker_hands').select('*', { count: 'exact', head: true }).gte('created_at', oneHourAgo.toISOString()),
        supabase.from('poker_hands').select('pot').is('completed_at', null),
        supabase.from('online_poker_tournaments').select('id, name, status, prize_pool, current_level').in('status', ['running', 'late_registration'])
      ]);
      
      const totalPot = (recentPots || []).reduce((sum, h) => sum + (h.pot || 0), 0);
      const avgPot = recentPots && recentPots.length > 0 ? totalPot / recentPots.length : 0;
      
      res.json({
        success: true,
        timestamp: now.toISOString(),
        metrics: {
          activePlayers: activePlayers || 0,
          activeTables: activeTables || 0,
          activeHands: activeHands || 0,
          handsPerMinute: handsLastMinute || 0,
          handsPerHour: handsLastHour || 0,
          totalPotInPlay: totalPot,
          avgPotSize: Math.round(avgPot)
        },
        tournaments: activeTournaments || [],
        hudTracker: realtimeHUDTracker.getStats()
      });
    } catch (error) {
      logger.error('Failed to get realtime analytics', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to get realtime analytics' });
    }
  });
  
  /**
   * Compare players
   */
  app.post('/api/analytics/compare', async (req: Request, res: Response) => {
    try {
      const { playerIds, limit = 300 } = req.body;
      
      if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 8) {
        return res.status(400).json({ 
          success: false, 
          error: 'Provide 2-8 player IDs to compare' 
        });
      }
      
      // Get player names
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds);
      
      // Get shared hands
      const { data: handsData } = await supabase
        .from('poker_hands')
        .select(`
          id, hand_number, pot, phase, community_cards, dealer_seat,
          small_blind_seat, big_blind_seat, winners,
          poker_tables!inner (small_blind, big_blind),
          poker_hand_players!inner (
            player_id, seat_number, stack_start, stack_end,
            hole_cards, is_folded, is_all_in, won_amount, bet_amount
          ),
          poker_actions (player_id, seat_number, phase, action_type, amount)
        `)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Transform hands
      const hands = (handsData || []).map(h => ({
        id: h.id,
        handNumber: h.hand_number,
        pot: h.pot,
        phase: h.phase,
        communityCards: h.community_cards || [],
        dealerSeat: h.dealer_seat,
        smallBlindSeat: h.small_blind_seat,
        bigBlindSeat: h.big_blind_seat,
        actions: (h.poker_actions || []).map((a: any) => ({
          phase: a.phase, playerId: a.player_id, seatNumber: a.seat_number,
          actionType: a.action_type, amount: a.amount
        })),
        players: (h.poker_hand_players || []).map((p: any) => ({
          playerId: p.player_id, seatNumber: p.seat_number,
          stackStart: p.stack_start, stackEnd: p.stack_end,
          holeCards: p.hole_cards || [], isFolded: p.is_folded,
          isAllIn: p.is_all_in, wonAmount: p.won_amount, betAmount: p.bet_amount
        })),
        winners: (h.winners || []) as any[],
        bigBlind: (h.poker_tables as any)?.big_blind || 20,
        smallBlind: (h.poker_tables as any)?.small_blind || 10
      }));
      
      // Calculate stats for each player
      const comparison = playerIds.map(id => {
        const player = players?.find(p => p.id === id);
        const stats = calculateRealHUDStats(hands, id);
        const style = getPlayerStyle(stats);
        const leaks = detectLeaks(stats);
        
        return {
          playerId: id,
          playerName: player?.name || 'Unknown',
          stats,
          style,
          leaks: leaks.slice(0, 3)
        };
      });
      
      res.json({
        success: true,
        comparison,
        handsAnalyzed: hands.length
      });
    } catch (error) {
      logger.error('Failed to compare players', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to compare players' });
    }
  });
  
  logger.info('Analytics routes registered');
}
