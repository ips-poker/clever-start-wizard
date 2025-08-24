import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Home, Plus, Edit, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
// import { ImageUploader } from "./ImageUploader";

interface HomeContent {
  // Hero Section
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_cta_text: string;
  hero_background_image: string;
  
  // About Section
  about_title: string;
  about_description: string;
  about_image: string;
  
  // Features
  features_title: string;
  features_subtitle: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_1_image: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_2_image: string;
  feature_3_title: string;
  feature_3_description: string;
  feature_3_image: string;
  
  // Gallery Section
  gallery_title: string;
  gallery_subtitle: string;
  
  // Social Proof
  social_title: string;
  social_subtitle: string;
  
  // Contact Footer
  contact_title: string;
  contact_subtitle: string;
  contact_telegram: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
}

interface CMSContentItem {
  id: string;
  page_slug: string;
  content_key: string;
  content_type: string;
  content_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContentForm {
  page_slug: string;
  content_key: string;
  content_type: string;
  content_value: string;
  is_active: boolean;
}

export function HomePageEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Content management state
  const [cmsContent, setCmsContent] = useState<CMSContentItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<ContentForm>({
    page_slug: 'home',
    content_key: '',
    content_type: 'text',
    content_value: '',
    is_active: true
  });
  
  const [content, setContent] = useState<HomeContent>({
    // Hero Section
    hero_badge: "IPS",
    hero_title: "International Poker Club",
    hero_subtitle: "Премиальный покерный клуб",
    hero_description: "Элитные турниры и профессиональный покер в Санкт-Петербурге с рейтинговой системой ELO",
    hero_cta_text: "Записаться на турнир",
    hero_background_image: "",
    
    // About Section
    about_title: "О International Poker Series",
    about_description: "Мы создаем незабываемые покерные турниры высочайшего уровня, объединяя профессионалов и любителей игры в атмосфере настоящего спорта и азарта.",
    about_image: "",
    
    // Features
    features_title: "Преимущества IPS",
    features_subtitle: "Почему игроки выбирают наши турниры",
    feature_1_title: "Профессиональная организация",
    feature_1_description: "Турниры проводятся по международным стандартам с опытными дилерами",
    feature_1_image: "",
    feature_2_title: "ELO рейтинговая система", 
    feature_2_description: "Уникальная система рейтинга для отслеживания прогресса игроков",
    feature_2_image: "",
    feature_3_title: "Элитная атмосфера",
    feature_3_description: "Престижные локации и высокий уровень сервиса",
    feature_3_image: "",
    
    // Gallery Section
    gallery_title: "Галерея турниров",
    gallery_subtitle: "Моменты наших незабываемых игр",
    
    // Social Proof
    social_title: "Что говорят о нас игроки",
    social_subtitle: "Отзывы участников турниров IPS",
    
    // Contact Footer
    contact_title: "Присоединяйтесь к турнирам IPS",
    contact_subtitle: "Свяжитесь с нами для участия в турнирах",
    contact_telegram: "@IPSPoker",
    contact_phone: "+7 (921) 000-00-00",
    contact_email: "info@ipspoker.ru",
    contact_address: "Санкт-Петербург, Россия",
  });

  const contentTypes = [
    { value: 'text', label: 'Текст' },
    { value: 'html', label: 'HTML' },
    { value: 'image', label: 'Изображение' },
    { value: 'json', label: 'JSON' },
  ];

  useEffect(() => {
    fetchContent();
    fetchCmsContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'home')
        .eq('is_active', true)
        .order('content_key');

      if (error) throw error;

      if (data && data.length > 0) {
        const contentObj: Record<string, string> = {};
        
        data.forEach(item => {
          contentObj[item.content_key] = item.content_value || '';
        });

        setContent(prev => ({ ...prev, ...contentObj }));
      }
    } catch (error) {
      console.error('Error fetching home content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент главной страницы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // CMS Content Management functions
  const fetchCmsContent = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'home')
        .order('content_key');

      if (error) throw error;
      setCmsContent(data || []);
    } catch (error) {
      console.error('Error fetching CMS content:', error);
    }
  };

  const handleContentSave = async (id?: string) => {
    try {
      if (id) {
        // Update existing
        const { error } = await supabase
          .from('cms_content')
          .update({
            content_key: formData.content_key,
            content_type: formData.content_type,
            content_value: formData.content_value,
            is_active: formData.is_active,
          })
          .eq('id', id);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new
        const { error } = await supabase
          .from('cms_content')
          .insert([{ ...formData, page_slug: 'home' }]);

        if (error) throw error;
        setShowAddForm(false);
      }

      await fetchCmsContent();
      resetContentForm();
      toast({
        title: "Успешно",
        description: id ? "Контент обновлен" : "Контент создан",
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить контент",
        variant: "destructive",
      });
    }
  };

  const handleContentDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот контент?')) return;

    try {
      const { error } = await supabase
        .from('cms_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCmsContent();
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

  const startContentEdit = (item: CMSContentItem) => {
    setFormData({
      page_slug: item.page_slug,
      content_key: item.content_key,
      content_type: item.content_type,
      content_value: item.content_value || '',
      is_active: item.is_active,
    });
    setEditingId(item.id);
  };

  const resetContentForm = () => {
    setFormData({
      page_slug: 'home',
      content_key: '',
      content_type: 'text',
      content_value: '',
      is_active: true
    });
  };

  const cancelContentEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetContentForm();
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const contentItems = Object.entries(content).map(([key, value]) => ({
        page_slug: 'home',
        content_key: key,
        content_value: value,
        content_type: 'text',
        is_active: true
      }));

      // Удаляем существующий контент для главной страницы
      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'home');

      // Вставляем новый контент
      const { error } = await supabase
        .from('cms_content')
        .insert(contentItems);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Контент главной страницы сохранен"
      });
    } catch (error) {
      console.error('Error saving home content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить контент",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (key: keyof HomeContent, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
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
            <Home className="w-6 h-6" />
            Главная страница
          </h1>
          <p className="text-muted-foreground">Управление контентом и изображениями главной страницы</p>
        </div>
        <Button onClick={saveContent} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить изменения
        </Button>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="hero">Герой</TabsTrigger>
          <TabsTrigger value="about">О нас</TabsTrigger>
          <TabsTrigger value="features">Особенности</TabsTrigger>
          <TabsTrigger value="gallery">Галерея</TabsTrigger>
          <TabsTrigger value="contact">Контакты</TabsTrigger>
          <TabsTrigger value="content">Контент</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Главная секция (Hero)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_badge">Значок/Бейдж</Label>
                <Input
                  id="hero_badge"
                  value={content.hero_badge}
                  onChange={(e) => updateContent('hero_badge', e.target.value)}
                  placeholder="IPS"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_title">Главный заголовок</Label>
                <Input
                  id="hero_title"
                  value={content.hero_title}
                  onChange={(e) => updateContent('hero_title', e.target.value)}
                  placeholder="International Poker Club"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_subtitle">Подзаголовок</Label>
                <Input
                  id="hero_subtitle"
                  value={content.hero_subtitle}
                  onChange={(e) => updateContent('hero_subtitle', e.target.value)}
                  placeholder="Премиальный покерный клуб"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_description">Описание</Label>
                <Textarea
                  id="hero_description"
                  value={content.hero_description}
                  onChange={(e) => updateContent('hero_description', e.target.value)}
                  rows={3}
                  placeholder="Элитные турниры и профессиональный покер..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_cta_text">Текст кнопки</Label>
                <Input
                  id="hero_cta_text"
                  value={content.hero_cta_text}
                  onChange={(e) => updateContent('hero_cta_text', e.target.value)}
                  placeholder="Записаться на турнир"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_background_image">Фоновое изображение URL</Label>
                <Input
                  id="hero_background_image"
                  value={content.hero_background_image}
                  onChange={(e) => updateContent('hero_background_image', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Секция "О нас"</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="about_title">Заголовок</Label>
                <Input
                  id="about_title"
                  value={content.about_title}
                  onChange={(e) => updateContent('about_title', e.target.value)}
                  placeholder="О International Poker Series"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="about_description">Описание</Label>
                <Textarea
                  id="about_description"
                  value={content.about_description}
                  onChange={(e) => updateContent('about_description', e.target.value)}
                  rows={4}
                  placeholder="Описание организации..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="about_image">Изображение секции URL</Label>
                <Input
                  id="about_image"
                  value={content.about_image}
                  onChange={(e) => updateContent('about_image', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Section */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Секция преимуществ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="features_title">Заголовок секции</Label>
                  <Input
                    id="features_title"
                    value={content.features_title}
                    onChange={(e) => updateContent('features_title', e.target.value)}
                    placeholder="Преимущества IPS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="features_subtitle">Подзаголовок</Label>
                  <Input
                    id="features_subtitle"
                    value={content.features_subtitle}
                    onChange={(e) => updateContent('features_subtitle', e.target.value)}
                    placeholder="Почему игроки выбирают наши турниры"
                  />
                </div>
              </div>

              {/* Feature 1 */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Преимущество 1</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feature_1_title">Заголовок</Label>
                    <Input
                      id="feature_1_title"
                      value={content.feature_1_title}
                      onChange={(e) => updateContent('feature_1_title', e.target.value)}
                      placeholder="Профессиональная организация"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature_1_description">Описание</Label>
                    <Textarea
                      id="feature_1_description"
                      value={content.feature_1_description}
                      onChange={(e) => updateContent('feature_1_description', e.target.value)}
                      rows={2}
                      placeholder="Описание преимущества..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature_1_image">Изображение URL</Label>
                    <Input
                      id="feature_1_image"
                      value={content.feature_1_image}
                      onChange={(e) => updateContent('feature_1_image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Преимущество 2</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feature_2_title">Заголовок</Label>
                    <Input
                      id="feature_2_title"
                      value={content.feature_2_title}
                      onChange={(e) => updateContent('feature_2_title', e.target.value)}
                      placeholder="ELO рейтинговая система"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature_2_description">Описание</Label>
                    <Textarea
                      id="feature_2_description"
                      value={content.feature_2_description}
                      onChange={(e) => updateContent('feature_2_description', e.target.value)}
                      rows={2}
                      placeholder="Описание преимущества..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature_2_image">Изображение URL</Label>
                    <Input
                      id="feature_2_image"
                      value={content.feature_2_image}
                      onChange={(e) => updateContent('feature_2_image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Преимущество 3</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feature_3_title">Заголовок</Label>
                    <Input
                      id="feature_3_title"
                      value={content.feature_3_title}
                      onChange={(e) => updateContent('feature_3_title', e.target.value)}
                      placeholder="Элитная атмосфера"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature_3_description">Описание</Label>
                    <Textarea
                      id="feature_3_description"
                      value={content.feature_3_description}
                      onChange={(e) => updateContent('feature_3_description', e.target.value)}
                      rows={2}
                      placeholder="Описание преимущества..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature_3_image">Изображение URL</Label>
                    <Input
                      id="feature_3_image"
                      value={content.feature_3_image}
                      onChange={(e) => updateContent('feature_3_image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Section */}
        <TabsContent value="gallery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Секция галереи</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gallery_title">Заголовок</Label>
                <Input
                  id="gallery_title"
                  value={content.gallery_title}
                  onChange={(e) => updateContent('gallery_title', e.target.value)}
                  placeholder="Галерея турниров"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gallery_subtitle">Подзаголовок</Label>
                <Input
                  id="gallery_subtitle"
                  value={content.gallery_subtitle}
                  onChange={(e) => updateContent('gallery_subtitle', e.target.value)}
                  placeholder="Моменты наших незабываемых игр"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Section */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Секция контактов</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_title">Заголовок</Label>
                  <Input
                    id="contact_title"
                    value={content.contact_title}
                    onChange={(e) => updateContent('contact_title', e.target.value)}
                    placeholder="Присоединяйтесь к турнирам IPS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_subtitle">Подзаголовок</Label>
                  <Input
                    id="contact_subtitle"
                    value={content.contact_subtitle}
                    onChange={(e) => updateContent('contact_subtitle', e.target.value)}
                    placeholder="Свяжитесь с нами для участия в турнирах"
                  />
                </div>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Контактная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_telegram">Telegram</Label>
                      <Input
                        id="contact_telegram"
                        value={content.contact_telegram}
                        onChange={(e) => updateContent('contact_telegram', e.target.value)}
                        placeholder="@IPSPoker"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Телефон</Label>
                      <Input
                        id="contact_phone"
                        value={content.contact_phone}
                        onChange={(e) => updateContent('contact_phone', e.target.value)}
                        placeholder="+7 (921) 000-00-00"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        value={content.contact_email}
                        onChange={(e) => updateContent('contact_email', e.target.value)}
                        placeholder="info@ipspoker.ru"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_address">Адрес</Label>
                      <Input
                        id="contact_address"
                        value={content.contact_address}
                        onChange={(e) => updateContent('contact_address', e.target.value)}
                        placeholder="Санкт-Петербург, Россия"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Management Section */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Управление контентом главной страницы</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Добавление и редактирование элементов контента
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddForm(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить элемент
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Form */}
              {showAddForm && (
                <Card className="mb-6 border-dashed">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="content_key">Ключ контента</Label>
                        <Input
                          id="content_key"
                          value={formData.content_key}
                          onChange={(e) => setFormData({ ...formData, content_key: e.target.value })}
                          placeholder="hero_new_element"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content_type">Тип контента</Label>
                        <Select
                          value={formData.content_type}
                          onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {contentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Активен</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content_value">Содержимое</Label>
                      <Textarea
                        id="content_value"
                        value={formData.content_value}
                        onChange={(e) => setFormData({ ...formData, content_value: e.target.value })}
                        rows={4}
                        placeholder="Введите содержимое..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={cancelContentEdit}>
                        <X className="w-4 h-4 mr-2" />
                        Отмена
                      </Button>
                      <Button onClick={() => handleContentSave()}>
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content List */}
              <div className="space-y-4">
                {cmsContent.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Нет дополнительных элементов контента</p>
                    <p className="text-sm">Используйте кнопку "Добавить элемент" выше</p>
                  </div>
                ) : (
                  cmsContent.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        {editingId === item.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Ключ контента</Label>
                                <Input
                                  value={formData.content_key}
                                  onChange={(e) => setFormData({ ...formData, content_key: e.target.value })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Тип контента</Label>
                                <Select
                                  value={formData.content_type}
                                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {contentTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={formData.is_active}
                                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <Label>Активен</Label>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Содержимое</Label>
                              <Textarea
                                value={formData.content_value}
                                onChange={(e) => setFormData({ ...formData, content_value: e.target.value })}
                                rows={4}
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={cancelContentEdit}>
                                <X className="w-4 h-4 mr-2" />
                                Отмена
                              </Button>
                              <Button onClick={() => handleContentSave(item.id)}>
                                <Save className="w-4 h-4 mr-2" />
                                Сохранить
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{item.content_key}</Badge>
                                  <Badge variant="outline">{item.content_type}</Badge>
                                  <Badge variant={item.is_active ? "default" : "destructive"}>
                                    {item.is_active ? "Активен" : "Неактивен"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startContentEdit(item)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleContentDelete(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm font-mono whitespace-pre-wrap break-words">
                                {item.content_value || <span className="text-muted-foreground">Нет содержимого</span>}
                              </p>
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

      {/* Save Button */}
      <div className="flex justify-center pt-6">
        <Button 
          onClick={saveContent} 
          disabled={saving} 
          size="lg"
          className="gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить все изменения
        </Button>
      </div>
    </div>
  );
}