import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Trophy, 
  Globe, 
  TrendingUp, 
  Eye,
  FileText,
  Image,
  Activity,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminDashboardProps {
  onTabChange?: (tab: string) => void;
}

interface DashboardStats {
  totalContent: number;
  activeContent: number;
  totalPlayers: number;
  totalTournaments: number;
  galleryImages: number;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    type: string;
  }>;
}

export function AdminDashboard({ onTabChange }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalContent: 0,
    activeContent: 0,
    totalPlayers: 0,
    totalTournaments: 0,
    galleryImages: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [
        contentResult,
        playersResult,
        tournamentsResult,
        galleryResult
      ] = await Promise.all([
        supabase.from('cms_content').select('*'),
        supabase.from('players').select('*'),
        supabase.from('tournaments').select('*'),
        supabase.from('cms_gallery').select('*')
      ]);

      const totalContent = contentResult.data?.length || 0;
      const activeContent = contentResult.data?.filter(item => item.is_active)?.length || 0;

      setStats({
        totalContent,
        activeContent,
        totalPlayers: playersResult.data?.length || 0,
        totalTournaments: tournamentsResult.data?.length || 0,
        galleryImages: galleryResult.data?.length || 0,
        recentActivity: [
          {
            id: '1',
            action: 'Обновлён контент главной страницы',
            timestamp: new Date().toISOString(),
            type: 'content'
          },
          {
            id: '2', 
            action: 'Добавлено новое изображение в галерею',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: 'gallery'
          },
          {
            id: '3',
            action: 'Создан новый турнир',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            type: 'tournament'
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardCards = [
    {
      title: "Контент",
      value: `${stats.activeContent}/${stats.totalContent}`,
      description: "Активный контент",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Игроки",
      value: stats.totalPlayers.toString(),
      description: "Зарегистрированных игроков",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Турниры",
      value: stats.totalTournaments.toString(),
      description: "Всего турниров",
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      title: "Галерея",
      value: stats.galleryImages.toString(),
      description: "Изображений",
      icon: Image,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Дашборд</h1>
          <p className="text-muted-foreground">Обзор вашего сайта и аналитика</p>
        </div>
        <Button 
          onClick={fetchDashboardStats}
          variant="outline"
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          Обновить
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Недавняя активность
            </CardTitle>
            <CardDescription>
              Последние изменения в системе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Activity className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Быстрые действия
            </CardTitle>
            <CardDescription>
              Часто используемые функции
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => onTabChange?.('home-editor')}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm">Редактировать главную</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => onTabChange?.('gallery')}
              >
                <Image className="w-5 h-5" />
                <span className="text-sm">Управление галереей</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => onTabChange?.('tournaments')}
              >
                <Trophy className="w-5 h-5" />
                <span className="text-sm">Новый турнир</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => onTabChange?.('seo')}
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm">SEO настройки</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Статус системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">База данных</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Работает
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">CMS</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Активна
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Последнее обновление</span>
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}