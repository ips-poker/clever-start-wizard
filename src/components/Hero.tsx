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
      {/* Premium Background with Enhanced Gradients */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${luxuryPokerHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-slate-950/95"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-poker-accent/5 via-transparent to-poker-accent-light/5"></div>
      </div>

      {/* Sophisticated Floating Elements */}
      <div className="absolute inset-0 opacity-15 overflow-hidden motion-reduce:hidden">
        <div className="absolute top-20 left-10 text-7xl text-poker-accent/40 animate-pulse [animation-duration:4s] hover:scale-110 transition-transform duration-1000">♠</div>
        <div className="absolute bottom-20 right-10 text-6xl text-poker-accent-light/30 animate-pulse [animation-duration:5s] hover:scale-110 transition-transform duration-1000">♣</div>
        <div className="absolute top-1/2 left-20 text-5xl text-white/20 animate-pulse [animation-duration:6s] hover:scale-110 transition-transform duration-1000">♦</div>
        <div className="absolute bottom-1/3 right-20 text-5xl text-white/25 animate-pulse [animation-duration:7s] hover:scale-110 transition-transform duration-1000">♥</div>
        <div className="absolute top-1/3 right-1/4 text-4xl text-poker-accent/20 animate-pulse [animation-duration:8s] hover:scale-110 transition-transform duration-1000">♠</div>
        <div className="absolute bottom-1/2 left-1/3 text-3xl text-white/15 animate-pulse [animation-duration:9s] hover:scale-110 transition-transform duration-1000">♣</div>
      </div>

      {/* Ambient Light Effects */}
      <div className="absolute inset-0 motion-reduce:hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-poker-accent/10 rounded-full blur-3xl animate-pulse [animation-duration:8s]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-poker-accent-light/8 rounded-full blur-3xl animate-pulse [animation-duration:10s]"></div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Premium Hero Layout */}
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen py-20">
          
          {/* Left Column - Hero Content */}
          <div className="space-y-10 text-center lg:text-left">
            {/* Elegant Badge */}
            <div className="animate-scale-in flex justify-center lg:justify-start">
              <Badge className="relative bg-gradient-to-r from-poker-accent via-poker-accent-light to-poker-accent border-0 text-white font-bold px-8 py-4 rounded-full shadow-2xl text-sm tracking-wide backdrop-blur-sm overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">{getContent('hero_badge', 'Премиальный покерный клуб')}</div>
              </Badge>
            </div>

            {/* Hero Logo & Branding */}
            <div className="space-y-8 animate-slide-up [animation-delay:0.2s]">
              <div className="flex justify-center lg:justify-start">
                <div className="relative group">
                  {/* Glow Effect */}
                  <div className="absolute -inset-2 bg-gradient-to-br from-poker-accent/30 via-poker-accent-light/20 to-poker-accent/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse [animation-duration:3s]"></div>
                  {/* Logo Container */}
                  <div className="relative bg-gradient-to-br from-white/95 to-white/85 rounded-3xl p-4 shadow-2xl border border-white/40 backdrop-blur-xl group-hover:scale-110 transition-all duration-500">
                    <img 
                      src={pokerLogo} 
                      alt="EPC Logo" 
                      className="w-28 h-28 lg:w-32 lg:h-32 object-contain" 
                    />
                  </div>
                </div>
              </div>
              
              {/* Premium Typography */}
              <div className="space-y-6">
                <h1 className="relative">
                  <span className="block text-6xl sm:text-7xl lg:text-9xl font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white/95 to-white/80 drop-shadow-2xl">
                    {getContent('hero_title', 'EPC')}
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-poker-accent via-poker-accent-light to-poker-accent text-4xl sm:text-5xl lg:text-7xl mt-3 font-bold tracking-wide">
                    {getContent('hero_subtitle', 'Event Poker Club')}
                  </span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/95 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium animate-fade-in [animation-delay:0.4s] drop-shadow-lg">
                  {getContent('hero_description', 'Премиальный покерный клуб с уникальной рейтинговой системой RPS. Развивайте навыки в элегантной атмосфере среди профессиональных игроков.')}
                </p>
              </div>
            </div>

            {/* Premium Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start animate-scale-in [animation-delay:0.6s]">
              <Link to="/tournaments" className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-poker-accent via-poker-accent-light to-poker-accent rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <Button size="lg" className="relative w-full sm:w-auto bg-gradient-to-r from-poker-accent via-poker-accent-light to-poker-accent hover:from-poker-accent-light hover:via-poker-accent hover:to-poker-accent-light text-white font-black px-12 py-7 text-xl rounded-3xl shadow-2xl border-0 transition-all duration-500 group-hover:scale-105">
                  <Play className="w-7 h-7 mr-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                  {getContent('cta_primary', 'Начать играть')}
                </Button>
              </Link>
              <Link to="/rating" className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-white/30 to-white/10 rounded-3xl blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <Button size="lg" variant="outline" className="relative w-full sm:w-auto border-3 border-white/60 text-white bg-white/15 hover:bg-white/25 hover:border-white backdrop-blur-xl font-black px-12 py-7 text-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:scale-105">
                  <Trophy className="w-7 h-7 mr-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                  {getContent('cta_secondary', 'Рейтинг игроков')}
                </Button>
              </Link>
            </div>

            {/* Elite Statistics */}
            <div className="grid grid-cols-3 gap-8 animate-slide-up [animation-delay:0.8s] max-w-lg mx-auto lg:mx-0">
              <div className="text-center lg:text-left group cursor-default">
                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-poker-accent via-poker-accent-light to-poker-accent mb-2 group-hover:scale-110 transition-transform duration-300">500+</div>
                <div className="text-sm text-white/90 font-semibold tracking-wide uppercase">Игроков</div>
              </div>
              <div className="text-center lg:text-left group cursor-default">
                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-poker-accent via-poker-accent-light to-poker-accent mb-2 group-hover:scale-110 transition-transform duration-300">150+</div>
                <div className="text-sm text-white/90 font-semibold tracking-wide uppercase">Турниров</div>
              </div>
              <div className="text-center lg:text-left group cursor-default">
                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-poker-accent via-poker-accent-light to-poker-accent mb-2 group-hover:scale-110 transition-transform duration-300">4.9</div>
                <div className="text-sm text-white/90 font-semibold tracking-wide uppercase">Рейтинг</div>
              </div>
            </div>
          </div>

          {/* Right Column - Premium Feature Showcase */}
          <div className="space-y-8 animate-slide-up [animation-delay:1s]">
            {/* Flagship RPS System Card */}
            <Card className="relative p-10 bg-gradient-to-br from-white/25 via-white/15 to-white/5 border border-white/40 shadow-2xl backdrop-blur-2xl rounded-3xl hover:scale-105 transition-all duration-700 hover:shadow-elegant group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/10 via-transparent to-poker-accent-light/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative space-y-8">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-3xl blur group-hover:blur-lg transition-all duration-500"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-3xl flex items-center justify-center shadow-2xl">
                      <Trophy className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-white group-hover:text-poker-accent-light transition-colors duration-300">
                      {getContent('main_feature_title', 'Рейтинговая система RPS')}
                    </h3>
                    <Badge className="bg-gradient-to-r from-poker-accent-light/30 to-poker-accent/30 text-poker-accent-light border border-poker-accent-light/40 px-4 py-2 text-sm font-bold backdrop-blur-sm">
                      Эксклюзивная технология
                    </Badge>
                  </div>
                </div>
                <p className="text-white/95 text-xl font-medium leading-relaxed">
                  {getContent('main_feature_description', 'Уникальная система Rating Points System для справедливой оценки мастерства')}
                </p>
              </div>
            </Card>

            {/* Premium Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="group p-8 bg-gradient-to-br from-white/20 to-white/5 border border-white/30 backdrop-blur-xl rounded-2xl hover:bg-white/25 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-2xl flex items-center justify-center">
                      <Users className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xl font-black text-white group-hover:text-poker-accent-light transition-colors duration-300">Элитное сообщество</h4>
                    <p className="text-white/85 font-medium">Игра с профессиональными покеристами высокого уровня</p>
                  </div>
                </div>
              </Card>
              
              <Card className="group p-8 bg-gradient-to-br from-white/20 to-white/5 border border-white/30 backdrop-blur-xl rounded-2xl hover:bg-white/25 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-poker-accent to-poker-accent-light rounded-2xl flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xl font-black text-white group-hover:text-poker-accent-light transition-colors duration-300">Премиальные турниры</h4>
                    <p className="text-white/85 font-medium">Еженедельные соревнования с крупными призовыми фондами</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Luxury Benefits Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="group flex items-center space-x-4 p-6 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Shield className="w-8 h-8 text-poker-accent-light flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-white font-bold text-base">{getContent('feature_1', 'Честная игра')}</span>
              </div>
              <div className="group flex items-center space-x-4 p-6 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <TrendingUp className="w-8 h-8 text-poker-accent-light flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-white font-bold text-base">{getContent('feature_2', 'Рост навыков')}</span>
              </div>
              <div className="group flex items-center space-x-4 p-6 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Award className="w-8 h-8 text-poker-accent-light flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-white font-bold text-base">{getContent('feature_3', 'Рейтинг RPS')}</span>
              </div>
              <div className="group flex items-center space-x-4 p-6 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105">
                <Star className="w-8 h-8 text-poker-accent-light flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-white font-bold text-base">{getContent('feature_4', 'Награды')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}