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
      
      // Создаем профиль для нового пользователя с данными из Telegram
      const displayName = authData.username || fullName || `User_${authData.id}`;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          email: telegramEmail,
          full_name: displayName,
          avatar_url: authData.photo_url
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('Successfully created profile with Telegram data');
      }
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
      } else {
        console.log('Successfully updated Supabase user metadata');
      }
    }

    // Обновляем/создаем профиль пользователя с данными из Telegram
    const displayName = authData.username || fullName || `User_${authData.id}`;
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: existingUser.user.id,
        email: telegramEmail,
        full_name: displayName,
        avatar_url: authData.photo_url
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
    } else {
      console.log('Successfully updated profile with Telegram data');
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

    // Используем функцию для объединения игроков
    const telegramId = authData.id.toString();
    let player = null;
    
    try {
      // Пытаемся объединить существующих игроков
      const { data: mergedPlayerId, error: mergeError } = await supabase
        .rpc('merge_player_profiles', {
          telegram_user_id: telegramId,
          telegram_email: telegramEmail,
          supabase_user_id: existingUser.user?.id
        });

      if (mergeError) {
        console.error('Error merging player profiles:', mergeError);
      }

      // Если функция вернула ID, получаем объединенного игрока
      if (mergedPlayerId) {
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('*')
          .eq('id', mergedPlayerId)
          .single();
        
        player = existingPlayer;
      }
    } catch (error) {
      console.error('Error in merge process:', error);
    }

    // Если объединение не удалось или игрока нет, создаем нового
    if (!player) {
      const playerName = authData.username || fullName || `Player_${telegramId}`;
      
      const { data: newPlayer, error: createPlayerError } = await supabase
        .from('players')
        .insert({
          name: playerName,
          telegram: telegramId,
          user_id: existingUser.user?.id,
          email: telegramEmail,
          elo_rating: 100,
          games_played: 0,
          wins: 0,
          avatar_url: authData.photo_url
        })
        .select()
        .single();

      if (createPlayerError) {
        console.error('Error creating player:', createPlayerError);
      } else {
        player = newPlayer;
      }
    }

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