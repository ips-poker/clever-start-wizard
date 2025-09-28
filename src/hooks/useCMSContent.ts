import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CMSContent } from "@/types/cms";

interface UseCMSContentResult {
  content: Record<string, string>;
  loading: boolean;
  error: string | null;
  retrying: boolean;
  lastSync: Date | null;
  getContent: (key: string, fallback?: string) => string;
  refetch: () => void;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export function useCMSContent(pageSlug: string): UseCMSContentResult {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);
  const lastReconnectTime = useRef(0);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const baseRetryDelay = 1000; // 1 second
  const cacheKey = `cms_content_${pageSlug}`;

  // Get cached content from localStorage
  const getCachedContent = useCallback((): { content: Record<string, string>, timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to get cached CMS content:', err);
    }
    return null;
  }, [cacheKey]);

  // Save content to localStorage
  const setCachedContent = useCallback((newContent: Record<string, string>) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        content: newContent,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to cache CMS content:', err);
    }
  }, [cacheKey]);

  const fetchContent = useCallback(async (isRetry: boolean = false, useCache: boolean = true) => {
    try {
      // Try to use cached content first if not retrying
      if (!isRetry && useCache) {
        const cached = getCachedContent();
        if (cached) {
          setContent(cached.content);
          setLastSync(new Date(cached.timestamp));
          setLoading(false);
          return;
        }
      }

      if (isRetry) {
        setRetrying(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', pageSlug)
        .eq('is_active', true);

      if (error) throw error;

      // Convert array to object with content_key as keys
      const contentObj = (data || []).reduce((acc: Record<string, string>, item: CMSContent) => {
        acc[item.content_key] = item.content_value || '';
        return acc;
      }, {});

      setContent(contentObj);
      setCachedContent(contentObj);
      setError(null);
      setLastSync(new Date());
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err: any) {
      console.error('Error fetching CMS content:', err);
      const errorMessage = err.message || 'Failed to fetch content';
      setError(errorMessage);

      // Try to use cached content as fallback
      if (!isRetry) {
        const cached = getCachedContent();
        if (cached) {
          setContent(cached.content);
          setLastSync(new Date(cached.timestamp));
          console.log('Using cached content as fallback');
        }
      }

      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = baseRetryDelay * Math.pow(2, retryCountRef.current - 1); // Exponential backoff
        
        console.log(`Retrying CMS content fetch (attempt ${retryCountRef.current}/${maxRetries}) in ${delay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchContent(true, false);
        }, delay);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [pageSlug, getCachedContent, setCachedContent]);

  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      console.log('CMS realtime subscription cleaning up...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Rate limiting - prevent too frequent reconnections
    const now = Date.now();
    if (now - lastReconnectTime.current < 10000) { // Increased to 10 seconds
      console.log('CMS realtime subscription rate limited, skipping...');
      return;
    }
    lastReconnectTime.current = now;

    console.log('CMS setting up new realtime subscription for:', pageSlug);
    channelRef.current = supabase
      .channel(`cms_${pageSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
          filter: `page_slug=eq.${pageSlug}`
        },
        (payload) => {
          console.log('CMS content changed:', payload);
          // Debounce rapid changes
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            fetchContent(false, false);
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log(`CMS realtime subscription status: ${status}`);
        if (status === 'CLOSED') {
          console.error('CMS realtime subscription error, retrying...');
          // Retry subscription after a delay
          setTimeout(setupRealtimeSubscription, 5000);
        }
      });
  }, [pageSlug, fetchContent]);

  useEffect(() => {
    fetchContent();
    setupRealtimeSubscription();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchContent, setupRealtimeSubscription]);

  const getContent = useCallback((key: string, fallback: string = '') => {
    return content[key] || fallback;
  }, [content]);

  const refetch = useCallback(() => {
    retryCountRef.current = 0;
    // Clear cache and fetch fresh data
    try {
      localStorage.removeItem(cacheKey);
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    }
    fetchContent(false, false);
  }, [fetchContent, cacheKey]);

  return { 
    content, 
    loading, 
    error, 
    retrying, 
    lastSync, 
    getContent, 
    refetch 
  };
}