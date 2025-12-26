/**
 * Tournament Table Balancer - Edge Function
 * 
 * Балансирует столы турнира и консолидирует при необходимости.
 * Вызывается после выбывания игрока или по cron.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all running tournaments
    const { data: tournaments, error: fetchError } = await supabase
      .from('online_poker_tournaments')
      .select('id, name')
      .in('status', ['running', 'final_table']);

    if (fetchError) throw fetchError;

    if (!tournaments || tournaments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active tournaments', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const tournament of tournaments) {
      console.log(`Processing tournament: ${tournament.name}`);

      // 1. Try consolidation first (closes empty tables)
      const { data: consolidateResult, error: consError } = await supabase
        .rpc('consolidate_tournament_tables', { p_tournament_id: tournament.id });

      if (consError) {
        console.error(`Consolidation error for ${tournament.name}:`, consError);
      } else if (consolidateResult?.tables_closed > 0) {
        console.log(`Consolidated ${consolidateResult.tables_closed} tables`);
      }

      // 2. Then balance remaining tables
      const { data: balanceResult, error: balError } = await supabase
        .rpc('balance_tournament_tables', { p_tournament_id: tournament.id });

      if (balError) {
        console.error(`Balance error for ${tournament.name}:`, balError);
      }

      results.push({
        tournamentId: tournament.id,
        name: tournament.name,
        consolidated: consolidateResult,
        balanced: balanceResult
      });

      // 3. Check if we should switch to final table
      const { count: playersCount } = await supabase
        .from('online_poker_tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .eq('status', 'playing');

      const { count: tablesCount } = await supabase
        .from('poker_tables')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .in('status', ['playing', 'waiting']);

      // If all players fit on one table - it's the final table
      if (tablesCount === 1 && (playersCount || 0) <= 9) {
        await supabase
          .from('online_poker_tournaments')
          .update({ status: 'final_table' })
          .eq('id', tournament.id)
          .eq('status', 'running');
        
        console.log(`Tournament ${tournament.name} is now at FINAL TABLE`);
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
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
