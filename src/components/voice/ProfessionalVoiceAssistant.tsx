import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceAssistantProps {
  selectedTournament?: any;
  onStatusChange?: (status: string) => void;
}

interface VoiceMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: any;
}

export function ProfessionalVoiceAssistant({ selectedTournament, onStatusChange }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('CwhRBWXzGAHq8TQ4Fs17'); // Roger
  const [tournamentData, setTournamentData] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const voices = [
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Роджер', description: 'Профессиональный мужской голос' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Сара', description: 'Четкий женский голос' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'Джордж', description: 'Авторитетный голос' },
    { id: 'XB0fDUnXU5powFXDhCwa', name: 'Шарлотта', description: 'Элегантный женский голос' }
  ];

  const addMessage = (message: VoiceMessage) => {
    setMessages(prev => [...prev.slice(-9), message]);
  };

  const playAudio = async (base64Audio: string) => {
    try {
      setIsSpeaking(true);
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => setIsSpeaking(false);
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsSpeaking(false);
      toast.error('Ошибка воспроизведения аудио');
    }
  };

  const speakText = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          action: 'speak',
          text,
          voice: selectedVoice,
          tournament_id: selectedTournament?.id
        }
      });

      if (error) throw error;

      if (data?.success && data?.audioContent) {
        await playAudio(data.audioContent);
        addMessage({
          type: 'assistant',
          content: text,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Speech generation error:', error);
      toast.error('Ошибка генерации речи');
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    try {
      if (!selectedTournament?.id) {
        toast.error('Сначала выберите турнир');
        await speakText('Сначала выберите турнир для управления');
        return;
      }

      // Дедупликация команд
      const lastCommandTime = Date.now();
      if (lastCommandTime - (window as any).lastVoiceCommand < 2000) {
        console.log('Дублирующая команда игнорирована');
        return;
      }
      (window as any).lastVoiceCommand = lastCommandTime;

      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          action: 'process_command',
          text: transcript,
          tournament_id: selectedTournament.id
        }
      });

      if (error) throw error;

      addMessage({
        type: 'user',
        content: transcript,
        timestamp: new Date()
      });

      if (data?.success) {
        if (data.command_recognized) {
          // Выполняем действие в интерфейсе
          if (data.action_result) {
            await executeUIAction(data.action_result);
          }
          
          toast.success('Команда выполнена');
          onStatusChange?.(data.action_result?.action || 'processed');
        } else {
          toast.warning('Команда не распознана');
        }

        if (data.response_text) {
          await speakText(data.response_text);
        }
      }
    } catch (error) {
      console.error('Command processing error:', error);
      toast.error('Ошибка обработки команды');
      await speakText('Произошла ошибка при выполнении команды');
    }
  };

  // Выполнение UI действий на основе голосовых команд
  const executeUIAction = async (actionResult: any) => {
    const { action, tournament_id } = actionResult;
    
    try {
      switch (action) {
        case 'start_tournament':
        case 'pause_tournament':
        case 'resume_tournament':
        case 'complete_tournament':
          // Обновляем статус турнира в UI через Supabase RPC
          await supabase.rpc('handle_voice_tournament_action', {
            tournament_id_param: tournament_id,
            action_type: action
          });
          break;
          
        case 'next_blind_level':
        case 'previous_blind_level':
        case 'set_blind_level':
          // Обновляем уровень блайндов
          const parameters = actionResult.level ? { level: actionResult.level } : {};
          await supabase.rpc('handle_voice_tournament_action', {
            tournament_id_param: tournament_id,
            action_type: action,
            parameters: parameters
          });
          break;
          
        case 'set_timer':
        case 'add_time':
        case 'remove_time':
        case 'reset_timer':
          // Обновляем таймер
          const minutes = actionResult.minutes || 0;
          let newTime = minutes * 60;
          
          if (action === 'add_time' && tournamentData?.timer_remaining) {
            newTime = tournamentData.timer_remaining + (minutes * 60);
          } else if (action === 'remove_time' && tournamentData?.timer_remaining) {
            newTime = Math.max(0, tournamentData.timer_remaining - (minutes * 60));
          } else if (action === 'reset_timer') {
            newTime = tournamentData?.timer_duration || 1200; // По умолчанию 20 минут
          }
          
          await supabase.rpc('update_tournament_timer', {
            tournament_id_param: tournament_id,
            new_timer_remaining: newTime
          });
          break;
          
        case 'start_timer':
        case 'stop_timer':
          // Управление таймером
          await supabase.rpc('handle_voice_tournament_action', {
            tournament_id_param: tournament_id,
            action_type: action
          });
          break;
          
        case 'start_break':
        case 'end_break':
        case 'extend_break':
          // Управление перерывами
          const breakParams = actionResult.duration || actionResult.minutes 
            ? { duration: actionResult.duration || actionResult.minutes } 
            : {};
          await supabase.rpc('handle_voice_tournament_action', {
            tournament_id_param: tournament_id,
            action_type: action,
            parameters: breakParams
          });
          break;
          
        case 'show_stats':
        case 'show_players':
        case 'show_payouts':
        case 'current_level_info':
        case 'next_level_info':
        case 'blind_structure_info':
        case 'time_remaining':
          // Триггерим показ информации через callback
          onStatusChange?.(action);
          break;
          
        case 'announcement':
        case 'silence_announcement':
        case 'last_hand_announcement':
        case 'one_minute_warning':
        case 'ten_minutes_warning':
        case 'five_minutes_warning':
          // Голосовые объявления
          if (actionResult.message) {
            await speakText(actionResult.message);
          }
          break;
          
        case 'help':
          // Показываем справку по командам
          onStatusChange?.('show_help');
          break;
      }
    } catch (error) {
      console.error('UI action error:', error);
      toast.error('Ошибка выполнения действия в интерфейсе');
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      toast.success('Слушаю команду...');

      // Auto-stop after 8 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopListening();
        }
      }, 8000);

    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsListening(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Convert to base64 for processing
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        addMessage({
          type: 'system',
          content: 'Распознаю речь...',
          timestamp: new Date()
        });

        // Use Whisper API for real transcription
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) {
          console.error('Transcription error:', error);
          toast.error('Ошибка распознавания речи');
          return;
        }

        const transcript = data?.text || "";
        if (transcript.trim()) {
          await processVoiceCommand(transcript);
        } else {
          toast.warning('Не удалось распознать команду');
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Ошибка распознавания речи');
    }
  };

  const quickCommand = async (command: string) => {
    await processVoiceCommand(command);
  };

  // Получение данных турнира в реальном времени
  useEffect(() => {
    if (!selectedTournament?.id) return;

    const fetchTournamentData = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select(`
            *,
            tournament_registrations(count)
          `)
          .eq('id', selectedTournament.id)
          .single();

        if (!error && data) {
          setTournamentData(data);
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
      }
    };

    fetchTournamentData();

    // Подписка на изменения турнира с дедупликацией
    const subscription = supabase
      .channel(`voice-tournament-${selectedTournament.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${selectedTournament.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // Обновляем данные только если они действительно изменились
          if (newData.updated_at !== tournamentData?.updated_at) {
            setTournamentData(newData);
            
            // Умные голосовые уведомления только для важных изменений
            if (oldData.status !== newData.status) {
              const statusMessages = {
                'playing': 'Турнир запущен',
                'paused': 'Турнир приостановлен',
                'finished': 'Турнир завершен',
                'registration': 'Открыта регистрация'
              };
              const message = statusMessages[newData.status] || `Статус изменен на ${newData.status}`;
              speakText(message);
            } else if (oldData.current_level !== newData.current_level) {
              // Получаем информацию об уровне из базы данных
              fetchAndAnnounceLevel(newData.current_level, newData.id);
            } else if (oldData.timer_remaining > 60 && newData.timer_remaining <= 60 && newData.timer_remaining > 0) {
              speakText('Внимание! До окончания уровня осталась одна минута');
            } else if (oldData.timer_remaining > 10 && newData.timer_remaining <= 10 && newData.timer_remaining > 0) {
              speakText('Внимание! До окончания уровня осталось 10 секунд');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedTournament?.id]);

  // Получение информации об уровне блайндов для объявления
  const fetchAndAnnounceLevel = async (level: number, tournamentId: string) => {
    try {
      const { data: blindLevel } = await supabase
        .from('blind_levels')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('level', level)
        .single();

      if (blindLevel) {
        if (blindLevel.is_break) {
          const duration = Math.floor(blindLevel.duration / 60);
          speakText(`Начинается перерыв на ${duration} минут`);
        } else {
          let announcement = `Переход на ${level} уровень блайндов. `;
          announcement += `Малый блайнд ${blindLevel.small_blind}, большой блайнд ${blindLevel.big_blind}`;
          if (blindLevel.ante && blindLevel.ante > 0) {
            announcement += `, анте ${blindLevel.ante}`;
          }
          speakText(announcement);
        }
      }
    } catch (error) {
      console.error('Error fetching blind level:', error);
      speakText(`Переход на ${level} уровень блайндов`);
    }
  };

  // Автоматические объявления времени
  useEffect(() => {
    if (!tournamentData?.timer_remaining || !selectedTournament?.id) return;

    const timeRemaining = tournamentData.timer_remaining;
    
    // Объявления на определенных отметках времени
    if (timeRemaining === 600) { // 10 минут
      speakText('До окончания уровня осталось 10 минут');
    } else if (timeRemaining === 300) { // 5 минут
      speakText('До окончания уровня осталось 5 минут');
    } else if (timeRemaining === 120) { // 2 минуты
      speakText('До окончания уровня осталось 2 минуты');
    } else if (timeRemaining === 60) { // 1 минута
      speakText('Внимание! До окончания уровня осталась одна минута');
    } else if (timeRemaining === 30) { // 30 секунд
      speakText('До окончания уровня осталось 30 секунд');
    } else if (timeRemaining === 10) { // 10 секунд
      speakText('Внимание! До окончания уровня осталось 10 секунд');
    }
  }, [tournamentData?.timer_remaining]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Главная панель управления */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-primary text-sm md:text-base">
            <Zap className="h-4 w-4 md:h-5 md:w-5" />
            Профессиональный голосовой ассистент
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          {/* Статус */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={selectedTournament ? "default" : "secondary"} className="text-xs">
                {selectedTournament ? "Активен" : "Ожидание"}
              </Badge>
              {isListening && (
                <Badge variant="outline" className="animate-pulse text-xs">
                  <Mic className="h-3 w-3 mr-1" />
                  Слушаю
                </Badge>
              )}
              {isSpeaking && (
                <Badge variant="outline" className="animate-pulse text-xs">
                  <Volume2 className="h-3 w-3 mr-1" />
                  Говорю
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {!isListening ? (
                <Button 
                  onClick={startListening} 
                  className="gap-2 flex-1 md:flex-initial"
                  disabled={!selectedTournament}
                  size="sm"
                >
                  <Mic className="h-4 w-4" />
                  <span className="hidden sm:inline">Дать команду</span>
                  <span className="sm:hidden">Команда</span>
                </Button>
              ) : (
                <Button 
                  onClick={stopListening} 
                  variant="outline" 
                  className="gap-2 flex-1 md:flex-initial"
                  size="sm"
                >
                  <MicOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Остановить</span>
                  <span className="sm:hidden">Стоп</span>
                </Button>
              )}
            </div>
          </div>

          {/* Выбор голоса */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium">Голос ассистента:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {voices.map((voice) => (
                <Button
                  key={voice.id}
                  variant={selectedVoice === voice.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedVoice(voice.id)}
                  className="justify-start text-xs p-2"
                >
                  {voice.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Турнир */}
          {selectedTournament && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">Активный турнир:</p>
              <p className="font-medium text-sm md:text-base">{selectedTournament.name}</p>
              {tournamentData && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Статус:</span>
                    <span className="ml-1 font-medium">{tournamentData.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Уровень:</span>
                    <span className="ml-1 font-medium">{tournamentData.current_level}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Блайнды:</span>
                    <span className="ml-1 font-medium">{tournamentData.current_small_blind}/{tournamentData.current_big_blind}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Таймер:</span>
                    <span className="ml-1 font-medium">
                      {tournamentData.timer_remaining ? 
                        `${Math.floor(tournamentData.timer_remaining / 60)}:${String(tournamentData.timer_remaining % 60).padStart(2, '0')}` : 
                        'Остановлен'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Быстрые команды */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-sm md:text-base">Управление турниром</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          {/* Основные команды */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Основные команды</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("какой текущий уровень блайндов")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Текущий уровень
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("какие следующие блайнды")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Следующий уровень
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("сколько времени осталось")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Время уровня
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("возобновить турнир")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Продолжить
              </Button>
            </div>
          </div>

          {/* Блайнды */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Блайнды</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("следующий уровень блайндов")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                След. уровень
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("предыдущий уровень блайндов")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Пред. уровень
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("установить уровень 5")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Уровень 5
              </Button>
            </div>
          </div>

          {/* Таймер */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Таймер</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("таймер 20 минут")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                20 мин
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("добавить время 5 минут")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                +5 мин
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("остановить таймер")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Стоп
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("запустить таймер")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Старт
              </Button>
            </div>
          </div>

          {/* Перерывы */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Перерывы</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("перерыв на 15 минут")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Перерыв 15м
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("перерыв на 30 минут")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Перерыв 30м
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("закончить перерыв")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Конец перерыва
              </Button>
            </div>
          </div>

          {/* Игроки и столы */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Игроки и столы</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("список игроков")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Игроки
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("перебалансировать столы")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Балансировка
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("лидеры чипов")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Чип-лидеры
              </Button>
            </div>
          </div>

          {/* Объявления */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Объявления</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("тишина")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Тишина
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("последняя рука")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Последняя рука
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("финальный стол")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Финал
              </Button>
            </div>
          </div>

          {/* Завершение */}
          <div className="space-y-2">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Завершение</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("выплаты")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Выплаты
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("награждение")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Награждение
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => quickCommand("завершить турнир")}
                disabled={!selectedTournament}
                className="text-xs p-2"
              >
                Завершить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Подсказки по командам */}
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-sm md:text-base">Голосовые команды</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-sm md:text-base">Управление турниром:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Запустить турнир"</li>
                <li>• "Поставить на паузу"</li>
                <li>• "Возобновить турнир"</li>
                <li>• "Завершить турнир"</li>
                <li>• "Показать статистику"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm md:text-base">Блайнды и таймер:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Следующий уровень"</li>
                <li>• "Установить уровень 5"</li>
                <li>• "Таймер 20 минут"</li>
                <li>• "Добавить время 5 минут"</li>
                <li>• "Остановить таймер"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm md:text-base">Игроки:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Список игроков"</li>
                <li>• "Исключить игрока Иван"</li>
                <li>• "Пересадить игрока на стол 3"</li>
                <li>• "Лидеры чипов"</li>
                <li>• "Перебалансировать столы"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm md:text-base">Объявления:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Тишина"</li>
                <li>• "Последняя рука"</li>
                <li>• "Перерыв на 15 минут"</li>
                <li>• "Финальный стол"</li>
                <li>• "Объявление [текст]"</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-muted rounded-lg">
            <p className="text-xs md:text-sm text-muted-foreground">
              💡 <strong>Совет:</strong> Говорите четко и естественно. Ассистент понимает команды на русском языке 
              и может выполнять сложные действия, такие как "Пересадить игрока Петров на стол номер 5".
            </p>
          </div>
        </CardContent>
      </Card>

      {/* История команд */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>История команд</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : message.type === 'assistant'
                      ? 'bg-secondary border'
                      : 'bg-muted border'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="flex-1">{message.content}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}