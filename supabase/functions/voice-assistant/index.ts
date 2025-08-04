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

      // ОСНОВНЫЕ КОМАНДЫ ТУРНИРА
      if (command.includes('запустить турнир') || command.includes('начать турнир')) {
        response_text = "Запускаю турнир. Желаю удачи всем участникам!";
        action_result = { action: 'start_tournament', tournament_id };
      } else if (command.includes('пауза') || command.includes('остановить')) {
        response_text = "Ставлю турнир на паузу. Участники, пожалуйста, сохраните свои позиции.";
        action_result = { action: 'pause_tournament', tournament_id };
      } else if (command.includes('возобновить') || command.includes('продолжить')) {
        response_text = "Возобновляю турнир. Игра продолжается!";
        action_result = { action: 'resume_tournament', tournament_id };
      } else if (command.includes('завершить турнир')) {
        response_text = "Завершаю турнир. Поздравляю победителей!";
        action_result = { action: 'complete_tournament', tournament_id };

      // УПРАВЛЕНИЕ БЛАЙНДАМИ С УМНОЙ ЛОГИКОЙ
      } else if (command.includes('следующий уровень') || command.includes('повысить блайнды')) {
        response_text = "Переходим к следующему уровню блайндов. Внимание игроки!";
        action_result = { action: 'next_blind_level', tournament_id };
      } else if (command.includes('предыдущий уровень') || command.includes('понизить блайнды')) {
        response_text = "Возвращаемся к предыдущему уровню блайндов.";
        action_result = { action: 'previous_blind_level', tournament_id };
      } else if (command.includes('установить уровень')) {
        const level = command.match(/уровень\s*(\d+)/)?.[1];
        if (level) {
          response_text = `Устанавливаю ${level} уровень блайндов.`;
          action_result = { action: 'set_blind_level', tournament_id, level: parseInt(level) };
        }
      } else if (command.includes('какой уровень') || command.includes('текущий уровень')) {
        response_text = "Покажу информацию о текущем уровне блайндов.";
        action_result = { action: 'current_level_info', tournament_id };
      } else if (command.includes('следующие блайнды') || command.includes('что дальше')) {
        response_text = "Покажу информацию о следующем уровне блайндов.";
        action_result = { action: 'next_level_info', tournament_id };
      } else if (command.includes('структура блайндов') || command.includes('вся структура')) {
        response_text = "Показываю полную структуру блайндов турнира.";
        action_result = { action: 'blind_structure_info', tournament_id };

      // УПРАВЛЕНИЕ ТАЙМЕРОМ С РАСШИРЕННЫМИ ВОЗМОЖНОСТЯМИ
      } else if (command.includes('таймер') && command.includes('минут')) {
        const minutes = command.match(/(\d+)\s*минут/)?.[1];
        if (minutes) {
          response_text = `Устанавливаю таймер на ${minutes} минут.`;
          action_result = { action: 'set_timer', tournament_id, minutes: parseInt(minutes) };
        }
      } else if (command.includes('добавить время')) {
        const minutes = command.match(/(\d+)\s*минут/)?.[1] || '5';
        response_text = `Добавляю ${minutes} минут к таймеру.`;
        action_result = { action: 'add_time', tournament_id, minutes: parseInt(minutes) };
      } else if (command.includes('убрать время') || command.includes('снять время')) {
        const minutes = command.match(/(\d+)\s*минут/)?.[1] || '5';
        response_text = `Убираю ${minutes} минут с таймера.`;
        action_result = { action: 'remove_time', tournament_id, minutes: parseInt(minutes) };
      } else if (command.includes('остановить таймер')) {
        response_text = "Останавливаю таймер.";
        action_result = { action: 'stop_timer', tournament_id };
      } else if (command.includes('запустить таймер')) {
        response_text = "Запускаю таймер.";
        action_result = { action: 'start_timer', tournament_id };
      } else if (command.includes('сколько времени') || command.includes('остаток времени')) {
        response_text = "Покажу оставшееся время текущего уровня.";
        action_result = { action: 'time_remaining', tournament_id };
      } else if (command.includes('сбросить таймер')) {
        response_text = "Сбрасываю таймер на полное время уровня.";
        action_result = { action: 'reset_timer', tournament_id };

      // ПЕРЕРЫВЫ С ДЕТАЛЬНЫМ УПРАВЛЕНИЕМ
      } else if (command.includes('объявить перерыв') || command.includes('начать перерыв')) {
        const minutes = command.match(/(\d+)\s*минут/)?.[1] || '15';
        response_text = `Объявляю перерыв на ${minutes} минут. Участники могут отдохнуть.`;
        action_result = { action: 'start_break', tournament_id, duration: parseInt(minutes) };
      } else if (command.includes('закончить перерыв') || command.includes('завершить перерыв')) {
        response_text = "Перерыв окончен. Игроки, возвращайтесь к столам!";
        action_result = { action: 'end_break', tournament_id };
      } else if (command.includes('продлить перерыв')) {
        const minutes = command.match(/(\d+)\s*минут/)?.[1] || '5';
        response_text = `Продлеваю перерыв на ${minutes} минут.`;
        action_result = { action: 'extend_break', tournament_id, minutes: parseInt(minutes) };

      // УПРАВЛЕНИЕ ИГРОКАМИ
      } else if (command.includes('исключить игрока')) {
        const playerName = command.replace(/.*исключить игрока\s*/, '').trim();
        response_text = `Исключаю игрока ${playerName} из турнира.`;
        action_result = { action: 'eliminate_player', tournament_id, player_name: playerName };
      } else if (command.includes('добавить игрока')) {
        const playerName = command.replace(/.*добавить игрока\s*/, '').trim();
        response_text = `Добавляю игрока ${playerName} в турнир.`;
        action_result = { action: 'add_player', tournament_id, player_name: playerName };
      } else if (command.includes('список игроков') || command.includes('сколько игроков')) {
        response_text = "Показываю актуальный список игроков турнира.";
        action_result = { action: 'show_players', tournament_id };
      } else if (command.includes('средний стек') || command.includes('средние фишки')) {
        response_text = "Показываю информацию о среднем стеке игроков.";
        action_result = { action: 'average_stack', tournament_id };

      // СТОЛЫ И РАССАДКА
      } else if (command.includes('перебалансировать столы')) {
        response_text = "Выполняю перебалансировку столов для равномерного распределения игроков.";
        action_result = { action: 'rebalance_tables', tournament_id };
      } else if (command.includes('разбить столы')) {
        response_text = "Выполняю разбивку столов согласно правилам турнира.";
        action_result = { action: 'break_tables', tournament_id };
      } else if (command.includes('пересадить игрока')) {
        const playerName = command.replace(/.*пересадить игрока\s*/, '').split(' на стол ')[0].trim();
        const tableMatch = command.match(/стол\s*(\d+)/);
        const tableNumber = tableMatch ? tableMatch[1] : null;
        response_text = `Пересаживаю игрока ${playerName}${tableNumber ? ` на стол ${tableNumber}` : ''}.`;
        action_result = { action: 'move_player', tournament_id, player_name: playerName, table_number: tableNumber };

      // СТАТИСТИКА И ОТЧЕТЫ
      } else if (command.includes('статистика') || command.includes('показать статистику')) {
        response_text = "Показываю статистику турнира. Данные обновлены.";
        action_result = { action: 'show_stats', tournament_id };
      } else if (command.includes('лидеры чипов') || command.includes('чип лидеры')) {
        response_text = "Показываю текущих лидеров по количеству фишек.";
        action_result = { action: 'chip_leaders', tournament_id };
      } else if (command.includes('выплаты') || command.includes('призовые')) {
        response_text = "Показываю структуру выплат турнира.";
        action_result = { action: 'show_payouts', tournament_id };
      } else if (command.includes('экспорт отчета')) {
        response_text = "Генерирую и экспортирую отчет турнира.";
        action_result = { action: 'export_report', tournament_id };

      // ОБЪЯВЛЕНИЯ И СООБЩЕНИЯ
      } else if (command.includes('объявление')) {
        const announcement = command.replace(/.*объявление\s*/, '');
        response_text = `Внимание участники турнира! ${announcement}`;
        action_result = { action: 'announcement', tournament_id, message: announcement };
      } else if (command.includes('тишина') || command.includes('тихо')) {
        response_text = "Внимание! Прошу соблюдать тишину за столами.";
        action_result = { action: 'silence_announcement', tournament_id };
      } else if (command.includes('последняя рука') || command.includes('финальная рука')) {
        response_text = "Внимание! Играется последняя рука этого уровня.";
        action_result = { action: 'last_hand_announcement', tournament_id };
      } else if (command.includes('минута до перехода') || command.includes('минуточку')) {
        response_text = "Внимание! Одна минута до перехода на следующий уровень.";
        action_result = { action: 'one_minute_warning', tournament_id };

      // АВТОМАТИЧЕСКИЕ ОБЪЯВЛЕНИЯ ВРЕМЕНИ
      } else if (command.includes('объявить время') || command.includes('сообщить время')) {
        response_text = "Объявляю оставшееся время уровня.";
        action_result = { action: 'announce_time', tournament_id };
      } else if (command.includes('10 минут осталось')) {
        response_text = "Внимание! До окончания уровня осталось 10 минут.";
        action_result = { action: 'ten_minutes_warning', tournament_id };
      } else if (command.includes('5 минут осталось')) {
        response_text = "Внимание! До окончания уровня осталось 5 минут.";
        action_result = { action: 'five_minutes_warning', tournament_id };

      // ПРАВИЛА И РЕШЕНИЯ
      } else if (command.includes('показать карты') || command.includes('открыть карты')) {
        response_text = "Все участники должны показать свои карты согласно правилам.";
        action_result = { action: 'show_cards_ruling', tournament_id };
      } else if (command.includes('штраф')) {
        const playerName = command.replace(/.*штраф\s*/, '').split(' за ')[0].trim();
        const reason = command.includes(' за ') ? command.split(' за ')[1] : 'нарушение правил';
        response_text = `Выношу предупреждение игроку ${playerName} за ${reason}.`;
        action_result = { action: 'penalty', tournament_id, player_name: playerName, reason };
      } else if (command.includes('мертвая рука')) {
        response_text = "Объявляю руку мертвой согласно правилам турнира.";
        action_result = { action: 'dead_hand_ruling', tournament_id };

      // ТЕХНИЧЕСКАЯ ПОДДЕРЖКА
      } else if (command.includes('проблема с картами')) {
        response_text = "Приостанавливаю игру для замены колоды карт.";
        action_result = { action: 'card_problem', tournament_id };
      } else if (command.includes('проблема с фишками')) {
        response_text = "Приостанавливаю игру для пересчета фишек.";
        action_result = { action: 'chip_problem', tournament_id };
      } else if (command.includes('техническая пауза')) {
        response_text = "Объявляю техническую паузу для решения возникших вопросов.";
        action_result = { action: 'technical_pause', tournament_id };

      // ФИНАЛ ТУРНИРА
      } else if (command.includes('финальный стол')) {
        response_text = "Начинаем игру финального стола! Удачи участникам!";
        action_result = { action: 'final_table', tournament_id };
      } else if (command.includes('награждение')) {
        response_text = "Начинаем церемонию награждения победителей!";
        action_result = { action: 'awards_ceremony', tournament_id };
      } else if (command.includes('фото финалистов')) {
        response_text = "Приглашаю финалистов на фотосессию.";
        action_result = { action: 'photo_session', tournament_id };

      // ПОМОЩЬ И ИНФОРМАЦИЯ
      } else if (command.includes('помощь') || command.includes('команды')) {
        response_text = "Я умею управлять турниром, работать с блайндами, таймером, игроками, столами. Могу объявлять переходы уровней, перерывы, показывать статистику. Просто скажите что нужно сделать.";
        action_result = { action: 'help', tournament_id };
      } else if (command.includes('время') || command.includes('сколько времени')) {
        response_text = "Показываю текущее время и оставшееся время уровня.";
        action_result = { action: 'current_time', tournament_id };
      } else if (command.includes('правила')) {
        response_text = "Показываю основные правила турнира.";
        action_result = { action: 'show_rules', tournament_id };

      } else {
        response_text = "Команда не распознана. Скажите 'помощь' чтобы узнать доступные команды.";
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