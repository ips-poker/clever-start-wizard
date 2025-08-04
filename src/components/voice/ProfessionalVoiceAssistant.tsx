import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  Settings, 
  Play, 
  Square, 
  Trash2,
  Users,
  Timer,
  Coffee,
  Trophy,
  AlertTriangle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { useProfessionalVoiceAssistant, VoiceSettings } from '@/hooks/useProfessionalVoiceAssistant';

interface ProfessionalVoiceAssistantProps {
  selectedTournament?: any;
  currentTime?: number;
  timerActive?: boolean;
  registrations?: any[];
}

export function ProfessionalVoiceAssistant({ 
  selectedTournament, 
  currentTime = 0,
  timerActive = false,
  registrations = []
}: ProfessionalVoiceAssistantProps) {
  const [settings, setSettings] = useState<VoiceSettings>({
    enabled: true,
    volume: 0.8,
    language: 'ru-RU',
    voice: null,
    autoAnnouncements: true,
    debugMode: false,
    useElevenLabs: false,
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB' // Adam voice
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const {
    isPlaying,
    queueLength,
    lastAnnouncement,
    announceCustomMessage,
    testVoice,
    stopAll,
    clearQueue,
    announceNewLevel,
    announceTimeWarning,
    announcePlayerAction
  } = useProfessionalVoiceAssistant(settings);

  // Загрузка доступных голосов
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        const russianVoices = voices.filter(voice => 
          voice.lang.includes('ru') || voice.name.toLowerCase().includes('russia')
        );
        setAvailableVoices(russianVoices.length > 0 ? russianVoices : voices.slice(0, 10));
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Быстрые команды для турнирного директора
  const quickCommands = [
    { 
      id: 'shuffle_deal', 
      text: "Перетасовка и раздача! Турнир начинается!", 
      label: "Начало турнира",
      icon: Trophy,
      category: 'tournament'
    },
    { 
      id: 'seats_please', 
      text: "Игроки, займите свои места за столами", 
      label: "Места за столами",
      icon: Users,
      category: 'players'
    },
    { 
      id: 'break_over', 
      text: "Перерыв окончен. Игроки, займите свои места за столами.", 
      label: "Конец перерыва",
      icon: CheckCircle,
      category: 'break'
    },
    { 
      id: 'blinds_up_5min', 
      text: "До повышения блайндов осталось 5 минут", 
      label: "5 минут до блайндов",
      icon: Timer,
      category: 'time'
    },
    { 
      id: 'blinds_up_1min', 
      text: "До повышения блайндов осталась 1 минута", 
      label: "1 минута до блайндов",
      icon: AlertTriangle,
      category: 'time'
    },
    { 
      id: 'blinds_up', 
      text: "Со следующей раздачи блайнды ап!", 
      label: "Блайнды ап!",
      icon: RotateCcw,
      category: 'blinds'
    },
    { 
      id: 'break_start', 
      text: "Начинается перерыв", 
      label: "Начало перерыва",
      icon: Coffee,
      category: 'break'
    },
    { 
      id: 'final_table', 
      text: "Собирается финальный стол! Поздравляем финалистов!", 
      label: "Финальный стол",
      icon: Trophy,
      category: 'tournament'
    }
  ];

  const updateSetting = <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleVolumeChange = (value: number[]) => {
    updateSetting('volume', value[0]);
  };

  const categories = {
    tournament: { label: 'Турнир', color: 'bg-yellow-100 text-yellow-800' },
    players: { label: 'Игроки', color: 'bg-blue-100 text-blue-800' },
    break: { label: 'Перерыв', color: 'bg-orange-100 text-orange-800' },
    time: { label: 'Время', color: 'bg-red-100 text-red-800' },
    blinds: { label: 'Блайнды', color: 'bg-green-100 text-green-800' }
  };

  return (
    <div className="space-y-6">
      {/* Основная панель управления */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {settings.enabled ? (
                <Volume2 className="w-5 h-5 text-green-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-red-600" />
              )}
              Профессиональный голосовой помощник
              <div className="flex gap-2">
                <Badge variant={settings.enabled ? "default" : "secondary"}>
                  {settings.enabled ? "Включен" : "Выключен"}
                </Badge>
                {isPlaying && (
                  <Badge variant="destructive" className="animate-pulse">
                    <Mic className="w-3 h-3 mr-1" />
                    Говорит
                  </Badge>
                )}
                {queueLength > 0 && (
                  <Badge variant="outline">
                    В очереди: {queueLength}
                  </Badge>
                )}
              </div>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Основные управления */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={settings.enabled ? "default" : "outline"}
              onClick={() => updateSetting('enabled', !settings.enabled)}
              className="flex items-center gap-2"
            >
              {settings.enabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              {settings.enabled ? "Выключить" : "Включить"}
            </Button>
            
            <Button
              variant="outline"
              onClick={testVoice}
              disabled={!settings.enabled}
            >
              <Play className="w-4 h-4 mr-2" />
              Тест голоса
            </Button>
            
            <Button
              variant="outline"
              onClick={stopAll}
              disabled={!settings.enabled || (!isPlaying && queueLength === 0)}
            >
              <Square className="w-4 h-4 mr-2" />
              Остановить все
            </Button>

            {queueLength > 0 && (
              <Button
                variant="outline"
                onClick={clearQueue}
                disabled={!settings.enabled}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить очередь
              </Button>
            )}
          </div>

          {/* Настройки */}
          {showSettings && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Громкость: {Math.round(settings.volume * 100)}%</Label>
                <Slider
                  value={[settings.volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {availableVoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Голос</Label>
                  <Select
                    value={settings.voice || "default"}
                    onValueChange={(value) => updateSetting('voice', value === "default" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите голос" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">По умолчанию</SelectItem>
                      {availableVoices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-announcements"
                  checked={settings.autoAnnouncements}
                  onCheckedChange={(checked) => updateSetting('autoAnnouncements', checked)}
                />
                <Label htmlFor="auto-announcements">
                  Автоматические объявления времени
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="debug-mode"
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => updateSetting('debugMode', checked)}
                />
                <Label htmlFor="debug-mode">
                  Режим отладки (логи в консоли)
                </Label>
              </div>
            </div>
          )}

          {/* Статус */}
          {lastAnnouncement && (
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-sm text-blue-600">Последнее объявление:</div>
              <div className="text-sm text-blue-800 mt-1">{lastAnnouncement}</div>
            </div>
          )}

          <Separator />

          {/* Быстрые команды */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Быстрые объявления:</h4>
            
            {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
              const commandsInCategory = quickCommands.filter(cmd => cmd.category === categoryKey);
              if (commandsInCategory.length === 0) return null;

              return (
                <div key={categoryKey} className="space-y-2">
                  <Badge className={categoryInfo.color} variant="outline">
                    {categoryInfo.label}
                  </Badge>
                  <div className="grid grid-cols-2 gap-2">
                    {commandsInCategory.map((command) => {
                      const IconComponent = command.icon;
                      return (
                        <Button
                          key={command.id}
                          variant="outline"
                          size="sm"
                          onClick={() => announceCustomMessage(command.text, 'medium')}
                          disabled={!settings.enabled}
                          className="flex items-center gap-2 text-xs h-auto py-2 px-3"
                        >
                          <IconComponent className="w-3 h-3" />
                          {command.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Информация о турнире */}
          {selectedTournament && (
            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Активный турнир: <span className="font-medium">{selectedTournament.name}</span></div>
                <div>Уровень: <span className="font-medium">{selectedTournament.current_level}</span></div>
                <div>Игроков: <span className="font-medium">{registrations.length}</span></div>
                {timerActive && (
                  <div className="text-green-600">Таймер активен: {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}