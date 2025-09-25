import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
  }
}

interface TelegramMessage {
  chat_id: number
  text: string
  parse_mode?: string
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string
      web_app?: { url: string }
      callback_data?: string
    }>>
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse incoming webhook data
    const update: TelegramUpdate = await req.json()
    console.log('Received update:', JSON.stringify(update, null, 2))

    if (!update.message || !update.message.text) {
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const { message } = update
    const chatId = message.chat.id
    const text = message.text!  // We already checked it exists above
    const userId = message.from.id
    const userName = `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`

    // Get app URL for Web App
    const appUrl = `${SUPABASE_URL.replace('.supabase.co', '')}.lovable.app/telegram`

    let responseMessage: TelegramMessage

    if (text.startsWith('/start')) {
      responseMessage = {
        chat_id: chatId,
        text: `👋 Добро пожаловать в Poker Rating System!\n\n🎯 Здесь вы можете:\n• Участвовать в турнирах\n• Отслеживать свой рейтинг\n• Просматривать статистику\n\n🚀 Нажмите кнопку ниже для запуска приложения`,
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 Открыть приложение',
              web_app: { url: appUrl }
            }
          ]]
        }
      }
    }
    else if (text.startsWith('/help')) {
      responseMessage = {
        chat_id: chatId,
        text: `📖 Доступные команды:\n\n/start - Главное меню\n/help - Справка\n/stats - Ваша статистика\n/tournaments - Активные турниры\n\n🎮 Используйте кнопку "Открыть приложение" для полного функционала`,
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 Открыть приложение',
              web_app: { url: appUrl }
            }
          ]]
        }
      }
    }
    else if (text.startsWith('/stats')) {
      // Get player stats from database
      const { data: player } = await supabase
        .from('players')
        .select('name, elo_rating, games_played, wins')
        .eq('telegram', userId.toString())
        .single()

      if (player) {
        const winRate = player.games_played > 0 ? Math.round((player.wins / player.games_played) * 100) : 0
        responseMessage = {
          chat_id: chatId,
          text: `📊 Ваша статистика:\n\n👤 Игрок: ${player.name}\n🏆 Рейтинг: ${player.elo_rating} ELO\n🎯 Игр сыграно: ${player.games_played}\n✅ Побед: ${player.wins}\n📈 Процент побед: ${winRate}%`,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🎮 Открыть приложение',
                web_app: { url: appUrl }
              }
            ]]
          }
        }
      } else {
        responseMessage = {
          chat_id: chatId,
          text: `❌ Профиль не найден.\n\nСначала зарегистрируйтесь в приложении!`,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🎮 Открыть приложение',
                web_app: { url: appUrl }
              }
            ]]
          }
        }
      }
    }
    else if (text.startsWith('/tournaments')) {
      // Get active tournaments
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('name, status, buy_in, max_players')
        .in('status', ['registration', 'running'])
        .eq('is_published', true)
        .limit(5)

      if (tournaments && tournaments.length > 0) {
        let tournamentsList = '🏆 Активные турниры:\n\n'
        tournaments.forEach((tournament, index) => {
          const statusEmoji = tournament.status === 'registration' ? '📝' : '🎮'
          const statusText = tournament.status === 'registration' ? 'Регистрация' : 'Идет игра'
          tournamentsList += `${index + 1}. ${tournament.name}\n${statusEmoji} ${statusText}\n💰 Взнос: ${tournament.buy_in}₽\n👥 Макс. игроков: ${tournament.max_players}\n\n`
        })
        
        responseMessage = {
          chat_id: chatId,
          text: tournamentsList,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🎮 Открыть приложение',
                web_app: { url: appUrl }
              }
            ]]
          }
        }
      } else {
        responseMessage = {
          chat_id: chatId,
          text: `😔 Активных турниров пока нет.\n\nСледите за обновлениями в приложении!`,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🎮 Открыть приложение',
                web_app: { url: appUrl }
              }
            ]]
          }
        }
      }
    }
    else {
      // Unknown command
      responseMessage = {
        chat_id: chatId,
        text: `❓ Неизвестная команда.\n\nИспользуйте /help для списка команд или откройте приложение для полного функционала.`,
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 Открыть приложение',
              web_app: { url: appUrl }
            }
          ]]
        }
      }
    }

    // Send response to Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    
    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseMessage),
    })

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text()
      console.error('Telegram API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Message sent successfully')
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})