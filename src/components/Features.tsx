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
    <section className="py-20 bg-gradient-to-br from-slate-900 via-black to-slate-800 relative overflow-hidden">
      {/* Покерные масти декорация */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-10 left-10 text-amber-400/30 text-5xl animate-pulse transform rotate-12">♥</div>
        <div className="absolute top-30 right-20 text-amber-400/20 text-4xl animate-bounce-subtle transform -rotate-12">♠</div>
        <div className="absolute bottom-10 left-20 text-amber-400/25 text-6xl animate-pulse transform rotate-45">♣</div>
        <div className="absolute bottom-30 right-10 text-amber-400/20 text-3xl animate-bounce-subtle transform -rotate-30">♦</div>
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
                className="relative group"
              >
                {/* Outer glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/10 to-amber-600/0 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                {/* Main card */}
                <div className="relative bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/85 border-2 border-amber-400/10 rounded-3xl p-7 backdrop-blur-xl group-hover:scale-[1.03] group-hover:border-amber-400/30 transition-all duration-700 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/8 to-amber-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none">
                    <div className="absolute top-4 right-4 text-amber-400/40 text-3xl animate-float">♦</div>
                    <div className="absolute bottom-4 left-4 text-amber-400/30 text-2xl animate-float-delayed">♠</div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className="relative mb-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                      <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl ring-2 ring-amber-400/30 group-hover:ring-amber-400/50">
                        <IconComponent className="w-7 h-7 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white leading-tight mb-3 group-hover:text-amber-50 transition-colors duration-300 drop-shadow-md">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 mb-5 text-sm leading-relaxed font-light">
                      {feature.description}
                    </p>
                    <ul className="space-y-2.5">
                      {feature.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-center text-sm">
                          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center mr-3 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                          </div>
                          <span className="leading-relaxed text-white/80 font-light">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
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