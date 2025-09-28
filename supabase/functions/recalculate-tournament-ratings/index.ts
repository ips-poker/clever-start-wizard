import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tournament_id } = await req.json();
    
    console.log('Starting recalculation for tournament:', tournament_id);

    // Получаем данные турнира
    const { data: tournament, error: tournamentError } = await supabaseClient
      .from('tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single();

    if (tournamentError || !tournament) {
      console.error('Tournament not found:', tournamentError);
      return new Response(
        JSON.stringify({ error: 'Tournament not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем регистрации
    const { data: registrations, error: regError } = await supabaseClient
      .from('tournament_registrations')
      .select(`
        id,
        player_id,
        position,
        rebuys,
        addons,
        status,
        players (
          id,
          name,
          elo_rating
        )
      `)
      .eq('tournament_id', tournament_id);

    if (regError || !registrations) {
      console.error('Error fetching registrations:', regError);
      return new Response(
        JSON.stringify({ error: 'Error fetching registrations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${registrations.length} registrations`);

    // Удаляем старые результаты
    const { error: deleteError } = await supabaseClient
      .from('game_results')
      .delete()
      .eq('tournament_id', tournament_id);

    if (deleteError) {
      console.error('Error deleting old results:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Error deleting old results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Old results deleted');

    // Сбрасываем статистику игроков
    const playerIds = registrations.map(r => r.player_id);
    const { error: resetError } = await supabaseClient
      .from('players')
      .update({ 
        games_played: 0,
        wins: 0
      })
      .in('id', playerIds);

    if (resetError) {
      console.log('Error resetting player stats (non-critical):', resetError);
    }

    // Обновляем статус турнира
    const { error: statusError } = await supabaseClient
      .from('tournaments')
      .update({ status: 'registration' })
      .eq('id', tournament_id);

    if (statusError) {
      console.error('Error updating tournament status:', statusError);
    }

    console.log('Tournament status reset to registration');

    // Вызываем функцию пересчета рейтингов
    const { data: calcData, error: calcError } = await supabaseClient.functions.invoke('calculate-elo', {
      body: {
        tournament_id: tournament_id,  
        registrations: registrations
      }
    });

    if (calcError) {
      console.error('Error calculating ratings:', calcError);
      return new Response(
        JSON.stringify({ error: 'Error calculating ratings', details: calcError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Ratings recalculated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Рейтинги пересчитаны для турнира "${tournament.name}"`,
        data: calcData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recalculate-tournament-ratings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});