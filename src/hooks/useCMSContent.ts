import { useState, useEffect, useRef, useCallback } from "react";
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

  const fetchContent = useCallback(async (isRetry: boolean = false) => {
    try {
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
      setError(null);
      setLastSync(new Date());
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err: any) {
      console.error('Error fetching CMS content:', err);
      const errorMessage = err.message || 'Failed to fetch content';
      setError(errorMessage);

      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = baseRetryDelay * Math.pow(2, retryCountRef.current - 1); // Exponential backoff
        
        console.log(`Retrying CMS content fetch (attempt ${retryCountRef.current}/${maxRetries}) in ${delay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchContent(true);
        }, delay);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [pageSlug]);

  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing subscription
    if (channelRef.current) {
      console.log('CMS realtime subscription cleaning up...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Rate limiting - prevent too frequent reconnections
    if (Date.now() - lastReconnectTime.current < 5000) {
      console.log('CMS realtime subscription rate limited, skipping...');
      return;
    }
    lastReconnectTime.current = Date.now();

    // Create new subscription with simplified channel name
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
            fetchContent(false);
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
    fetchContent(false);
  }, [fetchContent]);

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