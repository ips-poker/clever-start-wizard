import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Получаем все регистрации (registered + playing)
    const { data: registrations, error: registrationsError } = await supabase
      .from('tournament_registrations')
      .select(`
        id,
        status,
        chips,
        reentries,
        additional_sets,
        players(name, elo_rating)
      `)
      .eq('tournament_id', tournament_id)
      .in('status', ['registered', 'playing'])
      .order('created_at', { ascending: true })

    if (registrationsError) {
      console.error('Error fetching registrations:', registrationsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch registrations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Форматируем дату и время
    const startDate = new Date(tournament.start_time)
    
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

    // Завораживающие вступления
    const introVariants = [
      '🔥 Собираем сильнейших! Кто готов побороться за славу и призы?',
      '♠️ Столы накрыты, фишки готовы — ждём только вас!',
      '💫 Турнир на подходе! Смотрите, кто уже в игре...',
      '🎯 Состав участников формируется — успей занять своё место!',
      '⚡️ Регистрация открыта! Вот кто уже заявился на баттл...',
      '🃏 Карты скоро лягут на стол! Ознакомьтесь со списком игроков:',
      '🏆 Легенды собираются! Не пропустите главный турнир:',
      '💎 VIP-состав на старте! Присоединяйтесь к лучшим:',
    ]
    
    const getRandomIntro = () => introVariants[Math.floor(Math.random() * introVariants.length)]

    // Формат турнира с красивыми иконками
    const getFormatDescription = (format: string | null): string => {
      switch (format) {
        case 'knockout': return '💀 Нокаут'
        case 'bounty': return '🎯 Баунти'
        case 'deepstack': return '📚 Дипстек'
        case 'turbo': return '⚡️ Турбо'
        case 'hyper': return '🚀 Гипер-турбо'
        case 'rebuy': return '🔄 С ребаями'
        case 'freezeout': return '❄️ Фризаут'
        case 'reentry': return '🔁 С доп. входами'
        default: return '🃏 Классика'
      }
    }

    // Эмодзи для номера участника
    const getNumberEmoji = (num: number): string => {
      const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
      if (num <= 10) return numbers[num - 1]
      return `${num}.`
    }

    // Считаем свободные места
    const totalRegistered = registrations?.length || 0
    const remainingSpots = tournament.max_players - totalRegistered

    // Формируем сообщение
    let message = `${getRandomIntro()}\n\n`
    message += `♠️♥️♦️♣️\n`
    message += `🏆 <b>${tournament.name}</b>\n`
    message += `♣️♦️♥️♠️\n\n`
    message += `📅 ${formatDate(startDate)}\n`
    message += `⏰ ${formatTime(startDate)} МСК\n`
    message += `${getFormatDescription(tournament.tournament_format)}\n\n`
    
    message += `┏━━━━━━━━━━━━━━━━━━━━━┓\n`
    message += `┃   👥 <b>УЖЕ В ИГРЕ</b>: ${totalRegistered}   ┃\n`
    message += `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n`

    if (registrations && registrations.length > 0) {
      // Первые 10 с особым оформлением
      const topPlayers = registrations.slice(0, 10)
      for (let i = 0; i < topPlayers.length; i++) {
        const reg = topPlayers[i]
        const playerName = (reg.players as any)?.name || 'Неизвестный'
        const numEmoji = getNumberEmoji(i + 1)
        message += `${numEmoji} ${playerName}\n`
      }

      // Остальные в раскрывающемся блоке
      const restPlayers = registrations.slice(10)
      if (restPlayers.length > 0) {
        message += `\n<blockquote expandable>\n`
        message += `📋 <b>Ещё ${restPlayers.length} участников:</b>\n\n`
        
        for (let i = 0; i < restPlayers.length; i++) {
          const reg = restPlayers[i]
          const playerName = (reg.players as any)?.name || 'Неизвестный'
          message += `${i + 11}. ${playerName}\n`
        }
        message += `</blockquote>\n`
      }
    } else {
      message += `<i>Пока никто не зарегистрирован...</i>\n`
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    // Информация о свободных местах
    if (remainingSpots > 0) {
      const spotsText = remainingSpots === 1 ? 'место' : remainingSpots < 5 ? 'места' : 'мест'
      message += `🎰 <b>Осталось ${remainingSpots} ${spotsText}!</b>\n`
      message += `📱 Спешите зарегистрироваться!\n\n`
    } else {
      message += `🔒 <b>Все места заняты!</b>\n`
      message += `📝 Следите за следующими турнирами\n\n`
    }

    message += `♠️ <b>Ваш SYNDICATE Poker Club</b> ♥️`

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
        channel_id: TELEGRAM_CHANNEL_ID,
        registered_count: totalRegistered,
        remaining_spots: remainingSpots
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error posting tournament registrations:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
