import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";
import luxuryPokerHero from "@/assets/luxury-poker-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm"
        style={{ backgroundImage: `url(${luxuryPokerHero})`, filter: 'blur(8px)' }}
      >
        <div className="absolute inset-0 bg-slate-900/60"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      {/* Floating Poker Suits with Advanced Animation */}
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        {/* Main suits - larger */}
        <div className="absolute top-20 left-10 text-9xl text-poker-gold animate-float">♠</div>
        <div className="absolute top-40 right-20 text-8xl text-poker-gold animate-glow" style={{animationDelay: '1s'}}>♥</div>
        <div className="absolute bottom-40 left-20 text-9xl text-poker-gold animate-float" style={{animationDelay: '2s'}}>♦</div>
        <div className="absolute bottom-20 right-10 text-8xl text-poker-gold animate-glow" style={{animationDelay: '3s'}}>♣</div>
        
        {/* Medium suits - middle layer */}
        <div className="absolute top-32 left-1/3 text-7xl text-poker-gold animate-pulse" style={{animationDelay: '0.5s'}}>♠</div>
        <div className="absolute top-60 right-1/4 text-7xl text-poker-gold animate-float" style={{animationDelay: '1.5s'}}>♥</div>
        <div className="absolute bottom-60 left-1/2 text-7xl text-poker-gold animate-glow" style={{animationDelay: '2.5s'}}>♦</div>
        <div className="absolute bottom-32 right-1/3 text-7xl text-poker-gold animate-pulse" style={{animationDelay: '3.5s'}}>♣</div>
        
        {/* Small suits - background layer */}
        <div className="absolute top-16 left-1/4 text-6xl text-poker-gold/70 animate-float" style={{animationDelay: '4s'}}>♠</div>
        <div className="absolute top-24 right-1/3 text-6xl text-poker-gold/70 animate-glow" style={{animationDelay: '4.5s'}}>♥</div>
        <div className="absolute top-48 left-2/3 text-6xl text-poker-gold/70 animate-pulse" style={{animationDelay: '5s'}}>♦</div>
        <div className="absolute top-72 right-2/3 text-6xl text-poker-gold/70 animate-float" style={{animationDelay: '5.5s'}}>♣</div>
        
        <div className="absolute bottom-16 left-1/3 text-6xl text-poker-gold/70 animate-glow" style={{animationDelay: '6s'}}>♠</div>
        <div className="absolute bottom-24 right-1/4 text-6xl text-poker-gold/70 animate-pulse" style={{animationDelay: '6.5s'}}>♥</div>
        <div className="absolute bottom-48 left-3/4 text-6xl text-poker-gold/70 animate-float" style={{animationDelay: '7s'}}>♦</div>
        <div className="absolute bottom-72 right-3/4 text-6xl text-poker-gold/70 animate-glow" style={{animationDelay: '7.5s'}}>♣</div>
        
        {/* Extra small suits - scattered */}
        <div className="absolute top-28 left-1/5 text-5xl text-poker-gold/50 animate-pulse" style={{animationDelay: '8s'}}>♠</div>
        <div className="absolute top-52 right-1/5 text-5xl text-poker-gold/50 animate-float" style={{animationDelay: '8.5s'}}>♥</div>
        <div className="absolute top-80 left-4/5 text-5xl text-poker-gold/50 animate-glow" style={{animationDelay: '9s'}}>♦</div>
        <div className="absolute bottom-80 right-4/5 text-5xl text-poker-gold/50 animate-pulse" style={{animationDelay: '9.5s'}}>♣</div>
        
        <div className="absolute bottom-28 left-2/5 text-5xl text-poker-gold/50 animate-float" style={{animationDelay: '10s'}}>♠</div>
        <div className="absolute bottom-52 right-2/5 text-5xl text-poker-gold/50 animate-glow" style={{animationDelay: '10.5s'}}>♥</div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-poker-gold rounded-full animate-glow" style={{animationDelay: '3.5s'}}></div>
        <div className="absolute bottom-1/4 left-3/4 w-2 h-2 bg-poker-gold rounded-full animate-float" style={{animationDelay: '4.5s'}}></div>
        <div className="absolute top-3/4 right-3/4 w-1.5 h-1.5 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '5.5s'}}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-white space-y-8 animate-fade-in">
            <div className="space-y-6">
              <Badge className="bg-white/20 border border-poker-gold/50 text-white font-semibold px-5 py-2 rounded-full shadow-elegant backdrop-blur-md relative overflow-hidden text-sm">
                <span className="relative z-10">Премиальный покерный клуб</span>
                <div className="absolute inset-0 bg-gradient-shine opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
              </Badge>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight relative">
                <span className="text-white text-shadow-lg relative drop-shadow-lg">
                  IPS
                </span>
                <span className="block text-poker-gold text-3xl lg:text-4xl mt-2 font-semibold drop-shadow-lg">
                  International
                </span>
                <span className="block text-2xl lg:text-3xl font-medium text-white/90 tracking-wide drop-shadow-md">
                  Poker Style
                </span>
              </h1>
               
               <p className="text-lg text-white max-w-lg leading-relaxed font-medium bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                 Премиальный покерный клуб с рейтинговой системой ELO. 
                 Развивайте навыки в роскошной атмосфере среди элитных игроков.
               </p>

               {/* Brand Key Benefits */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 text-sm bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-poker-gold/40 animate-slide-up text-white font-semibold shadow-elegant relative overflow-hidden group">
                    <Shield className="w-5 h-5 text-poker-gold" />
                    <span className="relative z-10">Честная игра</span>
                    <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
                  <div className="flex items-center space-x-3 text-sm bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-poker-gold/40 animate-slide-up text-white font-semibold shadow-elegant relative overflow-hidden group" style={{animationDelay: '0.2s'}}>
                    <TrendingUp className="w-5 h-5 text-poker-gold" />
                    <span className="relative z-10">Рост навыков</span>
                    <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
                  <div className="flex items-center space-x-3 text-sm bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-poker-gold/40 animate-slide-up text-white font-semibold shadow-elegant relative overflow-hidden group" style={{animationDelay: '0.4s'}}>
                    <Award className="w-5 h-5 text-poker-gold" />
                    <span className="relative z-10">Рейтинг ELO</span>
                    <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
                  <div className="flex items-center space-x-3 text-sm bg-white/20 px-4 py-3 rounded-xl backdrop-blur-md border border-poker-gold/40 animate-slide-up text-white font-semibold shadow-elegant relative overflow-hidden group" style={{animationDelay: '0.6s'}}>
                    <Users className="w-5 h-5 text-poker-gold" />
                    <span className="relative z-10">Сообщество</span>
                    <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
               </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4 animate-scale-in" style={{animationDelay: '1s'}}>
                <Button size="lg" className="bg-poker-gold text-poker-charcoal hover:bg-poker-gold/90 hover:shadow-floating transition-all duration-300 font-bold px-8 py-4 text-lg rounded-xl shadow-elegant border border-poker-gold relative overflow-hidden group">
                  <Play className="w-6 h-6 mr-3" />
                  <span className="relative z-10 font-bold">Начать играть</span>
                  <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
                </Button>
                <Button size="lg" variant="outline" className="border-2 border-white/70 text-white bg-white/15 hover:bg-white/25 hover:text-white transition-all duration-300 font-semibold px-8 py-4 text-lg rounded-xl backdrop-blur-md shadow-elegant relative overflow-hidden group">
                  <span className="relative z-10 font-bold">Рейтинг игроков</span>
                  <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                </Button>
             </div>

             {/* Brand Stats */}
             <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center p-5 bg-white/15 backdrop-blur-xl rounded-xl border border-poker-gold/40 shadow-elegant hover:shadow-floating transition-all duration-300 animate-slide-up hover:scale-105 relative overflow-hidden group" style={{animationDelay: '0.8s'}}>
                  <div className="text-4xl font-bold text-poker-gold mb-3">500+</div>
                  <div className="text-sm text-white font-semibold relative z-10">Игроков</div>
                  <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
                </div>
                <div className="text-center p-5 bg-white/15 backdrop-blur-xl rounded-xl border border-poker-gold/40 shadow-elegant hover:shadow-floating transition-all duration-300 animate-slide-up hover:scale-105 relative overflow-hidden group" style={{animationDelay: '1s'}}>
                  <div className="text-4xl font-bold text-poker-gold mb-3">150+</div>
                  <div className="text-sm text-white font-semibold relative z-10">Турниров</div>
                  <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
                </div>
                <div className="text-center p-5 bg-white/15 backdrop-blur-xl rounded-xl border border-poker-gold/40 shadow-elegant hover:shadow-floating transition-all duration-300 animate-slide-up hover:scale-105 relative overflow-hidden group" style={{animationDelay: '1.2s'}}>
                  <div className="text-4xl font-bold text-poker-gold mb-3">4.9</div>
                  <div className="text-sm text-white font-semibold relative z-10">Рейтинг</div>
                  <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
                </div>
             </div>
           </div>

           {/* Right Column - Cards with Poker Background */}
           <div className="space-y-6 animate-slide-right" style={{animationDelay: '0.6s'}}>
              {/* Premium Main Feature Card */}
              <Card className="p-8 bg-white/15 backdrop-blur-xl border border-poker-gold/50 shadow-floating relative overflow-hidden group">
                <div className="relative z-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-poker-gold rounded-2xl flex items-center justify-center mx-auto shadow-elegant text-white">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">Рейтинговая система ELO</h3>
                  <p className="text-white text-lg font-medium">Профессиональная система оценки навыков покерных игроков</p>
                  <Badge className="bg-poker-gold text-white px-6 py-3 font-bold text-base shadow-elegant border border-poker-gold">
                    Главная особенность
                  </Badge>
                </div>
              </Card>

             <div className="grid gap-6">
              <Card className="p-6 bg-white/15 backdrop-blur-xl border border-poker-gold/40 hover:border-poker-gold/60 transition-all duration-300 group shadow-elegant relative overflow-hidden hover:scale-105 animate-fade-in" style={{animationDelay: '1.2s'}}>
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="p-4 bg-poker-gold rounded-xl shadow-elegant">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg">Элитное сообщество</h3>
                    <p className="text-base text-white/80 font-medium">Игра с опытными покеристами</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/15 backdrop-blur-xl border border-poker-gold/40 hover:border-poker-gold/60 transition-all duration-300 group shadow-elegant relative overflow-hidden hover:scale-105 animate-fade-in" style={{animationDelay: '1.4s'}}>
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="p-4 bg-poker-gold rounded-xl shadow-elegant">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg">Регулярные турниры</h3>
                    <p className="text-base text-white/80 font-medium">Еженедельные соревнования</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/15 backdrop-blur-xl border border-poker-gold/40 hover:border-poker-gold/60 transition-all duration-300 group shadow-elegant relative overflow-hidden hover:scale-105 animate-fade-in" style={{animationDelay: '1.6s'}}>
                <div className="relative z-10 flex items-center space-x-4">
                  <div className="p-4 bg-poker-gold rounded-xl shadow-elegant">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg">Награды и достижения</h3>
                    <p className="text-base text-white/80 font-medium">Система признания успехов</p>
                  </div>
                </div>
              </Card>
             </div>
           </div>
         </div>
       </div>
     </section>
   );
 }