import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useSEOManager } from '@/hooks/useSEOManager';
import { 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  MapPin,
  Search,
  Globe,
  Star,
  Wand2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function YandexSEOOptimizer() {
  const [loading, setLoading] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState<any>(null);
  const [formData, setFormData] = useState({
    region: 'Москва',
    businessType: 'Покерный клуб',
    mainKeywords: 'покер клуб москва, турниры по покеру, покерный клуб премиум',
    competitors: 'pokerdom.ru, pokerstars.ru, partypoker.ru',
    uniqueFeatures: 'рейтинговая система RPS, премиум сервис, элитное сообщество'
  });

  const { saveSEOData } = useSEOManager();
  const { toast } = useToast();

  const yandexOptimizationTips = [
    {
      title: "Региональная оптимизация",
      description: "Яндекс сильно учитывает геолокацию пользователей",
      tips: [
        "Обязательно указывайте регион в title и description",
        "Используйте мета-теги geo.region и geo.placename",
        "Добавляйте адрес в структурированных данных",
        "Регистрируйтесь в Яндекс.Справочнике"
      ],
      icon: MapPin,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Поведенческие факторы",
      description: "Яндекс анализирует поведение пользователей на сайте",
      tips: [
        "Увеличивайте время на сайте качественным контентом",
        "Снижайте показатель отказов интерактивными элементами",
        "Оптимизируйте скорость загрузки страниц",
        "Создавайте понятную навигацию"
      ],
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Контентная стратегия",
      description: "Яндекс предпочитает экспертный и полезный контент",
      tips: [
        "Создавайте подробные статьи о покерных стратегиях",
        "Добавляйте отзывы и рейтинги игроков",
        "Публикуйте результаты турниров и статистику",
        "Используйте структурированные данные для событий"
      ],
      icon: Star,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Технические факторы",
      description: "Техническая оптимизация для Яндекса",
      tips: [
        "Настройте правильные заголовки H1-H6",
        "Используйте микроразметку Schema.org",
        "Оптимизируйте изображения с alt-тегами",
        "Создайте sitemap.xml и robots.txt"
      ],
      icon: Globe,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  const generateYandexOptimizedContent = async () => {
    setLoading(true);
    
    try {
      // Попытка генерации с AI
      const businessData = JSON.stringify(formData);
      
      const { data, error } = await supabase.functions.invoke('seo-analyzer', {
        body: {
          pageSlug: 'yandex_optimization',
          url: window.location.origin,
          content: `Generate Yandex-optimized content for: ${businessData}`,
          keywords: formData.mainKeywords,
          competitors: formData.competitors
        }
      });

      if (!error && data?.recommendations) {
        // Используем AI рекомендации
        const optimized = {
          title: data.recommendations.title || generateFallbackTitle(),
          description: data.recommendations.description || generateFallbackDescription(),
          h1: data.recommendations.h1 || generateFallbackH1(),
          keywords: data.recommendations.keywords || formData.mainKeywords,
          geo_tags: {
            region: 'RU-MOW',
            placename: formData.region,
            position: '55.7558;37.6176'
          },
          content_suggestions: data.analysis?.content_recommendations || generateFallbackSuggestions(),
          structured_data: data.recommendations.schema || generateFallbackSchema()
        };
        
        setOptimizedContent(optimized);
        toast({
          title: "AI оптимизация завершена",
          description: "Контент оптимизирован с помощью искусственного интеллекта",
        });
      } else {
        // Fallback к стандартной генерации
        generateFallbackOptimization();
      }
    } catch (error: any) {
      console.error('AI generation failed:', error);
      // Fallback к стандартной генерации при ошибке
      generateFallbackOptimization();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackOptimization = () => {
    const optimized = {
      title: generateFallbackTitle(),
      description: generateFallbackDescription(),
      h1: generateFallbackH1(),
      keywords: `${formData.mainKeywords}, ${formData.businessType.toLowerCase()} ${formData.region.toLowerCase()}, лучший покер клуб ${formData.region.toLowerCase()}`,
      geo_tags: {
        region: 'RU-MOW',
        placename: formData.region,
        position: '55.7558;37.6176'
      },
      content_suggestions: generateFallbackSuggestions(),
      structured_data: generateFallbackSchema()
    };
    
    setOptimizedContent(optimized);
    toast({
      title: "Стандартная оптимизация",
      description: "Контент оптимизирован базовыми алгоритмами",
    });
  };

  const generateFallbackTitle = () => 
    `${formData.businessType} в ${formData.region} - EPC Event Poker Club | Турниры и рейтинг RPS`;
  
  const generateFallbackDescription = () => 
    `Премиальный ${formData.businessType.toLowerCase()} EPC в ${formData.region}. ${formData.uniqueFeatures}. Турниры по покеру каждый день. Присоединяйтесь к лучшему покер клубу города!`;
  
  const generateFallbackH1 = () => 
    `EPC Event Poker Club - Лучший ${formData.businessType.toLowerCase()} в ${formData.region}`;
  
  const generateFallbackSuggestions = () => [
    `Создайте страницу "Покерные турниры в ${formData.region}"`,
    `Добавьте раздел "Отзывы игроков ${formData.businessType.toLowerCase()}"`,
    `Создайте календарь турниров с микроразметкой Event`,
    `Добавьте страницу с рейтингом лучших игроков ${formData.region}`
  ];
  
  const generateFallbackSchema = () => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EPC Event Poker Club",
    "description": `Премиальный ${formData.businessType.toLowerCase()} в ${formData.region}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": formData.region,
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "55.7558",
      "longitude": "37.6176"
    }
  });

  const applyOptimizations = async () => {
    if (!optimizedContent) return;

    try {
      setLoading(true);
      
      const result = await saveSEOData({
        page_slug: 'home',
        meta_title: optimizedContent.title,
        meta_description: optimizedContent.description,
        meta_keywords: optimizedContent.keywords,
        canonical_url: window.location.origin,
        robots_meta: 'index, follow'
      });

      if (result) {
        toast({
          title: "SEO оптимизация применена",
          description: "Данные сохранены и будут использованы на сайте",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка применения",
        description: error.message || "Не удалось применить оптимизацию",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Яндекс SEO Оптимизатор
          </CardTitle>
          <CardDescription>
            Специализированная оптимизация для попадания в топ Яндекса
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="region">Регион</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                placeholder="Москва"
              />
            </div>
            <div>
              <Label htmlFor="businessType">Тип бизнеса</Label>
              <Input
                id="businessType"
                value={formData.businessType}
                onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                placeholder="Покерный клуб"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mainKeywords">Основные ключевые слова</Label>
            <Textarea
              id="mainKeywords"
              value={formData.mainKeywords}
              onChange={(e) => setFormData(prev => ({ ...prev, mainKeywords: e.target.value }))}
              placeholder="покер клуб москва, турниры по покеру..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="uniqueFeatures">Уникальные особенности</Label>
            <Textarea
              id="uniqueFeatures"
              value={formData.uniqueFeatures}
              onChange={(e) => setFormData(prev => ({ ...prev, uniqueFeatures: e.target.value }))}
              placeholder="рейтинговая система RPS, премиум сервис..."
              rows={2}
            />
          </div>

            <div className="flex gap-2">
              <Button 
                onClick={generateYandexOptimizedContent} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {loading ? 'Оптимизирую с AI...' : 'Оптимизировать с AI'}
              </Button>

              {optimizedContent && (
                <Button 
                  onClick={applyOptimizations}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Применить оптимизацию
                </Button>
              )}
            </div>
        </CardContent>
      </Card>

      {/* Optimization Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {yandexOptimizationTips.map((tip, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={`p-2 rounded-lg ${tip.bgColor}`}>
                  <tip.icon className={`w-5 h-5 ${tip.color}`} />
                </div>
                {tip.title}
              </CardTitle>
              <CardDescription>{tip.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tip.tips.map((tipText, tipIndex) => (
                  <li key={tipIndex} className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{tipText}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated Content */}
      {optimizedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Оптимизированный контент
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-semibold">Title (длина: {optimizedContent.title.length} символов):</Label>
              <div className="p-3 bg-muted rounded-lg mt-1 text-sm">
                {optimizedContent.title}
              </div>
              <Badge variant={optimizedContent.title.length <= 60 ? "default" : "destructive"} className="mt-1">
                {optimizedContent.title.length <= 60 ? "Оптимальная длина" : "Слишком длинный"}
              </Badge>
            </div>

            <div>
              <Label className="font-semibold">Description (длина: {optimizedContent.description.length} символов):</Label>
              <div className="p-3 bg-muted rounded-lg mt-1 text-sm">
                {optimizedContent.description}
              </div>
              <Badge variant={optimizedContent.description.length <= 160 ? "default" : "destructive"} className="mt-1">
                {optimizedContent.description.length <= 160 ? "Оптимальная длина" : "Слишком длинное"}
              </Badge>
            </div>

            <div>
              <Label className="font-semibold">H1 заголовок:</Label>
              <div className="p-3 bg-muted rounded-lg mt-1 text-sm">
                {optimizedContent.h1}
              </div>
            </div>

            <div>
              <Label className="font-semibold">Geo-теги для Яндекса:</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                <Badge variant="outline">geo.region: {optimizedContent.geo_tags.region}</Badge>
                <Badge variant="outline">geo.placename: {optimizedContent.geo_tags.placename}</Badge>
                <Badge variant="outline">geo.position: {optimizedContent.geo_tags.position}</Badge>
              </div>
            </div>

            <div>
              <Label className="font-semibold">Рекомендации по контенту:</Label>
              <ul className="mt-2 space-y-1">
                {optimizedContent.content_suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}