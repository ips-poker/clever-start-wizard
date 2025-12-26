/**
 * Tournament Level Manager - Cron Job Edge Function
 * 
 * Автоматически управляет уровнями блайндов для всех активных турниров:
 * - Проверяет level_end_at и продвигает уровень если время истекло
 * - Обрабатывает перерывы
 * - Уведомляет о смене уровня через WebSocket
 * 
 * Запускается каждые 10 секунд через pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TournamentLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number | null;
  duration: number | null;
  is_break: boolean | null;
}

interface ProcessResult {
  tournamentId: string;
  tournamentName: string;
  action: 'level_advanced' | 'break_started' | 'break_ended' | 'tournament_completed' | 'no_action';
  previousLevel: number;
  newLevel: number;
  newBlinds?: { smallBlind: number; bigBlind: number; ante: number };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: ProcessResult[] = [];
    const now = new Date();
    console.log(`Tournament level manager running at ${now.toISOString()}`);

    // 1. Получаем все активные турниры с истекшим временем уровня
    const { data: expiredTournaments, error: fetchError } = await supabase
      .from('online_poker_tournaments')
      .select('id, name, current_level, level_duration, level_end_at, status, small_blind, big_blind, ante')
      .in('status', ['running', 'break'])
      .not('level_end_at', 'is', null)
      .lt('level_end_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching tournaments:', fetchError);
      throw fetchError;
    }

    if (!expiredTournaments || expiredTournaments.length === 0) {
      console.log('No tournaments need level advancement');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tournaments need level advancement',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${expiredTournaments.length} tournaments with expired levels`);

    // 2. Обрабатываем каждый турнир
    for (const tournament of expiredTournaments) {
      const currentLevel = tournament.current_level || 1;
      
      // Получаем следующий уровень блайндов
      const { data: nextLevel, error: levelError } = await supabase
        .from('online_poker_tournament_levels')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('level', currentLevel + 1)
        .single();

      if (levelError || !nextLevel) {
        // Нет следующего уровня - турнир должен продолжаться на текущем
        console.log(`Tournament ${tournament.name}: No next level found, staying at level ${currentLevel}`);
        
        // Просто продлеваем текущий уровень
        const { data: currentLevelData } = await supabase
          .from('online_poker_tournament_levels')
          .select('*')
          .eq('tournament_id', tournament.id)
          .eq('level', currentLevel)
          .single();

        if (currentLevelData) {
          const duration = currentLevelData.duration || tournament.level_duration || 300;
          const newEndTime = new Date(Date.now() + duration * 1000);
          
          await supabase
            .from('online_poker_tournaments')
            .update({ level_end_at: newEndTime.toISOString() })
            .eq('id', tournament.id);
        }
        
        results.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          action: 'no_action',
          previousLevel: currentLevel,
          newLevel: currentLevel
        });
        continue;
      }

      // 3. Определяем тип перехода
      const isBreak = nextLevel.is_break || false;
      const wasBreak = tournament.status === 'break';
      const duration = nextLevel.duration || tournament.level_duration || 300;
      const newEndTime = new Date(Date.now() + duration * 1000);

      let action: ProcessResult['action'];
      let newStatus = tournament.status;

      if (isBreak) {
        action = 'break_started';
        newStatus = 'break';
      } else if (wasBreak) {
        action = 'break_ended';
        newStatus = 'running';
      } else {
        action = 'level_advanced';
        newStatus = 'running';
      }

      // 4. Обновляем турнир
      const { error: updateError } = await supabase
        .from('online_poker_tournaments')
        .update({
          current_level: currentLevel + 1,
          small_blind: isBreak ? tournament.small_blind : nextLevel.small_blind,
          big_blind: isBreak ? tournament.big_blind : nextLevel.big_blind,
          ante: isBreak ? tournament.ante : nextLevel.ante,
          level_end_at: newEndTime.toISOString(),
          status: newStatus
        })
        .eq('id', tournament.id);

      if (updateError) {
        console.error(`Error updating tournament ${tournament.id}:`, updateError);
        continue;
      }

      // 5. Обновляем блайнды на всех столах турнира (если не перерыв)
      if (!isBreak) {
        const { error: tablesError } = await supabase
          .from('poker_tables')
          .update({
            small_blind: nextLevel.small_blind,
            big_blind: nextLevel.big_blind,
            ante: nextLevel.ante || 0
          })
          .eq('tournament_id', tournament.id);

        if (tablesError) {
          console.error(`Error updating tables for tournament ${tournament.id}:`, tablesError);
        }
      }

      // 6. Проверяем нужна ли балансировка столов
      await checkAndBalanceTables(supabase, tournament.id);

      results.push({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        action,
        previousLevel: currentLevel,
        newLevel: currentLevel + 1,
        newBlinds: isBreak ? undefined : {
          smallBlind: nextLevel.small_blind,
          bigBlind: nextLevel.big_blind,
          ante: nextLevel.ante || 0
        }
      });

      console.log(`Tournament ${tournament.name}: ${action} (Level ${currentLevel} -> ${currentLevel + 1})`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Tournament level manager error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Проверяет и балансирует столы турнира
 */
async function checkAndBalanceTables(supabase: any, tournamentId: string): Promise<void> {
  try {
    // Получаем все активные столы турнира с количеством игроков
    const { data: tables, error } = await supabase
      .from('poker_tables')
      .select(`
        id,
        max_players,
        poker_table_players!inner(player_id, seat_number, stack)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'playing');

    if (error || !tables || tables.length <= 1) return;

    // Считаем игроков на каждом столе
    const tableStats = tables.map((t: any) => ({
      tableId: t.id,
      playerCount: t.poker_table_players?.length || 0,
      maxPlayers: t.max_players,
      players: t.poker_table_players || []
    }));

    // Проверяем нужна ли консолидация
    const totalPlayers = tableStats.reduce((sum: number, t: any) => sum + t.playerCount, 0);
    const avgPlayers = totalPlayers / tableStats.length;
    const maxPlayersPerTable = tableStats[0]?.maxPlayers || 9;

    // Если можно уместить всех на меньшее количество столов
    const minTablesNeeded = Math.ceil(totalPlayers / maxPlayersPerTable);
    
    if (tableStats.length > minTablesNeeded && minTablesNeeded > 0) {
      console.log(`Tournament ${tournamentId}: Need to consolidate from ${tableStats.length} to ${minTablesNeeded} tables`);
      // Вызываем функцию консолидации
      await supabase.rpc('consolidate_tournament_tables', { p_tournament_id: tournamentId });
    } else {
      // Просто балансируем существующие столы
      const maxDiff = Math.max(...tableStats.map((t: any) => t.playerCount)) - 
                      Math.min(...tableStats.map((t: any) => t.playerCount));
      
      if (maxDiff > 1) {
        console.log(`Tournament ${tournamentId}: Balancing tables (diff: ${maxDiff})`);
        await supabase.rpc('balance_tournament_tables', { p_tournament_id: tournamentId });
      }
    }
  } catch (err) {
    console.error(`Error balancing tables for tournament ${tournamentId}:`, err);
  }
}
