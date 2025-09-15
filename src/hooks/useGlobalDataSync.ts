import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalCacheManager } from './useDataSync';

interface GlobalSyncConfig {
  enabled?: boolean;
  clearCacheOnStart?: boolean;
  tables?: string[];
}

const DEFAULT_TABLES = [
  'cms_content',
  'cms_seo', 
  'cms_gallery',
  'cms_settings',
  'tournaments',
  'players',
  'tournament_registrations',
  'game_results'
];

export function useGlobalDataSync(config: GlobalSyncConfig = {}) {
  const { 
    enabled = true, 
    clearCacheOnStart = false, 
    tables = DEFAULT_TABLES 
  } = config;

  // Global cache invalidation on any table change
  const setupGlobalSync = useCallback(() => {
    if (!enabled) return;

    console.log('Setting up global data sync for tables:', tables);

    const channels = tables.map(table => {
      return supabase
        .channel(`global_sync_${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => {
            console.log(`Global sync: ${table} changed`, payload);
            
            // Clear related caches
            const cacheKeys = GlobalCacheManager.getCacheInfo()
              .filter(cache => cache.key.includes(table))
              .map(cache => cache.key);
            
            cacheKeys.forEach(key => {
              try {
                localStorage.removeItem(key);
                console.log(`Cleared cache for ${key}`);
              } catch (err) {
                console.warn(`Failed to clear cache for ${key}:`, err);
              }
            });

            // Trigger custom event for components to react to
            window.dispatchEvent(new CustomEvent('globalDataSync', {
              detail: { table, event: payload.eventType, data: payload }
            }));
          }
        )
        .subscribe((status) => {
          console.log(`Global sync subscription for ${table}: ${status}`);
        });
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [enabled, tables]);

  // Auto-cleanup expired cache
  const cleanupExpiredCache = useCallback(() => {
    GlobalCacheManager.clearExpired();
    console.log('Cleaned up expired cache entries');
  }, []);

  // Initialize global sync
  useEffect(() => {
    if (clearCacheOnStart) {
      GlobalCacheManager.clearAll();
      console.log('Cleared all cache on startup');
    }

    // Cleanup expired cache on start
    cleanupExpiredCache();

    // Setup global sync
    const cleanup = setupGlobalSync();

    // Cleanup expired cache every 5 minutes
    const cleanupInterval = setInterval(cleanupExpiredCache, 5 * 60 * 1000);

    return () => {
      cleanup?.();
      clearInterval(cleanupInterval);
    };
  }, [clearCacheOnStart, cleanupExpiredCache, setupGlobalSync]);

  // Global event listener for data sync events
  useEffect(() => {
    const handleGlobalSync = (event: any) => {
      console.log('Global data sync event received:', event.detail);
    };

    window.addEventListener('globalDataSync', handleGlobalSync);
    return () => window.removeEventListener('globalDataSync', handleGlobalSync);
  }, []);

  return {
    clearAllCache: GlobalCacheManager.clearAll,
    clearExpiredCache: cleanupExpiredCache,
    getCacheInfo: GlobalCacheManager.getCacheInfo
  };
}