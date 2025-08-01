import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Home } from "lucide-react";
import { ImageUploader } from "./ImageUploader";

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

export function HomePageEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [content, setContent] = useState<HomeContent>({
    // Hero Section
    hero_badge: "IPS",
    hero_title: "International Poker Style",
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

  useEffect(() => {
    fetchContent();
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hero">Герой</TabsTrigger>
          <TabsTrigger value="about">О нас</TabsTrigger>
          <TabsTrigger value="features">Особенности</TabsTrigger>
          <TabsTrigger value="gallery">Галерея</TabsTrigger>
          <TabsTrigger value="contact">Контакты</TabsTrigger>
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
                  placeholder="International Poker Style"
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
              
              <ImageUploader
                label="Фоновое изображение"
                currentImageUrl={content.hero_background_image}
                onImageChange={(url) => updateContent('hero_background_image', url)}
                folder="home/hero"
                placeholder="Фоновое изображение для главной секции"
              />
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
              
              <ImageUploader
                label="Изображение секции"
                currentImageUrl={content.about_image}
                onImageChange={(url) => updateContent('about_image', url)}
                folder="home/about"
                placeholder="Изображение для секции О нас"
              />
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
                  <ImageUploader
                    label="Изображение"
                    currentImageUrl={content.feature_1_image}
                    onImageChange={(url) => updateContent('feature_1_image', url)}
                    folder="home/features"
                    placeholder="Изображение для преимущества 1"
                  />
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
                  <ImageUploader
                    label="Изображение"
                    currentImageUrl={content.feature_2_image}
                    onImageChange={(url) => updateContent('feature_2_image', url)}
                    folder="home/features"
                    placeholder="Изображение для преимущества 2"
                  />
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
                  <ImageUploader
                    label="Изображение"
                    currentImageUrl={content.feature_3_image}
                    onImageChange={(url) => updateContent('feature_3_image', url)}
                    folder="home/features"
                    placeholder="Изображение для преимущества 3"
                  />
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