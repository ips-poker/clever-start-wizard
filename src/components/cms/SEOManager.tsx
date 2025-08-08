import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSEOManager } from "@/hooks/useSEOManager";
import { SEOForm } from "@/components/cms/content/SEOForm";
import { SEOPreview } from "@/components/cms/seo/SEOPreview";
import { SEOAnalyzer } from "@/components/cms/seo/SEOAnalyzer";
import { SchemaMarkupGenerator } from "@/components/cms/seo/SchemaMarkupGenerator";
import { SEOTracking } from "@/components/cms/seo/SEOTracking";
import { 
  Search, 
  Plus, 
  Edit, 
  BarChart3, 
  Code, 
  Target, 
  Globe, 
  TrendingUp,
  Lightbulb,
  Settings,
  Eye
} from "lucide-react";

export function SEOManager() {
  const [seoData, setSeoData] = useState<any[]>([]);
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

  const { 
    loading, 
    saving, 
    error, 
    fetchSEOData, 
    saveSEOData, 
    deleteSEOData 
  } = useSEOManager();
  
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
    loadData();
  }, []);

  const loadData = async () => {
    const data = await fetchSEOData();
    setSeoData(data);
  };

  const handleSave = async () => {
    const result = await saveSEOData(formData, editingId || undefined);
    if (result) {
      await loadData();
      resetForm();
      setEditingId(null);
      setShowAddForm(false);
    }
  };

  const startEdit = (item: any) => {
    setFormData({
      page_slug: item.page_slug,
      meta_title: item.meta_title || '',
      meta_description: item.meta_description || '',
      meta_keywords: item.meta_keywords || '',
      og_title: item.og_title || '',
      og_description: item.og_description || '',
      og_image: item.og_image || '',
      canonical_url: item.canonical_url || '',
      robots_meta: item.robots_meta || 'index, follow',
    });
    setEditingId(item.id);
    setShowAddForm(true);
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
          <p className="text-muted-foreground">
            Полнофункциональный инструмент для максимальной SEO оптимизации сайта
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Добавить SEO данные
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Обзор
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Анализ
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Отслеживание
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Предпросмотр
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Настройки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* SEO Form */}
          <SEOForm
            isOpen={showAddForm}
            isEditing={!!editingId}
            loading={saving}
            pageOptions={pageOptions}
            robotsOptions={robotsOptions}
            formData={formData}
            onFormDataChange={setFormData}
            onSave={handleSave}
            onCancel={cancelEdit}
          />

          {/* SEO Data List */}
          <div className="space-y-4">
            {seoData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Нет SEO данных</h3>
                  <p className="text-muted-foreground mb-4">
                    Создайте первые SEO настройки для оптимизации сайта
                  </p>
                  <Button onClick={() => setShowAddForm(true)}>Добавить первые SEO данные</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary mb-1">{seoData.length}</div>
                      <div className="text-sm text-muted-foreground">Настроенных страниц</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {seoData.filter(item => item.meta_title && item.meta_description).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Полностью оптимизированы</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-1">
                        {seoData.filter(item => !item.meta_title || !item.meta_description).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Требуют доработки</div>
                    </CardContent>
                  </Card>
                </div>

                {seoData.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">{item.page_slug}</Badge>
                            <Badge variant={item.robots_meta?.includes('noindex') ? "destructive" : "default"}>
                              {item.robots_meta || 'index, follow'}
                            </Badge>
                            {(!item.meta_title || !item.meta_description) && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                Нужна оптимизация
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">
                            {item.meta_title || 'Заголовок не задан'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.meta_description || 'Описание не задано'}
                          </p>
                          {item.meta_keywords && (
                            <div className="flex gap-1 flex-wrap">
                              {item.meta_keywords.split(',').slice(0, 5).map((keyword: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword.trim()}
                                </Badge>
                              ))}
                              {item.meta_keywords.split(',').length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.meta_keywords.split(',').length - 5} еще
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analyzer">
          <SEOAnalyzer />
        </TabsContent>

        <TabsContent value="schema">
          <SchemaMarkupGenerator />
        </TabsContent>

        <TabsContent value="tracking">
          <SEOTracking />
        </TabsContent>

        <TabsContent value="preview">
          <SEOPreview
            metaTitle={formData.meta_title}
            metaDescription={formData.meta_description}
            canonicalUrl={formData.canonical_url}
            ogTitle={formData.og_title}
            ogDescription={formData.og_description}
            ogImage={formData.og_image}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Общие настройки SEO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Следующие обновления:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Автоматическая генерация sitemap.xml</li>
                    <li>• Интеграция с Google Search Console API</li>
                    <li>• Мониторинг позиций в реальном времени</li>
                    <li>• Анализ конкурентов</li>
                    <li>• Автоматические рекомендации по улучшению</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}