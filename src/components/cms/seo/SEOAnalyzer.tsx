import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  Globe,
  Zap,
  Target,
  BarChart3,
  Lightbulb
} from "lucide-react";

interface SEOAnalysis {
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

interface PageAnalysis extends SEOAnalysis {
  pageSlug: string;
  pageName: string;
  lastAnalyzed: Date;
}

export function SEOAnalyzer() {
  const [analyses, setAnalyses] = useState<PageAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const { toast } = useToast();

  const pages = [
    { slug: 'home', name: 'Главная страница', url: '/' },
    { slug: 'about', name: 'О нас', url: '/about' },
    { slug: 'tournaments', name: 'Турниры', url: '/tournaments' },
    { slug: 'rating', name: 'Рейтинг', url: '/rating' },
    { slug: 'gallery', name: 'Галерея', url: '/gallery' },
    { slug: 'blog', name: 'Блог', url: '/blog' },
  ];

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      // Simulate loading analyses from database or localStorage
      const mockAnalyses: PageAnalysis[] = pages.map(page => ({
        pageSlug: page.slug,
        pageName: page.name,
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        lastAnalyzed: new Date(),
        issues: generateMockIssues(),
        recommendations: generateMockRecommendations(),
      }));
      
      setAnalyses(mockAnalyses);
      setOverallScore(Math.floor(mockAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / mockAnalyses.length));
    } catch (error) {
      console.error('Error loading SEO analyses:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить SEO анализы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockIssues = () => [
    {
      type: 'error' as const,
      title: 'Отсутствует meta description',
      description: 'Meta description не заполнено, что может негативно влиять на CTR в поисковой выдаче',
      priority: 'high' as const,
    },
    {
      type: 'warning' as const,
      title: 'Заголовок слишком длинный',
      description: 'Title превышает рекомендуемую длину в 60 символов',
      priority: 'medium' as const,
    },
    {
      type: 'info' as const,
      title: 'Добавьте structured data',
      description: 'Рекомендуется добавить JSON-LD разметку для лучшего понимания контента поисковиками',
      priority: 'low' as const,
    },
  ];

  const generateMockRecommendations = () => [
    {
      title: 'Оптимизируйте заголовки',
      description: 'Используйте H1-H6 теги в правильной иерархии',
      impact: 'high' as const,
    },
    {
      title: 'Добавьте alt атрибуты к изображениям',
      description: 'Все изображения должны иметь описательные alt атрибуты',
      impact: 'medium' as const,
    },
    {
      title: 'Улучшите внутреннюю перелинковку',
      description: 'Добавьте больше релевантных внутренних ссылок',
      impact: 'medium' as const,
    },
  ];

  const runFullAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      // Simulate analysis process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh analyses
      await loadAnalyses();
      
      toast({
        title: "Анализ завершён",
        description: "SEO анализ всех страниц успешно обновлён",
      });
    } catch (error) {
      toast({
        title: "Ошибка анализа",
        description: "Не удалось выполнить SEO анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Отличная оптимизация";
    if (score >= 60) return "Хорошая оптимизация";
    return "Требует улучшения";
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка анализа...</div>;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Общий SEO рейтинг
            </CardTitle>
            <Button 
              onClick={runFullAnalysis} 
              disabled={analyzing}
              className="flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Анализируем...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Запустить полный анализ
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className={`text-6xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-lg text-muted-foreground">{getScoreLabel(overallScore)}</p>
            <Progress value={overallScore} className="w-full h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Page Analyses */}
      <Tabs defaultValue="pages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Анализ страниц
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Рекомендации
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Производительность
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          {analyses.map((analysis) => (
            <Card key={analysis.pageSlug}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{analysis.pageName}</CardTitle>
                    <Badge variant="outline">{analysis.pageSlug}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                      {analysis.score}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={analysis.score} className="h-2" />
                
                {/* Issues */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Проблемы ({analysis.issues.length})
                  </h4>
                  <div className="space-y-2">
                    {analysis.issues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                        {issue.type === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                        {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />}
                        {issue.type === 'info' && <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />}
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{issue.title}</p>
                            <Badge variant={
                              issue.priority === 'high' ? 'destructive' :
                              issue.priority === 'medium' ? 'default' : 'secondary'
                            } className="text-xs">
                              {issue.priority === 'high' ? 'Высокий' :
                               issue.priority === 'medium' ? 'Средний' : 'Низкий'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Топ рекомендации для улучшения SEO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generateMockRecommendations().map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <Badge variant={
                        rec.impact === 'high' ? 'default' :
                        rec.impact === 'medium' ? 'secondary' : 'outline'
                      }>
                        {rec.impact === 'high' ? 'Высокое влияние' :
                         rec.impact === 'medium' ? 'Среднее влияние' : 'Низкое влияние'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Индексация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {pages.length}/{pages.length}
                </div>
                <p className="text-sm text-muted-foreground">страниц проиндексировано</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Скорость сайта
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">A</div>
                <p className="text-sm text-muted-foreground">средняя оценка PageSpeed</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Мобильность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">95</div>
                <p className="text-sm text-muted-foreground">Mobile-Friendly тест</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}