import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketConfig {
  position: number;
  entryCount: number;
}

// Default ticket configuration: top 3 get entries
const DEFAULT_TICKET_CONFIG: TicketConfig[] = [
  { position: 1, entryCount: 3 },
  { position: 2, entryCount: 2 },
  { position: 3, entryCount: 1 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tournament_id, custom_config } = await req.json();

    if (!tournament_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'tournament_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[issue-tickets] Processing tournament: ${tournament_id}`);

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('online_poker_tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single();

    if (tournamentError || !tournament) {
      console.error('[issue-tickets] Tournament not found:', tournamentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Tournament not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if tournament has ticket rewards configured
    const ticketsForTop = tournament.tickets_for_top || 3;
    const ticketValue = tournament.ticket_value || 0;

    // Get finished participants with positions
    const { data: finishedPlayers, error: playersError } = await supabase
      .from('online_poker_tournament_participants')
      .select('player_id, finish_position')
      .eq('tournament_id', tournament_id)
      .not('finish_position', 'is', null)
      .lte('finish_position', ticketsForTop)
      .order('finish_position', { ascending: true });

    if (playersError) {
      console.error('[issue-tickets] Error fetching players:', playersError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch players' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!finishedPlayers || finishedPlayers.length === 0) {
      console.log('[issue-tickets] No eligible players found');
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible players', tickets_issued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use custom config or default
    const ticketConfig: TicketConfig[] = custom_config || DEFAULT_TICKET_CONFIG;

    // Check for existing tickets for this tournament
    const { data: existingTickets } = await supabase
      .from('tournament_tickets')
      .select('player_id')
      .eq('won_from_tournament_id', tournament_id);

    const existingPlayerIds = new Set((existingTickets || []).map(t => t.player_id));

    // Issue tickets
    const ticketsToInsert = [];
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3); // Tickets valid for 3 months

    for (const player of finishedPlayers) {
      // Skip if already has ticket from this tournament
      if (existingPlayerIds.has(player.player_id)) {
        console.log(`[issue-tickets] Player ${player.player_id} already has ticket, skipping`);
        continue;
      }

      // Find config for this position
      const config = ticketConfig.find(c => c.position === player.finish_position);
      const entryCount = config?.entryCount || 1;

      ticketsToInsert.push({
        player_id: player.player_id,
        won_from_tournament_id: tournament_id,
        finish_position: player.finish_position,
        ticket_value: ticketValue,
        entry_count: entryCount,
        entry_type: 'offline_entry',
        status: 'active',
        issued_at: new Date().toISOString(),
        expires_at: expiryDate.toISOString(),
      });

      console.log(`[issue-tickets] Prepared ticket for player ${player.player_id}, position ${player.finish_position}, entries: ${entryCount}`);
    }

    if (ticketsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'All eligible players already have tickets', tickets_issued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert tickets
    const { data: insertedTickets, error: insertError } = await supabase
      .from('tournament_tickets')
      .insert(ticketsToInsert)
      .select();

    if (insertError) {
      console.error('[issue-tickets] Error inserting tickets:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to insert tickets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[issue-tickets] Successfully issued ${insertedTickets?.length || 0} tickets`);

    return new Response(
      JSON.stringify({
        success: true,
        tickets_issued: insertedTickets?.length || 0,
        tickets: insertedTickets,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[issue-tickets] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
