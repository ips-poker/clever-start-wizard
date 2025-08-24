import React, { useState } from 'react';
import { useRatingSystemConfig } from '@/hooks/useRatingSystemConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Trophy, 
  Zap, 
  Target,
  Layers,
  Clock,
  DollarSign,
  Users,
  Star,
  Settings,
  Download,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  format: string;
  icon: React.ReactNode;
  color: string;
  config: any;
  features: string[];
  recommendedFor: string[];
}

export default function OfflinePokerProfileManager() {
  const { config, saveConfig } = useRatingSystemConfig();
  const [selectedProfile, setSelectedProfile] = useState<ProfileTemplate | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const profileTemplates: ProfileTemplate[] = [
    {
      id: 'freezeout_standard',
      name: 'Стандартный Freezeout',
      description: 'Классические турниры без ребаев и адонов',
      format: 'freezeout',
      icon: <Trophy className="h-6 w-6" />,
      color: 'bg-green-500',
      features: [
        'Позиционные бонусы активны',
        'Стандартные призовые коэффициенты',
        'Баланс между скиллом и удачей',
        'Подходит для регулярных турниров'
      ],
      recommendedFor: ['Еженедельные турниры', 'Турниры для начинающих', 'Стандартные события'],
      config: {
        base_points: 100,
        rebuy_multiplier: 0,
        addon_multiplier: 0,
        enable_position_bonus: true,
        first_place_bonus: 40,
        second_place_bonus: 25,
        third_place_bonus: 15,
        prize_coefficient: 0.002,
        volatility_control: 1.0,
        weights: {
          position_weight: 1.0,
          prize_weight: 0.8,
          field_size_weight: 0.6,
          buy_in_weight: 0.4,
          duration_weight: 0.3,
          performance_weight: 1.0
        }
      }
    },
    {
      id: 'rebuy_aggressive',
      name: 'Ребай Агрессивный',
      description: 'Турниры с активными ребаями для агрессивной игры',
      format: 'rebuy',
      icon: <Layers className="h-6 w-6" />,
      color: 'bg-blue-500',
      features: [
        'Высокие множители ребаев',
        'Бонусы за двойные ребаи',
        'Поощрение активной игры',
        'Увеличенный призовой фонд'
      ],
      recommendedFor: ['Вечерние турниры', 'Турниры выходного дня', 'Акционные события'],
      config: {
        base_points: 80,
        rebuy_multiplier: 1.5,
        addon_multiplier: 1.3,
        double_rebuy_multiplier: 2.0,
        enable_position_bonus: true,
        first_place_bonus: 50,
        itm_bonus: 15,
        late_entry_penalty: 8,
        prize_coefficient: 0.0025,
        volatility_control: 1.2,
        weights: {
          position_weight: 0.9,
          prize_weight: 1.0,
          field_size_weight: 0.7,
          buy_in_weight: 0.6,
          duration_weight: 0.4,
          performance_weight: 1.1
        }
      }
    },
    {
      id: 'bounty_knockout',
      name: 'Баунти Knockout',
      description: 'Турниры с нокаут бонусами за выбивание соперников',
      format: 'bounty_knockout',
      icon: <Target className="h-6 w-6" />,
      color: 'bg-red-500',
      features: [
        'Существенные бонусы за нокауты',
        'Поощрение агрессивной игры',
        'Дополнительная мотивация',
        'Высокая динамика'
      ],
      recommendedFor: ['Специальные события', 'Промо турниры', 'Вечера баунти'],
      config: {
        base_points: 90,
        knockout_bonus: 35,
        rebuy_multiplier: 1.2,
        enable_position_bonus: true,
        first_place_bonus: 45,
        bubble_bonus: 8,
        prize_coefficient: 0.003,
        volatility_control: 1.3,
        weights: {
          position_weight: 0.8,
          prize_weight: 0.9,
          field_size_weight: 0.5,
          buy_in_weight: 0.4,
          duration_weight: 0.3,
          performance_weight: 1.3
        }
      }
    },
    {
      id: 'turbo_fast',
      name: 'Турбо Экспресс',
      description: 'Быстрые турниры с ускоренной структурой блайндов',
      format: 'turbo',
      icon: <Zap className="h-6 w-6" />,
      color: 'bg-yellow-500',
      features: [
        'Быстрая структура блайндов',
        'Адаптированные модификаторы',
        'Компенсация высокой дисперсии',
        'Короткое время игры'
      ],
      recommendedFor: ['Обеденные турниры', 'Быстрые сессии', 'Турниры в будни'],
      config: {
        base_points: 110,
        turbo_modifier: 0.85,
        enable_position_bonus: true,
        first_place_bonus: 35,
        volatility_control: 0.8,
        prize_coefficient: 0.0015,
        weights: {
          position_weight: 1.1,
          prize_weight: 0.7,
          field_size_weight: 0.8,
          buy_in_weight: 0.5,
          duration_weight: 0.2,
          performance_weight: 0.9
        }
      }
    },
    {
      id: 'deepstack_skill',
      name: 'DeepStack Профессиональный',
      description: 'Глубокие стеки для максимального проявления скилла',
      format: 'deepstack',
      icon: <Star className="h-6 w-6" />,
      color: 'bg-purple-500',
      features: [
        'Глубокие начальные стеки',
        'Повышенная роль скилла',
        'Длительная игра',
        'Профессиональный уровень'
      ],
      recommendedFor: ['Чемпионаты', 'Серии турниров', 'Профессиональные события'],
      config: {
        base_points: 120,
        deepstack_modifier: 1.15,
        enable_position_bonus: true,
        first_place_bonus: 60,
        duration_multiplier: true,
        prize_coefficient: 0.004,
        volatility_control: 1.4,
        skill_gap_adjustment: true,
        weights: {
          position_weight: 1.2,
          prize_weight: 1.1,
          field_size_weight: 0.9,
          buy_in_weight: 0.8,
          duration_weight: 0.7,
          performance_weight: 1.4
        }
      }
    },
    {
      id: 'satellite_qualifier',
      name: 'Сателлит Квалификация',
      description: 'Турниры-сателлиты для получения билетов на крупные события',
      format: 'satellite',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-indigo-500',
      features: [
        'Особая структура призов',
        'Фокус на квалификации',
        'Модифицированное распределение',
        'Специальные бонусы'
      ],
      recommendedFor: ['Квалификация на серии', 'Доступ к дорогим турнирам', 'Специальные акции'],
      config: {
        base_points: 70,
        satellite_modifier: true,
        enable_position_bonus: false,
        prize_coefficient: 0.001,
        volatility_control: 0.9,
        weights: {
          position_weight: 0.6,
          prize_weight: 0.4,
          field_size_weight: 1.0,
          buy_in_weight: 0.3,
          duration_weight: 0.2,
          performance_weight: 0.8
        }
      }
    }
  ];

  const applyProfile = async (profile: ProfileTemplate) => {
    setIsApplying(true);
    try {
      const newConfig = {
        ...config,
        ...profile.config,
        profile_name: profile.name,
        profile_description: profile.description,
        tournament_types: [profile.format]
      };

      await saveConfig(newConfig);
      
      toast({
        title: 'Профиль применен',
        description: `Настройки "${profile.name}" успешно активированы`,
        duration: 3000
      });
      
      setSelectedProfile(null);
    } catch (error: any) {
      toast({
        title: 'Ошибка применения профиля',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Профили для офлайн турниров</h2>
        <p className="text-muted-foreground">
          Готовые конфигурации рейтинговой системы для различных форматов покер турниров
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profileTemplates.map((profile) => (
          <Card 
            key={profile.id} 
            className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/40 cursor-pointer"
            onClick={() => setSelectedProfile(profile)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${profile.color} text-white`}>
                  {profile.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {profile.format.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <CardDescription className="mt-3">
                {profile.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium">Особенности:</div>
                <ul className="text-sm space-y-1">
                  {profile.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProfile(profile);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Подробнее
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Details Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedProfile && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${selectedProfile.color} text-white`}>
                    {selectedProfile.icon}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedProfile.name}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedProfile.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Features */}
                <div>
                  <h4 className="font-semibold mb-3">Особенности профиля:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedProfile.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended For */}
                <div>
                  <h4 className="font-semibold mb-3">Рекомендуется для:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.recommendedFor.map((rec, index) => (
                      <Badge key={index} variant="secondary">
                        {rec}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Configuration Preview */}
                <div>
                  <h4 className="font-semibold mb-3">Основные настройки:</h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Базовые очки:</span>
                      <span className="font-medium">{selectedProfile.config.base_points || 'По умолчанию'}</span>
                    </div>
                    {selectedProfile.config.rebuy_multiplier > 0 && (
                      <div className="flex justify-between">
                        <span>Множитель ребаев:</span>
                        <span className="font-medium">{selectedProfile.config.rebuy_multiplier}x</span>
                      </div>
                    )}
                    {selectedProfile.config.knockout_bonus && (
                      <div className="flex justify-between">
                        <span>Бонус за нокаут:</span>
                        <span className="font-medium">+{selectedProfile.config.knockout_bonus}</span>
                      </div>
                    )}
                    {selectedProfile.config.first_place_bonus && (
                      <div className="flex justify-between">
                        <span>Бонус за 1 место:</span>
                        <span className="font-medium">+{selectedProfile.config.first_place_bonus}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Призовый коэффициент:</span>
                      <span className="font-medium">{selectedProfile.config.prize_coefficient}</span>
                    </div>
                  </div>
                </div>

                {/* Alert */}
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription>
                    Применение профиля перезапишет текущие настройки рейтинговой системы. 
                    Убедитесь, что сохранили важные конфигурации перед применением.
                  </AlertDescription>
                </Alert>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={() => applyProfile(selectedProfile)}
                    disabled={isApplying}
                    className="flex-1"
                  >
                    {isApplying ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Применяется...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Применить профиль
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProfile(null)}>
                    Отмена
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}