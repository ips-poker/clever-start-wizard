import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Eye, 
  Clock,
  Activity,
  Globe,
  Download,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalPageViews: number;
  totalUsers: number;
  avgSessionTime: string;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; change: number }>;
  recentActivity: Array<{ action: string; timestamp: string; user?: string }>;
  deviceStats: Array<{ device: string; percentage: number }>;
  trafficSources: Array<{ source: string; visitors: number; percentage: number }>;
}

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsData>({
    totalPageViews: 0,
    totalUsers: 0,
    avgSessionTime: "0:00",
    bounceRate: 0,
    topPages: [],
    recentActivity: [],
    deviceStats: [],
    trafficSources: []
  });
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Симуляция данных аналитики (в реальном проекте здесь будет API)
      const mockData: AnalyticsData = {
        totalPageViews: 15420,
        totalUsers: 3240,
        avgSessionTime: "3:42",
        bounceRate: 42.5,
        topPages: [
          { page: "/", views: 5420, change: 12.5 },
          { page: "/tournaments", views: 3210, change: -2.3 },
          { page: "/rating", views: 2140, change: 8.7 },
          { page: "/gallery", views: 1890, change: 15.2 },
          { page: "/about", views: 1260, change: -5.1 }
        ],
        recentActivity: [
          { action: "Новый пользователь зарегистрирован", timestamp: new Date().toISOString() },
          { action: "Создан новый турнир", timestamp: new Date(Date.now() - 1800000).toISOString() },
          { action: "Обновлен контент главной страницы", timestamp: new Date(Date.now() - 3600000).toISOString() },
          { action: "Загружено новое изображение в галерею", timestamp: new Date(Date.now() - 7200000).toISOString() }
        ],
        deviceStats: [
          { device: "Desktop", percentage: 65 },
          { device: "Mobile", percentage: 30 },
          { device: "Tablet", percentage: 5 }
        ],
        trafficSources: [
          { source: "Прямые переходы", visitors: 1620, percentage: 50 },
          { source: "Поисковые системы", visitors: 972, percentage: 30 },
          { source: "Социальные сети", visitors: 486, percentage: 15 },
          { source: "Реферальные ссылки", visitors: 162, percentage: 5 }
        ]
      };

      setData(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold text-foreground">Аналитика</h2>
          <p className="text-muted-foreground">Статистика посещений и активности сайта</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Сегодня</SelectItem>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalyticsData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Просмотры страниц</p>
                <p className="text-2xl font-bold">{formatNumber(data.totalPageViews)}</p>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp className="w-3 h-3" />
                  +12.5%
                </div>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Уникальные посетители</p>
                <p className="text-2xl font-bold">{formatNumber(data.totalUsers)}</p>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp className="w-3 h-3" />
                  +8.2%
                </div>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Время на сайте</p>
                <p className="text-2xl font-bold">{data.avgSessionTime}</p>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <ArrowUp className="w-3 h-3" />
                  +5.4%
                </div>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Показатель отказов</p>
                <p className="text-2xl font-bold">{data.bounceRate}%</p>
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <ArrowDown className="w-3 h-3" />
                  -2.1%
                </div>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Топ страниц */}
        <Card>
          <CardHeader>
            <CardTitle>Популярные страницы</CardTitle>
            <CardDescription>Страницы с наибольшим количеством просмотров</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topPages.map((page, index) => (
                <div key={page.page} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{page.page === "/" ? "Главная" : page.page}</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(page.views)} просмотров</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${page.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {page.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(page.change)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Источники трафика */}
        <Card>
          <CardHeader>
            <CardTitle>Источники трафика</CardTitle>
            <CardDescription>Откуда приходят посетители</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.trafficSources.map((source, index) => (
                <div key={source.source} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{source.source}</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(source.visitors)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Недавняя активность */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Недавняя активность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Статистика устройств */}
        <Card>
          <CardHeader>
            <CardTitle>Статистика устройств</CardTitle>
            <CardDescription>Распределение по типам устройств</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.deviceStats.map((device, index) => (
                <div key={device.device} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{device.device}</span>
                    <span className="text-sm text-muted-foreground">{device.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Экспорт данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Экспорт данных
          </CardTitle>
          <CardDescription>Выгрузка аналитических данных</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Экспорт CSV
            </Button>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Отчет за период
            </Button>
            <Button variant="outline">
              <Globe className="w-4 h-4 mr-2" />
              Геоданные
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}