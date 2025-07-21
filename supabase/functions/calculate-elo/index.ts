import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface TournamentResult {
  player_id: string;
  position: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tournament_id, results } = await req.json()
    
    if (!tournament_id || !results || !Array.isArray(results)) {
      throw new Error('Missing tournament_id or results')
    }

    console.log(`Calculating ELO for tournament ${tournament_id} with ${results.length} players`)

    // Get all players involved in the tournament
    const playerIds = results.map((r: TournamentResult) => r.player_id)
    const { data: players, error: playersError } = await supabaseClient
      .from('players')
      .select('*')
      .in('id', playerIds)

    if (playersError) throw playersError

    // Calculate new ELO ratings
    const eloChanges = calculateEloChanges(players, results)

    // Update players and create game results
    for (const change of eloChanges) {
      const player = players.find(p => p.id === change.player_id)
      if (!player) continue

      const newRating = player.elo_rating + change.elo_change
      const newGamesPlayed = player.games_played + 1
      const newWins = change.position === 1 ? player.wins + 1 : player.wins

      // Update player stats
      const { error: updateError } = await supabaseClient
        .from('players')
        .update({
          elo_rating: newRating,
          games_played: newGamesPlayed,
          wins: newWins
        })
        .eq('id', player.id)

      if (updateError) {
        console.error('Error updating player:', updateError)
        continue
      }

      // Create game result record
      const { error: resultError } = await supabaseClient
        .from('game_results')
        .insert({
          tournament_id,
          player_id: player.id,
          position: change.position,
          elo_before: player.elo_rating,
          elo_after: newRating,
          elo_change: change.elo_change
        })

      if (resultError) {
        console.error('Error creating game result:', resultError)
      }
    }

    // Mark tournament as finished
    const { error: tournamentError } = await supabaseClient
      .from('tournaments')
      .update({ status: 'finished' })
      .eq('id', tournament_id)

    if (tournamentError) {
      console.error('Error updating tournament status:', tournamentError)
    }

    console.log('ELO calculation completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ELO ratings updated successfully',
        changes: eloChanges
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in calculate-elo function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

function calculateEloChanges(players: Player[], results: TournamentResult[]) {
  const K = 32 // ELO K-factor
  const changes = []

  // Sort results by position
  results.sort((a, b) => a.position - b.position)

  for (let i = 0; i < results.length; i++) {
    const playerResult = results[i]
    const player = players.find(p => p.id === playerResult.player_id)
    if (!player) continue

    let totalEloChange = 0
    let opponentCount = 0

    // Calculate ELO change against all other players
    for (let j = 0; j < results.length; j++) {
      if (i === j) continue

      const opponentResult = results[j]
      const opponent = players.find(p => p.id === opponentResult.player_id)
      if (!opponent) continue

      // Determine score based on position comparison
      let score = 0.5 // Default tie
      if (playerResult.position < opponentResult.position) {
        score = 1 // Win (better position)
      } else if (playerResult.position > opponentResult.position) {
        score = 0 // Loss (worse position)
      }

      // Calculate expected score
      const expectedScore = 1 / (1 + Math.pow(10, (opponent.elo_rating - player.elo_rating) / 400))

      // Calculate ELO change for this matchup
      const eloChange = K * (score - expectedScore)
      totalEloChange += eloChange
      opponentCount++
    }

    // Average the ELO change
    const avgEloChange = opponentCount > 0 ? Math.round(totalEloChange / opponentCount) : 0

    changes.push({
      player_id: player.id,
      position: playerResult.position,
      elo_change: avgEloChange
    })
  }

  return changes
}