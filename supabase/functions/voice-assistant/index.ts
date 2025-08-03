import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, text, voice = "Roger", tournament_id } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (action === 'speak') {
      // Generate speech using ElevenLabs
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

      return new Response(
        JSON.stringify({ 
          success: true,
          audioContent: base64Audio,
          message: "Speech generated successfully"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'process_command') {
      // Process voice command and execute tournament action
      const command = text.toLowerCase();
      let response_text = "";
      let action_result = null;

      if (command.includes('запустить турнир') || command.includes('начать турнир')) {
        response_text = "Запускаю турнир. Желаю удачи всем участникам!";
        action_result = { action: 'start_tournament', tournament_id };
      } else if (command.includes('пауза') || command.includes('остановить')) {
        response_text = "Ставлю турнир на паузу. Участники, пожалуйста, сохраните свои позиции.";
        action_result = { action: 'pause_tournament', tournament_id };
      } else if (command.includes('возобновить') || command.includes('продолжить')) {
        response_text = "Возобновляю турнир. Игра продолжается!";
        action_result = { action: 'resume_tournament', tournament_id };
      } else if (command.includes('следующий уровень') || command.includes('повысить блайнды')) {
        response_text = "Переходим к следующему уровню блайндов. Внимание игроки!";
        action_result = { action: 'next_blind_level', tournament_id };
      } else if (command.includes('статистика') || command.includes('показать статистику')) {
        response_text = "Показываю статистику турнира. Данные обновлены.";
        action_result = { action: 'show_stats', tournament_id };
      } else if (command.includes('перерыв')) {
        const minutes = command.match(/(\d+)\s*минут/)?.[1] || '15';
        response_text = `Объявляю перерыв на ${minutes} минут. Участники могут отдохнуть.`;
        action_result = { action: 'break', tournament_id, duration: parseInt(minutes) };
      } else if (command.includes('завершить турнир')) {
        response_text = "Завершаю турнир. Поздравляю победителей!";
        action_result = { action: 'complete_tournament', tournament_id };
      } else if (command.includes('объявление')) {
        const announcement = command.replace(/.*объявление\s*/, '');
        response_text = `Внимание участники турнира! ${announcement}`;
        action_result = { action: 'announcement', tournament_id, message: announcement };
      } else {
        response_text = "Команда не распознана. Пожалуйста, повторите или используйте другую команду.";
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          response_text,
          action_result,
          command_recognized: action_result !== null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action specified');

  } catch (error) {
    console.error('Voice assistant error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});