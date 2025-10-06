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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img 
            src={luxuryPokerHero} 
            alt="Покерный стол" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/80 to-slate-900/85 backdrop-blur-[1px]"></div>
        </div>

        {/* Светящиеся частицы */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-amber-400/60 rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* Диагональные световые лучи */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent transform rotate-12 animate-ray-1"></div>
          <div className="absolute top-0 right-1/4 w-1/3 h-full bg-gradient-to-r from-transparent via-amber-500/15 to-transparent transform -rotate-12 animate-ray-2"></div>
        </div>

        {/* Градиентные световые пятна */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Геометрические паттерны */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
          <div className="absolute top-10 right-20 w-32 h-32 border-2 border-amber-400/30 rounded-lg transform rotate-45 animate-spin-slow"></div>
          <div className="absolute bottom-32 left-32 w-24 h-24 border border-amber-400/20 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 left-10 w-16 h-16 border-2 border-purple-400/30 transform rotate-12"></div>
        </div>

        {/* Покерные фишки декорация */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-8">
          <div className="absolute top-20 right-32 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/30 border-2 border-amber-400/40 animate-float"></div>
          <div className="absolute bottom-40 left-20 w-16 h-16 rounded-full bg-gradient-to-br from-purple-400/30 to-purple-600/30 border-2 border-purple-400/40 animate-float-delayed"></div>
          <div className="absolute top-1/2 right-10 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400/30 to-blue-600/30 border-2 border-blue-400/40 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Animated poker symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
          <div className="absolute top-[15%] left-[10%] text-amber-400/50 text-5xl animate-float">♠</div>
          <div className="absolute top-[25%] right-[15%] text-amber-400/40 text-4xl animate-float-delayed">♣</div>
          <div className="absolute bottom-[20%] left-[15%] text-amber-400/45 text-6xl animate-float">♥</div>
          <div className="absolute bottom-[15%] right-[10%] text-amber-400/35 text-3xl animate-float-delayed">♦</div>
          <div className="absolute top-[40%] left-[25%] text-purple-400/30 text-4xl animate-float" style={{ animationDelay: '1.5s' }}>♠</div>
          <div className="absolute top-[60%] right-[30%] text-blue-400/25 text-3xl animate-float-delayed" style={{ animationDelay: '2.5s' }}>♦</div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Top section - Logo and Main Info */}
            <div className="text-center mb-16">
              {/* Logo */}
              <div className="mb-8 flex justify-center animate-fade-in">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl p-3 shadow-2xl group-hover:shadow-amber-500/30 transition-all duration-500 ring-1 ring-white/20 group-hover:ring-amber-400/30">
                    <img 
                      src={epcLogo} 
                      alt="EPC Logo" 
                      className="h-20 w-auto group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </div>

              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 rounded-full border border-amber-400/30 mb-8 backdrop-blur-xl animate-fade-in animation-delay-100">
                <Crown className="h-5 w-5 text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm tracking-wide">
                  {getContent('hero_badge', 'Премиальный покерный клуб')}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in animation-delay-200">
                <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent drop-shadow-xl">
                  Event Poker Club
                </span>
              </h1>

              {/* Description */}
              <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in animation-delay-300">
                {getContent('hero_description', 'Профессиональные турниры с официальной рейтинговой системой RPS')}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in animation-delay-400">
                <Link to="/tournaments">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-amber-500/30 transition-all duration-300 group"
                  >
                    <Trophy className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {getContent('cta_primary', 'Турниры')}
                  </Button>
                </Link>
                <Link to="/rating">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/70 backdrop-blur-xl font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 group"
                  >
                    <TrendingUp className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {getContent('cta_secondary', 'Рейтинг RPS')}
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto animate-fade-in animation-delay-500">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-amber-400/20 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-amber-400 mb-1">500+</div>
                  <div className="text-sm text-slate-400">Активных игроков</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-amber-400/20 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-amber-400 mb-1">150+</div>
                  <div className="text-sm text-slate-400">Турниров</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-amber-400/20 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-amber-400 mb-1">RPS</div>
                  <div className="text-sm text-slate-400">Рейтинг IPS</div>
                </div>
              </div>
            </div>

            {/* Bottom section - Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-fade-in animation-delay-600">
              {/* RPS Rating System */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/10 to-amber-600/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border-2 border-amber-400/20 rounded-2xl p-6 backdrop-blur-2xl shadow-xl group-hover:border-amber-400/40 group-hover:scale-105 transition-all duration-500">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-50 transition-colors">
                    Система RPS
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {getContent('feature_rps', 'Официальная рейтинговая система International Poker Series для честной оценки навыков')}
                  </p>
                </div>
              </div>

              {/* Professional Tournaments */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/10 to-purple-600/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border-2 border-purple-400/20 rounded-2xl p-6 backdrop-blur-2xl shadow-xl group-hover:border-purple-400/40 group-hover:scale-105 transition-all duration-500">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-50 transition-colors">
                    Турниры
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {getContent('feature_tournaments', 'Регулярные профессиональные турниры с призовыми фондами и честной игрой')}
                  </p>
                </div>
              </div>

              {/* Community */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/10 to-blue-600/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border-2 border-blue-400/20 rounded-2xl p-6 backdrop-blur-2xl shadow-xl group-hover:border-blue-400/40 group-hover:scale-105 transition-all duration-500">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-50 transition-colors">
                    Сообщество
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {getContent('feature_community', 'Дружное покерное сообщество с прозрачной статистикой и достижениями')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom animations */}
        <style>{`
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float 6s ease-in-out 3s infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
            50% { transform: translateY(-20px) rotate(var(--tw-rotate)); }
          }
          .animate-particle {
            animation: particle linear infinite;
          }
          @keyframes particle {
            0% { 
              transform: translateY(0) scale(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% { 
              transform: translateY(-100vh) scale(1);
              opacity: 0;
            }
          }
          .animate-ray-1 {
            animation: ray-move-1 20s ease-in-out infinite;
          }
          .animate-ray-2 {
            animation: ray-move-2 25s ease-in-out infinite;
          }
          @keyframes ray-move-1 {
            0%, 100% { transform: translateX(-10%) rotate(12deg); }
            50% { transform: translateX(10%) rotate(12deg); }
          }
          @keyframes ray-move-2 {
            0%, 100% { transform: translateX(10%) rotate(-12deg); }
            50% { transform: translateX(-10%) rotate(-12deg); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 8s ease-in-out infinite;
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
          }
          .animate-spin-slow {
            animation: spin-slow 30s linear infinite;
          }
          @keyframes spin-slow {
            from { transform: rotate(45deg); }
            to { transform: rotate(405deg); }
          }
          .animation-delay-100 {
            animation-delay: 0.1s;
          }
          .animation-delay-200 {
            animation-delay: 0.2s;
          }
          .animation-delay-300 {
            animation-delay: 0.3s;
          }
          .animation-delay-400 {
            animation-delay: 0.4s;
          }
          .animation-delay-500 {
            animation-delay: 0.5s;
          }
          .animation-delay-600 {
            animation-delay: 0.6s;
          }
        `}</style>
      </section>
    </>
  );
}