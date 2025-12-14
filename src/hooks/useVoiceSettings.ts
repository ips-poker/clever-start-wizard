import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceSettings {
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

const defaultSettings: VoiceSettings = {
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
};

export const useVoiceSettings = () => {
  const [settings, setSettings] = useState<VoiceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const authResponse = await supabase.auth.getUser();
      const user = authResponse?.data?.user;
      
      if (!user) {
        console.log('No authenticated user found');
        setSettings(defaultSettings);
        setIsLoading(false);
        return defaultSettings;
      }

      const { data, error } = await supabase
        .from('voice_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading voice settings:', error);
        setSettings(defaultSettings);
        setIsLoading(false);
        return defaultSettings;
      }

      const loadedSettings = data ? {
        voice_enabled: data.voice_enabled ?? defaultSettings.voice_enabled,
        voice_language: data.voice_language ?? defaultSettings.voice_language,
        confidence_threshold: data.confidence_threshold ?? defaultSettings.confidence_threshold,
        auto_confirm_critical: data.auto_confirm_critical ?? defaultSettings.auto_confirm_critical,
        volume_level: data.volume_level ?? defaultSettings.volume_level,
        voice_speed: data.voice_speed ?? defaultSettings.voice_speed,
        voice_provider: (data.voice_provider as 'system' | 'elevenlabs') ?? defaultSettings.voice_provider,
        elevenlabs_voice: data.elevenlabs_voice ?? defaultSettings.elevenlabs_voice,
        warning_intervals: (typeof data.warning_intervals === 'object' && data.warning_intervals !== null)
          ? data.warning_intervals as VoiceSettings['warning_intervals']
          : defaultSettings.warning_intervals
      } : defaultSettings;

      setSettings(loadedSettings);
      setIsLoading(false);
      return loadedSettings;
    } catch (error) {
      console.error('Error loading voice settings:', error);
      setSettings(defaultSettings);
      setIsLoading(false);
      return defaultSettings;
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const initialize = async () => {
      await loadSettings();
      
      if (!isMounted) return;

      // Подписка на realtime обновления настроек
      try {
        const authResponse = await supabase.auth.getUser();
        const user = authResponse?.data?.user;
        
        if (user && isMounted) {
          channel = supabase
            .channel(`voice_settings_changes_${user.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'voice_settings',
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                if (isMounted) {
                  console.log('Voice settings changed via realtime:', payload);
                  loadSettings();
                }
              }
            )
            .subscribe();
        }
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const updateSettings = async (newSettings: VoiceSettings) => {
    console.log('Updating voice settings:', newSettings);
    setSettings(newSettings);
    // Синхронизируем с базой данных
    await saveSettingsToDatabase(newSettings);
    // Ждем сохранения и принудительно перезагружаем
    setTimeout(async () => {
      await loadSettings();
    }, 200);
  };

  const saveSettingsToDatabase = async (settingsToSave: VoiceSettings) => {
    try {
      const authResponse = await supabase.auth.getUser();
      const user = authResponse?.data?.user;
      
      if (!user) {
        console.log('No user found, cannot save settings');
        return;
      }

      const { data: existingSettings } = await supabase
        .from('voice_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const dbSettings = {
        voice_enabled: settingsToSave.voice_enabled,
        voice_language: settingsToSave.voice_language,
        confidence_threshold: settingsToSave.confidence_threshold,
        auto_confirm_critical: settingsToSave.auto_confirm_critical,
        volume_level: settingsToSave.volume_level,
        voice_speed: settingsToSave.voice_speed,
        voice_provider: settingsToSave.voice_provider,
        elevenlabs_voice: settingsToSave.elevenlabs_voice,
        warning_intervals: settingsToSave.warning_intervals,
        updated_at: new Date().toISOString()
      };

      if (existingSettings) {
        await supabase
          .from('voice_settings')
          .update(dbSettings)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('voice_settings')
          .insert([{
            ...dbSettings,
            user_id: user.id
          }]);
      }
    } catch (error) {
      console.error('Error saving settings to database:', error);
    }
  };

  return {
    settings,
    isLoading,
    loadSettings,
    updateSettings,
    saveSettingsToDatabase
  };
};