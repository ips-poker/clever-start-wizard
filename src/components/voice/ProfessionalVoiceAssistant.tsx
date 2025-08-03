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
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          action: 'process_command',
          text: transcript,
          tournament_id: selectedTournament?.id
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

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, 5000);

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
        
        // For now, simulate transcription - in real implementation, use Whisper API
        const simulatedTranscript = "показать статистику турнира"; // This would come from actual speech recognition
        
        addMessage({
          type: 'system',
          content: 'Обрабатываю голосовую команду...',
          timestamp: new Date()
        });

        await processVoiceCommand(simulatedTranscript);
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

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Главная панель управления */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" />
            Профессиональный голосовой ассистент
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Статус */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={selectedTournament ? "default" : "secondary"}>
                {selectedTournament ? "Активен" : "Ожидание"}
              </Badge>
              {isListening && (
                <Badge variant="outline" className="animate-pulse">
                  <Mic className="h-3 w-3 mr-1" />
                  Слушаю
                </Badge>
              )}
              {isSpeaking && (
                <Badge variant="outline" className="animate-pulse">
                  <Volume2 className="h-3 w-3 mr-1" />
                  Говорю
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {!isListening ? (
                <Button 
                  onClick={startListening} 
                  className="gap-2"
                  disabled={!selectedTournament}
                >
                  <Mic className="h-4 w-4" />
                  Дать команду
                </Button>
              ) : (
                <Button 
                  onClick={stopListening} 
                  variant="outline" 
                  className="gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  Остановить
                </Button>
              )}
            </div>
          </div>

          {/* Выбор голоса */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Голос ассистента:</p>
            <div className="grid grid-cols-2 gap-2">
              {voices.map((voice) => (
                <Button
                  key={voice.id}
                  variant={selectedVoice === voice.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedVoice(voice.id)}
                  className="justify-start"
                >
                  {voice.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Турнир */}
          {selectedTournament && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Активный турнир:</p>
              <p className="font-medium">{selectedTournament.name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Быстрые команды */}
      <Card>
        <CardHeader>
          <CardTitle>Управление турниром</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Основные команды */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Основные команды</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("показать статистику турнира")}
                disabled={!selectedTournament}
              >
                Статистика
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("поставить турнир на паузу")}
                disabled={!selectedTournament}
              >
                Пауза
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("возобновить турнир")}
                disabled={!selectedTournament}
              >
                Продолжить
              </Button>
            </div>
          </div>

          {/* Блайнды */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Блайнды</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("следующий уровень блайндов")}
                disabled={!selectedTournament}
              >
                Следующий уровень
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("предыдущий уровень блайндов")}
                disabled={!selectedTournament}
              >
                Предыдущий уровень
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("установить уровень 5")}
                disabled={!selectedTournament}
              >
                Уровень 5
              </Button>
            </div>
          </div>

          {/* Таймер */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Таймер</p>
            <div className="grid grid-cols-4 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("таймер 20 минут")}
                disabled={!selectedTournament}
              >
                20 мин
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("добавить время 5 минут")}
                disabled={!selectedTournament}
              >
                +5 мин
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("остановить таймер")}
                disabled={!selectedTournament}
              >
                Стоп
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("запустить таймер")}
                disabled={!selectedTournament}
              >
                Старт
              </Button>
            </div>
          </div>

          {/* Перерывы */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Перерывы</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("перерыв на 15 минут")}
                disabled={!selectedTournament}
              >
                Перерыв 15 мин
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("перерыв на 30 минут")}
                disabled={!selectedTournament}
              >
                Перерыв 30 мин
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("закончить перерыв")}
                disabled={!selectedTournament}
              >
                Конец перерыва
              </Button>
            </div>
          </div>

          {/* Игроки и столы */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Игроки и столы</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("список игроков")}
                disabled={!selectedTournament}
              >
                Список игроков
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("перебалансировать столы")}
                disabled={!selectedTournament}
              >
                Перебалансировка
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("лидеры чипов")}
                disabled={!selectedTournament}
              >
                Чип-лидеры
              </Button>
            </div>
          </div>

          {/* Объявления */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Объявления</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("тишина")}
                disabled={!selectedTournament}
              >
                Тишина
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("последняя рука")}
                disabled={!selectedTournament}
              >
                Последняя рука
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("финальный стол")}
                disabled={!selectedTournament}
              >
                Финальный стол
              </Button>
            </div>
          </div>

          {/* Завершение */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Завершение</p>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("выплаты")}
                disabled={!selectedTournament}
              >
                Выплаты
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => quickCommand("награждение")}
                disabled={!selectedTournament}
              >
                Награждение
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => quickCommand("завершить турнир")}
                disabled={!selectedTournament}
              >
                Завершить турнир
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Подсказки по командам */}
      <Card>
        <CardHeader>
          <CardTitle>Голосовые команды</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Управление турниром:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Запустить турнир"</li>
                <li>• "Поставить на паузу"</li>
                <li>• "Возобновить турнир"</li>
                <li>• "Завершить турнир"</li>
                <li>• "Показать статистику"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Блайнды и таймер:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Следующий уровень"</li>
                <li>• "Установить уровень 5"</li>
                <li>• "Таймер 20 минут"</li>
                <li>• "Добавить время 5 минут"</li>
                <li>• "Остановить таймер"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Игроки:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Список игроков"</li>
                <li>• "Исключить игрока Иван"</li>
                <li>• "Пересадить игрока на стол 3"</li>
                <li>• "Лидеры чипов"</li>
                <li>• "Перебалансировать столы"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Объявления:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Тишина"</li>
                <li>• "Последняя рука"</li>
                <li>• "Перерыв на 15 минут"</li>
                <li>• "Финальный стол"</li>
                <li>• "Объявление [текст]"</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
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