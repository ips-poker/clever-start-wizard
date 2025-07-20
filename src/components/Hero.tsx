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
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="absolute inset-0 bg-slate-900/30"></div>
      </div>
      {/* Floating Poker Suits with Advanced Animation */}
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        <div className="absolute top-20 left-10 text-4xl text-poker-gold animate-float">♠</div>
        <div className="absolute top-40 right-20 text-3xl text-poker-gold animate-glow" style={{animationDelay: '1s'}}>♥</div>
        <div className="absolute bottom-40 left-20 text-4xl text-poker-gold animate-float" style={{animationDelay: '2s'}}>♦</div>
        <div className="absolute bottom-20 right-10 text-3xl text-poker-gold animate-glow" style={{animationDelay: '3s'}}>♣</div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-poker-gold rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-white space-y-8 animate-fade-in">
            <div className="space-y-6">
              <Badge className="bg-gradient-glass border border-poker-gold/50 text-poker-charcoal font-semibold px-6 py-2 rounded-full shadow-glass animate-glass-morph backdrop-blur-md relative overflow-hidden">
                <span className="relative z-10">Премиальный покерный клуб</span>
                <div className="absolute inset-0 bg-gradient-shine opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
              </Badge>
              
              <h1 className="text-6xl lg:text-7xl font-black leading-tight tracking-tight drop-shadow-2xl relative">
                <span className="bg-gradient-to-r from-white via-white to-poker-pearl bg-clip-text text-transparent text-shadow-lg relative">
                  IPS
                  <div className="absolute inset-0 bg-gradient-shine opacity-0 hover:opacity-30 transition-opacity duration-1000 animate-shimmer"></div>
                </span>
                <span className="block text-poker-gold text-4xl lg:text-5xl mt-2 font-bold drop-shadow-xl animate-glow">
                  International
                </span>
                <span className="block text-3xl lg:text-4xl font-light text-white tracking-wide drop-shadow-lg">
                  Poker Style
                </span>
              </h1>
               
               <p className="text-xl text-white max-w-lg leading-relaxed drop-shadow-lg font-medium">
                 Премиальный покерный клуб с рейтинговой системой ELO. 
                 Развивайте навыки в роскошной атмосфере среди элитных игроков.
               </p>

               {/* Brand Key Benefits */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center space-x-3 text-sm bg-gradient-glass px-4 py-3 rounded-lg backdrop-blur-md border border-poker-gold/30 animate-slide-up text-poker-charcoal font-medium shadow-glass relative overflow-hidden group">
                   <Shield className="w-4 h-4 text-poker-gold animate-pulse" />
                   <span className="relative z-10">Честная игра</span>
                   <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                 </div>
                 <div className="flex items-center space-x-3 text-sm bg-gradient-glass px-4 py-3 rounded-lg backdrop-blur-md border border-poker-gold/30 animate-slide-up text-poker-charcoal font-medium shadow-glass relative overflow-hidden group" style={{animationDelay: '0.2s'}}>
                   <TrendingUp className="w-4 h-4 text-poker-gold animate-pulse" style={{animationDelay: '0.5s'}} />
                   <span className="relative z-10">Рост навыков</span>
                   <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                 </div>
                 <div className="flex items-center space-x-3 text-sm bg-gradient-glass px-4 py-3 rounded-lg backdrop-blur-md border border-poker-gold/30 animate-slide-up text-poker-charcoal font-medium shadow-glass relative overflow-hidden group" style={{animationDelay: '0.4s'}}>
                   <Award className="w-4 h-4 text-white" />
                   <span className="relative z-10">Рейтинг ELO</span>
                   <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                 </div>
                 <div className="flex items-center space-x-3 text-sm bg-gradient-glass px-4 py-3 rounded-lg backdrop-blur-md border border-poker-gold/30 animate-slide-up text-poker-charcoal font-medium shadow-glass relative overflow-hidden group" style={{animationDelay: '0.6s'}}>
                   <Users className="w-4 h-4 text-poker-gold animate-pulse" style={{animationDelay: '1.5s'}} />
                   <span className="relative z-10">Сообщество</span>
                   <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                 </div>
               </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4 animate-scale-in" style={{animationDelay: '1s'}}>
               <Button size="lg" className="bg-poker-gold text-poker-charcoal hover:bg-poker-gold/90 hover:shadow-floating hover:scale-110 transition-all duration-500 font-bold px-8 py-4 text-lg rounded-xl shadow-xl border border-poker-gold/50 animate-pulse-glow relative overflow-hidden group">
                 <Play className="w-5 h-5 mr-2 animate-bounce-subtle" />
                 <span className="relative z-10">Начать играть</span>
                 <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
               </Button>
               <Button size="lg" variant="outline" className="border-2 border-white text-white bg-gradient-glass hover:bg-white hover:text-poker-charcoal transition-all duration-500 font-semibold px-8 py-4 text-lg rounded-xl backdrop-blur-md hover:scale-110 shadow-glass relative overflow-hidden group">
                 <span className="relative z-10">Рейтинг игроков</span>
                 <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
               </Button>
             </div>

             {/* Brand Stats */}
             <div className="grid grid-cols-3 gap-6 pt-8">
               <div className="text-center p-6 bg-gradient-glass backdrop-blur-xl rounded-xl border border-poker-gold/30 shadow-floating hover:shadow-glass transition-all duration-500 animate-slide-up text-poker-charcoal hover:scale-105 relative overflow-hidden group" style={{animationDelay: '0.8s'}}>
                 <div className="text-4xl font-black text-poker-gold mb-2 animate-glow">500+</div>
                 <div className="text-sm text-poker-charcoal font-medium relative z-10">Игроков</div>
                 <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
               </div>
               <div className="text-center p-6 bg-gradient-glass backdrop-blur-xl rounded-xl border border-poker-gold/30 shadow-floating hover:shadow-glass transition-all duration-500 animate-slide-up text-poker-charcoal hover:scale-105 relative overflow-hidden group" style={{animationDelay: '1s'}}>
                 <div className="text-4xl font-black text-poker-gold mb-2 animate-glow" style={{animationDelay: '0.5s'}}>150+</div>
                 <div className="text-sm text-poker-charcoal font-medium relative z-10">Турниров</div>
                 <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
               </div>
               <div className="text-center p-6 bg-gradient-glass backdrop-blur-xl rounded-xl border border-poker-gold/30 shadow-floating hover:shadow-glass transition-all duration-500 animate-slide-up text-poker-charcoal hover:scale-105 relative overflow-hidden group" style={{animationDelay: '1.2s'}}>
                 <div className="text-4xl font-black text-poker-gold mb-2 animate-glow" style={{animationDelay: '1s'}}>4.9</div>
                 <div className="text-sm text-poker-charcoal font-medium relative z-10">Рейтинг</div>
                 <div className="absolute inset-0 bg-gradient-shine opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
               </div>
             </div>
           </div>

           {/* Right Column - Cards with Poker Background */}
           <div className="space-y-6 animate-slide-right" style={{animationDelay: '0.6s'}}>
             {/* Premium Main Feature Card */}
             <Card className="p-8 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/40 transition-all duration-500 shadow-elegant hover:shadow-gold relative overflow-hidden group animate-bounce-subtle">
               {/* Background Pattern */}
               <div 
                 className="absolute inset-0 opacity-5 bg-cover bg-center group-hover:opacity-10 transition-opacity duration-500"
                 style={{ backgroundImage: `url(${pokerChipsBg})` }}
               ></div>
               <div className="relative z-10 text-center text-white space-y-6">
                 <div className="w-20 h-20 bg-gradient-gold rounded-2xl flex items-center justify-center mx-auto shadow-gold text-poker-charcoal animate-glow group-hover:scale-110 transition-transform duration-300">
                   <Trophy className="w-10 h-10" />
                 </div>
                 <h3 className="text-3xl font-bold text-white group-hover:text-poker-gold transition-colors duration-300 drop-shadow-lg">Рейтинговая система ELO</h3>
                 <p className="text-white/90 text-lg group-hover:text-white transition-colors duration-300 drop-shadow-md">Профессиональная система оценки навыков покерных игроков</p>
                 <Badge className="bg-white/95 border border-poker-gold/50 text-poker-charcoal px-4 py-2 font-semibold animate-pulse-glow shadow-lg">
                   Главная особенность
                 </Badge>
               </div>
             </Card>

             <div className="grid gap-6">
               <Card className="p-6 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/30 transition-all duration-300 group shadow-elegant relative overflow-hidden hover:scale-105 animate-fade-in" style={{animationDelay: '1.2s'}}>
                 <div className="absolute inset-0 opacity-5 bg-cover bg-center group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundImage: `url(${pokerChipsBg})` }}></div>
                 <div className="relative z-10 flex items-center space-x-4">
                   <div className="p-4 bg-gradient-charcoal rounded-xl group-hover:bg-gradient-steel transition-colors shadow-subtle group-hover:animate-bounce-subtle">
                     <Users className="w-6 h-6 text-poker-gold group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div className="text-white">
                     <h3 className="font-bold text-lg group-hover:text-poker-gold transition-colors duration-300">Элитное сообщество</h3>
                     <p className="text-sm text-poker-silver/80 group-hover:text-poker-silver transition-colors duration-300">Игра с опытными покеристами</p>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/30 transition-all duration-300 group shadow-elegant relative overflow-hidden hover:scale-105 animate-fade-in" style={{animationDelay: '1.4s'}}>
                 <div className="absolute inset-0 opacity-5 bg-cover bg-center group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundImage: `url(${pokerChipsBg})` }}></div>
                 <div className="relative z-10 flex items-center space-x-4">
                   <div className="p-4 bg-gradient-charcoal rounded-xl group-hover:bg-gradient-steel transition-colors shadow-subtle group-hover:animate-bounce-subtle">
                     <Calendar className="w-6 h-6 text-poker-gold group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div className="text-white">
                     <h3 className="font-bold text-lg group-hover:text-poker-gold transition-colors duration-300">Регулярные турниры</h3>
                     <p className="text-sm text-poker-silver/80 group-hover:text-poker-silver transition-colors duration-300">Еженедельные соревнования</p>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/30 transition-all duration-300 group shadow-elegant relative overflow-hidden hover:scale-105 animate-fade-in" style={{animationDelay: '1.6s'}}>
                 <div className="absolute inset-0 opacity-5 bg-cover bg-center group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundImage: `url(${pokerChipsBg})` }}></div>
                 <div className="relative z-10 flex items-center space-x-4">
                   <div className="p-4 bg-gradient-charcoal rounded-xl group-hover:bg-gradient-steel transition-colors shadow-subtle group-hover:animate-bounce-subtle">
                     <Star className="w-6 h-6 text-poker-gold group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div className="text-white">
                     <h3 className="font-bold text-lg group-hover:text-poker-gold transition-colors duration-300">Награды и достижения</h3>
                     <p className="text-sm text-poker-silver/80 group-hover:text-poker-silver transition-colors duration-300">Система признания успехов</p>
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