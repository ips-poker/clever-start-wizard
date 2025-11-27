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
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />
      
      {/* Diagonal metal plates */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.9) 40%, rgba(255,255,255,0.06) 41%, rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.9) 43%, rgba(0,0,0,0.9) 100%)
          `,
          backgroundSize: "220px 220px",
        }}
      />
      
      {/* Neon Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl" />
      
      {/* Poker Chips Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[12%] left-[28%] w-20 h-20 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-2xl opacity-40"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-400/30 flex items-center justify-center">
            <span className="text-red-400/50 font-bold text-xs">500</span>
          </div>
          <div className="absolute inset-4 rounded-full border-2 border-dashed border-red-400/20"></div>
        </div>
        
        <div className="absolute top-[40%] right-[15%] w-16 h-16 rounded-full animate-bounce-subtle">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-xl opacity-35"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-400/30 flex items-center justify-center">
            <span className="text-blue-400/50 font-bold text-xs">1K</span>
          </div>
        </div>
        
        <div className="absolute bottom-[18%] left-[15%] w-18 h-18 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-xl opacity-30"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border border-green-400/30 flex items-center justify-center">
            <span className="text-green-400/50 font-bold text-xs">50</span>
          </div>
        </div>
      </div>
      
      {/* Elegant Poker Suits */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[25%] right-[32%] animate-pulse-slow">
          <div className="text-red-400/40 text-5xl filter drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]">♥</div>
        </div>
        <div className="absolute top-[38%] left-[25%] animate-bounce-subtle">
          <div className="text-blue-400/35 text-4xl filter drop-shadow-[0_0_12px_rgba(96,165,250,0.3)]">♠</div>
        </div>
        <div className="absolute bottom-[15%] right-[20%] animate-pulse-slow">
          <div className="text-green-400/45 text-6xl filter drop-shadow-[0_0_20px_rgba(74,222,128,0.4)]">♣</div>
        </div>
      </div>
      
      {/* Gradient light spots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 border-2 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-syndikate-orange" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-foreground">
              РЕЙТИНГОВАЯ СИСТЕМА
            </h2>
          </div>
          <div className="h-[2px] w-20 bg-gradient-neon mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto uppercase tracking-wider">
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
                className="brutal-metal brutal-border p-6 group hover:scale-105 transition-all duration-500 hover:shadow-neon-orange relative overflow-hidden"
              >
                {/* Industrial texture */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.02) 10px, rgba(255, 255, 255, 0.02) 20px)`
                  }}
                />
                
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange" />
                
                <div className="text-center relative z-10">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 text-background" />
                  </div>
                  <h3 className="font-display text-lg uppercase text-foreground mb-2 group-hover:text-syndikate-orange transition-colors duration-300 tracking-wider">
                    {benefit.title}
                  </h3>
                  <div className="bg-syndikate-metal/50 brutal-border p-2 mb-3">
                    <span className="text-syndikate-orange text-sm font-bold uppercase tracking-wider">
                      {benefit.value}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
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
            <h3 className="font-display text-3xl uppercase tracking-wider text-foreground">
              Что включает рейтинговая система?
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed uppercase tracking-wide">
              Наша система анализирует каждую игру и предоставляет детальную статистику 
              для улучшения ваших навыков.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={`feature-${index}-${feature}`} className="flex items-center space-x-3 bg-syndikate-metal/30 brutal-border p-3">
                  <CheckCircle className="w-5 h-5 text-syndikate-orange flex-shrink-0" />
                  <span className="text-foreground text-sm font-medium uppercase tracking-wide">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button 
                size="lg" 
                className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange px-8"
              >
                Узнать свой рейтинг
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          <div className="relative order-first lg:order-last">
            {/* Rating Display */}
            <div className="brutal-metal brutal-border p-8 shadow-neon-orange relative overflow-hidden group">
              {/* Industrial texture */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.02) 10px, rgba(255, 255, 255, 0.02) 20px)`
                }}
              />
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-syndikate-orange" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange" />

              <div className="text-center space-y-6 relative z-10">
                <div className="space-y-3">
                  <h4 className="font-display text-2xl uppercase tracking-wider text-foreground">Ваш текущий рейтинг</h4>
                  <div className="text-6xl font-display text-syndikate-orange neon-orange">1847</div>
                  <div className="bg-syndikate-orange/20 brutal-border px-4 py-2 inline-block">
                    <span className="text-syndikate-orange font-bold text-sm uppercase tracking-widest">Продвинутый игрок</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-border">
                  <div className="text-center bg-syndikate-metal/30 brutal-border p-3">
                    <div className="text-2xl font-display text-foreground">23</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Турниров</div>
                  </div>
                  <div className="text-center bg-syndikate-metal/30 brutal-border p-3">
                    <div className="text-2xl font-display text-syndikate-orange">+127</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">За месяц</div>
                  </div>
                  <div className="text-center bg-syndikate-metal/30 brutal-border p-3">
                    <div className="text-2xl font-display text-syndikate-orange">TOP 15</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Позиция</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t-2 border-border">
                  <span className="text-sm text-muted-foreground font-bold uppercase tracking-wider">До Elite:</span>
                  <div className="bg-syndikate-orange brutal-border px-4 py-1.5">
                    <span className="text-background font-bold text-sm uppercase">153 очка</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Achievement */}
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center animate-pulse">
              <Star className="w-6 h-6 text-background" />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-12px) rotate(var(--tw-rotate)); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </section>
  );
}