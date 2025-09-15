import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SEOData {
  id: string;
  page_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots_meta: string | null;
  schema_markup: any | null;
  created_at: string;
  updated_at: string;
}

interface UseSEODataResult {
  seoData: SEOData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSEOData(pageSlug: string): UseSEODataResult {
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSEOData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('cms_seo')
        .select('*')
        .eq('page_slug', pageSlug)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setSeoData(data || null);
    } catch (err: any) {
      console.error('Error fetching SEO data:', err);
      setError(err.message || 'Failed to fetch SEO data');
    } finally {
      setLoading(false);
    }
  }, [pageSlug]);

  const refetch = useCallback(() => {
    fetchSEOData();
  }, [fetchSEOData]);

  useEffect(() => {
    fetchSEOData();

    // Real-time subscription для обновлений SEO данных
    const channel = supabase
      .channel(`seo_${pageSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_seo',
          filter: `page_slug=eq.${pageSlug}`
        },
        (payload) => {
          console.log('SEO data changed:', payload);
          fetchSEOData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSEOData, pageSlug]);

  return { seoData, loading, error, refetch };
}