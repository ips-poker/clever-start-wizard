import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Edit, Save, X, Globe, Eye } from "lucide-react";

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

export function SEOManager() {
  const [seoData, setSeoData] = useState<SEOData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
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
      const { data, error } = await (supabase as any)
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
        const { error } = await (supabase as any)
          .from('cms_seo')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await (supabase as any)
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
        description: "Не удалось сохранить SEO данные",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: SEOData) => {
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
      page_slug: '', meta_title: '', meta_description: '', meta_keywords: '',
      og_title: '', og_description: '', og_image: '', canonical_url: '', robots_meta: 'index, follow'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">SEO Управление</h2>
          <p className="text-muted-foreground">Настройка SEO метаданных для страниц сайта</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Добавить SEO данные
        </Button>
      </div>

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
                <Label>Страница</Label>
                <Select value={formData.page_slug} onValueChange={(value) => setFormData({ ...formData, page_slug: value })}>
                  <SelectTrigger><SelectValue placeholder="Выберите страницу" /></SelectTrigger>
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
                <Select value={formData.robots_meta} onValueChange={(value) => setFormData({ ...formData, robots_meta: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <h3 className="text-lg font-semibold">Основные мета-теги</h3>
              
              <div>
                <Label>Meta Title</Label>
                <Input
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
                <Label>Meta Description</Label>
                <Textarea
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
                <Label>Meta Keywords</Label>
                <Input
                  value={formData.meta_keywords}
                  onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                  placeholder="ключевые, слова, через, запятую"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}><X size={16} className="mr-2" />Отмена</Button>
              <Button onClick={() => handleSave()}><Save size={16} className="mr-2" />Сохранить</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {seoData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет SEO данных</h3>
              <Button onClick={() => setShowAddForm(true)}>Добавить первые SEO данные</Button>
            </CardContent>
          </Card>
        ) : (
          seoData.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">{item.page_slug}</Badge>
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
                    <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                      <Edit size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}