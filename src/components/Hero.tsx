import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";
import { Link } from "react-router-dom";
import luxuryPokerHero from "@/assets/luxury-poker-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";
import pokerLogo from "/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png";
import { useCMSContent } from "@/hooks/useCMSContent";
export function Hero() {
  const { getContent, loading } = useCMSContent('home');
  
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Enhanced Background with Better Gradient */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${luxuryPokerHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/30"></div>
      </div>

      {/* Elegant Floating Elements */}
      <div className="absolute inset-0 opacity-8 overflow-hidden motion-reduce:hidden">
        <div className="absolute top-20 left-10 text-6xl text-poker-accent/30 animate-pulse [animation-duration:3s]">♠</div>
        <div className="absolute bottom-20 right-10 text-5xl text-poker-accent-light/20 animate-pulse [animation-duration:4s]">♣</div>
        <div className="absolute top-1/2 left-20 text-4xl text-white/10 animate-pulse [animation-duration:5s]">♦</div>
        <div className="absolute bottom-1/3 right-20 text-4xl text-white/15 animate-pulse [animation-duration:6s]">♥</div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Main Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen py-16">
          
          {/* Left Column - Main Content */}
          <div className="space-y-8 text-center lg:text-left">
            {/* Premium Badge */}
            <div className="animate-scale-in">
              <Badge className="bg-gradient-to-r from-poker-accent to-poker-accent-light border-0 text-white font-semibold px-6 py-3 rounded-full shadow-elegant">
                {getContent('hero_badge', 'Премиальный покерный клуб')}
              </Badge>
            </div>

            {/* Logo & Title Block */}
            <div className="space-y-6 animate-slide-up [animation-delay:0.2s]">
              <div className="flex justify-center lg:justify-start">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/20 to-poker-accent-light/20 rounded-2xl blur-lg"></div>
                  <img 
                    src={pokerLogo} 
                    alt="EPC Logo" 
                    className="relative w-24 h-24 lg:w-28 lg:h-28 object-contain bg-gradient-to-br from-white/95 to-white/85 rounded-2xl p-3 shadow-elegant border border-white/30 backdrop-blur-sm" 
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-sinkin font-black leading-none tracking-tight">
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">
                    {getContent('hero_title', 'EPC')}
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-poker-accent to-poker-accent-light text-3xl sm:text-4xl lg:text-6xl mt-2 font-bold">
                    {getContent('hero_subtitle', 'Event Poker Club')}
                  </span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium animate-fade-in [animation-delay:0.4s]">
                  {getContent('hero_description', 'Премиальный покерный клуб с уникальной рейтинговой системой RPS. Развивайте навыки в элегантной атмосфере среди профессиональных игроков.')}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-scale-in [animation-delay:0.6s]">
              <Link to="/tournaments" className="group">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-poker-accent to-poker-accent-light hover:from-poker-accent-light hover:to-poker-accent text-white font-bold px-10 py-6 text-lg rounded-2xl shadow-elegant hover:scale-110 hover:shadow-2xl transition-all duration-500 border-0">
                  <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                  {getContent('cta_primary', 'Начать играть')}
                </Button>
              </Link>
              <Link to="/rating" className="group">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur-xl font-bold px-10 py-6 text-lg rounded-2xl shadow-elegant hover:scale-110 hover:shadow-2xl transition-all duration-500">
                  <Trophy className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                  {getContent('cta_secondary', 'Рейтинг игроков')}
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 animate-slide-up [animation-delay:0.8s] max-w-md mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-poker-accent to-poker-accent-light mb-1">500+</div>
                <div className="text-sm text-white/80 font-medium">Игроков</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-poker-accent to-poker-accent-light mb-1">150+</div>
                <div className="text-sm text-white/80 font-medium">Турниров</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-poker-accent to-poker-accent-light mb-1">4.9</div>
                <div className="text-sm text-white/80 font-medium">Рейтинг</div>
              </div>
            </div>
          </div>

          {/* Right Column - Feature Highlights */}
          <div className="space-y-6 animate-slide-up [animation-delay:1s]">
            {/* Main RPS Feature */}
            <Card className="p-8 bg-gradient-to-br from-white/20 to-white/5 border border-white/30 shadow-2xl backdrop-blur-xl hover:scale-105 transition-all duration-500 hover:shadow-elegant">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-2xl flex items-center justify-center shadow-card">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{getContent('main_feature_title', 'Рейтинговая система RPS')}</h3>
                    <Badge className="bg-poker-accent-light/20 text-poker-accent-light border border-poker-accent-light/30 px-3 py-1 text-xs font-bold mt-1">
                      Уникальная особенность
                    </Badge>
                  </div>
                </div>
                <p className="text-white/90 text-lg font-medium leading-relaxed">
                  {getContent('main_feature_description', 'Уникальная система Rating Points System для справедливой оценки мастерства')}
                </p>
              </div>
            </Card>

            {/* Secondary Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-6 bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Элитное сообщество</h4>
                    <p className="text-white/80 text-sm">Игра с профессионалами</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Турниры</h4>
                    <p className="text-white/80 text-sm">Еженедельные соревнования</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <Shield className="w-6 h-6 text-poker-accent-light flex-shrink-0" />
                <span className="text-white font-medium text-sm">{getContent('feature_1', 'Честная игра')}</span>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <TrendingUp className="w-6 h-6 text-poker-accent-light flex-shrink-0" />
                <span className="text-white font-medium text-sm">{getContent('feature_2', 'Рост навыков')}</span>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <Award className="w-6 h-6 text-poker-accent-light flex-shrink-0" />
                <span className="text-white font-medium text-sm">{getContent('feature_3', 'Рейтинг RPS')}</span>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <Star className="w-6 h-6 text-poker-accent-light flex-shrink-0" />
                <span className="text-white font-medium text-sm">{getContent('feature_4', 'Награды')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}