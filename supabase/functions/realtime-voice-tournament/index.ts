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
              instructions: `Ты голосовой ассистент для управления покерными турнирами. 
              Ты можешь выполнять следующие команды:
              - Начать турнир (start_tournament)
              - Остановить турнир (pause_tournament) 
              - Возобновить турнир (resume_tournament)
              - Завершить турнир (complete_tournament)
              - Показать статистику турнира (show_tournament_stats)
              - Добавить игрока (add_player)
              - Показать список игроков (show_players)
              - Перейти к следующему уровню блайндов (next_blind_level)
              - Обновить таймер (update_timer)
              
              Отвечай кратко и по делу. Всегда подтверждай выполнение команд.
              Говори на русском языке.`,
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