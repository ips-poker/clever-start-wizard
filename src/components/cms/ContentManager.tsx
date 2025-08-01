import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Save, Plus, Edit, Trash2, X, Loader2, Eye, EyeOff } from "lucide-react";

interface CMSContent {
  id: string;
  page_slug: string;
  content_key: string;
  content_type: string;
  content_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PageContent {
  [key: string]: CMSContent;
}

export function ContentManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [contentByPage, setContentByPage] = useState<Record<string, PageContent>>({});
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
  const [newContentKey, setNewContentKey] = useState("");
  const [newContentValue, setNewContentValue] = useState("");
  const [newContentType, setNewContentType] = useState("text");
  const [showAddForm, setShowAddForm] = useState<string | null>(null);

  const { toast } = useToast();

  const pages = [
    { value: 'home', label: 'Главная страница', icon: '🏠' },
    { value: 'about', label: 'О нас', icon: '🏢' },
    { value: 'tournaments', label: 'Турниры', icon: '🏆' },
    { value: 'rating', label: 'Рейтинг', icon: '⭐' },
    { value: 'gallery', label: 'Галерея', icon: '🖼️' },
    { value: 'blog', label: 'Блог', icon: '📝' },
    { value: 'contact', label: 'Контакты', icon: '📞' },
    { value: 'footer', label: 'Футер', icon: '🔗' },
  ];

  const contentTypes = [
    { value: 'text', label: 'Текст', icon: '📝' },
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'image', label: 'Изображение', icon: '🖼️' },
    { value: 'json', label: 'JSON', icon: '⚙️' },
  ];

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .order('page_slug')
        .order('content_key');

      if (error) throw error;

      // Группируем контент по страницам
      const grouped = (data || []).reduce((acc: Record<string, PageContent>, item: CMSContent) => {
        if (!acc[item.page_slug]) {
          acc[item.page_slug] = {};
        }
        acc[item.page_slug][item.content_key] = item;
        return acc;
      }, {});

      setContentByPage(grouped);
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

  const savePageContent = async (pageSlug: string) => {
    setSaving(true);
    try {
      const pageContent = contentByPage[pageSlug] || {};
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
        description: `Контент страницы "${pages.find(p => p.value === pageSlug)?.label}" сохранен`,
      });
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

  const addNewContent = async () => {
    if (!newContentKey || !newContentValue) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cms_content')
        .insert([{
          page_slug: showAddForm,
          content_key: newContentKey,
          content_value: newContentValue,
          content_type: newContentType,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Обновляем локальное состояние
      setContentByPage(prev => ({
        ...prev,
        [showAddForm!]: {
          ...prev[showAddForm!],
          [newContentKey]: data
        }
      }));

      // Сбрасываем форму
      setNewContentKey("");
      setNewContentValue("");
      setNewContentType("text");
      setShowAddForm(null);

      toast({
        title: "Успешно",
        description: "Новый элемент контента добавлен",
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

  const deleteContent = async (pageSlug: string, contentKey: string, id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;

    try {
      const { error } = await supabase
        .from('cms_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Удаляем из локального состояния
      setContentByPage(prev => {
        const newState = { ...prev };
        if (newState[pageSlug]) {
          const { [contentKey]: removed, ...rest } = newState[pageSlug];
          newState[pageSlug] = rest;
        }
        return newState;
      });

      toast({
        title: "Успешно",
        description: "Элемент контента удален",
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

  const updateContentValue = (pageSlug: string, contentKey: string, value: string) => {
    setContentByPage(prev => ({
      ...prev,
      [pageSlug]: {
        ...prev[pageSlug],
        [contentKey]: {
          ...prev[pageSlug][contentKey],
          content_value: value
        }
      }
    }));
  };

  const toggleContentActive = (pageSlug: string, contentKey: string) => {
    setContentByPage(prev => ({
      ...prev,
      [pageSlug]: {
        ...prev[pageSlug],
        [contentKey]: {
          ...prev[pageSlug][contentKey],
          is_active: !prev[pageSlug][contentKey].is_active
        }
      }
    }));
  };

  const startEditing = (key: string) => {
    setEditingKeys(prev => new Set([...prev, key]));
  };

  const stopEditing = (key: string) => {
    setEditingKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  const getContentStats = (pageSlug: string) => {
    const pageContent = contentByPage[pageSlug] || {};
    const total = Object.keys(pageContent).length;
    const active = Object.values(pageContent).filter(item => item.is_active).length;
    return { total, active };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Управление контентом
          </h1>
          <p className="text-muted-foreground">Редактирование контента по страницам сайта</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          {pages.map((page) => {
            const stats = getContentStats(page.value);
            return (
              <TabsTrigger key={page.value} value={page.value} className="relative">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">{page.icon}</span>
                  <span className="text-xs">{page.label}</span>
                  {stats.total > 0 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {stats.active}/{stats.total}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {pages.map((page) => {
          const pageContent = contentByPage[page.value] || {};
          const contentItems = Object.entries(pageContent);
          const stats = getContentStats(page.value);

          return (
            <TabsContent key={page.value} value={page.value} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-2xl">{page.icon}</span>
                        {page.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stats.total === 0 
                          ? "Нет элементов контента" 
                          : `${stats.active} активных из ${stats.total} элементов`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowAddForm(page.value)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить элемент
                      </Button>
                      {stats.total > 0 && (
                        <Button
                          onClick={() => savePageContent(page.value)}
                          disabled={saving}
                          size="sm"
                          className="gap-2"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Сохранить все
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Add Form */}
                  {showAddForm === page.value && (
                    <Card className="mb-6 border-dashed border-primary/50 bg-primary/5">
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new_content_key">Ключ элемента</Label>
                            <Input
                              id="new_content_key"
                              value={newContentKey}
                              onChange={(e) => setNewContentKey(e.target.value)}
                              placeholder="hero_title, description..."
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="new_content_type">Тип контента</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {contentTypes.map((type) => (
                                <Button
                                  key={type.value}
                                  type="button"
                                  variant={newContentType === type.value ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setNewContentType(type.value)}
                                  className="gap-2"
                                >
                                  <span>{type.icon}</span>
                                  {type.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new_content_value">Содержимое</Label>
                          <Textarea
                            id="new_content_value"
                            value={newContentValue}
                            onChange={(e) => setNewContentValue(e.target.value)}
                            rows={3}
                            placeholder="Введите содержимое элемента..."
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowAddForm(null);
                              setNewContentKey("");
                              setNewContentValue("");
                              setNewContentType("text");
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Отмена
                          </Button>
                          <Button onClick={addNewContent}>
                            <Save className="w-4 h-4 mr-2" />
                            Добавить
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Content Items */}
                  <div className="space-y-4">
                    {contentItems.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Нет контента</h3>
                        <p className="mb-4">На этой странице пока нет элементов контента</p>
                        <Button 
                          onClick={() => setShowAddForm(page.value)}
                          variant="outline"
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить первый элемент
                        </Button>
                      </div>
                    ) : (
                      contentItems.map(([contentKey, item]) => {
                        const isEditing = editingKeys.has(`${page.value}-${contentKey}`);
                        const editKey = `${page.value}-${contentKey}`;

                        return (
                          <Card 
                            key={contentKey} 
                            className={`transition-all duration-200 ${
                              item.is_active ? 'border-primary/20' : 'border-muted opacity-60'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="font-mono text-xs">
                                        {contentKey}
                                      </Badge>
                                      <Badge variant="outline" className="gap-1">
                                        {contentTypes.find(t => t.value === item.content_type)?.icon}
                                        {contentTypes.find(t => t.value === item.content_type)?.label}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleContentActive(page.value, contentKey)}
                                        className="gap-1"
                                      >
                                        {item.is_active ? (
                                          <>
                                            <Eye className="w-4 h-4" />
                                            <Badge variant="default" className="text-xs">Активен</Badge>
                                          </>
                                        ) : (
                                          <>
                                            <EyeOff className="w-4 h-4" />
                                            <Badge variant="destructive" className="text-xs">Скрыт</Badge>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => isEditing ? stopEditing(editKey) : startEditing(editKey)}
                                    >
                                      {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => deleteContent(page.value, contentKey, item.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-3">
                                    <Label htmlFor={`content-${contentKey}`}>Содержимое</Label>
                                    <Textarea
                                      id={`content-${contentKey}`}
                                      value={item.content_value || ''}
                                      onChange={(e) => updateContentValue(page.value, contentKey, e.target.value)}
                                      rows={item.content_type === 'text' ? 3 : 6}
                                      className="font-mono text-sm"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-muted/50 rounded-lg p-4">
                                    <div className="text-sm font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                      {item.content_value || (
                                        <span className="text-muted-foreground italic">Нет содержимого</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}