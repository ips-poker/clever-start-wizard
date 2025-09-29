import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import luxuryPokerHero from "@/assets/luxury-poker-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";
import epcLogo from "@/assets/epc-logo.png";
import { useCMSContent } from "@/hooks/useCMSContent";
import { HeroSkeleton } from "@/components/ui/hero-skeleton";

export function Hero() {
  const {
    getContent,
    loading
  } = useCMSContent('home');

  if (loading) {
    return <HeroSkeleton />;
  }
  
  return (
    <>
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-black to-slate-800 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={luxuryPokerHero} 
            alt="Poker table background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-transparent to-black/90"></div>
        </div>
        
        {/* Покерные масти декорация */}
        <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 text-amber-400/20 text-6xl animate-pulse transform rotate-12">♠</div>
          <div className="absolute top-32 right-20 text-amber-400/15 text-4xl animate-bounce-subtle transform -rotate-12">♣</div>
          <div className="absolute bottom-20 left-20 text-amber-400/25 text-5xl animate-pulse transform rotate-45">♥</div>
          <div className="absolute bottom-32 right-10 text-amber-400/20 text-4xl animate-bounce-subtle transform -rotate-30">♦</div>
          <div className="absolute top-1/2 left-1/3 text-amber-400/5 text-9xl animate-glow transform rotate-12">♠</div>
          <div className="absolute top-1/3 right-1/4 text-amber-400/5 text-8xl animate-glow transform -rotate-45">♦</div>
        </div>

        <div className="container mx-auto px-4 z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Main Content */}
            <div className="space-y-8 text-center lg:text-left">
              {/* Logo and Main Card */}
              <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 overflow-hidden relative rounded-2xl p-8 backdrop-blur-xl shadow-2xl group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                  <div className="absolute top-4 right-4 text-amber-400/30 text-3xl animate-pulse">♠</div>
                  <div className="absolute bottom-4 left-4 text-amber-400/20 text-2xl animate-bounce-subtle">♣</div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6 justify-center lg:justify-start">
                    <div className="w-12 h-12 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-white/20 group-hover:ring-amber-400/30 transition-all duration-300">
                      <img src={epcLogo} alt="EPC Logo" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    
                    <div className="flex-1">
                      <h1 className="text-3xl lg:text-4xl font-light text-white tracking-wide drop-shadow-lg group-hover:text-amber-100 transition-colors duration-300">
                        EVENT POKER CLUB
                      </h1>
                      <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-2 group-hover:w-20 transition-all duration-500"></div>
                    </div>
                  </div>
                  
                  <p className="text-xl text-white/80 leading-relaxed mb-6 tracking-wide">
                    {getContent('hero_description', 'Премиальный покерный клуб в сердце Москвы с уникальной рейтинговой системой RPS')}
                  </p>

                  {/* Badge */}
                  <div className="bg-gradient-to-r from-white/10 via-white/15 to-white/10 rounded-lg p-3 backdrop-blur-md border border-white/20 group-hover:border-amber-400/30 transition-all duration-300 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                      <p className="text-white/90 text-base font-medium tracking-wide">
                        {getContent('hero_badge', 'Премиальный покерный клуб')}
                      </p>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link to="/tournaments">
                      <Button 
                        size="lg" 
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-amber-500/30 transition-all duration-300"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        {getContent('cta_primary', 'Присоединиться к турниру')}
                      </Button>
                    </Link>
                    
                    <Link to="/rating">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10 py-4 px-8 font-semibold rounded-lg transition-all duration-300"
                      >
                        <Trophy className="h-5 w-5 mr-2" />
                        {getContent('cta_secondary', 'Посмотреть рейтинг')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Key Benefits Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-emerald-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-white font-medium text-sm tracking-wide group-hover:text-green-100 transition-colors duration-300">Безопасность</h3>
                    <p className="text-white/60 text-xs mt-1">Честная игра</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-blue-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-white font-medium text-sm tracking-wide group-hover:text-purple-100 transition-colors duration-300">RPS Рейтинг</h3>
                    <p className="text-white/60 text-xs mt-1">Про система</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-amber-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-white font-medium text-sm tracking-wide group-hover:text-amber-100 transition-colors duration-300">Сообщество</h3>
                    <p className="text-white/60 text-xs mt-1">Элитные игроки</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg p-4 border border-white/10 backdrop-blur-sm">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-light text-amber-400 mb-1">500+</div>
                    <div className="text-xs text-white/60">Игроков</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-amber-400 mb-1">150+</div>
                    <div className="text-xs text-white/60">Турниров</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-amber-400 mb-1">4.9</div>
                    <div className="text-xs text-white/60">Рейтинг</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Feature Cards */}
            <div className="space-y-6">
              {/* Main RPS Rating Card */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-2xl p-6 border border-amber-500/20 backdrop-blur-xl shadow-xl group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-amber-500/30 transition-all duration-300">
                      <Trophy className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-light text-white tracking-wide group-hover:text-amber-100 transition-colors duration-300">
                        RPS RATING
                      </h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-amber-400 to-amber-600 mt-1 group-hover:w-16 transition-all duration-500"></div>
                    </div>
                  </div>
                  
                  <p className="text-white/80 text-sm leading-relaxed mb-4">
                    {getContent('main_feature_description', 'Уникальная система рейтинга, разработанная профессионалами покера для точной оценки мастерства игроков.')}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                      <div className="text-lg font-light text-amber-400">1500+</div>
                      <div className="text-xs text-white/60">Средний рейтинг</div>
                    </div>
                    <div className="bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg p-3 border border-white/10 backdrop-blur-sm">
                      <div className="text-lg font-light text-amber-400">95%</div>
                      <div className="text-xs text-white/60">Точность</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Feature Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-blue-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative z-10">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1 group-hover:text-purple-100 transition-colors duration-300">Сообщество</h4>
                    <p className="text-white/60 text-xs">Элитные игроки Москвы</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 via-transparent to-emerald-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative z-10">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1 group-hover:text-green-100 transition-colors duration-300">Турниры</h4>
                    <p className="text-white/60 text-xs">Ежедневные события</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-xl group hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 col-span-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-blue-600/8 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <Award className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm group-hover:text-blue-100 transition-colors duration-300">Достижения</h4>
                        <p className="text-white/60 text-xs">Система наград и титулов</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
        .animate-glow {
          animation: glow 4s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
      `}</style>
    </>
  );
}