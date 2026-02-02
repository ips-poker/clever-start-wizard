import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TournamentResult {
  position: number;
  player_name: string;
  elo_change: number;
  elo_after: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHANNEL_ID = Deno.env.get('TELEGRAM_CHANNEL_ID')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
      console.error('Missing Telegram configuration')
      return new Response(
        JSON.stringify({ error: 'Telegram configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration')
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { tournament_id } = await req.json()
    
    if (!tournament_id) {
      return new Response(
        JSON.stringify({ error: 'tournament_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching tournament:', tournament_id)

    // Получаем данные турнира
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single()

    if (tournamentError || !tournament) {
      console.error('Tournament not found:', tournamentError)
      return new Response(
        JSON.stringify({ error: 'Tournament not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем результаты с RPS очками
    const { data: results, error: resultsError } = await supabase
      .from('game_results')
      .select(`
        position,
        elo_change,
        elo_after,
        players(name)
      `)
      .eq('tournament_id', tournament_id)
      .order('position', { ascending: true })

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Форматируем дату и время
    const startDate = new Date(tournament.start_time)
    const endDate = tournament.finished_at ? new Date(tournament.finished_at) : null
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow'
      })
    }

    // Премиум эмодзи для мест
    const getPlaceEmoji = (position: number): string => {
      switch (position) {
        case 1: return '🥇'
        case 2: return '🥈'
        case 3: return '🥉'
        case 4: return '4️⃣'
        case 5: return '5️⃣'
        case 6: return '6️⃣'
        case 7: return '7️⃣'
        case 8: return '8️⃣'
        case 9: return '9️⃣'
        case 10: return '🔟'
        default: return `${position}.`
      }
    }

    // Вариативные вступления
    const introVariants = [
      '🔥 Состоялся незабываемый турнир!',
      '🎯 Завершился грандиозный турнир!',
      '⚡️ Эпичный покерный вечер позади!',
      '🌟 Очередной турнир вошёл в историю!',
      '💫 Невероятные эмоции и напряжённая борьба!',
      '🎲 Карты розданы, победители определены!',
    ]
    
    const getRandomIntro = () => introVariants[Math.floor(Math.random() * introVariants.length)]

    // Формат турнира
    const getFormatDescription = (format: string | null): string => {
      switch (format) {
        case 'knockout': return '💀 Нокаут'
        case 'bounty': return '🎯 Баунти'
        case 'deepstack': return '📚 Дипстек'
        case 'turbo': return '⚡️ Турбо'
        case 'hyper': return '🚀 Гипер-турбо'
        case 'rebuy': return '🔄 С ребаями'
        case 'freezeout': return '❄️ Фризаут'
        default: return '🃏 Классика'
      }
    }

    // Формируем сообщение
    let message = `${getRandomIntro()}\n\n`
    message += `🏆 <b>${tournament.name}</b>\n\n`
    message += `📅 ${formatDate(startDate)}\n`
    message += `⏰ ${formatTime(startDate)} — ${endDate ? formatTime(endDate) : '...'} МСК\n`
    message += `${getFormatDescription(tournament.tournament_format)}\n`
    message += `👥 Участников: ${results?.length || 0}\n\n`
    
    message += `╔═══════════════════════╗\n`
    message += `║   📊 <b>РЕЗУЛЬТАТЫ</b>   ║\n`
    message += `╚═══════════════════════╝\n\n`

    // Добавляем результаты (топ-10 или все, если меньше)
    const displayResults = results?.slice(0, 10) || []
    
    for (const result of displayResults) {
      const playerName = (result.players as any)?.name || 'Неизвестный'
      const placeEmoji = getPlaceEmoji(result.position)
      const rpsChange = result.elo_change > 0 ? `+${result.elo_change}` : `${result.elo_change}`
      const rpsIcon = result.elo_change > 0 ? '📈' : result.elo_change < 0 ? '📉' : '➡️'
      
      message += `${placeEmoji} <b>${playerName}</b>\n`
      message += `     ${rpsIcon} RPS: ${rpsChange} → ${result.elo_after}\n\n`
    }

    if (results && results.length > 10) {
      message += `<i>... и ещё ${results.length - 10} участников</i>\n\n`
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `🙏 <i>Всем спасибо за участие!</i>\n`
    message += `♠️♥️ <b>Ваш SYNDICATE Poker Club</b> ♦️♣️`

    console.log('Sending message to Telegram channel:', TELEGRAM_CHANNEL_ID)

    // Отправляем сообщение в Telegram канал
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: 'HTML',
      })
    })

    const telegramResult = await telegramResponse.json()
    console.log('Telegram response:', telegramResult)

    if (!telegramResponse.ok) {
      console.error('Failed to send Telegram message:', telegramResult)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: telegramResult.description || 'Failed to send message to Telegram' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: telegramResult.result?.message_id,
        channel_id: TELEGRAM_CHANNEL_ID
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error posting tournament results:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
