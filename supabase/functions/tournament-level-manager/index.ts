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

    // Check if specific tournament requested (direct call from frontend)
    let specificTournamentId: string | null = null;
    try {
      const body = await req.json();
      specificTournamentId = body?.tournamentId || null;
    } catch {
      // No body - cron job call
    }

    const results: ProcessResult[] = [];
    const now = new Date();
    console.log(`Tournament level manager running at ${now.toISOString()}, specific: ${specificTournamentId || 'none'}`);

    // Build query for expired tournaments
    let query = supabase
      .from('online_poker_tournaments')
      .select('id, name, current_level, level_duration, level_end_at, status, small_blind, big_blind, ante')
      .in('status', ['running', 'break', 'in_progress', 'active'])
      .not('level_end_at', 'is', null);

    if (specificTournamentId) {
      // Direct call - process this specific tournament immediately
      query = query.eq('id', specificTournamentId).lt('level_end_at', now.toISOString());
    } else {
      // Cron job - process any expired tournament
      query = query.lt('level_end_at', now.toISOString());
    }

    const { data: expiredTournaments, error: fetchError } = await query;

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
        
        // PROFESSIONAL TIMING: Notify all tables IMMEDIATELY that break is starting
        // This prevents any new hands from starting and shows break banner
        console.log(`Tournament ${tournament.name}: BREAK STARTING - broadcasting to all tables`);
        
        // Get all tournament tables and mark them for break
        const { data: tables } = await supabase
          .from('poker_tables')
          .select('id')
          .eq('tournament_id', tournament.id);
        
        if (tables && tables.length > 0) {
          // Set all tables to 'break' status to prevent new hands
          await supabase
            .from('poker_tables')
            .update({ 
              status: 'break',
              updated_at: new Date().toISOString()
            })
            .eq('tournament_id', tournament.id);
          
          console.log(`Tournament ${tournament.name}: Set ${tables.length} tables to break status`);
        }
        
      } else if (wasBreak) {
        action = 'break_ended';
        newStatus = 'running';
        
        // PROFESSIONAL TIMING: Resume play on all tables immediately
        console.log(`Tournament ${tournament.name}: Break ended, resuming play on all tables`);
        
        // Reset all tables to 'waiting' so hands can start
        await supabase
          .from('poker_tables')
          .update({ 
            status: 'waiting',
            updated_at: new Date().toISOString()
          })
          .eq('tournament_id', tournament.id);
          
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
          status: newStatus,
          updated_at: new Date().toISOString() // Trigger realtime subscription
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

      // 6. Проверяем нужна ли балансировка столов (особенно важно после перерыва)
      if (wasBreak || action === 'break_ended') {
        console.log(`Tournament ${tournament.name}: Running table balancing after break end`);
      }
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
 * Всегда вызывает RPC функцию consolidate_tournament_tables которая сама решает нужна ли консолидация
 * IMPROVED: Also broadcasts 'resume_hands' event when break ends
 */
async function checkAndBalanceTables(supabase: any, tournamentId: string): Promise<void> {
  try {
    // Получаем tournament info
    const { data: tournament, error: tournamentError } = await supabase
      .from('online_poker_tournaments')
      .select('players_per_table, status')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) {
      console.error(`Error fetching tournament ${tournamentId}:`, tournamentError);
      return;
    }

    const playersPerTable = tournament?.players_per_table || 6;
    const wasBreak = tournament?.status === 'break';

    // Получаем все активные столы турнира (waiting и playing)
    const { data: tables, error } = await supabase
      .from('poker_tables')
      .select('id, status, current_hand_id')
      .eq('tournament_id', tournamentId)
      .in('status', ['waiting', 'playing']);

    if (error) {
      console.error(`Error fetching tables for tournament ${tournamentId}:`, error);
      return;
    }

    // Считаем активных игроков в турнире
    const { count: totalPlayers, error: countError } = await supabase
      .from('online_poker_tournament_participants')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'playing');

    if (countError) {
      console.error(`Error counting players for tournament ${tournamentId}:`, countError);
      return;
    }

    const activeTables = tables?.length || 0;
    const minTablesNeeded = Math.ceil((totalPlayers || 0) / playersPerTable);

    console.log(`Tournament ${tournamentId}: ${totalPlayers} players, ${activeTables} tables, need ${minTablesNeeded} tables (max ${playersPerTable}/table)`);

    // CRITICAL: Clear any stuck current_hand_id on tables with completed hands
    // This allows consolidation to proceed
    for (const table of (tables || [])) {
      if (table.current_hand_id) {
        // Check if hand is actually completed
        const { data: hand } = await supabase
          .from('poker_hands')
          .select('completed_at')
          .eq('id', table.current_hand_id)
          .single();
        
        if (hand?.completed_at) {
          console.log(`Clearing stuck current_hand_id on table ${table.id}`);
          await supabase
            .from('poker_tables')
            .update({ current_hand_id: null, status: 'waiting' })
            .eq('id', table.id);
        }
      }
    }

    // Вызываем force_tournament_consolidation которая сначала очистит зависшие раздачи
    if (activeTables > minTablesNeeded || activeTables > 1) {
      console.log(`Tournament ${tournamentId}: Running force_tournament_consolidation`);
      const { data: result, error: rpcError } = await supabase.rpc('force_tournament_consolidation', { 
        p_tournament_id: tournamentId 
      });
      
      if (rpcError) {
        console.error(`Error consolidating tables for tournament ${tournamentId}:`, rpcError);
      } else {
        console.log(`Tournament ${tournamentId}: Force consolidation result:`, JSON.stringify(result));
      }
    }

    // Broadcast tournament_status_changed event to trigger hand restarts on all tables
    // This notifies the VPS server to resume dealing
    console.log(`Tournament ${tournamentId}: Broadcasting status update to resume hands`);
    await supabase
      .from('online_poker_tournaments')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', tournamentId);

  } catch (err) {
    console.error(`Error balancing tables for tournament ${tournamentId}:`, err);
  }
}
