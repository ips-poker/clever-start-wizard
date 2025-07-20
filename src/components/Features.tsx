import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  BarChart3, 
  Users, 
  Calendar,
  Shield,
  Clock,
  Target,
  Award,
  TrendingUp
} from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Trophy,
      title: "Турнирная система",
      description: "Регулярные турниры различных форматов с профессиональной организацией",
      highlights: ["Еженедельные турниры", "Различные форматы", "Профессиональные дилеры"],
      color: "poker-gold"
    },
    {
      icon: BarChart3,
      title: "Рейтинговая система",
      description: "Комплексная система оценки игроков с детальной статистикой",
      highlights: ["ELO рейтинг", "Детальная статистика", "История игр"],
      color: "poker-blue"
    },
    {
      icon: Users,
      title: "Сообщество",
      description: "Активное сообщество покерных энтузиастов и профессионалов",
      highlights: ["500+ активных игроков", "Обучающие мероприятия", "Нетворкинг"],
      color: "poker-green"
    },
    {
      icon: Calendar,
      title: "Турнирный календарь",
      description: "Удобное планирование и регистрация на предстоящие турниры",
      highlights: ["Онлайн регистрация", "Напоминания", "Календарь событий"],
      color: "poker-red"
    },
    {
      icon: Shield,
      title: "Честная игра",
      description: "Строгое соблюдение правил и обеспечение честности игры",
      highlights: ["Профессиональный арбитраж", "Видеонаблюдение", "Сертифицированные карты"],
      color: "primary"
    },
    {
      icon: Clock,
      title: "Турнирные часы",
      description: "Профессиональная система отсчета времени для турниров",
      highlights: ["Автоматические уровни", "Настраиваемые структуры", "Звуковые сигналы"],
      color: "poker-gold"
    },
    {
      icon: Target,
      title: "Персональные цели",
      description: "Система достижений и персональных целей для мотивации",
      highlights: ["Система достижений", "Персональные цели", "Прогресс трекинг"],
      color: "poker-blue"
    },
    {
      icon: Award,
      title: "Награды и признание",
      description: "Система наград за достижения в турнирах и активность",
      highlights: ["Почетные звания", "Сертификаты", "Зал славы"],
      color: "poker-green"
    },
    {
      icon: TrendingUp,
      title: "Аналитика прогресса",
      description: "Подробная аналитика вашего покерного прогресса",
      highlights: ["Графики прогресса", "ROI анализ", "Сравнение с другими"],
      color: "poker-red"
    }
  ];

  return (
    <section className="py-20 bg-accent/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Возможности клуба
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Все для профессионального покера
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            IPS предоставляет полный спектр услуг для серьезных покерных игроков: 
            от турниров до персональной аналитики
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border/50"
              >
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-${feature.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`w-6 h-6 text-${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-semibold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full bg-${feature.color} mr-2`}></div>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}