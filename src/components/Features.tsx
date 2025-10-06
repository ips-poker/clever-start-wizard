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
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Elegant Poker Chips Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-12 right-20 w-20 h-20 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-2xl opacity-35"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-400/30"></div>
          <div className="absolute inset-4 rounded-full border border-dashed border-red-400/20"></div>
        </div>
        
        <div className="absolute bottom-16 left-24 w-16 h-16 rounded-full animate-bounce-subtle">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-xl opacity-30"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border border-blue-400/30"></div>
        </div>
      </div>
      
      {/* Elegant Poker Suits */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-10 left-10 animate-pulse-slow transform rotate-12">
          <div className="text-red-400/45 text-5xl filter drop-shadow-[0_0_18px_rgba(248,113,113,0.4)]">♥</div>
        </div>
        <div className="absolute top-30 right-20 animate-bounce-subtle transform -rotate-12">
          <div className="text-purple-400/35 text-4xl filter drop-shadow-[0_0_14px_rgba(192,132,252,0.3)]">♠</div>
        </div>
        <div className="absolute bottom-10 left-20 animate-pulse-slow transform rotate-45">
          <div className="text-amber-400/40 text-6xl filter drop-shadow-[0_0_20px_rgba(251,191,36,0.35)]">♣</div>
        </div>
        <div className="absolute bottom-30 right-10 animate-bounce-subtle transform -rotate-30">
          <div className="text-blue-400/35 text-3xl filter drop-shadow-[0_0_12px_rgba(96,165,250,0.3)]">♦</div>
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
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
              ВОЗМОЖНОСТИ КЛУБА
            </h2>
          </div>
          <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
          <p className="text-lg text-white/70 max-w-3xl mx-auto font-light leading-relaxed">
            EPC предоставляет полный спектр услуг для серьезных покерных игроков: 
            от турниров до персональной аналитики
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={`feature-${index}-${feature.title}`} 
                className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:scale-105 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                  <div className="absolute top-3 right-3 text-amber-400/30 text-xl animate-pulse">♦</div>
                  <div className="absolute bottom-3 left-3 text-amber-400/20 text-lg animate-bounce-subtle">♠</div>
                </div>
                
                <div className="relative z-10">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <IconComponent className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-medium text-white leading-tight mb-3 group-hover:text-amber-100 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 mb-4 text-sm lg:text-base leading-relaxed font-light">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center text-xs lg:text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-3 flex-shrink-0"></div>
                        <span className="leading-relaxed text-white/70 font-light">{highlight}</span>
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