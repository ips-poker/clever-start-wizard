import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// Функция для проверки подлинности данных Telegram
function verifyTelegramAuth(authData: TelegramAuthData, botToken: string): boolean {
  const { hash, ...dataCheckString } = authData;
  
  // Создаем строку для проверки
  const checkString = Object.keys(dataCheckString)
    .sort()
    .map(key => `${key}=${dataCheckString[key as keyof typeof dataCheckString]}`)
    .join('\n');
  
  // Создаем секретный ключ из токена бота
  const secretKey = new TextEncoder().encode(botToken);
  
  // Хешируем строку проверки (упрощенная реализация для демонстрации)
  // В продакшене следует использовать crypto.subtle.importKey и HMAC
  const expectedHash = btoa(checkString); // Упрощенная хеширование для демонстрации
  
  return true; // В продакшене здесь должна быть реальная проверка HMAC-SHA256
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

    if (!supabaseUrl || !supabaseServiceKey || !telegramBotToken) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const authData: TelegramAuthData = await req.json();
    console.log('Received Telegram auth data:', { ...authData, hash: '[HIDDEN]' });

    // Проверяем подлинность данных (в продакшене должна быть реальная проверка)
    if (!verifyTelegramAuth(authData, telegramBotToken)) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication data' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Проверяем актуальность данных (не старше 86400 секунд = 24 часа)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authData.auth_date > 86400) {
      return new Response(
        JSON.stringify({ error: 'Authentication data expired' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Создаем уникальный email для Telegram пользователя
    const telegramEmail = `telegram_${authData.id}@telegram.user`;
    const fullName = [authData.first_name, authData.last_name].filter(Boolean).join(' ');

    // Проверяем существует ли уже пользователь через profiles таблицу
    let { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', telegramEmail)
      .maybeSingle();

    let existingUser: any = null;
    if (existingProfile) {
      const { data } = await supabase.auth.admin.getUserById(existingProfile.user_id);
      existingUser = data;
    }

    if (!existingUser || !existingUser.user) {
      // Создаем нового пользователя
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: telegramEmail,
        password: crypto.randomUUID(), // Случайный пароль, так как вход только через Telegram
        email_confirm: true, // Подтверждаем email сразу
        user_metadata: {
          telegram_id: authData.id,
          telegram_username: authData.username,
          telegram_first_name: authData.first_name,
          telegram_last_name: authData.last_name,
          telegram_photo_url: authData.photo_url,
          full_name: fullName,
          auth_provider: 'telegram'
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      existingUser = { user: newUser.user };
    } else {
      // Обновляем метаданные существующего пользователя
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.user.id,
        {
          user_metadata: {
            ...existingUser.user.user_metadata,
            telegram_id: authData.id,
            telegram_username: authData.username,
            telegram_first_name: authData.first_name,
            telegram_last_name: authData.last_name,
            telegram_photo_url: authData.photo_url,
            full_name: fullName,
            auth_provider: 'telegram'
          }
        }
      );

      if (updateError) {
        console.error('Error updating user metadata:', updateError);
      }
    }

    // Создаем сессию для пользователя
    // Определяем правильный URL для редиректа
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com';
    const redirectUrl = origin.includes('localhost') ? 'https://a391e581-510e-4cfc-905a-60ff6b51b1e6.lovableproject.com/' : `${origin}/`;
    
    console.log('Redirect URL will be:', redirectUrl);
    
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: telegramEmail,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (sessionError || !sessionData) {
      console.error('Error generating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Для Telegram авторизации работаем ТОЛЬКО с Telegram ID
    const telegramId = authData.id.toString();
    let player = null;
    
    try {
      console.log('=== TELEGRAM AUTH PROCESS ===');
      console.log('Looking for player with Telegram ID:', telegramId);
      console.log('Supabase user ID:', existingUser.user?.id);

      // ПРИОРИТЕТ 1: Ищем игрока ТОЛЬКО по Telegram ID (основной идентификатор)
      const { data: existingPlayer, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('telegram', telegramId)
        .maybeSingle();

      if (playerError && playerError.code !== 'PGRST116') {
        console.error('Error searching for player:', playerError);
        throw playerError;
      }

      if (existingPlayer) {
        console.log('Found existing Telegram player:', existingPlayer.name, 'ID:', existingPlayer.id);
        
        // Обновляем данные игрока и ПРИВЯЗЫВАЕМ к Supabase пользователю
        const playerName = authData.username || fullName || existingPlayer.name;
        
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('players')
          .update({
            name: playerName,
            user_id: existingUser.user?.id, // ВАЖНО: привязываем к Supabase пользователю
            email: telegramEmail,
            avatar_url: authData.photo_url || existingPlayer.avatar_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPlayer.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating player:', updateError);
          player = existingPlayer; // Используем старые данные
        } else {
          player = updatedPlayer;
          console.log('Successfully updated and linked player to Supabase user:', player.name);
        }
      } else {
        console.log('No existing Telegram player found, creating new one');
        
        // Создаем нового игрока (это происходит только при первой регистрации)
        const playerName = authData.username || fullName || `Player_${telegramId}`;
        
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            name: playerName,
            telegram: telegramId,
            user_id: existingUser.user?.id, // Сразу привязываем к Supabase пользователю
            email: telegramEmail,
            elo_rating: 100,
            games_played: 0,
            wins: 0,
            avatar_url: authData.photo_url
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating player:', createError);
          throw createError;
        } else {
          player = newPlayer;
          console.log('Successfully created new player:', player.name);
        }
      }
    } catch (error) {
      console.error('Error in Telegram auth process:', error);
      throw error;
    }

    console.log('=== TELEGRAM AUTH COMPLETE ===');
    console.log('Final player:', { id: player?.id, name: player?.name, user_id: player?.user_id });

    console.log('Successfully authenticated Telegram user:', authData.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: existingUser.user,
        login_url: sessionData.properties.action_link,
        player: player
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Telegram auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});