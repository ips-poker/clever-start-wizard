import React, { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEOData, CMSError } from "@/types/cms";

export function useSEOManager() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<CMSError | null>(null);
  const { toast } = useToast();

  const fetchSEOData = useCallback(async (): Promise<SEOData[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('cms_seo')
        .select('*')
        .order('page_slug');

      if (error) throw error;
      return (data || []) as SEOData[];
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch SEO data';
      setError({ message: errorMessage, code: err.code });
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveSEOData = useCallback(async (
    seoData: any,
    id?: string
  ): Promise<SEOData | null> => {
    setSaving(true);
    setError(null);
    
    try {
      if (id) {
        const { data, error } = await supabase
          .from('cms_seo')
          .update(seoData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "SEO данные обновлены",
        });
        
        return data as SEOData;
      } else {
        const { data, error } = await supabase
          .from('cms_seo')
          .insert(seoData)
          .select()
          .single();
          
        if (error) throw error;
        
        toast({
          title: "Успешно",
          description: "SEO данные созданы",
        });
        
        return data as SEOData;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save SEO data';
      setError({ message: errorMessage, code: err.code });
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const deleteSEOData = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('cms_seo')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно", 
        description: "SEO данные удалены",
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete SEO data';
      setError({ message: errorMessage, code: err.code });
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  return {
    loading,
    saving,
    error,
    fetchSEOData,
    saveSEOData,
    deleteSEOData,
  };
}