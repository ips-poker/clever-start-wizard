import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Volume2, Mic, Globe, Zap, Clock, Speaker, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface VoiceSettingsData {
  voice_enabled: boolean;
  voice_language: string;
  confidence_threshold: number;
  auto_confirm_critical: boolean;
  volume_level: number;
  voice_speed: number;
  voice_provider: 'system' | 'elevenlabs';
  elevenlabs_voice: string;
  warning_intervals: {
    five_minutes: boolean;
    two_minutes: boolean;
    one_minute: boolean;
    thirty_seconds: boolean;
    ten_seconds: boolean;
  };
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

const elevenLabsVoices = [
  { value: 'Aria', label: 'Aria (женский, английский)' },
  { value: 'Roger', label: 'Roger (мужской, английский)' },
  { value: 'Sarah', label: 'Sarah (женский, английский)' },
  { value: 'George', label: 'George (мужской, английский)' },
  { value: 'Charlotte', label: 'Charlotte (женский, английский)' }
];

export function VoiceSettings({ onSettingsChange }: VoiceSettingsProps) {
  const [settings, setSettings] = useState<VoiceSettingsData>({
    voice_enabled: true,
    voice_language: 'ru',
    confidence_threshold: 0.7,
    auto_confirm_critical: false,
    volume_level: 80,
    voice_speed: 1.0,
    voice_provider: 'elevenlabs',
    elevenlabs_voice: 'Aria',
    warning_intervals: {
      five_minutes: true,
      two_minutes: true,
      one_minute: true,
      thirty_seconds: true,
      ten_seconds: true
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom intervals state
  const [customIntervals, setCustomIntervals] = useState<Array<{id?: string, seconds: number, message: string}>>([]);
  const [newInterval, setNewInterval] = useState({ seconds: 180, message: '' });

  useEffect(() => {
    loadSettings();
    loadCustomIntervals();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, using default settings');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('voice_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          voice_enabled: data.voice_enabled ?? true,
          voice_language: data.voice_language ?? 'ru',
          confidence_threshold: data.confidence_threshold ?? 0.7,
          auto_confirm_critical: data.auto_confirm_critical ?? false,
          volume_level: data.volume_level ?? 80,
          voice_speed: data.voice_speed ?? 1.0,
          voice_provider: (data.voice_provider as 'system' | 'elevenlabs') ?? 'elevenlabs',
          elevenlabs_voice: data.elevenlabs_voice ?? 'Aria',
          warning_intervals: (typeof data.warning_intervals === 'object' && data.warning_intervals !== null) 
            ? data.warning_intervals as {
                five_minutes: boolean;
                two_minutes: boolean;
                one_minute: boolean;
                thirty_seconds: boolean;
                ten_seconds: boolean;
              }
            : {
                five_minutes: true,
                two_minutes: true,
                one_minute: true,
                thirty_seconds: true,
                ten_seconds: true
              }
        });
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
      toast.error('Ошибка загрузки настроек голосового управления');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomIntervals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('voice_time_intervals')
        .select('*')
        .eq('user_id', user.id)
        .order('seconds', { ascending: false });

      if (data) {
        setCustomIntervals(data);
      }
    } catch (error) {
      console.error('Error loading custom intervals:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Необходимо войти в систему');
        return;
      }

      // Проверяем, есть ли уже настройки для пользователя
      const { data: existingSettings } = await supabase
        .from('voice_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const settingsToSave = {
        voice_enabled: settings.voice_enabled,
        voice_language: settings.voice_language,
        confidence_threshold: settings.confidence_threshold,
        auto_confirm_critical: settings.auto_confirm_critical,
        volume_level: settings.volume_level,
        voice_speed: settings.voice_speed,
        voice_provider: settings.voice_provider,
        elevenlabs_voice: settings.elevenlabs_voice,
        warning_intervals: settings.warning_intervals,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingSettings) {
        // Обновляем существующую запись
        ({ error } = await supabase
          .from('voice_settings')
          .update(settingsToSave)
          .eq('user_id', user.id));
      } else {
        // Создаем новую запись
        ({ error } = await supabase
          .from('voice_settings')
          .insert([{
            ...settingsToSave,
            user_id: user.id
          }]));
      }

      if (error) throw error;

      toast.success('Настройки голосового управления сохранены');
      onSettingsChange?.(settings);
      
      // Принудительно перезагружаем настройки, чтобы они применились везде
      setTimeout(() => {
        window.location.reload();
      }, 500);
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

  const addCustomInterval = async () => {
    if (!newInterval.message.trim() || newInterval.seconds <= 0) {
      toast.error('Заполните все поля корректно');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('voice_time_intervals')
        .insert([{
          user_id: user.id,
          name: `За ${Math.floor(newInterval.seconds / 60)} мин ${newInterval.seconds % 60} сек`,
          seconds: newInterval.seconds,
          message: newInterval.message,
          is_active: true
        }]);

      if (error) throw error;

      toast.success('Интервал добавлен');
      setNewInterval({ seconds: 180, message: '' });
      loadCustomIntervals();
    } catch (error) {
      console.error('Error adding interval:', error);
      toast.error('Ошибка добавления интервала');
    }
  };

  const removeCustomInterval = async (id: string) => {
    try {
      const { error } = await supabase
        .from('voice_time_intervals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Интервал удален');
      loadCustomIntervals();
    } catch (error) {
      console.error('Error removing interval:', error);
      toast.error('Ошибка удаления интервала');
    }
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

        {/* Настройки голосового движка */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Speaker className="h-4 w-4" />
            Голосовой движок
          </Label>
          <Select
            value={settings.voice_provider}
            onValueChange={(value: 'system' | 'elevenlabs') => updateSetting('voice_provider', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите голосовой движок" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Системный голос</SelectItem>
              <SelectItem value="elevenlabs">ElevenLabs AI</SelectItem>
            </SelectContent>
          </Select>
          
          {settings.voice_provider === 'elevenlabs' && (
            <div className="space-y-2 ml-4">
              <Label>Голос ElevenLabs</Label>
              <Select
                value={settings.elevenlabs_voice}
                onValueChange={(value) => updateSetting('elevenlabs_voice', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите голос" />
                </SelectTrigger>
                <SelectContent>
                  {elevenLabsVoices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Настройки временных интервалов */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Временные предупреждения
          </Label>
          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">За 5 минут до окончания уровня</Label>
              <Switch
                checked={settings.warning_intervals.five_minutes}
                onCheckedChange={(checked) => 
                  updateSetting('warning_intervals', { ...settings.warning_intervals, five_minutes: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">За 2 минуты до окончания уровня</Label>
              <Switch
                checked={settings.warning_intervals.two_minutes}
                onCheckedChange={(checked) => 
                  updateSetting('warning_intervals', { ...settings.warning_intervals, two_minutes: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">За 1 минуту до окончания уровня</Label>
              <Switch
                checked={settings.warning_intervals.one_minute}
                onCheckedChange={(checked) => 
                  updateSetting('warning_intervals', { ...settings.warning_intervals, one_minute: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">За 30 секунд до окончания уровня</Label>
              <Switch
                checked={settings.warning_intervals.thirty_seconds}
                onCheckedChange={(checked) => 
                  updateSetting('warning_intervals', { ...settings.warning_intervals, thirty_seconds: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">За 10 секунд до окончания уровня</Label>
              <Switch
                checked={settings.warning_intervals.ten_seconds}
                onCheckedChange={(checked) => 
                  updateSetting('warning_intervals', { ...settings.warning_intervals, ten_seconds: checked })
                }
              />
            </div>
          </div>
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
          <p className="text-xs text-muted-foreground mt-2">
            Вы можете добавить свои собственные команды в разделе "Пользовательские команды"
          </p>
        </div>

        {/* Custom Time Intervals */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Дополнительные временные интервалы
          </Label>
          
          {/* Add new interval */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Время (секунды)</Label>
                <Input
                  type="number"
                  value={newInterval.seconds}
                  onChange={(e) => setNewInterval({...newInterval, seconds: parseInt(e.target.value) || 0})}
                  placeholder="180"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">Сообщение</Label>
                <div className="flex gap-2">
                  <Input
                    value={newInterval.message}
                    onChange={(e) => setNewInterval({...newInterval, message: e.target.value})}
                    placeholder="Внимание! До окончания уровня осталось 3 минуты."
                  />
                  <Button size="sm" onClick={addCustomInterval}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* List of custom intervals */}
          {customIntervals.length > 0 && (
            <div className="space-y-2">
              {customIntervals.map((interval) => (
                <div key={interval.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{Math.floor(interval.seconds / 60)}мин {interval.seconds % 60}сек</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{interval.message}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => removeCustomInterval(interval.id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}