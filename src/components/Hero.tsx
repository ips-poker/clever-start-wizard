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
        {/* Background Image with enhanced overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={luxuryPokerHero} 
            alt="Poker table background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-slate-900/60 to-black/90"></div>
          <div className="absolute inset-0 bg-gradient-radial from-amber-500/5 via-transparent to-transparent"></div>
        </div>
        
        {/* Enhanced poker suits decoration */}
        <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-16 left-8 text-amber-400/15 text-7xl animate-float transform rotate-12">♠</div>
          <div className="absolute top-32 right-16 text-amber-400/10 text-5xl animate-float-delayed transform -rotate-12">♣</div>
          <div className="absolute bottom-24 left-16 text-amber-400/20 text-6xl animate-float transform rotate-45">♥</div>
          <div className="absolute bottom-32 right-12 text-amber-400/12 text-4xl animate-float-delayed transform -rotate-30">♦</div>
          <div className="absolute top-1/2 left-1/3 text-amber-400/3 text-9xl animate-rotate-slow transform rotate-12">♠</div>
          <div className="absolute top-1/3 right-1/4 text-amber-400/3 text-8xl animate-rotate-slow transform -rotate-45">♦</div>
        </div>

        <div className="container mx-auto px-4 z-10 relative py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Logo and Main Card */}
              <div className="bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/85 border border-amber-400/10 overflow-hidden relative rounded-3xl p-10 backdrop-blur-xl shadow-2xl group transition-all duration-700 hover:border-amber-400/30">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/5 to-amber-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8 justify-center lg:justify-start">
                    <div className="w-16 h-16 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl ring-2 ring-white/20 group-hover:ring-amber-400/50 transition-all duration-500 group-hover:scale-110">
                      <img src={epcLogo} alt="EPC Logo" className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    
                    <div className="flex-1">
                      <h1 className="text-4xl lg:text-5xl font-light text-white tracking-wider drop-shadow-2xl group-hover:text-amber-50 transition-colors duration-500">
                        EVENT POKER CLUB
                      </h1>
                      <div className="h-1 w-20 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 mt-3 rounded-full group-hover:w-32 transition-all duration-700 shadow-lg shadow-amber-500/50"></div>
                    </div>
                  </div>
                  
                  <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8 tracking-wide font-light">
                    {getContent('hero_description', 'Премиальный покерный клуб в сердце Москвы с уникальной рейтинговой системой RPS')}
                  </p>

                  {/* Enhanced Badge */}
                  <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 rounded-xl p-4 backdrop-blur-md border border-amber-400/20 group-hover:border-amber-400/40 transition-all duration-500 mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50"></div>
                      <Crown className="h-5 w-5 text-amber-400" />
                      <p className="text-white font-medium text-lg tracking-wide">
                        {getContent('hero_badge', 'Премиальный покерный клуб')}
                      </p>
                    </div>
                  </div>

                  {/* Enhanced CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                    <Link to="/tournaments" className="group/btn">
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white font-bold py-6 px-10 rounded-xl shadow-2xl hover:shadow-amber-500/50 transition-all duration-500 hover:scale-105 border border-amber-400/20"
                      >
                        <Play className="h-5 w-5 mr-2 group-hover/btn:scale-110 transition-transform" />
                        {getContent('cta_primary', 'Присоединиться к турниру')}
                      </Button>
                    </Link>
                    
                    <Link to="/rating" className="group/btn">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="w-full sm:w-auto border-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400 py-6 px-10 font-bold rounded-xl transition-all duration-500 hover:scale-105 backdrop-blur-sm"
                      >
                        <Trophy className="h-5 w-5 mr-2 group-hover/btn:rotate-12 transition-transform" />
                        {getContent('cta_secondary', 'Посмотреть рейтинг')}
                      </Button>
                    </Link>
                  </div>

                  {/* Enhanced Stats */}
                  <div className="bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                    <div className="grid grid-cols-3 gap-8">
                      <div className="text-center group/stat">
                        <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2 group-hover/stat:scale-110 transition-transform">500+</div>
                        <div className="text-sm text-white/70 font-medium">Игроков</div>
                      </div>
                      <div className="text-center group/stat">
                        <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2 group-hover/stat:scale-110 transition-transform">150+</div>
                        <div className="text-sm text-white/70 font-medium">Турниров</div>
                      </div>
                      <div className="text-center group/stat">
                        <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2 group-hover/stat:scale-110 transition-transform">4.9</div>
                        <div className="text-sm text-white/70 font-medium">Рейтинг</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Key Benefits Cards */}
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
            </div>

            {/* Right Column - Feature Cards */}
            <div className="lg:col-span-5 space-y-5">
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
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out 3s infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(var(--tw-rotate)); }
          33% { transform: translateY(-20px) translateX(10px) rotate(var(--tw-rotate)); }
          66% { transform: translateY(-10px) translateX(-10px) rotate(var(--tw-rotate)); }
        }
        .animate-rotate-slow {
          animation: rotate-slow 20s linear infinite;
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          to { transform: rotate(360deg) scale(1); }
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </>
  );
}