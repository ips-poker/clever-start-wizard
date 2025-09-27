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
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    message?: {
      chat: {
        id: number
      }
    }
    data?: string
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
    
    // Parse incoming webhook data - handle empty body
    let update: TelegramUpdate
    try {
      const text = await req.text()
      if (!text || text.trim() === '') {
        console.log('Empty request body, returning OK')
        return new Response('OK', { status: 200, headers: corsHeaders })
      }
      update = JSON.parse(text)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }
    
    console.log('Received update:', JSON.stringify(update, null, 2))

    // Обработка нажатий кнопок (callback_query)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const chatId = callbackQuery.message?.chat.id;
      const userId = callbackQuery.from.id;

      console.log('Processing callback query:', callbackData);

      // Обрабатываем авторизацию через веб
      if (callbackData && callbackData.startsWith('web_auth_')) {
        try {
          // Получаем полные данные пользователя через Telegram API
          const getUserResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: userId })
          });
          
          let fullUserData = null;
          if (getUserResponse.ok) {
            const chatData = await getUserResponse.json();
            fullUserData = chatData.result;
          }

          // Формируем данные пользователя для авторизации с полной информацией
          const telegramAuthData = {
            id: userId,
            first_name: callbackQuery.from.first_name,
            last_name: callbackQuery.from.last_name || '',  // Обеспечиваем пустую строку вместо undefined
            username: callbackQuery.from.username,
            photo_url: fullUserData?.photo?.big_file_id ? 
              `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fullUserData.photo.big_file_id}` : 
              undefined,
            auth_date: Math.floor(Date.now() / 1000),
            hash: 'telegram_bot_auth' // Упрощенная хеш для бота
          };

          console.log('Calling telegram-auth function with data:', telegramAuthData);

          // Вызываем telegram-auth function
          const { data: authResult, error: authError } = await supabase.functions.invoke('telegram-auth', {
            body: telegramAuthData,
            headers: {
              'origin': 'https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com',
              'referer': 'https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com'
            }
          });

          if (authError) {
            console.error('Auth function error:', authError);
            
            // Отправляем сообщение об ошибке
            const errorMessage: TelegramMessage = {
              chat_id: chatId!,
              text: `❌ Ошибка авторизации: ${authError.message}\n\nПопробуйте позже или обратитесь в поддержку.`
            };
            
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(errorMessage)
            });
          } else if (authResult && authResult.success) {
            console.log('Auth successful, login URL:', authResult.login_url);
            
            // Отправляем ссылку для авторизации
            const successMessage: TelegramMessage = {
              chat_id: chatId!,
              text: `✅ Авторизация прошла успешно!\n\n🔗 Нажмите кнопку ниже для входа на сайт:`,
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: '🌐 Перейти на сайт',
                    web_app: { url: authResult.login_url }
                  }
                ]]
              }
            };
            
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(successMessage)
            });
          }

          // Отвечаем на callback query
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
              text: authResult?.success ? '✅ Авторизация выполнена' : '❌ Ошибка авторизации'
            })
          });

        } catch (error) {
          console.error('Error processing web auth:', error);
          
          // Отвечаем на callback query с ошибкой
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
              text: '❌ Произошла ошибка'
            })
          });
        }
      }

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    if (!update.message || !update.message.text) {
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const { message } = update
    const chatId = message.chat.id
    const text = message.text!  // We already checked it exists above
    const userId = message.from.id
    const userName = `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`

    // Get app URL for Web App
    const appUrl = `https://epc-poker.ru/telegram`

    let responseMessage: TelegramMessage

    if (text.startsWith('/start')) {
      // Проверяем, есть ли параметры для веб-авторизации
      const startParams = text.split(' ')[1];
      
      if (startParams && startParams.startsWith('webauth_')) {
        // Обрабатываем веб-авторизацию
        responseMessage = {
          chat_id: chatId,
          text: `🔐 Авторизация для веб-сайта\n\n✅ Для завершения авторизации на сайте, нажмите кнопку ниже.\n\n📱 Это безопасно - мы используем официальный API Telegram для авторизации.`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🌐 Авторизоваться на сайте',
                  callback_data: `web_auth_${userId}`
                }
              ],
              [
                {
                  text: '🎮 Открыть Telegram приложение',
                  web_app: { url: appUrl }
                }
              ]
            ]
          }
        };
      } else {
        // Стандартное приветствие
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})