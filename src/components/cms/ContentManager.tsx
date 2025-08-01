import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  Eye, 
  EyeOff,
  Home,
  Building2,
  Trophy,
  Star,
  Image as ImageIcon,
  BookOpen,
  Phone,
  Link2,
  Search,
  Globe,
  Settings,
  Code,
  Hash,
  Type,
  Monitor
} from "lucide-react";

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
  robots_meta: string;
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
  
  // SEO states
  const [seoData, setSeoData] = useState<SEOData[]>([]);
  const [editingSEO, setEditingSEO] = useState<string | null>(null);
  const [showAddSEOForm, setShowAddSEOForm] = useState(false);
  const [seoFormData, setSeoFormData] = useState({
    page_slug: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    robots_meta: 'index, follow'
  });

  const { toast } = useToast();

  const pages = [
    { value: 'home', label: 'Главная', icon: Home, color: 'text-blue-600' },
    { value: 'about', label: 'О нас', icon: Building2, color: 'text-green-600' },
    { value: 'tournaments', label: 'Турниры', icon: Trophy, color: 'text-yellow-600' },
    { value: 'rating', label: 'Рейтинг', icon: Star, color: 'text-orange-600' },
    { value: 'gallery', label: 'Галерея', icon: ImageIcon, color: 'text-purple-600' },
    { value: 'blog', label: 'Блог', icon: BookOpen, color: 'text-red-600' },
    { value: 'contact', label: 'Контакты', icon: Phone, color: 'text-teal-600' },
    { value: 'footer', label: 'Футер', icon: Link2, color: 'text-gray-600' },
    { value: 'seo', label: 'SEO', icon: Search, color: 'text-indigo-600' },
  ];

  const contentTypes = [
    { value: 'text', label: 'Текст', icon: Type, color: 'text-slate-600' },
    { value: 'html', label: 'HTML', icon: Code, color: 'text-orange-600' },
    { value: 'image', label: 'Изображение', icon: ImageIcon, color: 'text-green-600' },
    { value: 'json', label: 'JSON', icon: Hash, color: 'text-purple-600' },
  ];

  const seoPages = [
    { value: 'home', label: 'Главная страница' },
    { value: 'about', label: 'О нас' },
    { value: 'tournaments', label: 'Турниры' },
    { value: 'rating', label: 'Рейтинг' },
    { value: 'gallery', label: 'Галерея' },
    { value: 'blog', label: 'Блог' },
  ];

  const robotsOptions = [
    { value: 'index, follow', label: 'Индексировать, следовать ссылкам' },
    { value: 'index, nofollow', label: 'Индексировать, не следовать ссылкам' },
    { value: 'noindex, follow', label: 'Не индексировать, следовать ссылкам' },
    { value: 'noindex, nofollow', label: 'Не индексировать, не следовать ссылкам' },
  ];

  useEffect(() => {
    fetchContent();
    fetchSEOData();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .order('page_slug')
        .order('content_key');

      if (error) throw error;

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

  const fetchSEOData = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_seo')
        .select('*')
        .order('page_slug');

      if (error) throw error;
      setSeoData(data || []);
    } catch (error) {
      console.error('Error fetching SEO data:', error);
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

      setContentByPage(prev => ({
        ...prev,
        [showAddForm!]: {
          ...prev[showAddForm!],
          [newContentKey]: data
        }
      }));

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

  const saveSEOData = async (id?: string) => {
    try {
      if (id) {
        const { error } = await supabase
          .from('cms_seo')
          .update(seoFormData)
          .eq('id', id);
        if (error) throw error;
        setEditingSEO(null);
      } else {
        const { error } = await supabase
          .from('cms_seo')
          .insert([seoFormData]);
        if (error) throw error;
        setShowAddSEOForm(false);
      }

      await fetchSEOData();
      resetSEOForm();
      toast({
        title: "Успешно",
        description: id ? "SEO данные обновлены" : "SEO данные созданы",
      });
    } catch (error) {
      console.error('Error saving SEO data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить SEO данные",
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

  const startEditSEO = (item: SEOData) => {
    setSeoFormData({
      page_slug: item.page_slug,
      meta_title: item.meta_title || '',
      meta_description: item.meta_description || '',
      meta_keywords: item.meta_keywords || '',
      og_title: item.og_title || '',
      og_description: item.og_description || '',
      og_image: item.og_image || '',
      canonical_url: item.canonical_url || '',
      robots_meta: item.robots_meta,
    });
    setEditingSEO(item.id);
  };

  const resetSEOForm = () => {
    setSeoFormData({
      page_slug: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
      og_image: '',
      canonical_url: '',
      robots_meta: 'index, follow'
    });
  };

  const cancelSEOEdit = () => {
    setEditingSEO(null);
    setShowAddSEOForm(false);
    resetSEOForm();
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            Управление контентом
          </h1>
          <p className="text-muted-foreground">Редактирование контента и SEO настроек сайта</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 h-auto">
          {pages.map((page) => {
            const stats = page.value !== 'seo' ? getContentStats(page.value) : null;
            const IconComponent = page.icon;
            
            return (
              <TabsTrigger 
                key={page.value} 
                value={page.value} 
                className="flex flex-col items-center gap-2 h-16 data-[state=active]:bg-primary/10"
              >
                <div className={`p-1.5 rounded-md ${page.color} bg-current/10`}>
                  <IconComponent className={`w-4 h-4 ${page.color}`} />
                </div>
                <span className="text-xs font-medium">{page.label}</span>
                {stats && stats.total > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {stats.active}/{stats.total}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Content Pages */}
        {pages.filter(p => p.value !== 'seo').map((page) => {
          const pageContent = contentByPage[page.value] || {};
          const contentItems = Object.entries(pageContent);
          const stats = getContentStats(page.value);
          const IconComponent = page.icon;

          return (
            <TabsContent key={page.value} value={page.value} className="space-y-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${page.color} bg-current/10`}>
                          <IconComponent className={`w-5 h-5 ${page.color}`} />
                        </div>
                        Контент страницы: {page.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Label>Тип контента</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {contentTypes.map((type) => {
                                const TypeIcon = type.icon;
                                return (
                                  <Button
                                    key={type.value}
                                    type="button"
                                    variant={newContentType === type.value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setNewContentType(type.value)}
                                    className="gap-2"
                                  >
                                    <TypeIcon className="w-4 h-4" />
                                    {type.label}
                                  </Button>
                                );
                              })}
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
                        <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <FileText className="w-8 h-8" />
                        </div>
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
                        const typeInfo = contentTypes.find(t => t.value === item.content_type);
                        const TypeIcon = typeInfo?.icon || Type;

                        return (
                          <Card 
                            key={contentKey} 
                            className={`transition-all duration-200 hover:shadow-md ${
                              item.is_active ? 'border-primary/20' : 'border-muted opacity-60'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="font-mono text-xs gap-1">
                                        <Hash className="w-3 h-3" />
                                        {contentKey}
                                      </Badge>
                                      <Badge variant="outline" className="gap-1">
                                        <TypeIcon className="w-3 h-3" />
                                        {typeInfo?.label}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleContentActive(page.value, contentKey)}
                                        className="gap-1 h-6"
                                      >
                                        {item.is_active ? (
                                          <>
                                            <Eye className="w-3 h-3" />
                                            <Badge variant="default" className="text-xs h-4">Активен</Badge>
                                          </>
                                        ) : (
                                          <>
                                            <EyeOff className="w-3 h-3" />
                                            <Badge variant="destructive" className="text-xs h-4">Скрыт</Badge>
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

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <Search className="w-5 h-5" />
                    </div>
                    SEO Настройки
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Настройка метаданных для поисковых систем
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddSEOForm(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить SEO
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add SEO Form */}
              {showAddSEOForm && (
                <Card className="mb-6 border-dashed border-indigo-200 bg-indigo-50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Страница</Label>
                        <Select 
                          value={seoFormData.page_slug} 
                          onValueChange={(value) => setSeoFormData({ ...seoFormData, page_slug: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите страницу" />
                          </SelectTrigger>
                          <SelectContent>
                            {seoPages.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Robots Meta</Label>
                        <Select 
                          value={seoFormData.robots_meta} 
                          onValueChange={(value) => setSeoFormData({ ...seoFormData, robots_meta: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {robotsOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Meta Title</Label>
                        <Input
                          value={seoFormData.meta_title}
                          onChange={(e) => setSeoFormData({ ...seoFormData, meta_title: e.target.value })}
                          placeholder="Заголовок страницы (60 символов)"
                          maxLength={60}
                        />
                        <div className="text-xs text-muted-foreground">
                          {seoFormData.meta_title.length}/60 символов
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Meta Description</Label>
                        <Textarea
                          value={seoFormData.meta_description}
                          onChange={(e) => setSeoFormData({ ...seoFormData, meta_description: e.target.value })}
                          placeholder="Описание страницы (160 символов)"
                          maxLength={160}
                          rows={3}
                        />
                        <div className="text-xs text-muted-foreground">
                          {seoFormData.meta_description.length}/160 символов
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Meta Keywords</Label>
                        <Input
                          value={seoFormData.meta_keywords}
                          onChange={(e) => setSeoFormData({ ...seoFormData, meta_keywords: e.target.value })}
                          placeholder="ключевые, слова, через, запятую"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Open Graph изображение</Label>
                        <Input
                          value={seoFormData.og_image}
                          onChange={(e) => setSeoFormData({ ...seoFormData, og_image: e.target.value })}
                          placeholder="https://example.com/og-image.jpg"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={cancelSEOEdit}>
                        <X className="w-4 h-4 mr-2" />
                        Отмена
                      </Button>
                      <Button onClick={() => saveSEOData()}>
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SEO Items */}
              <div className="space-y-4">
                {seoData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="p-4 rounded-full bg-indigo-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Search className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Нет SEO настроек</h3>
                    <p className="mb-4">Добавьте SEO метаданные для страниц</p>
                    <Button 
                      onClick={() => setShowAddSEOForm(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить первые SEO настройки
                    </Button>
                  </div>
                ) : (
                  seoData.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        {editingSEO === item.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Meta Title</Label>
                                <Input
                                  value={seoFormData.meta_title}
                                  onChange={(e) => setSeoFormData({ ...seoFormData, meta_title: e.target.value })}
                                  maxLength={60}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Robots Meta</Label>
                                <Select 
                                  value={seoFormData.robots_meta} 
                                  onValueChange={(value) => setSeoFormData({ ...seoFormData, robots_meta: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {robotsOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Meta Description</Label>
                              <Textarea
                                value={seoFormData.meta_description}
                                onChange={(e) => setSeoFormData({ ...seoFormData, meta_description: e.target.value })}
                                maxLength={160}
                                rows={3}
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={cancelSEOEdit}>
                                <X className="w-4 h-4 mr-2" />
                                Отмена
                              </Button>
                              <Button onClick={() => saveSEOData(item.id)}>
                                <Save className="w-4 h-4 mr-2" />
                                Сохранить
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono gap-1">
                                    <Globe className="w-3 h-3" />
                                    {item.page_slug}
                                  </Badge>
                                  <Badge variant={item.robots_meta.includes('noindex') ? "destructive" : "default"}>
                                    {item.robots_meta}
                                  </Badge>
                                </div>
                                <h3 className="font-semibold text-lg">
                                  {item.meta_title || 'Нет заголовка'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {item.meta_description || 'Нет описания'}
                                </p>
                                {item.meta_keywords && (
                                  <div className="flex gap-1 flex-wrap">
                                    {item.meta_keywords.split(',').map((keyword, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {keyword.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditSEO(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}