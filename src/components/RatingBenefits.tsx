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
    <section className="py-20 bg-gradient-to-br from-slate-900 via-black to-slate-800 relative overflow-hidden">
      {/* Покерные масти декорация */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-20 right-10 text-amber-400/30 text-5xl animate-pulse transform rotate-12">♣</div>
        <div className="absolute top-40 left-20 text-amber-400/20 text-4xl animate-bounce-subtle transform -rotate-12">♥</div>
        <div className="absolute bottom-20 right-20 text-amber-400/25 text-6xl animate-pulse transform rotate-45">♦</div>
        <div className="absolute bottom-40 left-10 text-amber-400/20 text-3xl animate-bounce-subtle transform -rotate-30">♠</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
              РЕЙТИНГОВАЯ СИСТЕМА
            </h2>
          </div>
          <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
          <p className="text-lg text-white/70 max-w-3xl mx-auto font-light leading-relaxed">
            Профессиональная система RPS адаптированная специально для покера. 
            Получайте точную оценку навыков и отслеживайте свой прогресс.
          </p>
        </div>

        {/* Main Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <div 
                key={`benefit-${index}-${benefit.title}`} 
                className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:scale-105 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                  <div className="absolute top-3 right-3 text-amber-400/30 text-xl animate-pulse">♠</div>
                  <div className="absolute bottom-3 left-3 text-amber-400/20 text-lg animate-bounce-subtle">♣</div>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-amber-100 transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <div className="bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg p-2 backdrop-blur-md border border-white/20 mb-3">
                    <span className="text-amber-400 text-sm font-medium">
                      {benefit.value}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <h3 className="text-2xl lg:text-3xl font-light text-white tracking-wide">
              Что включает рейтинговая система?
            </h3>
            <p className="text-lg text-white/70 leading-relaxed font-light">
              Наша система анализирует каждую игру и предоставляет детальную статистику 
              для улучшения ваших навыков.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={`feature-${index}-${feature}`} className="flex items-center space-x-3 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-lg p-3 border border-white/10">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-white text-sm font-light">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-8 py-4 rounded-lg shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
              >
                Узнать свой рейтинг
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          <div className="relative order-first lg:order-last">
            {/* Rating Display - Enhanced Design */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-3xl p-8 border border-amber-500/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-4 right-6 text-amber-400/30 text-4xl animate-pulse">♦</div>
                <div className="absolute bottom-4 left-6 text-amber-400/20 text-3xl animate-bounce-subtle">♥</div>
              </div>

              <div className="text-center space-y-6 relative z-10">
                <div className="space-y-3">
                  <h4 className="text-xl lg:text-2xl font-light text-white tracking-wide">Ваш текущий рейтинг</h4>
                  <div className="text-5xl lg:text-6xl font-light text-amber-400 drop-shadow-lg">1847</div>
                  <div className="bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg p-3 backdrop-blur-md border border-white/20 inline-block">
                    <span className="text-amber-400 font-medium text-sm tracking-wide">Продвинутый игрок</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
                  <div className="text-center p-3 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10">
                    <div className="text-xl lg:text-2xl font-light text-white">23</div>
                    <div className="text-xs lg:text-sm text-white/60 font-light">Турниров</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10">
                    <div className="text-xl lg:text-2xl font-light text-green-400">+127</div>
                    <div className="text-xs lg:text-sm text-white/60 font-light">За месяц</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10">
                    <div className="text-xl lg:text-2xl font-light text-amber-400">TOP 15</div>
                    <div className="text-xs lg:text-sm text-white/60 font-light">Позиция</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/20">
                  <span className="text-sm text-white/60 font-light">До Elite осталось:</span>
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 rounded-full shadow-lg">
                    <span className="text-white font-medium text-sm">153 очка</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Achievement */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-full shadow-xl animate-pulse">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </section>
  );
}