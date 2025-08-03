import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceTournamentInterface } from '@/utils/VoiceInterface';

interface VoiceMessage {
  type: 'user_speech' | 'transcript' | 'system';
  content: string;
  timestamp: Date;
}

interface VoiceControlProps {
  selectedTournament?: any;
}

export function VoiceControl({ selectedTournament }: VoiceControlProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const voiceInterface = useRef<VoiceTournamentInterface | null>(null);

  const handleMessage = (message: VoiceMessage) => {
    setMessages(prev => [...prev.slice(-9), message]); // Keep last 10 messages
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      toast.success('Голосовой интерфейс подключен');
      setIsListening(true);
    } else {
      toast.error('Голосовой интерфейс отключен');
      setIsListening(false);
    }
  };

  const handleSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  useEffect(() => {
    voiceInterface.current = new VoiceTournamentInterface(
      handleMessage,
      handleConnectionChange,
      handleSpeakingChange
    );

    return () => {
      voiceInterface.current?.disconnect();
    };
  }, []);

  const startVoiceControl = async () => {
    try {
      await voiceInterface.current?.connect();
    } catch (error) {
      console.error('Error starting voice control:', error);
      toast.error('Ошибка подключения голосового интерфейса');
    }
  };

  const stopVoiceControl = () => {
    voiceInterface.current?.disconnect();
    setMessages([]);
  };

  const sendTestCommand = (command: string) => {
    try {
      voiceInterface.current?.sendTextMessage(command);
      handleMessage({
        type: 'user_speech',
        content: command,
        timestamp: new Date()
      });
    } catch (error) {
      toast.error('Ошибка отправки команды');
    }
  };

  return (
    <div className="space-y-6">
      {/* Управление голосовым интерфейсом */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Голосовое управление турнирами
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Статус подключения */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Подключено" : "Отключено"}
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
              {!isConnected ? (
                <Button onClick={startVoiceControl} className="gap-2">
                  <Mic className="h-4 w-4" />
                  Запустить голосовое управление
                </Button>
              ) : (
                <Button onClick={stopVoiceControl} variant="outline" className="gap-2">
                  <MicOff className="h-4 w-4" />
                  Остановить
                </Button>
              )}
            </div>
          </div>

          {/* Текущий турнир */}
          {selectedTournament && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Активный турнир:</p>
              <p className="font-medium">{selectedTournament.name}</p>
              <Badge variant={selectedTournament.status === 'running' ? 'default' : 'secondary'}>
                {selectedTournament.status === 'running' ? 'Активен' : 
                 selectedTournament.status === 'pending' ? 'Ожидание' : 'Завершен'}
              </Badge>
            </div>
          )}

          {/* Быстрые команды */}
          {isConnected && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Быстрые команды:</p>
              
              {/* Управление турниром */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Управление турниром:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Покажи статистику турнира")}
                  >
                    Статистика
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Поставить турнир на паузу")}
                  >
                    Пауза
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Перерыв на 15 минут")}
                  >
                    Перерыв 15 мин
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Завершить перерыв")}
                  >
                    Завершить перерыв
                  </Button>
                </div>
              </div>

              {/* Блайнды и время */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Блайнды и время:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Следующий уровень блайндов")}
                  >
                    Следующий уровень
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Предыдущий уровень блайндов")}
                  >
                    Предыдущий уровень
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Добавить 5 минут к таймеру")}
                  >
                    +5 минут
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Установить таймер на 20 минут")}
                  >
                    Таймер 20 мин
                  </Button>
                </div>
              </div>

              {/* Игроки */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Игроки:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Покажи список игроков")}
                  >
                    Список игроков
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Показать топ игроков")}
                  >
                    Топ игроков
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Добавить ребай для Алексей")}
                  >
                    Добавить ребай
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Добавить адон для Алексей")}
                  >
                    Добавить адон
                  </Button>
                </div>
              </div>

              {/* Дополнительные функции */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Дополнительно:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Показать структуру выплат")}
                  >
                    Выплаты
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Сделать объявление внимание игроки")}
                  >
                    Объявление
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Изменить громкость на 80")}
                  >
                    Громкость 80%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendTestCommand("Экспорт результатов в PDF")}
                  >
                    Экспорт PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* История сообщений */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              История команд
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm ${
                    message.type === 'user_speech'
                      ? 'bg-primary/10 text-primary'
                      : message.type === 'transcript'
                      ? 'bg-muted'
                      : 'bg-secondary'
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

      {/* Справка по командам */}
      <Card>
        <CardHeader>
          <CardTitle>Доступные голосовые команды</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Управление турниром:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Начать/запустить турнир"</li>
                <li>• "Поставить на паузу"</li>
                <li>• "Возобновить турнир"</li>
                <li>• "Завершить турнир"</li>
                <li>• "Перерыв на [X] минут"</li>
                <li>• "Завершить перерыв"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Блайнды и время:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Следующий уровень блайндов"</li>
                <li>• "Предыдущий уровень"</li>
                <li>• "Установить таймер на [X] минут"</li>
                <li>• "Добавить [X] минут"</li>
                <li>• "Убавить [X] минут"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Игроки:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Добавить игрока [имя]"</li>
                <li>• "Удалить игрока [имя]"</li>
                <li>• "Показать список игроков"</li>
                <li>• "Добавить ребай для [имя]"</li>
                <li>• "Добавить адон для [имя]"</li>
                <li>• "Показать топ игроков"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Дополнительно:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Показать структуру выплат"</li>
                <li>• "Сделать объявление [текст]"</li>
                <li>• "Изменить громкость на [X]"</li>
                <li>• "Экспорт результатов в PDF"</li>
                <li>• "Покажи статистику"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}