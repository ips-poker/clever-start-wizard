import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useClub } from "@/contexts/ClubContext";
import { useClubSubscription } from "@/hooks/useClubSubscription";
import { useClubPayment } from "@/hooks/useClubPayment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Check, 
  X, 
  Crown, 
  Zap,
  Star,
  Building2,
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { SUBSCRIPTION_TIERS, SubscriptionPlan, formatPrice } from "@/types/subscription";

const PLAN_ICONS: Record<SubscriptionPlan, React.ElementType> = {
  free: Building2,
  basic: Star,
  pro: Zap,
  enterprise: Crown
};

export function ClubSubscriptionPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { club } = useClub();
  const { subscription, usage, loading: subscriptionLoading } = useClubSubscription({ clanId: club?.id });
  const { loading: paymentLoading, createCheckout, openCustomerPortal, checkSubscription } = useClubPayment({ clanId: club?.id || '' });
  
  const [refreshing, setRefreshing] = useState(false);
  const currentPlan = (subscription?.plan as SubscriptionPlan) || 'free';

  // Handle success/cancel from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      toast.success('Подписка успешно оформлена!');
      handleRefreshSubscription();
      // Clear URL params
      searchParams.delete('subscription');
      searchParams.delete('session_id');
      setSearchParams(searchParams);
    } else if (subscriptionStatus === 'canceled') {
      toast.info('Оплата отменена');
      searchParams.delete('subscription');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    try {
      await checkSubscription();
      toast.success('Статус подписки обновлён');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan === 'free' || plan === currentPlan) return;
    await createCheckout(plan);
  };

  const plans: SubscriptionPlan[] = ['free', 'basic', 'pro', 'enterprise'];

  const formatLimit = (value: number) => {
    return value >= 999 ? '∞' : value.toString();
  };

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Текущий план: {SUBSCRIPTION_TIERS[currentPlan].name}</CardTitle>
            <CardDescription>
              {subscription?.expires_at 
                ? `Активен до ${new Date(subscription.expires_at).toLocaleDateString('ru-RU')}`
                : 'Управление подпиской и лимитами'
              }
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshSubscription}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            {currentPlan !== 'free' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={openCustomerPortal}
                disabled={paymentLoading}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Управление
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Турниры</span>
                <span className="text-muted-foreground">
                  {usage?.tournaments || 0} / {formatLimit(subscription?.max_tournaments || SUBSCRIPTION_TIERS[currentPlan].limits.max_tournaments)}
                </span>
              </div>
              <Progress 
                value={(() => {
                  const max = subscription?.max_tournaments || SUBSCRIPTION_TIERS[currentPlan].limits.max_tournaments;
                  return max > 0 ? ((usage?.tournaments || 0) / max) * 100 : 0;
                })()} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Участники</span>
                <span className="text-muted-foreground">
                  {usage?.players || 0} / {formatLimit(subscription?.max_players || SUBSCRIPTION_TIERS[currentPlan].limits.max_players)}
                </span>
              </div>
              <Progress 
                value={(() => {
                  const max = subscription?.max_players || SUBSCRIPTION_TIERS[currentPlan].limits.max_players;
                  return max > 0 ? ((usage?.players || 0) / max) * 100 : 0;
                })()} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Персонал</span>
                <span className="text-muted-foreground">
                  {usage?.staff || 0} / {formatLimit(subscription?.max_staff || SUBSCRIPTION_TIERS[currentPlan].limits.max_staff)}
                </span>
              </div>
              <Progress 
                value={(() => {
                  const max = subscription?.max_staff || SUBSCRIPTION_TIERS[currentPlan].limits.max_staff;
                  return max > 0 ? ((usage?.staff || 0) / max) * 100 : 0;
                })()} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const tier = SUBSCRIPTION_TIERS[plan];
          const PlanIcon = PLAN_ICONS[plan];
          const isCurrent = plan === currentPlan;
          const isPopular = plan === 'pro';
          const isUpgrade = plans.indexOf(plan) > plans.indexOf(currentPlan);

          return (
            <Card 
              key={plan} 
              className={`relative ${isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              {isPopular && !isCurrent && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  Популярный
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="secondary" className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  Ваш план
                </Badge>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <PlanIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {tier.price === 0 ? '0' : tier.price.toLocaleString('ru-RU')}
                  </span>
                  <span className="text-muted-foreground">
                    {tier.price === 0 ? '' : ` ₽/${tier.interval === 'month' ? 'мес' : 'год'}`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Limits */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Турниры</span>
                    <span className="font-medium">{formatLimit(tier.limits.max_tournaments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Игроки</span>
                    <span className="font-medium">{formatLimit(tier.limits.max_players)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Персонал</span>
                    <span className="font-medium">{formatLimit(tier.limits.max_staff)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Онлайн-столы</span>
                    <span className="font-medium">{formatLimit(tier.limits.max_online_tables)}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 pt-4 border-t">
                  <FeatureRow enabled={tier.features.voice_control} label="Голосовое управление" />
                  <FeatureRow enabled={tier.features.analytics} label="Аналитика" />
                  <FeatureRow enabled={tier.features.online_poker} label="Онлайн-покер" />
                  <FeatureRow enabled={tier.features.api_access} label="API доступ" />
                </div>

                {/* Action */}
                <Button 
                  className="w-full mt-4" 
                  variant={isCurrent ? "outline" : isUpgrade ? "default" : "secondary"}
                  disabled={isCurrent || plan === 'free' || paymentLoading}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {paymentLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Текущий план"
                  ) : plan === 'free' ? (
                    "Базовый"
                  ) : isUpgrade ? (
                    "Выбрать"
                  ) : (
                    "Понизить"
                  )}
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
          <Button variant="outline" asChild>
            <a href="https://t.me/epc_support" target="_blank" rel="noopener noreferrer">
              Связаться в Telegram
            </a>
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
