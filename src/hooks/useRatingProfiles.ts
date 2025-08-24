import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RatingSystemConfig, RatingProfile, DEFAULT_CONFIG } from './useRatingSystemConfig';

export function useRatingProfiles() {
  const [profiles, setProfiles] = useState<RatingProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<RatingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data: profilesData } = await supabase
        .from('cms_settings')
        .select('*')
        .eq('category', 'rating_profiles')
        .order('created_at', { ascending: false });

      if (profilesData && profilesData.length > 0) {
        const parsedProfiles = profilesData.map(item => ({
          id: item.setting_key,
          name: item.setting_key,
          description: item.description || '',
          config: JSON.parse(item.setting_value),
          tournament_types: JSON.parse(item.setting_value).tournament_types || [],
          is_default: item.setting_key === 'default_profile',
          created_at: item.created_at,
          updated_at: item.updated_at,
          usage_count: 0,
          avg_rating_change: 0
        }));
        
        setProfiles(parsedProfiles);
        
        const defaultProfile = parsedProfiles.find(p => p.is_default);
        if (defaultProfile) {
          setActiveProfile(defaultProfile);
        }
      } else {
        // Создаем профиль по умолчанию
        await createDefaultProfile();
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      // Fallback к локальному хранилищу
      const savedProfiles = localStorage.getItem('ratingProfiles');
      if (savedProfiles) {
        setProfiles(JSON.parse(savedProfiles));
      } else {
        await createDefaultProfile();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    const defaultProfile: RatingProfile = {
      id: 'default_profile',
      name: 'Профессиональный профиль',
      description: 'Продвинутая конфигурация рейтинговой системы для профессиональных турниров',
      config: DEFAULT_CONFIG,
      tournament_types: ['standard', 'freezeout', 'deepstack', 'turbo'],
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      avg_rating_change: 0
    };

    try {
      await saveProfile(defaultProfile);
    } catch (error) {
      console.error('Error creating default profile:', error);
      setProfiles([defaultProfile]);
      setActiveProfile(defaultProfile);
    }
  };

  const saveProfile = async (profile: RatingProfile) => {
    try {
      // Сначала проверяем существует ли запись
      const { data: existingProfile } = await supabase
        .from('cms_settings')
        .select('id')
        .eq('setting_key', profile.id)
        .eq('category', 'rating_profiles')
        .single();

      let error;
      if (existingProfile) {
        // Обновляем существующую запись
        const result = await supabase
          .from('cms_settings')
          .update({
            setting_value: JSON.stringify(profile.config),
            setting_type: 'json',
            description: profile.description,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', profile.id)
          .eq('category', 'rating_profiles');
        error = result.error;
      } else {
        // Создаем новую запись
        const result = await supabase
          .from('cms_settings')
          .insert({
            setting_key: profile.id,
            setting_value: JSON.stringify(profile.config),
            setting_type: 'json',
            category: 'rating_profiles',
            description: profile.description
          });
        error = result.error;
      }

      if (error) throw error;

      const updatedProfile = { ...profile, updated_at: new Date().toISOString() };
      
      setProfiles(prev => {
        const existing = prev.find(p => p.id === profile.id);
        if (existing) {
          return prev.map(p => p.id === profile.id ? updatedProfile : p);
        } else {
          return [...prev, updatedProfile];
        }
      });

      // Также дублируем в локальное хранилище
      const allProfiles = profiles.map(p => p.id === profile.id ? updatedProfile : p);
      if (!allProfiles.find(p => p.id === profile.id)) {
        allProfiles.push(updatedProfile);
      }
      localStorage.setItem('ratingProfiles', JSON.stringify(allProfiles));

      return { success: true };
    } catch (error) {
      console.error('Error saving profile:', error);
      
      // Fallback к локальному хранилищу
      try {
        const updatedProfile = { ...profile, updated_at: new Date().toISOString() };
        const existingProfiles = JSON.parse(localStorage.getItem('ratingProfiles') || '[]');
        const updatedProfiles = existingProfiles.find((p: RatingProfile) => p.id === profile.id)
          ? existingProfiles.map((p: RatingProfile) => p.id === profile.id ? updatedProfile : p)
          : [...existingProfiles, updatedProfile];
        
        localStorage.setItem('ratingProfiles', JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
        
        return { success: true, fallback: true };
      } catch (localError) {
        return { success: false, error: localError };
      }
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (profiles.find(p => p.id === profileId)?.is_default) {
      throw new Error('Нельзя удалить профиль по умолчанию');
    }

    try {
      const { error } = await supabase
        .from('cms_settings')
        .delete()
        .eq('setting_key', profileId)
        .eq('category', 'rating_profiles');

      if (error) throw error;

      setProfiles(prev => prev.filter(p => p.id !== profileId));
      
      if (activeProfile?.id === profileId) {
        const defaultProfile = profiles.find(p => p.is_default);
        setActiveProfile(defaultProfile || profiles[0] || null);
      }

      // Обновляем локальное хранилище
      const updatedProfiles = profiles.filter(p => p.id !== profileId);
      localStorage.setItem('ratingProfiles', JSON.stringify(updatedProfiles));

      return { success: true };
    } catch (error) {
      console.error('Error deleting profile:', error);
      return { success: false, error };
    }
  };

  const duplicateProfile = async (profileId: string, newName: string) => {
    const originalProfile = profiles.find(p => p.id === profileId);
    if (!originalProfile) {
      throw new Error('Профиль не найден');
    }

    const newProfile: RatingProfile = {
      ...originalProfile,
      id: `profile_${Date.now()}`,
      name: newName,
      description: `Копия профиля: ${originalProfile.name}`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0
    };

    return await saveProfile(newProfile);
  };

  const exportProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return null;

    const exportData = {
      profile_name: profile.name,
      profile_description: profile.description,
      config: profile.config,
      export_date: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rating_profile_${profile.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);

    return exportData;
  };

  const importProfile = async (file: File) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.config || !importData.profile_name) {
        throw new Error('Неверный формат файла профиля');
      }

      const newProfile: RatingProfile = {
        id: `imported_${Date.now()}`,
        name: importData.profile_name,
        description: importData.profile_description || 'Импортированный профиль',
        config: { ...DEFAULT_CONFIG, ...importData.config },
        tournament_types: importData.config.tournament_types || [],
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
        avg_rating_change: 0
      };

      return await saveProfile(newProfile);
    } catch (error) {
      console.error('Error importing profile:', error);
      throw error;
    }
  };

  const getProfileAnalytics = async (profileId: string) => {
    try {
      // Здесь можно добавить запросы к базе данных для получения аналитики
      // Пока возвращаем моковые данные
      return {
        usage_count: Math.floor(Math.random() * 100),
        avg_rating_change: (Math.random() - 0.5) * 10,
        success_rate: Math.random() * 100,
        player_satisfaction: Math.random() * 5 + 3,
        tournaments_processed: Math.floor(Math.random() * 50)
      };
    } catch (error) {
      console.error('Error getting profile analytics:', error);
      return null;
    }
  };

  return {
    profiles,
    activeProfile,
    isLoading,
    setActiveProfile,
    saveProfile,
    deleteProfile,
    duplicateProfile,
    exportProfile,
    importProfile,
    getProfileAnalytics,
    reloadProfiles: loadProfiles
  };
}