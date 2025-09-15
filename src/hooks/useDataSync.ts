import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DataSyncConfig {
  table: string;
  cacheKey: string;
  realtime?: boolean;
  filter?: string;
  select?: string;
  disableCache?: boolean; // Опция для отключения кэширования
}

interface DataSyncResult<T = any> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  refreshData: () => Promise<void>;
  clearCache: () => void;
}

const CACHE_EXPIRY = 30 * 1000; // 30 seconds - сокращено для критических данных
const GLOBAL_CACHE_KEY = 'data_sync_global';

export function useDataSync<T = any>(config: DataSyncConfig): DataSyncResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const channelRef = useRef<any>(null);
  const { table, cacheKey, realtime = true, filter, select = '*', disableCache = false } = config;

  // Get cached data from localStorage
  const getCachedData = useCallback((): { data: T[], timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to get cached data:', err);
    }
    return null;
  }, [cacheKey]);

  // Save data to localStorage
  const setCachedData = useCallback((newData: T[]) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: newData,
        timestamp: Date.now()
      }));
      
      // Update global cache registry
      const globalCache = JSON.parse(localStorage.getItem(GLOBAL_CACHE_KEY) || '{}');
      globalCache[cacheKey] = Date.now();
      localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(globalCache));
    } catch (err) {
      console.warn('Failed to cache data:', err);
    }
  }, [cacheKey]);

  // Clear cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
      const globalCache = JSON.parse(localStorage.getItem(GLOBAL_CACHE_KEY) || '{}');
      delete globalCache[cacheKey];
      localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(globalCache));
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    }
  }, [cacheKey]);

  // Fetch data from Supabase
  const fetchData = useCallback(async (useCache = true): Promise<void> => {
    try {
      // Try to use cached data first (only if caching is enabled)
      if (useCache && !disableCache) {
        const cached = getCachedData();
        if (cached) {
          setData(cached.data);
          setLastSync(new Date(cached.timestamp));
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      let query = supabase.from(table as any).select(select);
      
      if (filter) {
        // Simple filter parsing - can be extended
        const parts = filter.split('=');
        if (parts.length === 2) {
          const [column, value] = parts;
          query = query.eq(column.trim(), value.trim());
        }
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const newData = (fetchedData || []) as T[];
      setData(newData);
      setLastSync(new Date());
      
      // Only cache if caching is enabled
      if (!disableCache) {
        setCachedData(newData);
      }
      
    } catch (err: any) {
      console.error(`Error fetching ${table} data:`, err);
      setError(err.message || 'Failed to fetch data');
      
      // If fetch fails, try to use cached data as fallback
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setLastSync(new Date(cached.timestamp));
      }
    } finally {
      setLoading(false);
    }
  }, [table, select, filter, getCachedData, setCachedData]);

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!realtime) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(`Setting up realtime subscription for ${table}`);
    
    let channelConfig: any = {
      event: '*',
      schema: 'public',
      table: table
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    channelRef.current = supabase
      .channel(`realtime_${table}_${cacheKey}`)
      .on('postgres_changes', channelConfig, (payload) => {
        console.log(`Realtime update for ${table}:`, payload);
        // Clear cache and refetch on any change
        clearCache();
        fetchData(false);
      })
      .subscribe((status) => {
        console.log(`Realtime subscription status for ${table}: ${status}`);
      });
  }, [realtime, table, filter, cacheKey, clearCache, fetchData]);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    clearCache();
    await fetchData(false);
  }, [clearCache, fetchData]);

  // Initialize
  useEffect(() => {
    fetchData(true);
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchData, setupRealtimeSubscription]);

  return {
    data,
    loading,
    error,
    lastSync,
    refreshData,
    clearCache
  };
}

// Global cache management utility
export const GlobalCacheManager = {
  clearAll: () => {
    try {
      const globalCache = JSON.parse(localStorage.getItem(GLOBAL_CACHE_KEY) || '{}');
      Object.keys(globalCache).forEach(key => {
        localStorage.removeItem(key);
      });
      localStorage.removeItem(GLOBAL_CACHE_KEY);
    } catch (err) {
      console.warn('Failed to clear all cache:', err);
    }
  },

  clearExpired: () => {
    try {
      const globalCache = JSON.parse(localStorage.getItem(GLOBAL_CACHE_KEY) || '{}');
      const now = Date.now();
      
      Object.entries(globalCache).forEach(([key, timestamp]) => {
        if (now - (timestamp as number) > CACHE_EXPIRY) {
          localStorage.removeItem(key);
          delete globalCache[key];
        }
      });
      
      localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(globalCache));
    } catch (err) {
      console.warn('Failed to clear expired cache:', err);
    }
  },

  getCacheInfo: () => {
    try {
      const globalCache = JSON.parse(localStorage.getItem(GLOBAL_CACHE_KEY) || '{}');
      return Object.entries(globalCache).map(([key, timestamp]) => ({
        key,
        timestamp: timestamp as number,
        expired: Date.now() - (timestamp as number) > CACHE_EXPIRY
      }));
    } catch (err) {
      console.warn('Failed to get cache info:', err);
      return [];
    }
  }
};