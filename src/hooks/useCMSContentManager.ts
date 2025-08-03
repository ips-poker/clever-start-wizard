import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CMSContent, PageContent, CMSError } from "@/types/cms";

export function useCMSContentManager() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<CMSError | null>(null);
  const { toast } = useToast();

  const fetchContent = useCallback(async (): Promise<Record<string, PageContent>> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .order('page_slug')
        .order('content_key');

      if (error) throw error;

      const grouped = (data || []).reduce((acc: Record<string, PageContent>, item: any) => {
        if (!acc[item.page_slug]) {
          acc[item.page_slug] = {};
        }
        acc[item.page_slug][item.content_key] = item as CMSContent;
        return acc;
      }, {});

      return grouped;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch content';
      setError({ message: errorMessage, code: err.code });
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
      return {};
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const savePageContent = useCallback(async (pageSlug: string, pageContent: PageContent): Promise<boolean> => {
    setSaving(true);
    setError(null);
    
    try {
      const updates = Object.values(pageContent).map(item => 
        supabase
          .from('cms_content')
          .update({ 
            content_value: item.content_value,
            is_active: item.is_active 
          })
          .eq('id', item.id)
      );

      await Promise.all(updates);

      toast({
        title: "Успешно",
        description: `Контент страницы сохранен`,
      });
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save content';
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

  const addContent = useCallback(async (
    pageSlug: string,
    contentKey: string,
    contentValue: string,
    contentType: string = 'text'
  ): Promise<CMSContent | null> => {
    setSaving(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .insert([{
          page_slug: pageSlug,
          content_key: contentKey,
          content_value: contentValue,
          content_type: contentType,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Новый элемент контента добавлен",
      });

      return data as CMSContent;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add content';
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

  const deleteContent = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('cms_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Элемент контента удален",
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete content';
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
    fetchContent,
    savePageContent,
    addContent,
    deleteContent,
  };
}