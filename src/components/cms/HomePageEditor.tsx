import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Home, Save, RefreshCw, Eye, EyeOff } from "lucide-react";

interface ContentItem {
  id: string;
  page_slug: string;
  content_key: string;
  content_value: string | null;
  content_type: string;
  is_active: boolean;
}

export function HomePageEditor() {
  const [content, setContent] = useState<Record<string, ContentItem>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const homePageFields = [
    {
      key: 'hero_title',
      label: 'Главный заголовок',
      description: 'Основной заголовок героя (например: IPS)',
      type: 'text'
    },
    {
      key: 'hero_subtitle',
      label: 'Подзаголовок 1',
      description: 'Первый подзаголовок (например: International)',
      type: 'text'
    },
    {
      key: 'hero_subtitle_2',
      label: 'Подзаголовок 2',
      description: 'Второй подзаголовок (например: Poker Style)',
      type: 'text'
    },
    {
      key: 'hero_badge',
      label: 'Бейдж героя',
      description: 'Текст в бейдже над заголовком',
      type: 'text'
    },
    {
      key: 'hero_description',
      label: 'Описание героя',
      description: 'Основное описание под заголовком',
      type: 'textarea'
    },
    {
      key: 'feature_1',
      label: 'Особенность 1',
      description: 'Первая особенность в блоках',
      type: 'text'
    },
    {
      key: 'feature_2',
      label: 'Особенность 2',
      description: 'Вторая особенность в блоках',
      type: 'text'
    },
    {
      key: 'feature_3',
      label: 'Особенность 3',
      description: 'Третья особенность в блоках',
      type: 'text'
    },
    {
      key: 'feature_4',
      label: 'Особенность 4',
      description: 'Четвертая особенность в блоках',
      type: 'text'
    },
    {
      key: 'cta_primary',
      label: 'Основная кнопка',
      description: 'Текст основной кнопки действия',
      type: 'text'
    },
    {
      key: 'cta_secondary',
      label: 'Вторичная кнопка',
      description: 'Текст вторичной кнопки',
      type: 'text'
    },
    {
      key: 'main_feature_title',
      label: 'Заголовок главной функции',
      description: 'Заголовок в карточке справа',
      type: 'text'
    },
    {
      key: 'main_feature_description',
      label: 'Описание главной функции',
      description: 'Описание в карточке справа',
      type: 'textarea'
    }
  ];

  useEffect(() => {
    fetchHomeContent();
  }, []);

  const fetchHomeContent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'home');

      if (error) throw error;

      // Convert array to object for easier access
      const contentObj = (data || []).reduce((acc: Record<string, ContentItem>, item: ContentItem) => {
        acc[item.content_key] = item;
        return acc;
      }, {});

      setContent(contentObj);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMissingContent = async () => {
    const defaultValues: Record<string, string> = {
      hero_title: 'IPS',
      hero_subtitle: 'International',
      hero_subtitle_2: 'Poker Style',
      hero_badge: 'Премиальный покерный клуб',
      hero_description: 'Премиальный покерный клуб с рейтинговой системой ELO. Развивайте навыки в элегантной атмосфере среди профессиональных игроков.',
      feature_1: 'Честная игра',
      feature_2: 'Рост навыков',
      feature_3: 'Рейтинг ELO',
      feature_4: 'Сообщество',
      cta_primary: 'Начать играть',
      cta_secondary: 'Рейтинг игроков',
      main_feature_title: 'Рейтинговая система ELO',
      main_feature_description: 'Профессиональная система оценки навыков покерных игроков'
    };

    const missingContent = homePageFields
      .filter(field => !content[field.key])
      .map(field => ({
        page_slug: 'home',
        content_key: field.key,
        content_value: defaultValues[field.key] || '',
        content_type: field.type === 'textarea' ? 'text' : 'text',
        is_active: true
      }));

    if (missingContent.length > 0) {
      try {
        const { error } = await (supabase as any)
          .from('cms_content')
          .insert(missingContent);

        if (error) throw error;

        await fetchHomeContent();
        toast({
          title: "Успешно",
          description: `Создано ${missingContent.length} элементов контента`,
        });
      } catch (error) {
        console.error('Error creating content:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось создать контент",
          variant: "destructive",
        });
      }
    }
  };

  const updateContentValue = (key: string, value: string) => {
    setContent(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        content_value: value
      }
    }));
  };

  const toggleContentActive = async (key: string) => {
    const item = content[key];
    if (!item) return;

    try {
      const { error } = await (supabase as any)
        .from('cms_content')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;

      setContent(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          is_active: !prev[key].is_active
        }
      }));

      toast({
        title: "Успешно",
        description: `Элемент ${!item.is_active ? 'активирован' : 'деактивирован'}`,
      });
    } catch (error) {
      console.error('Error toggling content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить состояние",
        variant: "destructive",
      });
    }
  };

  const saveAllContent = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(content)
        .filter(([key, item]) => item.id)
        .map(([key, item]) => (supabase as any)
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
        description: "Все изменения сохранены",
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Загрузка...</div>;
  }

  const missingFieldsCount = homePageFields.filter(field => !content[field.key]).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Home className="w-6 h-6" />
            Редактор главной страницы
          </h2>
          <p className="text-muted-foreground">Удобное редактирование всех элементов главной страницы</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchHomeContent}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </Button>
          <Button
            onClick={saveAllContent}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить все'}
          </Button>
        </div>
      </div>

      {missingFieldsCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-orange-800">Не хватает контента</h3>
                <p className="text-orange-700">Обнаружено {missingFieldsCount} отсутствующих элементов контента</p>
              </div>
              <Button onClick={createMissingContent} variant="outline">
                Создать недостающий контент
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {homePageFields.map((field) => {
          const item = content[field.key];
          return (
            <Card key={field.key} className={!item ? "border-dashed border-orange-300" : ""}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {field.label}
                      {!item && <Badge variant="outline" className="text-orange-600">Отсутствует</Badge>}
                      {item && (
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "Активен" : "Скрыт"}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{field.description}</CardDescription>
                  </div>
                  {item && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleContentActive(field.key)}
                      className="flex items-center gap-1"
                    >
                      {item.is_active ? (
                        <>
                          <Eye className="w-4 h-4" />
                          Скрыть
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Показать
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!item ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Элемент отсутствует. Нажмите "Создать недостающий контент" выше.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={field.key}>Содержимое</Label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        id={field.key}
                        value={item.content_value || ''}
                        onChange={(e) => updateContentValue(field.key, e.target.value)}
                        rows={3}
                        className="min-h-[80px]"
                      />
                    ) : (
                      <Input
                        id={field.key}
                        value={item.content_value || ''}
                        onChange={(e) => updateContentValue(field.key, e.target.value)}
                      />
                    )}
                    <div className="text-xs text-muted-foreground">
                      Ключ: <code className="bg-muted px-1 rounded">{field.key}</code>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={saveAllContent}
          disabled={saving}
          size="lg"
          className="flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Сохранение всех изменений...' : 'Сохранить все изменения'}
        </Button>
      </div>
    </div>
  );
}