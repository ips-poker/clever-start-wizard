import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  type: 'clan_invitation' | 'clan_accepted' | 'clan_removed';
  player_id: string;
  clan_name: string;
  don_name?: string;
}

Deno.serve(async (req) => {
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
    
    const payload: NotificationPayload = await req.json()
    console.log('Notification payload:', payload)

    // Получаем telegram ID игрока
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('telegram, name')
      .eq('id', payload.player_id)
      .single()

    if (playerError || !player?.telegram) {
      console.log('Player not found or no telegram ID:', playerError)
      return new Response(
        JSON.stringify({ success: false, error: 'Player has no Telegram ID' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const telegramChatId = player.telegram
    const appUrl = 'https://syndicate-poker.ru/telegram'

    let message = ''
    let emoji = ''

    switch (payload.type) {
      case 'clan_invitation':
        emoji = '📨'
        message = `${emoji} Приглашение в клан!\n\n🏰 Клан «${payload.clan_name}» приглашает вас вступить в свои ряды!\n\n👤 От: ${payload.don_name || 'Дон'}\n\n✨ Откройте приложение, чтобы принять или отклонить приглашение.`
        break
      case 'clan_accepted':
        emoji = '🎉'
        message = `${emoji} Добро пожаловать в клан!\n\n🏰 Вы успешно вступили в клан «${payload.clan_name}»!\n\n🤝 Теперь вы часть семьи.`
        break
      case 'clan_removed':
        emoji = '😔'
        message = `${emoji} Вы были исключены из клана «${payload.clan_name}».`
        break
      default:
        message = `📢 Уведомление от клана «${payload.clan_name}»`
    }

    // Отправляем сообщение в Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎮 Открыть приложение',
              web_app: { url: appUrl }
            }
          ]]
        }
      })
    })

    const telegramResult = await telegramResponse.json()
    console.log('Telegram response:', telegramResult)

    if (!telegramResponse.ok) {
      console.error('Failed to send Telegram message:', telegramResult)
      return new Response(
        JSON.stringify({ success: false, error: telegramResult.description || 'Failed to send message' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message_id: telegramResult.result?.message_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
