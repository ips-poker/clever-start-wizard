import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Zap, 
  Database, 
  Globe, 
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Eye
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PerformanceMetrics {
  serverHealth: {
    cpu: number;
    memory: number;
    disk: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  sitePerformance: {
    loadTime: number;
    ttfb: number;
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  traffic: {
    currentUsers: number;
    requestsPerMinute: number;
    bandwidth: number;
  };
  errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: Array<{
    category: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timeRange, setTimeRange] = useState("1h");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMetricsSafe = async () => {
      if (isMounted) await fetchMetrics();
    };
    
    fetchMetricsSafe();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (isMounted) fetchMetrics();
      }, 30000); // Обновление каждые 30 секунд
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, [timeRange, autoRefresh]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Симуляция получения метрик производительности
      const mockMetrics: PerformanceMetrics = {
        serverHealth: {
          cpu: Math.random() * 80 + 10,
          memory: Math.random() * 70 + 15,
          disk: Math.random() * 60 + 20,
          status: 'healthy'
        },
        sitePerformance: {
          loadTime: Math.random() * 2 + 1,
          ttfb: Math.random() * 500 + 200,
          fcp: Math.random() * 1000 + 800,
          lcp: Math.random() * 2000 + 1500,
          cls: Math.random() * 0.1,
          fid: Math.random() * 50 + 10
        },
        database: {
          connections: Math.floor(Math.random() * 50 + 10),
          queryTime: Math.random() * 100 + 20,
          cacheHitRate: Math.random() * 20 + 80,
          status: 'healthy'
        },
        traffic: {
          currentUsers: Math.floor(Math.random() * 200 + 50),
          requestsPerMinute: Math.floor(Math.random() * 1000 + 500),
          bandwidth: Math.random() * 50 + 10
        },
        errors: [
          {
            timestamp: new Date().toISOString(),
            type: '404 Error',
            message: 'Page not found: /old-page',
            severity: 'low'
          },
          {
            timestamp: new Date(Date.now() - 300000).toISOString(),
            type: 'Database Warning',
            message: 'Slow query detected (>500ms)',
            severity: 'medium'
          }
        ],
        recommendations: [
          {
            category: 'Производительность',
            message: 'Оптимизируйте изображения для улучшения скорости загрузки',
            priority: 'medium'
          },
          {
            category: 'База данных',
            message: 'Добавьте индексы для часто используемых запросов',
            priority: 'high'
          },
          {
            category: 'Кеширование',
            message: 'Настройте кеширование статических ресурсов',
            priority: 'low'
          }
        ]
      };
      
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPerformanceScore = (metric: number, thresholds: { good: number; poor: number }) => {
    if (metric <= thresholds.good) return { score: 'good', color: 'text-green-600' };
    if (metric <= thresholds.poor) return { score: 'needs-improvement', color: 'text-yellow-600' };
    return { score: 'poor', color: 'text-red-600' };
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Мониторинг производительности</h2>
          <p className="text-muted-foreground">Отслеживание метрик сайта и сервера в реальном времени</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 час</SelectItem>
              <SelectItem value="6h">6 часов</SelectItem>
              <SelectItem value="24h">24 часа</SelectItem>
              <SelectItem value="7d">7 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Авто' : 'Ручное'}
          </Button>
          <Button variant="outline" onClick={fetchMetrics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Общий статус */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Все системы работают нормально</h3>
                <p className="text-sm text-muted-foreground">Последнее обновление: {new Date().toLocaleTimeString('ru-RU')}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
              Отличная производительность
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Метрики сервера */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="w-5 h-5" />
              Процессор
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Использование</span>
                <span className="font-medium">{metrics.serverHealth.cpu.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.serverHealth.cpu} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {metrics.serverHealth.cpu < 70 ? 'Нормальная нагрузка' : 'Высокая нагрузка'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MemoryStick className="w-5 h-5" />
              Память
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Использование</span>
                <span className="font-medium">{metrics.serverHealth.memory.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.serverHealth.memory} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {metrics.serverHealth.memory < 80 ? 'Достаточно памяти' : 'Мало памяти'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="w-5 h-5" />
              Диск
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Использование</span>
                <span className="font-medium">{metrics.serverHealth.disk.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.serverHealth.disk} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {metrics.serverHealth.disk < 85 ? 'Достаточно места' : 'Мало места'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Производительность сайта */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Core Web Vitals
          </CardTitle>
          <CardDescription>Ключевые метрики производительности сайта</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceScore(metrics.sitePerformance.loadTime, { good: 2, poor: 4 }).color}`}>
                {metrics.sitePerformance.loadTime.toFixed(1)}s
              </div>
              <p className="text-sm text-muted-foreground">Время загрузки</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceScore(metrics.sitePerformance.ttfb, { good: 600, poor: 1200 }).color}`}>
                {metrics.sitePerformance.ttfb.toFixed(0)}ms
              </div>
              <p className="text-sm text-muted-foreground">TTFB</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceScore(metrics.sitePerformance.fcp, { good: 1800, poor: 3000 }).color}`}>
                {metrics.sitePerformance.fcp.toFixed(0)}ms
              </div>
              <p className="text-sm text-muted-foreground">FCP</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceScore(metrics.sitePerformance.lcp, { good: 2500, poor: 4000 }).color}`}>
                {metrics.sitePerformance.lcp.toFixed(0)}ms
              </div>
              <p className="text-sm text-muted-foreground">LCP</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceScore(metrics.sitePerformance.cls, { good: 0.1, poor: 0.25 }).color}`}>
                {metrics.sitePerformance.cls.toFixed(3)}
              </div>
              <p className="text-sm text-muted-foreground">CLS</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceScore(metrics.sitePerformance.fid, { good: 100, poor: 300 }).color}`}>
                {metrics.sitePerformance.fid.toFixed(0)}ms
              </div>
              <p className="text-sm text-muted-foreground">FID</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* База данных */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              База данных
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Активные соединения</span>
              <span className="font-medium">{metrics.database.connections}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Время выполнения запросов</span>
              <span className="font-medium">{metrics.database.queryTime.toFixed(1)}ms</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Попадания в кеш</span>
                <span className="font-medium">{metrics.database.cacheHitRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.database.cacheHitRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Трафик */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Трафик
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-1">
                <Users className="w-4 h-4" />
                Пользователи онлайн
              </span>
              <span className="font-medium">{metrics.traffic.currentUsers}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Запросов в минуту</span>
              <span className="font-medium">{metrics.traffic.requestsPerMinute}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Пропускная способность</span>
              <span className="font-medium">{metrics.traffic.bandwidth.toFixed(1)} MB/s</span>
            </div>
          </CardContent>
        </Card>

        {/* Ошибки */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Недавние ошибки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.errors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ошибок не обнаружено
                </p>
              ) : (
                metrics.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      error.severity === 'high' ? 'bg-red-500' :
                      error.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{error.type}</p>
                      <p className="text-xs text-muted-foreground">{error.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(error.timestamp).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Рекомендации */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Рекомендации по оптимизации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs mb-1">
                      {rec.category}
                    </Badge>
                    <p className="text-sm">{rec.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}