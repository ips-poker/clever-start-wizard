import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const { web_app_url } = await req.json();
    
    if (!web_app_url) {
      throw new Error('web_app_url is required');
    }

    console.log('Configuring Telegram bot with Web App URL:', web_app_url);

    // 1. Set Menu Button to open Web App
    const menuButtonResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setChatMenuButton`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: 'Открыть приложение',
            web_app: {
              url: web_app_url
            }
          }
        })
      }
    );

    const menuButtonResult = await menuButtonResponse.json();
    console.log('Menu button configuration result:', menuButtonResult);

    if (!menuButtonResult.ok) {
      throw new Error(`Failed to set menu button: ${menuButtonResult.description}`);
    }

    // 2. Set bot commands
    const commandsResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setMyCommands`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            {
              command: 'start',
              description: 'Запустить приложение'
            },
            {
              command: 'app',
              description: 'Открыть мини-приложение'
            }
          ]
        })
      }
    );

    const commandsResult = await commandsResponse.json();
    console.log('Commands configuration result:', commandsResult);

    // 3. Get bot info to verify configuration
    const botInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    );
    const botInfo = await botInfoResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Telegram bot configured successfully',
        bot_username: botInfo.result?.username,
        web_app_url: web_app_url,
        menu_button_set: menuButtonResult.ok,
        commands_set: commandsResult.ok,
        instructions: [
          '1. Откройте бота в Telegram',
          '2. Нажмите на кнопку меню (три полоски внизу)',
          '3. Выберите "Открыть приложение"',
          '4. Нажмите три точки в правом верхнем углу',
          '5. Выберите "Добавить на главный экран"',
          '6. Теперь иконка будет открывать приложение напрямую в полноэкранном режиме'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error configuring Telegram bot:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
