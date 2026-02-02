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

    // Премиум эмодзи для мест с красивыми Unicode символами
    const getPlaceEmoji = (position: number): string => {
      switch (position) {
        case 1: return '🏆'
        case 2: return '🥈'
        case 3: return '🥉'
        case 4: return '🎯'
        case 5: return '⭐'
        case 6: return '✨'
        case 7: return '💫'
        case 8: return '🔸'
        case 9: return '🔹'
        case 10: return '◆'
        default: return `${position}.`
      }
    }

    // Премиум Unicode символы для декора
    const symbols = {
      crown: '👑',
      diamond: '💎',
      star: '⭐',
      sparkle: '✨',
      fire: '🔥',
      trophy: '🏆',
      medal: '🎖',
      gem: '💠',
      spade: '♠',
      heart: '♥',
      diamond_suit: '♦',
      club: '♣',
      arrow_up: '▲',
      arrow_down: '▼',
      dot: '•',
      circle: '○',
      bullet: '◉',
      star_filled: '★',
      star_empty: '☆',
      lightning: '⚡',
      infinity: '∞',
      check: '✓',
      x_mark: '✗',
      fleur: '⚜',
    }

    // Завораживающие вступления с премиум символами
    const introVariants = [
      `╔═══════════════════════╗\n║ ${symbols.crown} 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 𝐀𝐑𝐄 𝐁𝐎𝐑𝐍 ${symbols.crown} ║\n║ ━━━━━━━━━━━━━━━━━━━━━ ║\n║ Карты легли, судьба решена... ║\n║ Ещё один вечер величия! ║\n╚═══════════════════════╝`,
      
      `╭───────────────────────╮\n│ ${symbols.fire} 𝐓𝐇𝐄 𝐁𝐀𝐓𝐓𝐋𝐄 𝐈𝐒 𝐎𝐕𝐄𝐑 ${symbols.fire} │\n├───────────────────────┤\n│ Под светом покерных софитов │\n│ разыгралась настоящая драма! │\n╰───────────────────────╯`,
      
      `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n┃ ${symbols.lightning} 𝐕𝐈𝐂𝐓𝐎𝐑𝐘 𝐀𝐖𝐀𝐈𝐓𝐒 ${symbols.lightning} ┃\n┣━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ Напряжение достигло предела, ┃\n┃ блефы раскрыты, чемпион избран! ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━┛`,
      
      `╔╦══════════════════════╦╗\n║║ ${symbols.fleur} 𝐅𝐎𝐑𝐓𝐔𝐍𝐀 𝐅𝐀𝐕𝐄𝐓 ${symbols.fleur} ║║\n╠╬══════════════════════╬╣\n║║ Фортуна благоволила смелым — ║║\n║║ история написана кровью! ║║\n╚╩══════════════════════╩╝`,
      
      `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n░ ${symbols.star_filled} 𝐆𝐋𝐎𝐑𝐘 𝐀𝐖𝐀𝐈𝐓𝐒 ${symbols.star_filled} ░\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n░ Адреналин, стратегия, ░\n░ хладнокровие — всё сошлось! ░\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`,
    ]
    
    const getRandomIntro = () => introVariants[Math.floor(Math.random() * introVariants.length)]

    // Формат турнира с премиум иконками
    const getFormatDescription = (format: string | null): string => {
      switch (format) {
        case 'knockout': return `${symbols.fire} Нокаут`
        case 'bounty': return `🎯 Баунти`
        case 'deepstack': return `📚 Дипстек`
        case 'turbo': return `${symbols.lightning} Турбо`
        case 'hyper': return `🚀 Гипер-турбо`
        case 'rebuy': return `🔄 С ребаями`
        case 'freezeout': return `❄️ Фризаут`
        case 'reentry': return `🔁 С доп. входами`
        default: return `🃏 Классика`
      }
    }

    // Формируем сообщение с премиум оформлением
    let message = `${getRandomIntro()}\n\n`
    
    // Красивый заголовок турнира
    message += `\n`
    message += `⠀⠀⠀⠀${symbols.spade}${symbols.heart}${symbols.diamond_suit}${symbols.club}\n`
    message += `\n`
    message += `⠀⠀⠀${symbols.trophy} <b>${tournament.name}</b> ${symbols.trophy}\n`
    message += `\n`
    message += `⠀⠀⠀⠀${symbols.club}${symbols.diamond_suit}${symbols.heart}${symbols.spade}\n`
    message += `\n`
    
    // Информационный блок
    message += `┌─────────────────────┐\n`
    message += `│ 📅 ${formatDate(startDate)}\n`
    message += `│ ⏰ ${formatTime(startDate)} — ${endDate ? formatTime(endDate) : '...'} МСК\n`
    message += `│ ${getFormatDescription(tournament.tournament_format)}\n`
    message += `│ 👥 Участников: <b>${results?.length || 0}</b>\n`
    message += `└─────────────────────┘\n\n`
    
    // Заголовок результатов
    message += `╔════════════════════════╗\n`
    message += `║ ${symbols.star_filled} <b>𝐑𝐄𝐒𝐔𝐋𝐓𝐒</b> ${symbols.star_filled} ║\n`
    message += `╚════════════════════════╝\n\n`

    // Топ-10 с премиум оформлением
    const top10 = results?.slice(0, 10) || []
    for (const result of top10) {
      const playerName = (result.players as any)?.name || 'Неизвестный'
      const placeEmoji = getPlaceEmoji(result.position)
      const rpsChange = result.elo_change > 0 ? `+${result.elo_change}` : `${result.elo_change}`
      const rpsIcon = result.elo_change > 0 ? `${symbols.arrow_up}` : result.elo_change < 0 ? `${symbols.arrow_down}` : `${symbols.dot}`
      
      if (result.position === 1) {
        // Чемпион с особым оформлением
        message += `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n`
        message += `┃ ${symbols.crown} <b>ЧЕМПИОН</b> ${symbols.crown}\n`
        message += `┃\n`
        message += `┃ ${placeEmoji} <b>${playerName}</b>\n`
        message += `┃ ⠀⠀RPS: ${rpsIcon} ${rpsChange} ➜ <b>${result.elo_after}</b>\n`
        message += `┗━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`
      } else if (result.position <= 3) {
        // Призёры
        message += `┃ ${placeEmoji} <b>${playerName}</b>\n`
        message += `┃ ⠀⠀RPS: ${rpsIcon} ${rpsChange} ➜ ${result.elo_after}\n\n`
      } else {
        // Остальные из топ-10
        message += `│ ${placeEmoji} ${playerName}\n`
        message += `│ ⠀⠀${rpsIcon} ${rpsChange} ➜ ${result.elo_after}\n\n`
      }
    }

    // Остальные игроки в расширяемом блоке
    const restResults = results?.slice(10) || []
    if (restResults.length > 0) {
      message += `<blockquote expandable>\n`
      message += `📋 <b>Остальные участники:</b>\n\n`
      
      for (const result of restResults) {
        const playerName = (result.players as any)?.name || 'Неизвестный'
        const rpsChange = result.elo_change > 0 ? `+${result.elo_change}` : `${result.elo_change}`
        const rpsIcon = result.elo_change > 0 ? `${symbols.arrow_up}` : result.elo_change < 0 ? `${symbols.arrow_down}` : `${symbols.dot}`
        
        message += `${result.position}. ${playerName} ${rpsIcon} ${rpsChange}\n`
      }
      message += `</blockquote>\n\n`
    }

    // Красивый футер
    message += `═══════════════════════════\n\n`
    message += `⠀⠀${symbols.diamond} <i>Благодарим за игру!</i> ${symbols.diamond}\n\n`
    message += `⠀⠀${symbols.spade}${symbols.heart} <b>𝐒𝐘𝐍𝐃𝐈𝐂𝐀𝐓𝐄</b> ${symbols.diamond_suit}${symbols.club}\n`
    message += `⠀⠀⠀<b>𝐏𝐎𝐊𝐄𝐑 𝐂𝐋𝐔𝐁</b>\n`
    message += `⠀⠀⠀⠀${symbols.fleur} ${symbols.star_filled} ${symbols.fleur}`

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
