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
      title: "Рейтинговая система RPS",
      description: "Уникальная система RPS (Rating Points System) для справедливого определения мастерства",
      highlights: ["RPS рейтинг", "Призовые баллы", "История игр"],
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
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl" />
      {/* Elegant Poker Chips Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[8%] right-[25%] w-20 h-20 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-2xl opacity-40"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-400/30"></div>
          <div className="absolute inset-4 rounded-full border-2 border-dashed border-purple-400/20"></div>
        </div>
        
        <div className="absolute top-[45%] left-[18%] w-16 h-16 rounded-full animate-bounce-subtle">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-xl opacity-35"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-amber-400/30 flex items-center justify-center">
            <span className="text-amber-400/50 font-bold text-xs">100</span>
          </div>
        </div>
        
        <div className="absolute bottom-[10%] right-[12%] w-18 h-18 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-xl opacity-30"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border border-red-400/30 flex items-center justify-center">
            <span className="text-red-400/50 font-bold text-xs">500</span>
          </div>
        </div>
      </div>
      
      {/* Elegant Poker Suits */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[22%] left-[28%] animate-pulse-slow">
          <div className="text-purple-400/40 text-5xl filter drop-shadow-[0_0_15px_rgba(192,132,252,0.3)]">♠</div>
        </div>
        <div className="absolute top-[58%] right-[25%] animate-bounce-subtle">
          <div className="text-amber-400/35 text-4xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]">♦</div>
        </div>
        <div className="absolute bottom-[18%] left-[35%] animate-pulse-slow">
          <div className="text-red-400/45 text-6xl filter drop-shadow-[0_0_20px_rgba(248,113,113,0.4)]">♥</div>
        </div>
      </div>
      
      {/* Gradient light spots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 border-2 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center">
              <Trophy className="h-6 w-6 text-syndikate-orange" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-foreground">
              ВОЗМОЖНОСТИ КЛУБА
            </h2>
          </div>
          <div className="h-[2px] w-20 bg-gradient-neon mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto uppercase tracking-wider">
            Наш клуб предлагает полный спектр услуг для серьёзных игроков в покер
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={`feature-${index}-${feature.title}`} 
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
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 text-background" />
                  </div>
                  <h3 className="font-display text-xl uppercase text-foreground leading-tight mb-3 group-hover:text-syndikate-orange transition-colors duration-300 tracking-wider">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <div className="w-1.5 h-1.5 bg-syndikate-orange mr-3 flex-shrink-0 brutal-border"></div>
                        <span className="leading-relaxed text-foreground/80">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
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