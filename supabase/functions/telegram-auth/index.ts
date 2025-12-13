import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'
import { encode as hexEncode } from 'https://deno.land/std@0.177.0/encoding/hex.ts'

interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash?: string;
  // initDataRaw от Telegram WebApp SDK
  init_data_raw?: string;
}

// Генерация HMAC-SHA256
async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

// SHA256 для создания секретного ключа
async function sha256(data: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return new Uint8Array(hash);
}

// Верификация initDataRaw от Telegram WebApp
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function verifyInitDataRaw(initDataRaw: string, botToken: string): Promise<{ valid: boolean; user?: any }> {
  try {
    // Парсим initDataRaw как URL query string
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    
    if (!hash) {
      console.log('No hash in initDataRaw');
      return { valid: false };
    }

    // Удаляем hash из параметров для проверки
    params.delete('hash');
    
    // Сортируем параметры в алфавитном порядке и создаем строку проверки
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ: HMAC_SHA256(bot_token, "WebAppData")
    const secretKey = await hmacSha256(
      new TextEncoder().encode('WebAppData'),
      botToken
    );
    
    // Вычисляем HMAC-SHA256 от data_check_string
    const calculatedHashBytes = await hmacSha256(secretKey, dataCheckString);
    const calculatedHash = new TextDecoder().decode(hexEncode(calculatedHashBytes));

    const isValid = calculatedHash === hash;
    
    if (!isValid) {
      console.log('WebApp HMAC verification failed');
      console.log('Expected hash:', hash);
      console.log('Calculated hash:', calculatedHash);
      return { valid: false };
    }

    console.log('WebApp HMAC verification successful');

    // Парсим user из параметров
    const userParam = params.get('user');
    let user = null;
    if (userParam) {
      try {
        user = JSON.parse(userParam);
      } catch (e) {
        console.log('Failed to parse user param:', e);
      }
    }

    // Проверяем auth_date (не старше 1 часа)
    const authDate = params.get('auth_date');
    if (authDate) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - parseInt(authDate) > 3600) {
        console.log('WebApp auth data too old (>1 hour)');
        return { valid: false };
      }
    }

    return { valid: true, user };
  } catch (error) {
    console.error('Error verifying initDataRaw:', error);
    return { valid: false };
  }
}

// Верификация данных Telegram Widget (старый метод)
// https://core.telegram.org/widgets/login#checking-authorization
async function verifyTelegramWidgetAuth(authData: TelegramAuthData, botToken: string): Promise<boolean> {
  if (!authData.hash) {
    return false;
  }

  try {
    // Формируем строку проверки согласно документации Telegram Widget
    const checkFields: Record<string, string> = {};
    if (authData.id) checkFields['id'] = authData.id.toString();
    if (authData.first_name) checkFields['first_name'] = authData.first_name;
    if (authData.last_name) checkFields['last_name'] = authData.last_name;
    if (authData.username) checkFields['username'] = authData.username;
    if (authData.photo_url) checkFields['photo_url'] = authData.photo_url;
    if (authData.auth_date) checkFields['auth_date'] = authData.auth_date.toString();

    const checkString = Object.keys(checkFields)
      .sort()
      .map(key => `${key}=${checkFields[key]}`)
      .join('\n');

    // Для Widget: секретный ключ = SHA256(bot_token)
    const secretKey = await sha256(botToken);
    
    // Вычисляем HMAC-SHA256 от check_string
    const calculatedHashBytes = await hmacSha256(secretKey, checkString);
    const calculatedHash = new TextDecoder().decode(hexEncode(calculatedHashBytes));

    return calculatedHash === authData.hash;
  } catch (error) {
    console.error('Error during Widget HMAC verification:', error);
    return false;
  }
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
    // Секретный токен для внутренних вызовов между edge functions (telegram-webhook)
    const internalAuthSecret = Deno.env.get('INTERNAL_AUTH_SECRET') || 'fallback_' + telegramBotToken.substring(0, 20);

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
    console.log('Received Telegram auth data:', { 
      id: authData.id,
      auth_date: authData.auth_date,
      username: authData.username || 'NOT PROVIDED',
      hash: authData.hash ? '[PRESENT]' : '[MISSING]',
      photo_url: authData.photo_url ? '[PRESENT]' : 'NOT PROVIDED',
      init_data_raw: authData.init_data_raw ? '[PRESENT]' : '[MISSING]'
    });

    let isValid = false;
    let verifiedUser: any = null;

    // 1. Проверка внутреннего вызова от telegram-webhook (используем секретный токен)
    if (authData.hash === internalAuthSecret) {
      console.log('Auth via internal webhook call - verified with secret');
      isValid = true;
    }
    // 2. Проверка initDataRaw от Telegram WebApp SDK (основной метод)
    else if (authData.init_data_raw) {
      console.log('Verifying via initDataRaw (WebApp SDK)...');
      const result = await verifyInitDataRaw(authData.init_data_raw, telegramBotToken);
      isValid = result.valid;
      if (result.user) {
        verifiedUser = result.user;
        // Обновляем authData данными из верифицированного пользователя
        if (verifiedUser.id) authData.id = verifiedUser.id;
        if (verifiedUser.first_name) authData.first_name = verifiedUser.first_name;
        if (verifiedUser.last_name) authData.last_name = verifiedUser.last_name;
        if (verifiedUser.username) authData.username = verifiedUser.username;
        if (verifiedUser.photo_url) authData.photo_url = verifiedUser.photo_url;
      }
    }
    // 3. Проверка Telegram Widget (для веб-авторизации)
    else if (authData.hash) {
      console.log('Verifying via Widget hash...');
      isValid = await verifyTelegramWidgetAuth(authData, telegramBotToken);
    }

    if (!isValid) {
      console.log('Authentication verification failed');
      return new Response(
        JSON.stringify({ error: 'Invalid authentication data' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Authentication verified successfully');

    // Проверяем актуальность данных (не старше 24 часов для session creation)
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
          avatar_url: authData.photo_url || null
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('Successfully created profile with Telegram data', {
          avatar_url: authData.photo_url || 'NO PHOTO',
          full_name: displayName
        });
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

    // Проверяем существующий профиль и НЕ перезаписываем данные при повторном входе
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('user_id', existingUser.user.id)
      .maybeSingle();

    const displayName = authData.username || fullName || `User_${authData.id}`;
    
    // Если профиль существует и уже имеет данные, НЕ перезаписываем их
    const shouldUpdateAvatar = !currentProfile || !currentProfile.avatar_url;
    const shouldUpdateName = !currentProfile || !currentProfile.full_name;

    const profileUpdateData: any = {
      user_id: existingUser.user.id,
      email: telegramEmail,
    };

    // Обновляем только если данных еще нет
    if (shouldUpdateAvatar) {
      profileUpdateData.avatar_url = authData.photo_url || null;
    }
    if (shouldUpdateName) {
      profileUpdateData.full_name = displayName;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileUpdateData, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
    } else {
      console.log('Successfully updated profile', {
        avatar_updated: shouldUpdateAvatar,
        name_updated: shouldUpdateName,
        avatar_url: shouldUpdateAvatar ? (authData.photo_url || 'NO PHOTO') : 'KEPT EXISTING',
        full_name: shouldUpdateName ? displayName : 'KEPT EXISTING'
      });
    }

    // Создаем сессию для пользователя
    const redirectUrl = 'https://syndicate-poker.ru/';
    
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

    // Используем стандартный Supabase URL
    const loginUrl = sessionData.properties.action_link;

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

    // Если объединение не удалось или игрока нет, проверяем существующего или создаем нового
    if (!player) {
      // Ищем существующего игрока по telegram ID
      const { data: existingPlayerByTelegram } = await supabase
        .from('players')
        .select('*')
        .eq('telegram', telegramId)
        .maybeSingle();

      if (existingPlayerByTelegram) {
        // Игрок существует, НЕ перезаписываем его данные
        console.log('Found existing player by Telegram ID, keeping existing data', {
          player_id: existingPlayerByTelegram.id,
          name: existingPlayerByTelegram.name,
          avatar_url: existingPlayerByTelegram.avatar_url || 'NO AVATAR'
        });
        player = existingPlayerByTelegram;
      } else {
        // Создаем нового игрока только если его нет
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
            avatar_url: authData.photo_url || null
          })
          .select()
          .single();

        if (createPlayerError) {
          console.error('Error creating player:', createPlayerError);
        } else {
          console.log('Successfully created player with Telegram data', {
            player_name: playerName,
            avatar_url: authData.photo_url || 'NO PHOTO',
            telegram_id: telegramId
          });
          player = newPlayer;
        }
      }
    }

    console.log('Successfully authenticated Telegram user:', authData.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: existingUser.user,
        login_url: loginUrl,
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
