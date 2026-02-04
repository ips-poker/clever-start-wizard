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

// Global subscription manager to prevent duplicate subscriptions
const subscriptionManager = {
  subscriptions: new Map<string, { channel: any; subscribers: number; setupInProgress: boolean }>(),
  callbacks: new Map<string, Set<() => void>>(),
  setupTimeouts: new Map<string, NodeJS.Timeout>(),
  
  subscribe(pageSlug: string, callback: () => void): () => void {
    // Add callback
    if (!this.callbacks.has(pageSlug)) {
      this.callbacks.set(pageSlug, new Set());
    }
    this.callbacks.get(pageSlug)!.add(callback);
    
    // Check if subscription already exists or is being set up
    const existing = this.subscriptions.get(pageSlug);
    if (existing) {
      existing.subscribers++;
      return () => this.unsubscribe(pageSlug, callback);
    }
    
    // Check if setup is already scheduled (debounce for StrictMode)
    if (this.setupTimeouts.has(pageSlug)) {
      return () => this.unsubscribe(pageSlug, callback);
    }
    
    // Mark as setup in progress with placeholder
    this.subscriptions.set(pageSlug, { channel: null, subscribers: 1, setupInProgress: true });
    
    // Debounce subscription setup to handle StrictMode double-mount
    const timeout = setTimeout(() => {
      this.setupTimeouts.delete(pageSlug);
      
      const current = this.subscriptions.get(pageSlug);
      if (!current || current.subscribers <= 0) {
        // Was unsubscribed during debounce
        this.subscriptions.delete(pageSlug);
        return;
      }
      
      console.log('CMS setting up realtime subscription for:', pageSlug);
      
      const channel = supabase
        .channel(`cms_global_${pageSlug}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cms_content',
            filter: `page_slug=eq.${pageSlug}`
          },
          () => {
            // Notify all callbacks for this pageSlug
            const callbacks = this.callbacks.get(pageSlug);
            if (callbacks) {
              callbacks.forEach(cb => cb());
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`CMS realtime subscription status: ${status} for ${pageSlug}`);
          }
        });
      
      current.channel = channel;
      current.setupInProgress = false;
    }, 100); // 100ms debounce
    
    this.setupTimeouts.set(pageSlug, timeout);
    
    return () => this.unsubscribe(pageSlug, callback);
  },
  
  unsubscribe(pageSlug: string, callback: () => void): void {
    // Remove callback
    const callbacks = this.callbacks.get(pageSlug);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(pageSlug);
      }
    }
    
    const existing = this.subscriptions.get(pageSlug);
    if (!existing) return;
    
    existing.subscribers--;
    
    if (existing.subscribers <= 0) {
      // Cancel pending setup if any
      const timeout = this.setupTimeouts.get(pageSlug);
      if (timeout) {
        clearTimeout(timeout);
        this.setupTimeouts.delete(pageSlug);
      }
      
      // Clean up channel if it was created
      if (existing.channel) {
        console.log('CMS cleaning up subscription for:', pageSlug);
        supabase.removeChannel(existing.channel);
      }
      this.subscriptions.delete(pageSlug);
    }
  }
};

export function useCMSContent(pageSlug: string): UseCMSContentResult {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const baseRetryDelay = 1000;
  const cacheKey = `cms_content_${pageSlug}`;

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
    if (!isMountedRef.current) return;
    
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

      const { data, error: fetchError } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', pageSlug)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const contentObj = (data || []).reduce((acc: Record<string, string>, item: CMSContent) => {
        acc[item.content_key] = item.content_value || '';
        return acc;
      }, {});

      if (isMountedRef.current) {
        setContent(contentObj);
        setCachedContent(contentObj);
        setError(null);
        setLastSync(new Date());
        retryCountRef.current = 0;
      }
    } catch (err: any) {
      console.error('Error fetching CMS content:', err);
      const errorMessage = err.message || 'Failed to fetch content';
      
      if (isMountedRef.current) {
        setError(errorMessage);

        // Try to use cached content as fallback
        if (!isRetry) {
          const cached = getCachedContent();
          if (cached) {
            setContent(cached.content);
            setLastSync(new Date(cached.timestamp));
          }
        }

        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = baseRetryDelay * Math.pow(2, retryCountRef.current - 1);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              fetchContent(true, false);
            }
          }, delay);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRetrying(false);
      }
    }
  }, [pageSlug, getCachedContent, setCachedContent]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch with cache
    const cached = getCachedContent();
    if (cached) {
      setContent(cached.content);
      setLastSync(new Date(cached.timestamp));
      setLoading(false);
    } else {
      fetchContent(false, true);
    }
    
    // Subscribe using global manager (prevents duplicates)
    const handleChange = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchContent(false, false);
        }
      }, 500);
    };
    
    const unsubscribe = subscriptionManager.subscribe(pageSlug, handleChange);

    return () => {
      isMountedRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      unsubscribe();
    };
  }, [pageSlug, getCachedContent, fetchContent]);

  const getContent = useCallback((key: string, fallback: string = '') => {
    const value = content[key];
    
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return fallback;
      }
    }
    
    return String(value);
  }, [content]);

  const refetch = useCallback(() => {
    retryCountRef.current = 0;
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
