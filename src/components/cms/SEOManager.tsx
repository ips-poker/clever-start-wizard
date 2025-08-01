import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Edit, Save, X, Globe, Tag, Eye } from "lucide-react";

interface CMSSEO {
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
  schema_markup: any;
  created_at: string;
  updated_at: string;
}

interface SEOForm {
  page_slug: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  robots_meta: string;
}

export function SEOManager() {
  const [seoData, setSeoData] = useState<CMSSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<SEOForm>({
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

  const pageOptions = [
    { value: 'home', label: 'Главная страница', url: '/' },
    { value: 'about', label: 'О нас', url: '/about' },
    { value: 'tournaments', label: 'Турниры', url: '/tournaments' },
    { value: 'rating', label: 'Рейтинг', url: '/rating' },
    { value: 'gallery', label: 'Галерея', url: '/gallery' },
    { value: 'blog', label: 'Блог', url: '/blog' },
    { value: 'admin', label: 'Админ панель', url: '/admin' },
    { value: 'director', label: 'Турнирный директор', url: '/director' },
  ];

  const robotsOptions = [
    { value: 'index, follow', label: 'Индексировать, следовать ссылкам' },
    { value: 'index, nofollow', label: 'Индексировать, не следовать ссылкам' },
    { value: 'noindex, follow', label: 'Не индексировать, следовать ссылкам' },
    { value: 'noindex, nofollow', label: 'Не индексировать, не следовать ссылкам' },
  ];

  useEffect(() => {
    fetchSEOData();
  }, []);

  const fetchSEOData = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_seo')
        .select('*')
        .order('page_slug', { ascending: true });

      if (error) throw error;
      setSeoData(data || []);
    } catch (error) {
      console.error('Error fetching SEO data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить SEO данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        // Update existing
        const { error } = await supabase
          .from('cms_seo')
          .update(formData)
          .eq('id', id);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new
        const { error } = await supabase
          .from('cms_seo')
          .insert([formData]);

        if (error) throw error;
        setShowAddForm(false);
      }

      await fetchSEOData();
      resetForm();
      toast({
        title: "Успешно",
        description: id ? "SEO данные обновлены" : "SEO данные созданы",
      });
    } catch (error) {
      console.error('Error saving SEO data:', error);
      toast({
        title: "Ошибка",
        description: error.message.includes('duplicate') 
          ? "Страница с таким slug уже существует" 
          : "Не удалось сохранить SEO данные",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: CMSSEO) => {
    setFormData({
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
    setEditingId(item.id);
  };

  const resetForm = () => {
    setFormData({
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

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const generatePreview = (data: SEOForm) => {
    const domain = window.location.origin;
    const pageUrl = pageOptions.find(p => p.value === data.page_slug)?.url || `/${data.page_slug}`;
    
    return (
      <div className="border rounded-lg p-4 bg-background">
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">{domain}{pageUrl}</div>
          <div className="text-blue-600 text-lg hover:underline cursor-pointer">
            {data.meta_title || data.og_title || `Заголовок для ${data.page_slug}`}
          </div>
          <div className="text-sm text-muted-foreground">
            {data.meta_description || data.og_description || 'Описание страницы не задано'}
          </div>
          {data.meta_keywords && (
            <div className="flex gap-1 flex-wrap">
              {data.meta_keywords.split(',').map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword.trim()}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">SEO Управление</h2>
          <p className="text-muted-foreground">Настройка SEO метаданных для страниц сайта</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить SEO данные
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search size={20} />
              Новые SEO данные
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page_slug">Страница</Label>
                <Select
                  value={formData.page_slug}
                  onValueChange={(value) => setFormData({ ...formData, page_slug: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите страницу" />
                  </SelectTrigger>
                  <SelectContent>
                    {pageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} ({option.url})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="robots_meta">Robots Meta</Label>
                <Select
                  value={formData.robots_meta}
                  onValueChange={(value) => setFormData({ ...formData, robots_meta: value })}
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

            {/* Basic Meta Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Основные мета-теги</h3>
              
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder="Заголовок страницы (60 символов)"
                  maxLength={60}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.meta_title.length}/60 символов
                </div>
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="Описание страницы (160 символов)"
                  maxLength={160}
                  rows={3}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.meta_description.length}/160 символов
                </div>
              </div>

              <div>
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Input
                  id="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                  placeholder="ключевые, слова, через, запятую"
                />
              </div>

              <div>
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input
                  id="canonical_url"
                  value={formData.canonical_url}
                  onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                  placeholder="https://example.com/page"
                />
              </div>
            </div>

            {/* Open Graph */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Open Graph (социальные сети)</h3>
              
              <div>
                <Label htmlFor="og_title">OG Title</Label>
                <Input
                  id="og_title"
                  value={formData.og_title}
                  onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                  placeholder="Заголовок для социальных сетей"
                />
              </div>

              <div>
                <Label htmlFor="og_description">OG Description</Label>
                <Textarea
                  id="og_description"
                  value={formData.og_description}
                  onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                  placeholder="Описание для социальных сетей"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="og_image">OG Image</Label>
                <Input
                  id="og_image"
                  value={formData.og_image}
                  onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Preview */}
            {formData.page_slug && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye size={16} />
                  Предпросмотр в поиске
                </h3>
                {generatePreview(formData)}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                <X size={16} className="mr-2" />
                Отмена
              </Button>
              <Button onClick={() => handleSave()}>
                <Save size={16} className="mr-2" />
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Data List */}
      <div className="space-y-4">
        {seoData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет SEO данных</h3>
              <p className="text-muted-foreground mb-4">Начните добавлять SEO метаданные для ваших страниц</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus size={16} className="mr-2" />
                Добавить первые SEO данные
              </Button>
            </CardContent>
          </Card>
        ) : (
          seoData.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                {editingId === item.id ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Страница</Label>
                        <Select
                          value={formData.page_slug}
                          onValueChange={(value) => setFormData({ ...formData, page_slug: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} ({option.url})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Robots Meta</Label>
                        <Select
                          value={formData.robots_meta}
                          onValueChange={(value) => setFormData({ ...formData, robots_meta: value })}
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
                      <div>
                        <Label>Meta Title</Label>
                        <Input
                          value={formData.meta_title}
                          onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                          maxLength={60}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {formData.meta_title.length}/60 символов
                        </div>
                      </div>

                      <div>
                        <Label>Meta Description</Label>
                        <Textarea
                          value={formData.meta_description}
                          onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                          maxLength={160}
                          rows={3}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          {formData.meta_description.length}/160 символов
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Meta Keywords</Label>
                          <Input
                            value={formData.meta_keywords}
                            onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Canonical URL</Label>
                          <Input
                            value={formData.canonical_url}
                            onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>OG Title</Label>
                          <Input
                            value={formData.og_title}
                            onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>OG Image</Label>
                          <Input
                            value={formData.og_image}
                            onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>OG Description</Label>
                        <Textarea
                          value={formData.og_description}
                          onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    {generatePreview(formData)}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={cancelEdit}>
                        <X size={16} className="mr-2" />
                        Отмена
                      </Button>
                      <Button onClick={() => handleSave(item.id)}>
                        <Save size={16} className="mr-2" />
                        Сохранить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {item.page_slug}
                          </Badge>
                          <Badge variant={item.robots_meta.includes('noindex') ? "destructive" : "default"}>
                            {item.robots_meta}
                          </Badge>
                        </div>
                        <h3 className="font-semibold">{item.meta_title || 'Нет заголовка'}</h3>
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
                        onClick={() => startEdit(item)}
                      >
                        <Edit size={14} />
                      </Button>
                    </div>

                    {(item.og_title || item.og_description || item.og_image) && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Globe size={14} />
                          Open Graph
                        </h4>
                        <div className="space-y-1 text-sm">
                          {item.og_title && <div><strong>Title:</strong> {item.og_title}</div>}
                          {item.og_description && <div><strong>Description:</strong> {item.og_description}</div>}
                          {item.og_image && <div><strong>Image:</strong> {item.og_image}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}