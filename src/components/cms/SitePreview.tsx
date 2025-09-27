import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Eye, ExternalLink } from "lucide-react";

interface CMSContent {
  id: string;
  page_slug: string;
  content_key: string;
  content_value: string | null;
  is_active: boolean;
}

export function SitePreview() {
  const [content, setContent] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_content')
        .select('*')
        .eq('is_active', true)
        .order('page_slug')
        .order('content_key');

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedContent = content.reduce((acc, item) => {
    if (!acc[item.page_slug]) {
      acc[item.page_slug] = [];
    }
    acc[item.page_slug].push(item);
    return acc;
  }, {} as Record<string, CMSContent[]>);

  const pageLabels: Record<string, string> = {
    home: 'Главная',
    about: 'О нас',
    tournaments: 'Турниры',
    rating: 'Рейтинг',
    gallery: 'Галерея',
    contact: 'Контакты',
    footer: 'Футер',
    services: 'Услуги',
    header: 'Шапка'
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Загрузка превью...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Превью сайта</h2>
          <p className="text-muted-foreground">Просмотр активного контента по страницам</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink size={16} />
            Открыть сайт
          </a>
        </Button>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedContent).map(([pageSlug, pageContent]) => (
          <Card key={pageSlug}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye size={20} />
                {pageLabels[pageSlug] || pageSlug}
                <Badge variant="outline">{pageContent.length} элементов</Badge>
              </CardTitle>
              <CardDescription>
                Активный контент для страницы "{pageLabels[pageSlug] || pageSlug}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pageContent.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.content_key}</Badge>
                      </div>
                    </div>
                    <div className="text-sm">
                      {item.content_value ? (
                        <p className="whitespace-pre-wrap break-words">
                          {item.content_value.length > 200 
                            ? `${item.content_value.substring(0, 200)}...` 
                            : item.content_value
                          }
                        </p>
                      ) : (
                        <span className="text-muted-foreground italic">Нет содержимого</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(groupedContent).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет активного контента</h3>
            <p className="text-muted-foreground">Создайте и активируйте контент, чтобы увидеть превью</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}