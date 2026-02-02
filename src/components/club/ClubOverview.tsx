import { useClub } from "@/contexts/ClubContext";
import { useClubSubscription } from "@/hooks/useClubSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Users, 
  UserCheck, 
  TrendingUp,
  Calendar,
  Star
} from "lucide-react";
import { PLAN_NAMES, ROLE_NAMES } from "@/types/club";

export function ClubOverview() {
  const { club, role, plan, isActive } = useClub();
  const { usage, limits, subscription } = useClubSubscription({ clanId: club?.id });

  const stats = [
    {
      label: "Активные турниры",
      value: usage?.tournaments || 0,
      max: subscription?.max_tournaments || 0,
      icon: Trophy,
      color: "text-amber-500"
    },
    {
      label: "Участники",
      value: usage?.players || 0,
      max: subscription?.max_players || 0,
      icon: Users,
      color: "text-blue-500"
    },
    {
      label: "Персонал",
      value: usage?.staff || 0,
      max: subscription?.max_staff || 0,
      icon: UserCheck,
      color: "text-green-500"
    },
    {
      label: "Рейтинг клуба",
      value: club?.total_rating || 0,
      icon: TrendingUp,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Статус подписки</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "destructive"}>
                {isActive ? "Активна" : "Неактивна"}
              </Badge>
              <Badge variant="outline" className="bg-primary/10">
                {PLAN_NAMES[plan]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {subscription?.expires_at 
                ? `Действует до ${new Date(subscription.expires_at).toLocaleDateString('ru-RU')}`
                : "Бессрочная подписка"
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const percentage = stat.max ? (stat.value / stat.max) * 100 : 0;
          
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">
                      {stat.value}
                      {stat.max !== undefined && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /{stat.max === 999999 ? '∞' : stat.max}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                {stat.max && stat.max !== 999999 && (
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className="mt-3 h-1.5" 
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Your Role */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Ваша роль
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-base py-1 px-3">
              {role ? ROLE_NAMES[role] : 'Неизвестно'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {role === 'owner' && "Полный доступ ко всем функциям клуба"}
              {role === 'admin' && "Управление турнирами и персоналом"}
              {role === 'director' && "Проведение турниров"}
              {role === 'member' && "Участие в турнирах клуба"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              onClick={() => window.location.href = '/director'}
            >
              <Trophy className="w-6 h-6 mb-2 text-primary" />
              <p className="font-medium">Tournament Director</p>
              <p className="text-xs text-muted-foreground">Управление турнирами</p>
            </button>
            
            <button 
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              onClick={() => window.location.href = '/rating'}
            >
              <TrendingUp className="w-6 h-6 mb-2 text-primary" />
              <p className="font-medium">Рейтинг</p>
              <p className="text-xs text-muted-foreground">Рейтинг игроков</p>
            </button>
            
            <button 
              className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              onClick={() => window.location.href = '/clans'}
            >
              <Users className="w-6 h-6 mb-2 text-primary" />
              <p className="font-medium">Клуб</p>
              <p className="text-xs text-muted-foreground">Страница клуба</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
