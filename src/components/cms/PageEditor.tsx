import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Save, RefreshCw, Plus, Edit, Trash, Eye, EyeOff } from "lucide-react";

interface ContentItem {
  id: string;
  page_slug: string;
  content_key: string;
  content_value: string | null;
  content_type: string;
  is_active: boolean;
  meta_data: any;
}

const pageOptions = [
  { value: 'about', label: 'О нас' },
  { value: 'blog', label: 'Блог' },
  { value: 'gallery', label: 'Галерея' },
  { value: 'rating', label: 'Рейтинг' },
  { value: 'tournaments', label: 'Турниры' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'director', label: 'Турнирный директор' },
];

const contentTypeOptions = [
  { value: 'text', label: 'Текст' },
  { value: 'textarea', label: 'Многострочный текст' },
  { value: 'html', label: 'HTML' },
  { value: 'image', label: 'Изображение' },
  { value: 'url', label: 'Ссылка' },
  { value: 'number', label: 'Число' },
  { value: 'boolean', label: 'Да/Нет' },
  { value: 'json', label: 'JSON' },
];

const defaultContentByPage: Record<string, Array<{ key: string; label: string; type: string; value: string; }>> = {
  about: [
    { key: 'hero_title', label: 'Заголовок героя', type: 'text', value: 'О нашем покерном клубе' },
    { key: 'hero_subtitle', label: 'Подзаголовок героя', type: 'text', value: 'International Poker Style - элитный покерный клуб' },
    { key: 'hero_description', label: 'Описание героя', type: 'textarea', value: 'Мы создали уникальную атмосферу для профессиональной игры в покер с рейтинговой системой и регулярными турнирами.' },
    { key: 'history_title', label: 'Заголовок истории', type: 'text', value: 'Наша история' },
    { key: 'history_text', label: 'Текст истории', type: 'textarea', value: 'С момента основания мы стремимся создать лучшие условия для игры в покер...' },
    { key: 'mission_title', label: 'Заголовок миссии', type: 'text', value: 'Наша миссия' },
    { key: 'mission_text', label: 'Текст миссии', type: 'textarea', value: 'Развитие покерного сообщества через честную игру и профессиональный подход...' },
  ],
  blog: [
    { key: 'hero_title', label: 'Заголовок блога', type: 'text', value: 'Блог IPS' },
    { key: 'hero_subtitle', label: 'Подзаголовок блога', type: 'text', value: 'Стратегии, новости и обучающие материалы' },
    { key: 'featured_post_enabled', label: 'Показывать рекомендуемую статью', type: 'boolean', value: 'true' },
  ],
  rating: [
    { key: 'hero_title', label: 'Заголовок рейтинга', type: 'text', value: 'Рейтинг игроков IPS' },
    { key: 'hero_subtitle', label: 'Подзаголовок рейтинга', type: 'text', value: 'Система ELO для справедливой оценки навыков' },
    { key: 'rating_description', label: 'Описание системы рейтинга', type: 'textarea', value: 'Наша система рейтинга основана на алгоритме ELO, адаптированном для покера...' },
    { key: 'show_top_count', label: 'Количество игроков в топе', type: 'number', value: '50' },
  ],
  tournaments: [
    { key: 'hero_title', label: 'Заголовок турниров', type: 'text', value: 'Турниры IPS' },
    { key: 'hero_subtitle', label: 'Подзаголовок турниров', type: 'text', value: 'Регулярные турниры для всех уровней игроков' },
    { key: 'registration_info', label: 'Информация о регистрации', type: 'textarea', value: 'Регистрация на турниры доступна за 24 часа до начала...' },
  ],
  gallery: [
    { key: 'hero_title', label: 'Заголовок галереи', type: 'text', value: 'Атмосфера IPS' },
    { key: 'hero_subtitle', label: 'Подзаголовок галереи', type: 'text', value: 'Взгляните на наш клуб изнутри' },
    { key: 'gallery_description', label: 'Описание галереи', type: 'textarea', value: 'Фотографии с наших турниров и мероприятий' },
  ],
};

export function PageEditor() {
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState({
    content_key: '',
    content_value: '',
    content_type: 'text',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (selectedPage) {
      fetchContent();
    }
  }, [selectedPage]);

  const fetchContent = async () => {
    if (!selectedPage) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('cms_content')
        .select('*')
        .eq('page_slug', selectedPage)
        .order('content_key', { ascending: true });

      if (error) throw error;
      setContent(data || []);
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

  const createDefaultContent = async () => {
    if (!selectedPage || !defaultContentByPage[selectedPage]) return;

    const defaultItems = defaultContentByPage[selectedPage];
    const existingKeys = content.map(item => item.content_key);
    const missingItems = defaultItems.filter(item => !existingKeys.includes(item.key));

    if (missingItems.length === 0) {
      toast({
        title: "Информация",
        description: "Весь контент уже создан для этой страницы",
      });
      return;
    }

    try {
      const itemsToCreate = missingItems.map(item => ({
        page_slug: selectedPage,
        content_key: item.key,
        content_value: item.value,
        content_type: item.type,
        is_active: true,
        meta_data: { label: item.label }
      }));

      const { error } = await (supabase as any)
        .from('cms_content')
        .insert(itemsToCreate);

      if (error) throw error;

      await fetchContent();
      toast({
        title: "Успешно",
        description: `Создано ${missingItems.length} элементов контента`,
      });
    } catch (error) {
      console.error('Error creating default content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать контент",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (item: ContentItem) => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('cms_content')
        .update({
          content_value: item.content_value,
          content_type: item.content_type,
          is_active: item.is_active,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Контент сохранен",
      });
      setEditingId(null);
      await fetchContent();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить контент",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!selectedPage || !newContent.content_key.trim()) return;

    try {
      const { error } = await (supabase as any)
        .from('cms_content')
        .insert({
          page_slug: selectedPage,
          content_key: newContent.content_key,
          content_value: newContent.content_value,
          content_type: newContent.content_type,
          is_active: true,
        });

      if (error) throw error;

      setNewContent({ content_key: '', content_value: '', content_type: 'text' });
      setShowAddForm(false);
      await fetchContent();
      toast({
        title: "Успешно",
        description: "Новый контент добавлен",
      });
    } catch (error) {
      console.error('Error adding content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить контент",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;

    try {
      const { error } = await (supabase as any)
        .from('cms_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchContent();
      toast({
        title: "Успешно",
        description: "Контент удален",
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить контент",
        variant: "destructive",
      });
    }
  };

  const renderContentInput = (item: ContentItem, isEditing: boolean) => {
    const value = item.content_value || '';
    
    if (!isEditing) {
      return (
        <div className="p-3 bg-muted/50 rounded-md">
          <div className="text-sm text-muted-foreground mb-1">Значение:</div>
          {item.content_type === 'boolean' ? (
            <Badge variant={value === 'true' ? 'default' : 'secondary'}>
              {value === 'true' ? 'Да' : 'Нет'}
            </Badge>
          ) : (
            <div className="whitespace-pre-wrap">{value || 'Пусто'}</div>
          )}
        </div>
      );
    }

    const updateValue = (newValue: string) => {
      setContent(prev => prev.map(c => 
        c.id === item.id ? { ...c, content_value: newValue } : c
      ));
    };

    switch (item.content_type) {
      case 'textarea':
      case 'html':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            rows={4}
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === 'true'}
              onCheckedChange={(checked) => updateValue(checked.toString())}
            />
            <Label>{value === 'true' ? 'Да' : 'Нет'}</Label>
          </div>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateValue(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Редактор страниц
          </h2>
          <p className="text-muted-foreground">Управление контентом всех страниц сайта</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchContent}
            disabled={!selectedPage}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={!selectedPage}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить контент
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Выбор страницы</CardTitle>
          <CardDescription>
            Выберите страницу для редактирования её контента
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="page-select">Страница</Label>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите страницу" />
                </SelectTrigger>
                <SelectContent>
                  {pageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPage && defaultContentByPage[selectedPage] && (
              <Button
                variant="outline"
                onClick={createDefaultContent}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Создать стандартный контент
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Добавить новый контент</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="new-key">Ключ контента</Label>
                <Input
                  id="new-key"
                  value={newContent.content_key}
                  onChange={(e) => setNewContent(prev => ({ ...prev, content_key: e.target.value }))}
                  placeholder="например: hero_title"
                />
              </div>
              <div>
                <Label htmlFor="new-type">Тип контента</Label>
                <Select
                  value={newContent.content_type}
                  onValueChange={(value) => setNewContent(prev => ({ ...prev, content_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-value">Значение</Label>
                {newContent.content_type === 'textarea' ? (
                  <Textarea
                    id="new-value"
                    value={newContent.content_value}
                    onChange={(e) => setNewContent(prev => ({ ...prev, content_value: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <Input
                    id="new-value"
                    value={newContent.content_value}
                    onChange={(e) => setNewContent(prev => ({ ...prev, content_value: e.target.value }))}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddNew}>Добавить</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Загрузка контента...
        </div>
      )}

      {selectedPage && !loading && (
        <div className="space-y-4">
          {content.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground mb-4">
                  Контент для страницы "{pageOptions.find(p => p.value === selectedPage)?.label}" не найден
                </div>
                {defaultContentByPage[selectedPage] && (
                  <Button onClick={createDefaultContent}>
                    Создать стандартный контент
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            content.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{item.content_key}</CardTitle>
                      <CardDescription>
                        Тип: {contentTypeOptions.find(t => t.value === item.content_type)?.label}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Активен' : 'Скрыт'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newActive = !item.is_active;
                            setContent(prev => prev.map(c => 
                              c.id === item.id ? { ...c, is_active: newActive } : c
                            ));
                            handleSave({ ...item, is_active: newActive });
                          }}
                        >
                          {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderContentInput(item, editingId === item.id)}
                  {editingId === item.id && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleSave(item)}
                        disabled={saving}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}