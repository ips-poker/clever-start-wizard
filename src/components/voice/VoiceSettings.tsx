import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Volume2, Mic, Globe, Zap } from 'lucide-react';

interface VoiceSettingsData {
  voice_enabled: boolean;
  voice_language: string;
  confidence_threshold: number;
  auto_confirm_critical: boolean;
  volume_level: number;
  voice_speed: number;
}

interface VoiceSettingsProps {
  onSettingsChange?: (settings: VoiceSettingsData) => void;
}

const languages = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' }
];

export function VoiceSettings({ onSettingsChange }: VoiceSettingsProps) {
  const [settings, setSettings] = useState<VoiceSettingsData>({
    voice_enabled: true,
    voice_language: 'ru',
    confidence_threshold: 0.7,
    auto_confirm_critical: false,
    volume_level: 80,
    voice_speed: 1.0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('voice_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          voice_enabled: data.voice_enabled,
          voice_language: data.voice_language,
          confidence_threshold: data.confidence_threshold,
          auto_confirm_critical: data.auto_confirm_critical,
          volume_level: data.volume_level,
          voice_speed: data.voice_speed
        });
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
      toast.error('Ошибка загрузки настроек голосового управления');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('voice_settings')
        .upsert([settings]);

      if (error) throw error;

      toast.success('Настройки голосового управления сохранены');
      onSettingsChange?.(settings);
    } catch (error) {
      console.error('Error saving voice settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof VoiceSettingsData>(
    key: K,
    value: VoiceSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки голосового управления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Загрузка настроек...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Настройки голосового управления
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Основные настройки */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Голосовое управление
              </Label>
              <p className="text-sm text-muted-foreground">
                Включить/выключить голосовые команды
              </p>
            </div>
            <Switch
              checked={settings.voice_enabled}
              onCheckedChange={(checked) => updateSetting('voice_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Автоподтверждение критичных операций</Label>
              <p className="text-sm text-muted-foreground">
                Автоматически подтверждать команды завершения турнира
              </p>
            </div>
            <Switch
              checked={settings.auto_confirm_critical}
              onCheckedChange={(checked) => updateSetting('auto_confirm_critical', checked)}
            />
          </div>
        </div>

        {/* Языковые настройки */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Язык голосового управления
          </Label>
          <Select
            value={settings.voice_language}
            onValueChange={(value) => updateSetting('voice_language', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите язык" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Настройки распознавания */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Порог уверенности распознавания: {Math.round(settings.confidence_threshold * 100)}%
          </Label>
          <Slider
            value={[settings.confidence_threshold]}
            onValueChange={([value]) => updateSetting('confidence_threshold', value)}
            min={0.5}
            max={1.0}
            step={0.05}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Минимальная уверенность для выполнения голосовых команд
          </p>
        </div>

        {/* Настройки звука */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Громкость голосовых ответов: {settings.volume_level}%
          </Label>
          <Slider
            value={[settings.volume_level]}
            onValueChange={([value]) => updateSetting('volume_level', value)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label>Скорость речи: {settings.voice_speed}x</Label>
          <Slider
            value={[settings.voice_speed]}
            onValueChange={([value]) => updateSetting('voice_speed', value)}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Скорость воспроизведения голосовых ответов
          </p>
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={loadSettings}
            disabled={isSaving}
          >
            Сброс
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </div>

        {/* Информация о голосовых командах */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Доступные голосовые команды:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <strong>Турнир:</strong> запустить, остановить, завершить
            </div>
            <div>
              <strong>Блайнды:</strong> следующий уровень, предыдущий
            </div>
            <div>
              <strong>Время:</strong> добавить минуты, установить таймер
            </div>
            <div>
              <strong>Игроки:</strong> добавить, показать список, ребай
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}