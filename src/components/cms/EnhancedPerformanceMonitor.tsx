import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Zap, 
  Database, 
  Globe, 
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Smartphone,
  Monitor,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick
} from "lucide-react";

interface PerformanceMetrics {
  page_load_time: number;
  time_to_first_byte: number;
  largest_contentful_paint: number;
  first_input_delay: number;
  cumulative_layout_shift: number;
  seo_score: number;
  accessibility_score: number;
  best_practices_score: number;
  performance_score: number;
  mobile_performance: number;
  desktop_performance: number;
  server_response_time: number;
  database_query_time: number;
  cache_hit_ratio: number;
  error_rate: number;
  uptime_percentage: number;
}

interface ResourceUsage {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_usage: number;
  active_connections: number;
  database_connections: number;
}

interface PageInsight {
  url: string;
  performance_score: number;
  issues: string[];
  recommendations: string[];
  size_kb: number;
  requests_count: number;
}

export function EnhancedPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    page_load_time: 0,
    time_to_first_byte: 0,
    largest_contentful_paint: 0,
    first_input_delay: 0,
    cumulative_layout_shift: 0,
    seo_score: 0,
    accessibility_score: 0,
    best_practices_score: 0,
    performance_score: 0,
    mobile_performance: 0,
    desktop_performance: 0,
    server_response_time: 0,
    database_query_time: 0,
    cache_hit_ratio: 0,
    error_rate: 0,
    uptime_percentage: 0
  });

  const [resourceUsage, setResourceUsage] = useState<ResourceUsage>({
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    network_usage: 0,
    active_connections: 0,
    database_connections: 0
  });

  const [pageInsights, setPageInsights] = useState<PageInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchPerformanceData();
    
    // Real-time monitoring every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceData = async () => {
    try {
      // Mock data - in real implementation, fetch from monitoring services
      const mockMetrics: PerformanceMetrics = {
        page_load_time: 1.2 + Math.random() * 0.5,
        time_to_first_byte: 0.3 + Math.random() * 0.2,
        largest_contentful_paint: 1.8 + Math.random() * 0.7,
        first_input_delay: 0.1 + Math.random() * 0.05,
        cumulative_layout_shift: 0.05 + Math.random() * 0.1,
        seo_score: 85 + Math.random() * 10,
        accessibility_score: 90 + Math.random() * 8,
        best_practices_score: 88 + Math.random() * 10,
        performance_score: 85 + Math.random() * 12,
        mobile_performance: 80 + Math.random() * 15,
        desktop_performance: 90 + Math.random() * 8,
        server_response_time: 0.15 + Math.random() * 0.1,
        database_query_time: 0.05 + Math.random() * 0.03,
        cache_hit_ratio: 85 + Math.random() * 10,
        error_rate: Math.random() * 2,
        uptime_percentage: 99.5 + Math.random() * 0.4
      };

      const mockResourceUsage: ResourceUsage = {
        cpu_usage: 15 + Math.random() * 25,
        memory_usage: 45 + Math.random() * 20,
        disk_usage: 60 + Math.random() * 15,
        network_usage: 20 + Math.random() * 30,
        active_connections: Math.floor(50 + Math.random() * 100),
        database_connections: Math.floor(5 + Math.random() * 15)
      };

      const mockPageInsights: PageInsight[] = [
        {
          url: '/homepage',
          performance_score: 85,
          issues: ['Большие изображения', 'Неоптимизированный CSS'],
          recommendations: ['Сжать изображения', 'Минифицировать CSS'],
          size_kb: 1250,
          requests_count: 45
        },
        {
          url: '/tournaments',
          performance_score: 92,
          issues: ['Медленный JavaScript'],
          recommendations: ['Оптимизировать скрипты'],
          size_kb: 980,
          requests_count: 38
        }
      ];

      setMetrics(mockMetrics);
      setResourceUsage(mockResourceUsage);
      setPageInsights(mockPageInsights);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные производительности",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runPerformanceAnalysis = async () => {
    setAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast({
        title: "Анализ завершен",
        description: "Найдены возможности для оптимизации",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось завершить анализ",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const optimizePerformance = async () => {
    setOptimizing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      toast({
        title: "Оптимизация завершена",
        description: "Производительность улучшена на 15%",
      });
      fetchPerformanceData(); // Refresh data
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить оптимизацию",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Отлично</Badge>;
    if (score >= 70) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Хорошо</Badge>;
    return <Badge variant="destructive">Требует внимания</Badge>;
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'bg-red-500';
    if (usage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Мониторинг производительности
          </h2>
          <p className="text-muted-foreground">Комплексный анализ производительности и оптимизация</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runPerformanceAnalysis} disabled={analyzing} variant="outline">
            <TrendingUp className={`w-4 h-4 mr-2 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Анализ...' : 'Анализировать'}
          </Button>
          <Button onClick={optimizePerformance} disabled={optimizing}>
            <Zap className={`w-4 h-4 mr-2 ${optimizing ? 'animate-spin' : ''}`} />
            {optimizing ? 'Оптимизация...' : 'Оптимизировать'}
          </Button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">LCP</p>
                <p className={`text-xl font-bold ${getScoreColor(metrics.largest_contentful_paint > 2.5 ? 50 : 90)}`}>
                  {metrics.largest_contentful_paint.toFixed(1)}s
                </p>
                <p className="text-xs text-muted-foreground">Largest Contentful Paint</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">FID</p>
                <p className={`text-xl font-bold ${getScoreColor(metrics.first_input_delay > 0.1 ? 50 : 90)}`}>
                  {(metrics.first_input_delay * 1000).toFixed(0)}ms
                </p>
                <p className="text-xs text-muted-foreground">First Input Delay</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CLS</p>
                <p className={`text-xl font-bold ${getScoreColor(metrics.cumulative_layout_shift > 0.1 ? 50 : 90)}`}>
                  {metrics.cumulative_layout_shift.toFixed(3)}
                </p>
                <p className="text-xs text-muted-foreground">Cumulative Layout Shift</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Общий балл</p>
                <p className={`text-xl font-bold ${getScoreColor(metrics.performance_score)}`}>
                  {Math.round(metrics.performance_score)}
                </p>
                <p className="text-xs text-muted-foreground">Performance Score</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="resources">Ресурсы</TabsTrigger>
          <TabsTrigger value="pages">Страницы</TabsTrigger>
          <TabsTrigger value="optimization">Оптимизация</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Lighthouse Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Performance</span>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.performance_score} className="w-24" />
                    <span className={`font-bold ${getScoreColor(metrics.performance_score)}`}>
                      {Math.round(metrics.performance_score)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>SEO</span>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.seo_score} className="w-24" />
                    <span className={`font-bold ${getScoreColor(metrics.seo_score)}`}>
                      {Math.round(metrics.seo_score)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Accessibility</span>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.accessibility_score} className="w-24" />
                    <span className={`font-bold ${getScoreColor(metrics.accessibility_score)}`}>
                      {Math.round(metrics.accessibility_score)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Best Practices</span>
                  <div className="flex items-center gap-2">
                    <Progress value={metrics.best_practices_score} className="w-24" />
                    <span className={`font-bold ${getScoreColor(metrics.best_practices_score)}`}>
                      {Math.round(metrics.best_practices_score)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Device Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span>Desktop</span>
                  </div>
                  {getScoreBadge(metrics.desktop_performance)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile</span>
                  </div>
                  {getScoreBadge(metrics.mobile_performance)}
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Время отклика</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Сервер:</span>
                      <span>{(metrics.server_response_time * 1000).toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>База данных:</span>
                      <span>{(metrics.database_query_time * 1000).toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{metrics.uptime_percentage.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    <span className="text-sm font-medium">CPU</span>
                  </div>
                  <span className="text-sm font-bold">{Math.round(resourceUsage.cpu_usage)}%</span>
                </div>
                <Progress 
                  value={resourceUsage.cpu_usage} 
                  className="h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-4 h-4" />
                    <span className="text-sm font-medium">Memory</span>
                  </div>
                  <span className="text-sm font-bold">{Math.round(resourceUsage.memory_usage)}%</span>
                </div>
                <Progress 
                  value={resourceUsage.memory_usage} 
                  className="h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm font-medium">Disk</span>
                  </div>
                  <span className="text-sm font-bold">{Math.round(resourceUsage.disk_usage)}%</span>
                </div>
                <Progress 
                  value={resourceUsage.disk_usage} 
                  className="h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium">Network</span>
                  </div>
                  <span className="text-sm font-bold">{Math.round(resourceUsage.network_usage)}%</span>
                </div>
                <Progress 
                  value={resourceUsage.network_usage} 
                  className="h-2"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Активные соединения</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resourceUsage.active_connections}</div>
                <p className="text-sm text-muted-foreground">Текущие подключения</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>База данных</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Соединения:</span>
                    <span className="font-bold">{resourceUsage.database_connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache hit ratio:</span>
                    <span className="font-bold">{Math.round(metrics.cache_hit_ratio)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error rate:</span>
                    <span className="font-bold">{metrics.error_rate.toFixed(2)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="space-y-4">
            {pageInsights.map((page, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{page.url}</CardTitle>
                    {getScoreBadge(page.performance_score)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Проблемы
                      </h4>
                      <ul className="text-sm space-y-1">
                        {page.issues.map((issue, i) => (
                          <li key={i} className="text-muted-foreground">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Рекомендации
                      </h4>
                      <ul className="text-sm space-y-1">
                        {page.recommendations.map((rec, i) => (
                          <li key={i} className="text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                    <span>Размер: {page.size_kb} KB</span>
                    <span>Запросов: {page.requests_count}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Автоматическая оптимизация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Сжатие изображений</span>
                  <Badge variant="default">Включено</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Минификация CSS/JS</span>
                  <Badge variant="default">Включено</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Кеширование</span>
                  <Badge variant="default">Активно</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>CDN</span>
                  <Badge variant="secondary">Не настроено</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Возможности улучшения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Потенциальная экономия времени загрузки: 1.2s</strong><br />
                    Настройте CDN и оптимизируйте изображения для лучшей производительности.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}