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
      title: "Точный RPS рейтинг",
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
    <section className="py-12 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 lg:mb-16">
          <Badge variant="outline" className="mb-4 border-poker-gold text-poker-gold text-xs lg:text-sm">
            Рейтинговая система
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-4 lg:mb-6 px-4">
            Почему наша рейтинговая система 
            <span className="text-poker-gold block sm:inline"> уникальна?</span>
          </h2>
          <p className="text-base lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4 leading-relaxed">
            Профессиональная система RPS адаптированная специально для покера. 
            Получайте точную оценку навыков и отслеживайте свой прогресс.
          </p>
        </div>

        {/* Main Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <Card 
                key={`benefit-${index}-${benefit.title}`} 
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
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-4 lg:space-y-6 text-center lg:text-left">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              Что включает рейтинговая система?
            </h3>
            <p className="text-base lg:text-lg text-muted-foreground px-4 lg:px-0 leading-relaxed">
              Наша система анализирует каждую игру и предоставляет детальную статистику 
              для улучшения ваших навыков.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3 px-4 lg:px-0">
              {features.map((feature, index) => (
                <div key={`feature-${index}-${feature}`} className="flex items-center space-x-3 touch-target">
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-poker-green flex-shrink-0" />
                  <span className="text-foreground text-sm lg:text-base">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 lg:pt-0">
              <Button size="lg" className="bg-gradient-royal text-white hover:shadow-royal min-h-[48px] px-6 lg:px-8">
                Узнать свой рейтинг
                <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
              </Button>
            </div>
          </div>

          <div className="relative order-first lg:order-last">
            {/* Rating Display - Enhanced Design */}
            <Card className="p-6 lg:p-8 bg-card border-2 border-poker-accent/30 shadow-elevated hover:shadow-floating transition-all duration-300">
              <div className="text-center space-y-4 lg:space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xl lg:text-2xl font-bold text-foreground">Ваш текущий рейтинг</h4>
                  <div className="text-4xl lg:text-6xl font-bold text-poker-accent drop-shadow-lg">1847</div>
                  <Badge className="bg-poker-accent text-white font-semibold px-3 lg:px-4 py-1 shadow-md text-xs lg:text-sm">Продвинутый игрок</Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 lg:gap-4 pt-4 border-t border-border">
                  <div className="text-center p-2 lg:p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="text-lg lg:text-2xl font-bold text-foreground">23</div>
                    <div className="text-xs lg:text-sm text-muted-foreground font-medium">Турниров</div>
                  </div>
                  <div className="text-center p-2 lg:p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="text-lg lg:text-2xl font-bold text-poker-success">+127</div>
                    <div className="text-xs lg:text-sm text-muted-foreground font-medium">За месяц</div>
                  </div>
                  <div className="text-center p-2 lg:p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="text-lg lg:text-2xl font-bold text-poker-accent">TOP 15</div>
                    <div className="text-xs lg:text-sm text-muted-foreground font-medium">Позиция</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border px-2">
                  <span className="text-xs lg:text-sm text-muted-foreground font-medium">До Elite осталось:</span>
                  <span className="font-semibold text-white bg-poker-accent px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm shadow-md">153 очка</span>
                </div>
              </div>
            </Card>

            {/* Floating Achievement */}
            <div className="absolute -top-2 lg:-top-4 -right-2 lg:-right-4 bg-poker-gold text-primary p-2 lg:p-3 rounded-full shadow-gold animate-pulse">
              <Star className="w-4 h-4 lg:w-6 lg:h-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}