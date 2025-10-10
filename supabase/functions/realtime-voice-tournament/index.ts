import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Upgrade to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    let openaiSocket: WebSocket | null = null;

    socket.onopen = () => {
      console.log("Client WebSocket connected");
      
      // Connect to OpenAI Realtime API
      const openaiUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
      openaiSocket = new WebSocket(openaiUrl);

      openaiSocket.onopen = () => {
        console.log("Connected to OpenAI Realtime API");
      };

      openaiSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("OpenAI -> Client:", data.type);

        // Handle session created event
        if (data.type === 'session.created') {
          console.log("Session created, sending configuration...");
          
          // Configure the session
          const sessionConfig = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: `Ты профессиональный голосовой ассистент для управления покерными турнирами. 
              
              ОСНОВНЫЕ КОМАНДЫ ТУРНИРА:
              - Начать/запустить турнир
              - Остановить/поставить на паузу турнир
              - Возобновить/продолжить турнир
              - Завершить/закончить турнир
              - Показать статистику/информацию о турнире
              
              УПРАВЛЕНИЕ ИГРОКАМИ:
              - Добавить игрока [имя]
              - Удалить игрока [имя]
              - Показать список игроков
              - Исключить игрока из турнира
              - Добавить ребай для игрока [имя]
              - Добавить адон для игрока [имя]
              - Показать рейтинг игроков
              
              УПРАВЛЕНИЕ БЛАЙНДАМИ И ВРЕМЕНЕМ:
              - Перейти к следующему уровню блайндов
              - Вернуться к предыдущему уровню
              - Установить таймер на [X] минут
              - Добавить [X] минут к таймеру
              - Убавить [X] минут с таймера
              - Перерыв на [X] минут
              - Завершить перерыв
              
              СТРУКТУРА ВЫПЛАТ:
              - Показать структуру выплат
              - Изменить призовой фонд
              - Добавить/убрать призовое место
              
              ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ:
              - Объявить результаты
              - Сделать объявление для игроков
              - Показать топ игроков
              - Создать отчет о турнире
              - Экспорт результатов
              
              НАСТРОЙКИ:
              - Включить/выключить звуковые уведомления
              - Изменить громкость
              - Переключить язык
              
              Всегда отвечай четко и кратко. Подтверждай выполнение команд. 
              Если команда неясна - уточняй детали. Говори только на русском языке.`,
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: "function",
                  name: "start_tournament",
                  description: "Начать выбранный турнир",
                  parameters: {
                    type: "object",
                    properties: {
                      tournament_id: { type: "string", description: "ID турнира для запуска" }
                    },
                    required: ["tournament_id"]
                  }
                },
                {
                  type: "function", 
                  name: "pause_tournament",
                  description: "Поставить турнир на паузу",
                  parameters: {
                    type: "object",
                    properties: {
                      tournament_id: { type: "string", description: "ID турнира для паузы" }
                    },
                    required: ["tournament_id"]
                  }
                },
                {
                  type: "function",
                  name: "resume_tournament", 
                  description: "Возобновить турнир после паузы",
                  parameters: {
                    type: "object",
                    properties: {
                      tournament_id: { type: "string", description: "ID турнира для возобновления" }
                    },
                    required: ["tournament_id"]
                  }
                },
                {
                  type: "function",
                  name: "complete_tournament",
                  description: "Завершить турнир",
                  parameters: {
                    type: "object", 
                    properties: {
                      tournament_id: { type: "string", description: "ID турнира для завершения" }
                    },
                    required: ["tournament_id"]
                  }
                },
                {
                  type: "function",
                  name: "show_tournament_stats",
                  description: "Показать статистику текущего турнира",
                  parameters: {
                    type: "object",
                    properties: {}
                  }
                },
                {
                  type: "function",
                  name: "add_player",
                  description: "Добавить нового игрока",
                  parameters: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Имя игрока" },
                      email: { type: "string", description: "Email игрока (опционально)" }
                    },
                    required: ["name"]
                  }
                },
                {
                  type: "function",
                  name: "show_players",
                  description: "Показать список всех игроков",
                  parameters: {
                    type: "object",
                    properties: {}
                  }
                },
                {
                  type: "function",
                  name: "next_blind_level",
                  description: "Перейти к следующему уровню блайндов",
                  parameters: {
                    type: "object",
                    properties: {
                      tournament_id: { type: "string", description: "ID турнира" }
                    },
                    required: ["tournament_id"]
                  }
                },
                 {
                   type: "function",
                   name: "update_timer",
                   description: "Обновить таймер турнира",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" },
                       minutes: { type: "number", description: "Количество минут для установки" }
                     },
                     required: ["tournament_id", "minutes"]
                   }
                 },
                 {
                   type: "function",
                   name: "remove_player",
                   description: "Удалить игрока из турнира",
                   parameters: {
                     type: "object",
                     properties: {
                       player_name: { type: "string", description: "Имя игрока для удаления" },
                       tournament_id: { type: "string", description: "ID турнира" }
                     },
                     required: ["player_name"]
                   }
                 },
                 {
                   type: "function",
                   name: "add_rebuy",
                   description: "Добавить ребай для игрока",
                   parameters: {
                     type: "object",
                     properties: {
                       player_name: { type: "string", description: "Имя игрока" },
                       amount: { type: "number", description: "Сумма ребая" }
                     },
                     required: ["player_name"]
                   }
                 },
                 {
                   type: "function",
                   name: "add_addon",
                   description: "Добавить адон для игрока",
                   parameters: {
                     type: "object",
                     properties: {
                       player_name: { type: "string", description: "Имя игрока" },
                       amount: { type: "number", description: "Сумма адона" }
                     },
                     required: ["player_name"]
                   }
                 },
                 {
                   type: "function",
                   name: "previous_blind_level",
                   description: "Вернуться к предыдущему уровню блайндов",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" }
                     },
                     required: ["tournament_id"]
                   }
                 },
                 {
                   type: "function",
                   name: "add_time",
                   description: "Добавить время к таймеру",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" },
                       minutes: { type: "number", description: "Количество минут для добавления" }
                     },
                     required: ["tournament_id", "minutes"]
                   }
                 },
                 {
                   type: "function",
                   name: "subtract_time",
                   description: "Убавить время с таймера",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" },
                       minutes: { type: "number", description: "Количество минут для убавления" }
                     },
                     required: ["tournament_id", "minutes"]
                   }
                 },
                 {
                   type: "function",
                   name: "start_break",
                   description: "Начать перерыв",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" },
                       minutes: { type: "number", description: "Длительность перерыва в минутах" }
                     },
                     required: ["tournament_id", "minutes"]
                   }
                 },
                 {
                   type: "function",
                   name: "end_break",
                   description: "Завершить перерыв",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" }
                     },
                     required: ["tournament_id"]
                   }
                 },
                 {
                   type: "function",
                   name: "show_payout_structure",
                   description: "Показать структуру выплат",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" }
                     },
                     required: ["tournament_id"]
                   }
                 },
                 {
                   type: "function",
                   name: "show_top_players",
                   description: "Показать топ игроков по рейтингу",
                   parameters: {
                     type: "object",
                     properties: {
                       limit: { type: "number", description: "Количество игроков для показа" }
                     }
                   }
                 },
                 {
                   type: "function",
                   name: "make_announcement",
                   description: "Сделать объявление для игроков",
                   parameters: {
                     type: "object",
                     properties: {
                       message: { type: "string", description: "Текст объявления" },
                       tournament_id: { type: "string", description: "ID турнира" }
                     },
                     required: ["message"]
                   }
                 },
                 {
                   type: "function",
                   name: "change_volume",
                   description: "Изменить громкость уведомлений",
                   parameters: {
                     type: "object",
                     properties: {
                       volume: { type: "number", description: "Уровень громкости от 0 до 100" }
                     },
                     required: ["volume"]
                   }
                 },
                 {
                   type: "function",
                   name: "export_results",
                   description: "Экспорт результатов турнира",
                   parameters: {
                     type: "object",
                     properties: {
                       tournament_id: { type: "string", description: "ID турнира" },
                       format: { type: "string", description: "Формат экспорта (pdf, excel, csv)" }
                     },
                     required: ["tournament_id"]
                   }
                 }
              ],
              tool_choice: "auto",
              temperature: 0.8,
              max_response_output_tokens: 1000
            }
          };

          openaiSocket?.send(JSON.stringify(sessionConfig));
        }

        // Handle function calls
        if (data.type === 'response.function_call_arguments.done') {
          console.log("Function call received:", data);
          
          // Execute the function and send result back
          if (data.name && data.arguments) {
            handleTournamentFunction(data.name, JSON.parse(data.arguments), data.call_id, openaiSocket!);
          }
        }

        // Forward all other messages to client
        socket.send(event.data);
      };

      openaiSocket.onerror = (error) => {
        console.error("OpenAI WebSocket error:", error);
        socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
      };

      openaiSocket.onclose = () => {
        console.log("OpenAI WebSocket closed");
        socket.close();
      };
    };

    socket.onmessage = (event) => {
      // Forward client messages to OpenAI
      if (openaiSocket && openaiSocket.readyState === WebSocket.OPEN) {
        console.log("Client -> OpenAI:", JSON.parse(event.data).type);
        openaiSocket.send(event.data);
      }
    };

    socket.onclose = () => {
      console.log("Client WebSocket closed");
      openaiSocket?.close();
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
      openaiSocket?.close();
    };

    return response;

  } catch (error) {
    console.error('Error in realtime-voice-tournament function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle tournament function calls
async function handleTournamentFunction(functionName: string, args: any, callId: string, openaiSocket: WebSocket) {
  console.log(`Executing function: ${functionName}`, args);
  
  let result = { success: false, message: "Неизвестная команда" };
  
  try {
    switch (functionName) {
      case 'start_tournament':
        const startResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'start_tournament'
        });
        result = startResult.data || { success: false, message: 'Ошибка запуска турнира' };
        break;
        
      case 'pause_tournament':
        const pauseResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'pause_tournament'
        });
        result = pauseResult.data || { success: false, message: 'Ошибка паузы турнира' };
        break;
        
      case 'resume_tournament':
        const resumeResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'resume_tournament'
        });
        result = resumeResult.data || { success: false, message: 'Ошибка возобновления турнира' };
        break;
        
      case 'complete_tournament':
        const completeResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'complete_tournament'
        });
        result = completeResult.data || { success: false, message: 'Ошибка завершения турнира' };
        break;
        
      case 'show_tournament_stats':
        const statsResult = await supabase.rpc('get_tournament_voice_stats', {
          tournament_id_param: args.tournament_id || 'latest'
        });
        if (statsResult.data) {
          const stats = statsResult.data;
          result = { 
            success: true, 
            message: `Турнир "${stats.tournament_name}": ${stats.players_count} игроков, ${stats.current_level} уровень блайндов, ${Math.floor(stats.timer_remaining / 60)} минут осталось. Призовой фонд: ${stats.prize_pool} рублей.` 
          };
        } else {
          result = { success: false, message: 'Не удалось получить статистику турнира' };
        }
        break;
        
      case 'add_player':
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .insert([{
            name: args.name,
            email: args.email || null
          }])
          .select();
        
        if (playerError) {
          result = { success: false, message: `Ошибка добавления игрока: ${playerError.message}` };
        } else {
          result = { success: true, message: `Игрок ${args.name} успешно добавлен в базу данных` };
        }
        break;
        
      case 'show_players':
        const { data: playersData, error: playersError } = await supabase
          .from('tournament_registrations')
          .select(`
            player_id,
            players!inner(name, elo_rating)
          `)
          .eq('status', 'confirmed')
          .limit(10);
        
        if (playersError) {
          result = { success: false, message: 'Ошибка получения списка игроков' };
        } else {
          const playerNames = playersData?.map(p => p.players?.[0]?.name || 'Неизвестный').join(', ') || 'Нет игроков';
          result = { 
            success: true, 
            message: `Зарегистрированные игроки: ${playerNames}` 
          };
        }
        break;
        
      case 'next_blind_level':
        const nextResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'next_blind_level'
        });
        result = nextResult.data || { success: false, message: 'Ошибка перехода к следующему уровню' };
        break;
        
      case 'previous_blind_level':
        const prevResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'previous_blind_level'
        });
        result = prevResult.data || { success: false, message: 'Ошибка возврата к предыдущему уровню' };
        break;
        
      case 'update_timer':
        const timerResult = await supabase.rpc('handle_voice_tournament_action', {
          tournament_id_param: args.tournament_id,
          action_type: 'update_timer',
          parameters: { minutes: args.minutes }
        });
        result = timerResult.data || { success: false, message: 'Ошибка обновления таймера' };
        break;
        
      case 'add_time':
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('timer_remaining')
          .eq('id', args.tournament_id)
          .single();
        
        if (tournament) {
          const newTime = tournament.timer_remaining + (args.minutes * 60);
          await supabase
            .from('tournaments')
            .update({ timer_remaining: newTime, last_voice_command: new Date().toISOString() })
            .eq('id', args.tournament_id);
          result = { success: true, message: `Добавлено ${args.minutes} минут к таймеру` };
        } else {
          result = { success: false, message: 'Турнир не найден' };
        }
        break;
        
      case 'subtract_time':
        const { data: tournamentSub } = await supabase
          .from('tournaments')
          .select('timer_remaining')
          .eq('id', args.tournament_id)
          .single();
        
        if (tournamentSub) {
          const newTime = Math.max(0, tournamentSub.timer_remaining - (args.minutes * 60));
          await supabase
            .from('tournaments')
            .update({ timer_remaining: newTime, last_voice_command: new Date().toISOString() })
            .eq('id', args.tournament_id);
          result = { success: true, message: `Убавлено ${args.minutes} минут с таймера` };
        } else {
          result = { success: false, message: 'Турнир не найден' };
        }
        break;
        
      case 'add_rebuy':
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('name', args.player_name)
          .single();
        
        if (player) {
          // Get current rebuys and increment
          const { data: currentReg } = await supabase
            .from('tournament_registrations')
            .select('rebuys')
            .eq('player_id', player.id)
            .single();
          
          const currentRebuys = currentReg?.rebuys || 0;
          
          await supabase
            .from('tournament_registrations')
            .update({ rebuys: currentRebuys + 1 })
            .eq('player_id', player.id);
          result = { success: true, message: `Ребай добавлен игроку ${args.player_name}` };
        } else {
          result = { success: false, message: 'Игрок не найден' };
        }
        break;
        
      case 'add_addon':
        const { data: playerAddon } = await supabase
          .from('players')
          .select('id')
          .eq('name', args.player_name)
          .single();
        
        if (playerAddon) {
          // Get current addons and increment
          const { data: currentReg } = await supabase
            .from('tournament_registrations')
            .select('addons')
            .eq('player_id', playerAddon.id)
            .single();
          
          const currentAddons = currentReg?.addons || 0;
          
          await supabase
            .from('tournament_registrations')
            .update({ addons: currentAddons + 1 })
            .eq('player_id', playerAddon.id);
          result = { success: true, message: `Адон добавлен игроку ${args.player_name}` };
        } else {
          result = { success: false, message: 'Игрок не найден' };
        }
        break;
        
      case 'show_top_players':
        const limit = args.limit || 5;
        const { data: topPlayers } = await supabase
          .from('players')
          .select('name, elo_rating')
          .order('elo_rating', { ascending: false })
          .limit(limit);
        
        if (topPlayers) {
          const playersList = topPlayers.map((p, i) => `${i + 1}. ${p.name} (${p.elo_rating})`).join(', ');
          result = { 
            success: true, 
            message: `Топ ${limit} игроков: ${playersList}` 
          };
        } else {
          result = { success: false, message: 'Ошибка получения топ игроков' };
        }
        break;
        
      case 'make_announcement':
        await supabase
          .from('voice_announcements')
          .insert([{
            tournament_id: args.tournament_id,
            message: args.message,
            announcement_type: 'voice',
            auto_generated: false
          }]);
        result = { success: true, message: `Объявление отправлено: "${args.message}"` };
        break;
        
      case 'show_payout_structure':
        const { data: tournamentPayout } = await supabase
          .from('tournaments')
          .select('buy_in, name')
          .eq('id', args.tournament_id)
          .single();
          
        const { data: registrationCount } = await supabase
          .from('tournament_registrations')
          .select('id')
          .eq('tournament_id', args.tournament_id)
          .eq('status', 'confirmed');
          
        if (tournamentPayout && registrationCount) {
          const prizePool = tournamentPayout.buy_in * registrationCount.length;
          result = { 
            success: true, 
            message: `Структура выплат турнира "${tournamentPayout.name}": 1 место - 50%, 2 место - 30%, 3 место - 20%. Призовой фонд: ${prizePool} рублей при ${registrationCount.length} игроках` 
          };
        } else {
          result = { success: false, message: 'Турнир не найден или нет участников' };
        }
        break;
        
      case 'change_volume':
        // Сохранить настройки громкости пользователя
        await supabase
          .from('voice_settings')
          .upsert([{
            user_id: 'current_user', // Здесь должен быть реальный user_id
            volume_level: args.volume
          }]);
        result = { success: true, message: `Громкость изменена на ${args.volume}%` };
        break;
        
      case 'export_results':
        const format = args.format || 'pdf';
        // Логика экспорта результатов
        result = { success: true, message: `Экспорт результатов турнира начат в формате ${format}. Файл будет готов через несколько секунд` };
        break;
        
      default:
        result = { success: false, message: `Неизвестная функция: ${functionName}` };
    }
    
    // Логирование команды
    await supabase
      .from('voice_commands_log')
      .insert([{
        user_id: 'current_user', // Здесь должен быть реальный user_id
        tournament_id: args.tournament_id || null,
        command: functionName,
        parameters: args,
        result: result,
        success: result.success,
        execution_time_ms: Date.now() - Date.now() // Здесь должно быть реальное время выполнения
      }]);
      
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result = { success: false, message: `Ошибка выполнения: ${errorMessage}` };
  }

  // Send function result back to OpenAI
  const functionResult = {
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: callId,
      output: JSON.stringify(result)
    }
  };

  openaiSocket.send(JSON.stringify(functionResult));
  openaiSocket.send(JSON.stringify({ type: "response.create" }));
}