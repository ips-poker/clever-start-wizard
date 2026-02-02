import { useClub } from "@/contexts/ClubContext";
import { useClubSubscription } from "@/hooks/useClubSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Check, 
  X, 
  Crown, 
  Zap,
  Star,
  Building2
} from "lucide-react";
import { SUBSCRIPTION_LIMITS, PLAN_NAMES, SubscriptionPlan } from "@/types/club";

const PLAN_ICONS: Record<SubscriptionPlan, React.ElementType> = {
  free: Building2,
  basic: Star,
  pro: Zap,
  enterprise: Crown
};

export function ClubSubscriptionPanel() {
  const { club, plan: currentPlan, isActive } = useClub();
  const { subscription, usage, limits } = useClubSubscription({ clanId: club?.id });

  const plans: SubscriptionPlan[] = ['free', 'basic', 'pro', 'enterprise'];

  const formatLimit = (value: number) => {
    return value === 999999 ? '∞' : value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Текущий план</CardTitle>
          <CardDescription>
            Управление подпиской и лимитами
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Турниры</span>
                <span className="text-muted-foreground">
                  {usage?.tournaments || 0} / {formatLimit(subscription?.max_tournaments || 0)}
                </span>
              </div>
              <Progress 
                value={subscription?.max_tournaments 
                  ? ((usage?.tournaments || 0) / subscription.max_tournaments) * 100 
                  : 0
                } 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Участники</span>
                <span className="text-muted-foreground">
                  {usage?.players || 0} / {formatLimit(subscription?.max_players || 0)}
                </span>
              </div>
              <Progress 
                value={subscription?.max_players 
                  ? ((usage?.players || 0) / subscription.max_players) * 100 
                  : 0
                } 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Персонал</span>
                <span className="text-muted-foreground">
                  {usage?.staff || 0} / {formatLimit(subscription?.max_staff || 0)}
                </span>
              </div>
              <Progress 
                value={subscription?.max_staff 
                  ? ((usage?.staff || 0) / subscription.max_staff) * 100 
                  : 0
                } 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const limits = SUBSCRIPTION_LIMITS[plan];
          const PlanIcon = PLAN_ICONS[plan];
          const isCurrent = plan === currentPlan;
          const isPopular = plan === 'pro';

          return (
            <Card 
              key={plan} 
              className={`relative ${isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  Популярный
                </Badge>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <PlanIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{PLAN_NAMES[plan]}</CardTitle>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {limits.price_monthly.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground"> ₽/мес</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Limits */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Турниры</span>
                    <span className="font-medium">{formatLimit(limits.max_tournaments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Игроки</span>
                    <span className="font-medium">{formatLimit(limits.max_players)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Персонал</span>
                    <span className="font-medium">{formatLimit(limits.max_staff)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Онлайн-столы</span>
                    <span className="font-medium">{formatLimit(limits.max_online_tables)}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 pt-4 border-t">
                  <FeatureRow enabled={limits.features.voice_control} label="Голосовое управление" />
                  <FeatureRow enabled={limits.features.analytics} label="Аналитика" />
                  <FeatureRow enabled={limits.features.online_poker} label="Онлайн-покер" />
                  <FeatureRow enabled={limits.features.api_access} label="API доступ" />
                </div>

                {/* Action */}
                <Button 
                  className="w-full mt-4" 
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || plan === 'free'}
                >
                  {isCurrent ? "Текущий план" : "Выбрать"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact for Enterprise */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10">
        <CardContent className="py-6 text-center">
          <Crown className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Нужно больше?</h3>
          <p className="text-muted-foreground mb-4">
            Свяжитесь с нами для индивидуального предложения
          </p>
          <Button variant="outline">
            Связаться
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled ? (
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className={enabled ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
