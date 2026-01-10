// ============================================
// CALIBRATION SYNC HOOK
// ============================================
// Синхронизация калибровки позиций игроков через Supabase
// Решает проблему изолированного localStorage в Telegram mini-app
// ВАЖНО: Теперь реактивно триггерит перерендер при загрузке калибровки

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setGlobalCalibrationCache, subscribeToCalibration, getCalibrationVersion } from '@/components/poker/FullscreenPokerTable';

interface CalibrationData {
  positions: {
    desktop: Record<number, Array<{ x: number; y: number }>>;
    telegram: Record<number, Array<{ x: number; y: number }>>;
  } | null;
  betOffsets: {
    desktop: Record<number, Array<{ x: number; y: number }>>;
    telegram: Record<number, Array<{ x: number; y: number }>>;
  } | null;
}

const CALIBRATION_SETTING_KEY = 'poker_table_calibration';

// Хук для реактивного отслеживания обновлений калибровки
export function useCalibrationVersion() {
  const [version, setVersion] = useState(getCalibrationVersion());
  
  useEffect(() => {
    // Подписываемся на обновления калибровки
    const unsubscribe = subscribeToCalibration(() => {
      setVersion(getCalibrationVersion());
    });
    return unsubscribe;
  }, []);
  
  return version;
}

export function useCalibrationSync() {
  const [isLoading, setIsLoading] = useState(true);
  const [calibration, setCalibration] = useState<CalibrationData>({ positions: null, betOffsets: null });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Загрузить калибровку из Supabase
  const loadFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cms_settings')
        .select('setting_value, updated_at')
        .eq('setting_key', CALIBRATION_SETTING_KEY)
        .maybeSingle();

      if (error) {
        console.warn('[CalibrationSync] Error loading from Supabase:', error);
        return null;
      }

      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value);
          setLastUpdated(data.updated_at);
          return parsed as CalibrationData;
        } catch {
          console.warn('[CalibrationSync] Invalid JSON in setting_value');
        }
      }
    } catch (err) {
      console.warn('[CalibrationSync] Failed to load from Supabase:', err);
    }
    return null;
  }, []);

  // Сохранить калибровку в Supabase
  const saveToSupabase = useCallback(async (data: CalibrationData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cms_settings')
        .upsert({
          setting_key: CALIBRATION_SETTING_KEY,
          setting_value: JSON.stringify(data),
          setting_type: 'json',
          category: 'poker',
          description: 'Калибровка позиций игроков и ставок на покерном столе',
          is_public: true
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('[CalibrationSync] Error saving to Supabase:', error);
        return false;
      }

      setLastUpdated(new Date().toISOString());
      return true;
    } catch (err) {
      console.error('[CalibrationSync] Failed to save to Supabase:', err);
      return false;
    }
  }, []);

  // Синхронизировать калибровку (localStorage -> Supabase -> глобальный кеш)
  const syncCalibration = useCallback(async () => {
    setIsLoading(true);

    // 1) Пробуем Supabase (источник истины)
    const supabaseData1 = await loadFromSupabase();
    if (supabaseData1) {
      setGlobalCalibrationCache(supabaseData1.positions, supabaseData1.betOffsets);
      setCalibration(supabaseData1);
      setIsLoading(false);
      return supabaseData1;
    }

    // 2) Fallback: localStorage (актуально для popup/desktop)
    try {
      const positionsStr = localStorage.getItem('syndikate_seat_positions');
      const betOffsetsStr = localStorage.getItem('syndikate_bet_offsets');

      if (positionsStr || betOffsetsStr) {
        const localData: CalibrationData = {
          positions: positionsStr ? JSON.parse(positionsStr) : null,
          betOffsets: betOffsetsStr ? JSON.parse(betOffsetsStr) : null,
        };

        setGlobalCalibrationCache(localData.positions, localData.betOffsets);
        setCalibration(localData);
        setIsLoading(false);
        return localData;
      }
    } catch (err) {
      console.warn('[CalibrationSync] Failed to load from localStorage:', err);
    }

    // 3) Telegram/WebView кейс: localStorage может быть пустым, а Supabase иногда отвечает чуть позже.
    // Делаем один быстрый ретрай, чтобы не рисовать стол на дефолтных координатах.
    await new Promise((r) => setTimeout(r, 900));
    const supabaseData2 = await loadFromSupabase();
    if (supabaseData2) {
      setGlobalCalibrationCache(supabaseData2.positions, supabaseData2.betOffsets);
      setCalibration(supabaseData2);
      setIsLoading(false);
      return supabaseData2;
    }

    // 4) Нет данных - устанавливаем loaded = true с null данными
    // Это важно чтобы компоненты не ждали вечно загрузки
    setGlobalCalibrationCache(null, null);
    setIsLoading(false);
    return null;
  }, [loadFromSupabase]);

  // Сохранить калибровку (в localStorage и Supabase)
  const saveCalibration = useCallback(async (): Promise<boolean> => {
    try {
      // Читаем текущие данные из localStorage
      const positionsStr = localStorage.getItem('syndikate_seat_positions');
      const betOffsetsStr = localStorage.getItem('syndikate_bet_offsets');
      
      const data: CalibrationData = {
        positions: positionsStr ? JSON.parse(positionsStr) : null,
        betOffsets: betOffsetsStr ? JSON.parse(betOffsetsStr) : null
      };
      
      // Сохраняем в Supabase
      const success = await saveToSupabase(data);
      
      if (success) {
        // Обновляем глобальный кеш
        setGlobalCalibrationCache(data.positions, data.betOffsets);
        setCalibration(data);
      }
      
      return success;
    } catch (err) {
      console.error('[CalibrationSync] Failed to save calibration:', err);
      return false;
    }
  }, [saveToSupabase]);

  // Автозагрузка при монтировании
  useEffect(() => {
    syncCalibration();
  }, [syncCalibration]);

  return {
    isLoading,
    calibration,
    lastUpdated,
    syncCalibration,
    saveCalibration
  };
}
