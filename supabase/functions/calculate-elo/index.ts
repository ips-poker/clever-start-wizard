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
  rebuys?: number;
  addons?: number;
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

    console.log(`Calculating RPS ratings for tournament ${tournament_id} with ${results.length} players`)

    // Get tournament data to check rebuy/addon costs
    const { data: tournament, error: tournamentError } = await supabaseClient
      .from('tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single()

    if (tournamentError) throw tournamentError

    // Get tournament payout structure from database
    const { data: payoutStructure, error: payoutError } = await supabaseClient
      .from('tournament_payouts')
      .select('place, percentage, amount')
      .eq('tournament_id', tournament_id)
      .order('place')

    if (payoutError) {
      console.error('Error fetching payout structure:', payoutError)
      // Fallback to default structure if no custom structure exists
    }

    // Get all players involved in the tournament
    const playerIds = results.map((r: TournamentResult) => r.player_id)
    const { data: players, error: playersError } = await supabaseClient
      .from('players')
      .select('*')
      .in('id', playerIds)

    if (playersError) throw playersError

    // Check if results already exist for this tournament
    const { data: existingResults } = await supabaseClient
      .from('game_results')
      .select('player_id')
      .eq('tournament_id', tournament_id)

    if (existingResults && existingResults.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Результаты для этого турнира уже существуют',
          success: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Calculate new RPS ratings changes
    const rpsChanges = calculateRPSChanges(players, results, tournament, payoutStructure)

    // Update players and create game results
    for (const change of rpsChanges) {
      const player = players.find(p => p.id === change.player_id)
      if (!player) continue

      const newRating = player.elo_rating + change.elo_change
      const newGamesPlayed = player.games_played + 1

      // Update player stats (wins will be updated automatically by trigger)
      const { error: updateError } = await supabaseClient
        .from('players')
        .update({
          elo_rating: newRating,
          games_played: newGamesPlayed
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

    // Mark tournament as finished with timestamp
    const { error: tournamentUpdateError } = await supabaseClient
      .from('tournaments')
      .update({ 
        status: 'completed',
        finished_at: new Date().toISOString()
      })
      .eq('id', tournament_id)

    if (tournamentUpdateError) {
      console.error('Error updating tournament status:', tournamentUpdateError)
    }

    console.log('RPS calculation completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'RPS ratings updated successfully',
        changes: rpsChanges
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

function calculateRPSChanges(players: Player[], results: TournamentResult[], tournament: any, payoutStructureFromDB?: any[]) {
  const changes = []

  // Sort results by position
  results.sort((a, b) => a.position - b.position)

  // Рассчитываем общий призовой фонд
  let totalPrizePool = 0
  results.forEach(result => {
    const rebuys = result.rebuys || 0
    const addons = result.addons || 0
    totalPrizePool += tournament.buy_in + 
      (rebuys * (tournament.rebuy_cost || 0)) + 
      (addons * (tournament.addon_cost || 0))
  })

  // Используем структуру выплат из БД или дефолтную
  let payoutStructure: number[] = []
  
  if (payoutStructureFromDB && payoutStructureFromDB.length > 0) {
    // Используем сохраненную структуру из БД
    payoutStructure = payoutStructureFromDB.map(p => p.percentage)
    console.log('Using payout structure from database:', payoutStructure)
  } else {
    // Fallback к дефолтной структуре
    payoutStructure = getPayoutStructure(results.length)
    console.log('Using default payout structure:', payoutStructure)
  }
  
  for (let i = 0; i < results.length; i++) {
    const playerResult = results[i]
    const player = players.find(p => p.id === playerResult.player_id)
    if (!player) continue

    let rpsChange = 0

    // Бонусы за ребаи и адоны
    const rebuys = playerResult.rebuys || 0
    const addons = playerResult.addons || 0
    rpsChange += rebuys + addons // +1 балл за каждый ребай/адон

    // Призовые баллы (только для призовых мест)
    const position = playerResult.position
    if (position <= payoutStructure.length) {
      const prizePercentage = payoutStructure[position - 1]
      const prizeAmount = (totalPrizePool * prizePercentage) / 100
      // 0.1% от призовой суммы (исправлено на правильный расчет)
      const prizePoints = Math.floor(prizeAmount * 0.001) 
      rpsChange += prizePoints
      
      console.log(`Призовые баллы для позиции ${position}: ${prizePercentage}% от ${totalPrizePool} = ${prizeAmount}, баллы: ${prizePoints}`)
    }

    // Рейтинг не может уйти в минус
    const newRating = Math.max(0, player.elo_rating + rpsChange)
    const finalChange = newRating - player.elo_rating

    changes.push({
      player_id: player.id,
      position: playerResult.position,
      elo_change: finalChange
    })
  }

  return changes
}

function getPayoutStructure(playerCount: number): number[] {
  if (playerCount <= 8) {
    return [60, 40]; // 2 места
  } else if (playerCount <= 11) {
    return [50, 30, 20]; // 3 места
  } else if (playerCount <= 20) {
    return [40, 27, 19, 14]; // 4 места
  } else if (playerCount <= 30) {
    return [36.0, 25.0, 17.5, 12.8, 8.7]; // 5 мест
  } else if (playerCount <= 50) {
    return [34.0, 23.0, 16.5, 11.9, 8.0, 6.6]; // 6 мест
  } else if (playerCount <= 70) {
    return [31.7, 20.7, 15.3, 10.8, 7.2, 5.8, 4.6, 3.9]; // 8 мест
  } else if (playerCount <= 100) {
    return [30.5, 19.5, 13.7, 10.0, 6.7, 5.4, 4.2, 3.7, 3.3, 3.0]; // 10 мест
  } else if (playerCount <= 130) {
    return [29.0, 18.7, 13.5, 9.5, 6.5, 5.2, 4.0, 3.4, 2.9, 2.6, 2.4, 2.3]; // 12 мест
  } else {
    return [28.0, 18.0, 13.0, 9.3, 6.3, 5.0, 3.9, 3.3, 2.8, 2.55, 2.25, 2.0, 1.8]; // 13+ мест
  }
}