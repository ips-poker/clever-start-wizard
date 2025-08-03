import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CMSContent {
  id: string;
  page_slug: string;
  content_key: string;
  content_value: string | null;
  content_type: string;
  is_active: boolean;
}

export function useCMSContent(pageSlug: string) {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchContentSafe = async () => {
      if (!isMounted) return;
      await fetchContent();
    };
    
    fetchContentSafe();
    
    // Подписываемся на изменения в реальном времени с защитой
    const channel = supabase
      .channel(`cms_content_${pageSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_content',
          filter: `page_slug=eq.${pageSlug}`
        },
        () => {
          if (isMounted) {
            setTimeout(() => {
              if (isMounted) fetchContent();
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 50);
    };
  }, [pageSlug]);

  const fetchContent = async () => {
    try {
      const { data, error } = await (supabase as any)
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
    } catch (err) {
      console.error('Error fetching CMS content:', err);
      setError('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  const getContent = (key: string, fallback: string = '') => {
    return content[key] || fallback;
  };

  return { content, loading, error, getContent };
}