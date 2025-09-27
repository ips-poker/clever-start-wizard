import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, MapPin, MessageCircle, Save, RefreshCw } from "lucide-react";

interface ContentItem {
  id: string;
  page_slug: string;
  content_key: string;
  content_value: string | null;
  content_type: string;
  is_active: boolean;
}

export function ContactFooterEditor() {
  const [content, setContent] = useState<Record<string, ContentItem>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const contentSections = {
    contact: {
      title: 'Контактная информация',
      description: 'Основные контакты, отображаемые в футере и на странице контактов',
      icon: Phone,
      fields: [
        { key: 'address', label: 'Адрес', icon: MapPin, type: 'text' },
        { key: 'phone', label: 'Телефон', icon: Phone, type: 'text' },
        { key: 'email', label: 'Email', icon: Mail, type: 'text' },
        { key: 'telegram', label: 'Telegram', icon: MessageCircle, type: 'text' },
      ]
    },
    footer: {
      title: 'Футер сайта',
      description: 'Информация о бренде и правовые уведомления',
      icon: Save,
      fields: [
        { key: 'brand_name', label: 'Название бренда', type: 'text' },
        { key: 'brand_subtitle', label: 'Подзаголовок бренда', type: 'text' },
        { key: 'brand_description', label: 'Описание бренда', type: 'textarea' },
        { key: 'copyright', label: 'Копирайт', type: 'text' },
        { key: 'legal_notice', label: 'Правовое уведомление', type: 'textarea' },
      ]
    },
    services: {
      title: 'Услуги',
      description: 'Список услуг, отображаемых в футере',
      icon: Save,
      fields: [
        { key: 'service_1', label: 'Услуга 1', type: 'text' },
        { key: 'service_2', label: 'Услуга 2', type: 'text' },
        { key: 'service_3', label: 'Услуга 3', type: 'text' },
        { key: 'service_4', label: 'Услуга 4', type: 'text' },
        { key: 'service_5', label: 'Услуга 5', type: 'text' },
        { key: 'service_6', label: 'Услуга 6', type: 'text' },
      ]
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_content')
        .select('*')
        .in('page_slug', ['contact', 'footer', 'services']);

      if (error) throw error;

      // Convert array to object for easier access
      const contentObj = (data || []).reduce((acc: Record<string, ContentItem>, item: ContentItem) => {
        const key = `${item.page_slug}_${item.content_key}`;
        acc[key] = item;
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
    const defaultValues: Record<string, Record<string, string>> = {
      contact: {
        address: 'Москва, ул. Примерная, 123',
        phone: '+7 (495) 123-45-67',
        email: 'info@ipspoker.ru',
        telegram: '@ips_poker'
      },
      footer: {
        brand_name: 'IPS',
        brand_subtitle: 'International Poker Style',
        brand_description: 'Элитный покерный клуб с рейтинговой системой. Профессиональные турниры и высокий уровень игры.',
        copyright: '© 2024 IPS International Poker Style. Все права защищены.',
        legal_notice: 'Игра проходит в рамках действующего законодательства без денежных призов.'
      },
      services: {
        service_1: 'Турниры Texas Hold\'em',
        service_2: 'Омаха турниры',
        service_3: 'Sit & Go',
        service_4: 'Кэш игры',
        service_5: 'Обучение',
        service_6: 'Корпоративные турниры'
      }
    };

    const missingContent: any[] = [];

    Object.entries(contentSections).forEach(([sectionKey, section]) => {
      section.fields.forEach(field => {
        const contentKey = `${sectionKey}_${field.key}`;
        if (!content[contentKey]) {
          missingContent.push({
            page_slug: sectionKey,
            content_key: field.key,
            content_value: defaultValues[sectionKey]?.[field.key] || '',
            content_type: field.type === 'textarea' ? 'text' : 'text',
            is_active: true
          });
        }
      });
    });

    if (missingContent.length > 0) {
      try {
        const { error } = await (supabase as any)
          .from('cms_content')
          .insert(missingContent);

        if (error) throw error;

        await fetchContent();
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

  const updateContentValue = (contentKey: string, value: string) => {
    setContent(prev => ({
      ...prev,
      [contentKey]: {
        ...prev[contentKey],
        content_value: value
      }
    }));
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

  const getMissingFieldsCount = () => {
    let count = 0;
    Object.entries(contentSections).forEach(([sectionKey, section]) => {
      section.fields.forEach(field => {
        const contentKey = `${sectionKey}_${field.key}`;
        if (!content[contentKey]) count++;
      });
    });
    return count;
  };

  const missingFieldsCount = getMissingFieldsCount();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Phone className="w-6 h-6" />
            Контакты и футер
          </h2>
          <p className="text-muted-foreground">Редактирование контактной информации и содержимого футера</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchContent}
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
                <p className="text-orange-700">Обнаружено {missingFieldsCount} отсутствующих элементов</p>
              </div>
              <Button onClick={createMissingContent} variant="outline">
                Создать недостающий контент
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {Object.entries(contentSections).map(([sectionKey, section]) => {
          const SectionIcon = section.icon;
          return (
            <Card key={sectionKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SectionIcon className="w-5 h-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {section.fields.map((field) => {
                    const contentKey = `${sectionKey}_${field.key}`;
                    const item = content[contentKey];
                    const FieldIcon = field.icon;

                    return (
                      <div key={field.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={contentKey} className="flex items-center gap-2">
                            {FieldIcon && <FieldIcon className="w-4 h-4" />}
                            {field.label}
                          </Label>
                          {!item && <Badge variant="outline" className="text-orange-600">Отсутствует</Badge>}
                          {item && (
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "Активен" : "Скрыт"}
                            </Badge>
                          )}
                        </div>
                        {!item ? (
                          <div className="p-3 border border-dashed border-orange-300 rounded-md text-center text-muted-foreground">
                            Элемент отсутствует
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {field.type === 'textarea' ? (
                              <Textarea
                                id={contentKey}
                                value={item.content_value || ''}
                                onChange={(e) => updateContentValue(contentKey, e.target.value)}
                                rows={3}
                              />
                            ) : (
                              <Input
                                id={contentKey}
                                value={item.content_value || ''}
                                onChange={(e) => updateContentValue(contentKey, e.target.value)}
                              />
                            )}
                            <div className="text-xs text-muted-foreground">
                              Ключ: <code className="bg-muted px-1 rounded">{sectionKey}.{field.key}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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