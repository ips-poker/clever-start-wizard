/**
 * Tournament Table Balancer - Edge Function
 * 
 * PROFESSIONAL: Балансирует столы турнира по правилам профессионального покера.
 * 
 * Правила балансировки:
 * 1. Разница игроков между столами ≤ 1 (например: 4,4,5 для 13 игроков)
 * 2. При пересадке выбираются игроки, следующие на большой блайнд
 * 3. Игроки в активной раздаче не пересаживаются
 * 4. При поздней регистрации автоматически создаётся новый стол если нужно
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableInfo {
  id: string;
  name: string;
  max_players: number;
  current_dealer_seat: number | null;
  current_hand_id: string | null;
  player_count: number;
}

interface TournamentInfo {
  id: string;
  name: string;
  players_per_table: number;
  status: string;
}

Deno.serve(async (req) => {
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
    console.log(`Tournament table balancer running at ${new Date().toISOString()}`);

    // Parse optional tournament_id from request body
    let specificTournamentId: string | null = null;
    try {
      const body = await req.json();
      specificTournamentId = body?.tournament_id || null;
    } catch {
      // No body or invalid JSON - process all tournaments
    }

    // Get tournaments to process
    let tournamentsQuery = supabase
      .from('online_poker_tournaments')
      .select('id, name, players_per_table, status')
      .in('status', ['running', 'final_table']);
    
    if (specificTournamentId) {
      tournamentsQuery = tournamentsQuery.eq('id', specificTournamentId);
    }

    const { data: tournaments, error: fetchError } = await tournamentsQuery;

    if (fetchError) {
      console.error('Error fetching tournaments:', fetchError);
      throw fetchError;
    }

    if (!tournaments || tournaments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active tournaments', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const tournament of tournaments as TournamentInfo[]) {
      console.log(`Processing tournament: ${tournament.name} (players_per_table: ${tournament.players_per_table || 9})`);
      const playersPerTable = tournament.players_per_table || 9;

      try {
        // 1. First consolidate empty tables
        const { data: consolidateResult, error: consError } = await supabase
          .rpc('consolidate_tournament_tables', { p_tournament_id: tournament.id });

        if (consError) {
          console.error(`Consolidation error for ${tournament.name}:`, consError);
        } else if (consolidateResult?.tables_closed > 0) {
          console.log(`Consolidated ${consolidateResult.tables_closed} tables`);
        }

        // 2. Professional balance using database function
        const { data: balanceResult, error: balError } = await supabase
          .rpc('professional_balance_tables', { p_tournament_id: tournament.id });

        if (balError) {
          console.error(`Balance error for ${tournament.name}:`, balError);
        } else if (balanceResult) {
          console.log(`Balance result:`, JSON.stringify(balanceResult));
        }

        // 3. Get current state for analysis
        const { data: tables } = await supabase
          .from('poker_tables')
          .select('id, name, max_players, current_dealer_seat, current_hand_id')
          .eq('tournament_id', tournament.id)
          .in('status', ['playing', 'waiting']);

        const { count: playersCount } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id)
          .eq('status', 'playing');

        // 4. Check for final table transition
        const activeTables = tables?.length || 0;
        const totalPlayers = playersCount || 0;

        // Calculate if we need this many tables
        const idealTables = Math.ceil(totalPlayers / playersPerTable);
        
        // Final table: all remaining players fit on one table
        if (activeTables === 1 && totalPlayers <= playersPerTable && tournament.status === 'running') {
          await supabase
            .from('online_poker_tournaments')
            .update({ status: 'final_table' })
            .eq('id', tournament.id)
            .eq('status', 'running');
          
          console.log(`Tournament ${tournament.name} is now at FINAL TABLE (${totalPlayers} players)`);
        }

        // Log balance state
        if (tables && tables.length > 0) {
          const tablePlayerCounts = await Promise.all(
            tables.map(async (t: TableInfo) => {
              const { count } = await supabase
                .from('poker_table_players')
                .select('*', { count: 'exact', head: true })
                .eq('table_id', t.id)
                .eq('status', 'active');
              return { tableId: t.id, name: t.name, players: count || 0 };
            })
          );
          
          const counts = tablePlayerCounts.map(t => t.players);
          const maxCount = Math.max(...counts);
          const minCount = Math.min(...counts);
          const isBalanced = maxCount - minCount <= 1;
          
          console.log(`Table balance for ${tournament.name}:`, {
            tables: tablePlayerCounts,
            isBalanced,
            maxDiff: maxCount - minCount
          });
        }

        results.push({
          tournamentId: tournament.id,
          name: tournament.name,
          playersPerTable,
          consolidated: consolidateResult,
          balanced: balanceResult,
          playersCount: totalPlayers,
          tablesCount: activeTables
        });

      } catch (err) {
        console.error(`Error processing tournament ${tournament.name}:`, err);
        results.push({
          tournamentId: tournament.id,
          name: tournament.name,
          error: (err as Error).message
        });
      }
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
    console.error('Tournament balancer error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
