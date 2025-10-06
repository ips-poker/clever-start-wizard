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

    // Load rating system configuration from database
    let ratingConfig = null
    try {
      const { data: configData } = await supabaseClient
        .from('cms_settings')
        .select('setting_value')
        .eq('setting_key', 'rating_system_config')
        .eq('category', 'rating_system')
        .single()
      
      if (configData?.setting_value) {
        ratingConfig = JSON.parse(configData.setting_value)
        console.log('Loaded rating system config from database')
      } else {
        console.log('No rating system config found, using defaults')
      }
    } catch (error) {
      console.warn('Error loading rating config:', error)
    }

    // Get tournament data to check rebuy/addon costs
    const { data: tournament, error: tournamentError } = await supabaseClient
      .from('tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single()

    if (tournamentError) throw tournamentError

    // Get all registrations to calculate correct prize pool
    const { data: registrations, error: regError } = await supabaseClient
      .from('tournament_registrations')
      .select('player_id, rebuys, addons, reentries, additional_sets')
      .eq('tournament_id', tournament_id)

    if (regError) throw regError

    // Get tournament payout structure from database
    const { data: payoutStructure, error: payoutError } = await supabaseClient
      .from('tournament_payouts')
      .select('place, percentage, amount, rps_points')
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
      console.log(`Tournament ${tournament_id} already has results, deleting old ones for recalculation`)
      
      // Удаляем старые результаты для пересчета
      const { error: deleteError } = await supabaseClient
        .from('game_results')
        .delete()
        .eq('tournament_id', tournament_id)
        
      if (deleteError) {
        console.error('Error deleting old results:', deleteError)
        return new Response(
          JSON.stringify({ 
            error: 'Ошибка удаления старых результатов',
            success: false 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }
    }

    // Calculate new RPS ratings changes
    const rpsChanges = calculateRPSChanges(players, results, tournament, registrations || [], payoutStructure || [], ratingConfig)

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
        status: 'finished',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

function calculateRPSChanges(
  players: Player[], 
  results: TournamentResult[], 
  tournament: any, 
  registrations: any[],
  payoutStructureFromDB?: any[], 
  ratingConfig?: any
) {
  const changes = []

  // Проверяем, какую систему использовать
  const usePoolBasedSystem = ratingConfig?.pool_based_system || false
  
  if (usePoolBasedSystem) {
    console.log('🎯 POOL-BASED RPS SYSTEM: каждый 1000₽ входа = 100 очков в общий пул')
    return calculatePoolBasedRPS(players, results, tournament, registrations, payoutStructureFromDB, ratingConfig)
  } else {
    console.log('🎯 CLASSIC RPS SYSTEM: базовые очки + бонусы + призовые')
    return calculatePoolBasedRPS(players, results, tournament, registrations, payoutStructureFromDB, ratingConfig)
  }
}

function calculatePoolBasedRPS(
  players: Player[], 
  results: TournamentResult[], 
  tournament: any,
  registrations: any[],
  payoutStructureFromDB?: any[], 
  ratingConfig?: any
) {
  const changes = []

  // Сортируем по позиции (1-е место это позиция 1, последнее место - максимальная позиция)
  results.sort((a, b) => a.position - b.position)
  
  console.log('Processing results for positions:', results.map(r => `Player ${r.player_id}: position ${r.position}`))

  // Рассчитываем общий пул RPS баллов по ПРАВИЛЬНОЙ формуле: 1000₽ = 100 RPS
  // ВАЖНО: берем данные из registrations БД, а не из параметра results
  let totalPointsPool = 0
  
  registrations.forEach(reg => {
    // Используем новые поля с fallback на старые для обратной совместимости
    const reentries = reg.reentries || 0
    const rebuys = reg.rebuys || 0
    const additionalSets = reg.additional_sets || 0
    const addons = reg.addons || 0
    
    const participationFee = tournament.participation_fee || tournament.buy_in || 0
    const reentryFee = tournament.reentry_fee || tournament.rebuy_cost || 0
    const additionalFee = tournament.additional_fee || tournament.addon_cost || 0
    
    const playerContribution = participationFee + 
      ((reentries + rebuys) * reentryFee) + 
      ((additionalSets + addons) * additionalFee)
    
    // ПРАВИЛЬНАЯ ФОРМУЛА: делим на 10, чтобы 1000₽ = 100 RPS
    totalPointsPool += Math.floor(playerContribution / 10)
  })

  console.log(`💰 Total RPS pool: ${totalPointsPool} RPS баллов (от ${registrations.length} игроков)`)

  // Используем структуру выплат из БД для распределения пула RPS баллов
  let payoutStructure: Array<{percentage: number, rps_points?: number}> = []
  
  if (payoutStructureFromDB && payoutStructureFromDB.length > 0) {
    // Используем структуру из БД с сохраненными RPS баллами
    payoutStructure = payoutStructureFromDB.map(p => ({
      percentage: parseFloat(p.percentage.toString()),
      rps_points: p.rps_points || null
    }))
    console.log('📊 Using payout structure from database:', payoutStructure)
  } else {
    // Используем дефолтную структуру процентов
    const defaultPercentages = getPayoutStructure(results.length)
    payoutStructure = defaultPercentages.map(pct => ({
      percentage: pct,
      rps_points: null
    }))
    console.log('📊 Using default payout structure:', payoutStructure.map(p => p.percentage))
  }
  
  // Распределяем RPS баллы согласно призовой структуре
  for (let i = 0; i < results.length; i++) {
    const playerResult = results[i]
    const player = players.find(p => p.id === playerResult.player_id)
    if (!player) continue

    const position = playerResult.position
    let rpsChange = 0

    // Проверяем, находится ли игрок в призовых местах
    if (position <= payoutStructure.length) {
      const payout = payoutStructure[position - 1]
      
      // Если в БД есть сохраненные RPS баллы - используем их
      if (payout.rps_points && payout.rps_points > 0) {
        rpsChange = payout.rps_points
        console.log(`🏆 Призовое место ${position}: ${rpsChange} RPS (из БД)`)
      } else {
        // Иначе рассчитываем по проценту от пула
        rpsChange = Math.floor((totalPointsPool * payout.percentage) / 100)
        console.log(`🏆 Призовое место ${position}: ${payout.percentage}% от ${totalPointsPool} = ${rpsChange} RPS`)
      }
    } else {
      // Игрок не в призовых - получает 0 RPS
      rpsChange = 0
      console.log(`❌ Позиция ${position} не в призовых (призовых мест: ${payoutStructure.length}) = 0 RPS`)
    }

    // Применяем минимальный рейтинг
    const minRating = ratingConfig?.min_rating || 100
    const newRating = Math.max(minRating, player.elo_rating + rpsChange)
    const finalChange = newRating - player.elo_rating

    console.log(`👤 ${player.name}: позиция ${position} → изменение рейтинга: ${finalChange} (${player.elo_rating} → ${newRating})`)

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