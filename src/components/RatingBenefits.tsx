import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  BarChart3, 
  Users, 
  TrendingUp,
  Target,
  Award,
  Star,
  ChevronRight,
  CheckCircle
} from "lucide-react";

export function RatingBenefits() {
  const benefits = [
    {
      icon: BarChart3,
      title: "Точный ELO рейтинг",
      description: "Математически точная система оценки навыков игрока",
      value: "От 1000 до 2500+",
      color: "poker-blue"
    },
    {
      icon: TrendingUp,
      title: "Отслеживание прогресса",
      description: "Детальная аналитика развития ваших покерных навыков",
      value: "Еженедельные отчеты",
      color: "poker-green"
    },
    {
      icon: Target,
      title: "Персональные цели",
      description: "Достигайте конкретных целей и получайте награды",
      value: "10+ достижений",
      color: "poker-gold"
    },
    {
      icon: Award,
      title: "Статус и признание",
      description: "Получайте титулы и признание в покерном сообществе",
      value: "5 уровней статуса",
      color: "poker-royal"
    }
  ];

  const features = [
    "Точный расчет силы игры",
    "Сравнение с другими игроками",
    "История всех партий",
    "Статистика по позициям",
    "Анализ ошибок",
    "Рекомендации по улучшению",
    "Турнирные достижения",
    "Прогноз развития"
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-poker-gold text-poker-gold">
            Рейтинговая система
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Почему наша рейтинговая система 
            <span className="text-poker-gold"> уникальна?</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Профессиональная система ELO адаптированная специально для покера. 
            Получайте точную оценку навыков и отслеживайте свой прогресс.
          </p>
        </div>

        {/* Main Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-${benefit.color}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <CardHeader className="text-center relative z-10">
                  <div className={`w-16 h-16 rounded-full bg-${benefit.color}/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`w-8 h-8 text-${benefit.color}`} />
                  </div>
                  <CardTitle className="text-lg font-semibold mb-2">
                    {benefit.title}
                  </CardTitle>
                  <Badge className={`bg-${benefit.color}/10 text-${benefit.color} border-${benefit.color}/20`}>
                    {benefit.value}
                  </Badge>
                </CardHeader>
                <CardContent className="text-center relative z-10">
                  <p className="text-muted-foreground text-sm">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-foreground">
              Что включает рейтинговая система?
            </h3>
            <p className="text-lg text-muted-foreground">
              Наша система анализирует каждую игру и предоставляет детальную статистику 
              для улучшения ваших навыков.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-poker-green flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Button size="lg" className="bg-gradient-royal text-white hover:shadow-royal">
              Узнать свой рейтинг
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="relative">
            {/* Rating Display Mock */}
            <div className="relative overflow-hidden rounded-2xl">
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ 
                  backgroundImage: `url(/src/assets/poker-chips-bg.jpg)`,
                  filter: 'blur(6px)'
                }}
              ></div>
              <div className="absolute inset-0 bg-slate-900/50"></div>
              <Card className="relative p-8 bg-transparent border-none text-white shadow-elegant">
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold">Ваш текущий рейтинг</h4>
                  <div className="text-6xl font-bold text-poker-gold">1847</div>
                  <Badge className="bg-poker-gold text-primary">Продвинутый игрок</Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-primary-foreground/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-poker-gold">23</div>
                    <div className="text-sm opacity-80">Турниров</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-poker-gold">+127</div>
                    <div className="text-sm opacity-80">За месяц</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-poker-gold">TOP 15</div>
                    <div className="text-sm opacity-80">Позиция</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-primary-foreground/20">
                  <span className="text-sm">До Elite осталось:</span>
                  <span className="font-semibold text-poker-gold">153 очка</span>
                </div>
              </div>
              </Card>
            </div>

            {/* Floating Achievement */}
            <div className="absolute -top-4 -right-4 bg-poker-gold text-primary p-3 rounded-full shadow-gold animate-pulse">
              <Star className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}