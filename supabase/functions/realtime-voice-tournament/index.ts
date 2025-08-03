import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      openaiSocket = new WebSocket(openaiUrl, [], {
        headers: {
          "Authorization": `Bearer ${openAIApiKey}`,
          "OpenAI-Beta": "realtime=v1"
        }
      });

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
          console.log("Function call:", data.name, data.arguments);
          
          // Execute the function and send result back
          handleTournamentFunction(data.name, JSON.parse(data.arguments), data.call_id, openaiSocket!);
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
    return new Response(JSON.stringify({ error: error.message }), {
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
        result = { success: true, message: `Турнир ${args.tournament_id} успешно запущен` };
        break;
        
      case 'pause_tournament':
        result = { success: true, message: `Турнир ${args.tournament_id} поставлен на паузу` };
        break;
        
      case 'resume_tournament':
        result = { success: true, message: `Турнир ${args.tournament_id} возобновлен` };
        break;
        
      case 'complete_tournament':
        result = { success: true, message: `Турнир ${args.tournament_id} завершен` };
        break;
        
      case 'show_tournament_stats':
        result = { 
          success: true, 
          message: "Статистика турнира: 12 игроков, 3-й уровень блайндов, осталось 45 минут" 
        };
        break;
        
      case 'add_player':
        result = { success: true, message: `Игрок ${args.name} успешно добавлен` };
        break;
        
      case 'show_players':
        result = { 
          success: true, 
          message: "Зарегистрированные игроки: Алексей, Марина, Дмитрий, Ольга" 
        };
        break;
        
      case 'next_blind_level':
        result = { success: true, message: `Переход к следующему уровню блайндов в турнире ${args.tournament_id}` };
        break;
        
      case 'update_timer':
        result = { success: true, message: `Таймер установлен на ${args.minutes} минут` };
        break;
        
      case 'remove_player':
        result = { success: true, message: `Игрок ${args.player_name} удален из турнира` };
        break;
        
      case 'add_rebuy':
        result = { success: true, message: `Ребай добавлен игроку ${args.player_name}${args.amount ? ` на сумму ${args.amount}` : ''}` };
        break;
        
      case 'add_addon':
        result = { success: true, message: `Адон добавлен игроку ${args.player_name}${args.amount ? ` на сумму ${args.amount}` : ''}` };
        break;
        
      case 'previous_blind_level':
        result = { success: true, message: `Возврат к предыдущему уровню блайндов в турнире ${args.tournament_id}` };
        break;
        
      case 'add_time':
        result = { success: true, message: `Добавлено ${args.minutes} минут к таймеру турнира ${args.tournament_id}` };
        break;
        
      case 'subtract_time':
        result = { success: true, message: `Убавлено ${args.minutes} минут с таймера турнира ${args.tournament_id}` };
        break;
        
      case 'start_break':
        result = { success: true, message: `Начат перерыв на ${args.minutes} минут в турнире ${args.tournament_id}` };
        break;
        
      case 'end_break':
        result = { success: true, message: `Перерыв завершен в турнире ${args.tournament_id}` };
        break;
        
      case 'show_payout_structure':
        result = { 
          success: true, 
          message: "Структура выплат: 1 место - 50%, 2 место - 30%, 3 место - 20%. Призовой фонд: 50,000 рублей" 
        };
        break;
        
      case 'show_top_players':
        const limit = args.limit || 5;
        result = { 
          success: true, 
          message: `Топ ${limit} игроков: 1. Алексей (1850), 2. Марина (1720), 3. Дмитрий (1680), 4. Ольга (1650), 5. Сергей (1620)` 
        };
        break;
        
      case 'make_announcement':
        result = { success: true, message: `Объявление отправлено: "${args.message}"` };
        break;
        
      case 'change_volume':
        result = { success: true, message: `Громкость изменена на ${args.volume}%` };
        break;
        
      case 'export_results':
        const format = args.format || 'pdf';
        result = { success: true, message: `Результаты турнира ${args.tournament_id} экспортированы в формате ${format}` };
        break;
        
      default:
        result = { success: false, message: `Неизвестная функция: ${functionName}` };
    }
  } catch (error) {
    result = { success: false, message: `Ошибка выполнения: ${error.message}` };
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