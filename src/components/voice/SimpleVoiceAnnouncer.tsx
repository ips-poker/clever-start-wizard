import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX } from 'lucide-react';
import { useSimpleVoiceAnnouncements } from '@/hooks/useSimpleVoiceAnnouncements';

interface SimpleVoiceAnnouncerProps {
  selectedTournament?: any;
}

export function SimpleVoiceAnnouncer({ selectedTournament }: SimpleVoiceAnnouncerProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  
  const { announceCustomMessage, stopAnnouncement } = useSimpleVoiceAnnouncements({ 
    enabled: isEnabled, 
    volume 
  });

  const testAnnouncement = () => {
    announceCustomMessage("Тестовое голосовое объявление. Система работает корректно.");
  };

  const quickCommands = [
    { text: "Начинается следующий уровень блайндов", label: "Следующий уровень" },
    { text: "Игроки, займите свои места за столами", label: "Места за столами" },
    { text: "До окончания уровня осталось 5 минут", label: "5 минут" },
    { text: "До окончания уровня осталась 1 минута", label: "1 минута" },
    { text: "Со следующей раздачи блайнды ап!", label: "Блайнды ап" },
    { text: "Начинается перерыв", label: "Перерыв" }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            Голосовые объявления
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Включено" : "Выключено"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Основные управления */}
          <div className="flex gap-2">
            <Button
              variant={isEnabled ? "default" : "outline"}
              onClick={() => setIsEnabled(!isEnabled)}
            >
              {isEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
              {isEnabled ? "Выключить" : "Включить"}
            </Button>
            
            <Button
              variant="outline"
              onClick={testAnnouncement}
              disabled={!isEnabled}
            >
              🔊 Тест
            </Button>
            
            <Button
              variant="outline"
              onClick={stopAnnouncement}
              disabled={!isEnabled}
            >
              ⏹️ Стоп
            </Button>
          </div>

          {/* Регулятор громкости */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Громкость: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Быстрые команды */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Быстрые объявления:</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickCommands.map((command, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => announceCustomMessage(command.text)}
                  disabled={!isEnabled}
                  className="text-xs"
                >
                  {command.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedTournament && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Активный турнир: {selectedTournament.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}