import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";
import pokerTableHero from "@/assets/poker-table-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${pokerTableHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="absolute inset-0 bg-slate-900/60"></div>
      </div>
      {/* Floating Poker Suits with Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 text-4xl text-poker-gold animate-float">♠</div>
        <div className="absolute top-40 right-20 text-3xl text-poker-gold animate-glow" style={{animationDelay: '1s'}}>♥</div>
        <div className="absolute bottom-40 left-20 text-4xl text-poker-gold animate-float" style={{animationDelay: '2s'}}>♦</div>
        <div className="absolute bottom-20 right-10 text-3xl text-poker-gold animate-glow" style={{animationDelay: '3s'}}>♣</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-white space-y-8 animate-fade-in">
            <div className="space-y-6">
              <Badge className="bg-gradient-luxury border border-poker-gold/30 text-poker-charcoal font-semibold px-6 py-2 rounded-full shadow-gold animate-glow">
                Премиальный покерный клуб
              </Badge>
              
              <h1 className="text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white via-poker-pearl to-white bg-clip-text text-transparent">IPS</span>
                <span className="block text-poker-gold text-4xl lg:text-5xl mt-2 font-bold">
                  International
                </span>
                <span className="block text-3xl lg:text-4xl font-light text-poker-silver tracking-wide">
                  Poker Style
                </span>
              </h1>
               
               <p className="text-xl text-poker-pearl max-w-lg leading-relaxed">
                 Премиальный покерный клуб с рейтинговой системой ELO. 
                 Развивайте навыки в роскошной атмосфере среди элитных игроков.
               </p>

               {/* Brand Key Benefits */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center space-x-3 text-sm bg-gradient-luxury/50 px-4 py-3 rounded-lg backdrop-blur-sm border border-poker-gold/20 animate-slide-up">
                   <Shield className="w-4 h-4 text-poker-gold" />
                   <span>Честная игра</span>
                 </div>
                 <div className="flex items-center space-x-3 text-sm bg-gradient-luxury/50 px-4 py-3 rounded-lg backdrop-blur-sm border border-poker-gold/20 animate-slide-up" style={{animationDelay: '0.2s'}}>
                   <TrendingUp className="w-4 h-4 text-poker-gold" />
                   <span>Рост навыков</span>
                 </div>
                 <div className="flex items-center space-x-3 text-sm bg-gradient-luxury/50 px-4 py-3 rounded-lg backdrop-blur-sm border border-poker-gold/20 animate-slide-up" style={{animationDelay: '0.4s'}}>
                   <Award className="w-4 h-4 text-poker-gold" />
                   <span>Рейтинг ELO</span>
                 </div>
                 <div className="flex items-center space-x-3 text-sm bg-gradient-luxury/50 px-4 py-3 rounded-lg backdrop-blur-sm border border-poker-gold/20 animate-slide-up" style={{animationDelay: '0.6s'}}>
                   <Users className="w-4 h-4 text-poker-gold" />
                   <span>Сообщество</span>
                 </div>
               </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4">
               <Button size="lg" className="bg-gradient-gold text-poker-charcoal hover:shadow-gold transition-all duration-300 font-bold px-8 py-4 text-lg rounded-xl">
                 <Play className="w-5 h-5 mr-2" />
                 Начать играть
               </Button>
               <Button size="lg" variant="outline" className="border-2 border-poker-silver/30 text-white hover:bg-poker-silver hover:text-poker-charcoal transition-all duration-300 font-semibold px-8 py-4 text-lg rounded-xl backdrop-blur-sm">
                 Рейтинг игроков
               </Button>
             </div>

             {/* Brand Stats */}
             <div className="grid grid-cols-3 gap-6 pt-8">
               <div className="text-center p-6 bg-gradient-card backdrop-blur-xl rounded-xl border border-poker-silver/20 shadow-elegant hover:shadow-gold transition-all duration-300 animate-slide-up" style={{animationDelay: '0.8s'}}>
                 <div className="text-4xl font-black text-poker-gold mb-2">500+</div>
                 <div className="text-sm text-poker-silver font-medium">Игроков</div>
               </div>
               <div className="text-center p-6 bg-gradient-card backdrop-blur-xl rounded-xl border border-poker-silver/20 shadow-elegant hover:shadow-gold transition-all duration-300 animate-slide-up" style={{animationDelay: '1s'}}>
                 <div className="text-4xl font-black text-poker-gold mb-2">150+</div>
                 <div className="text-sm text-poker-silver font-medium">Турниров</div>
               </div>
               <div className="text-center p-6 bg-gradient-card backdrop-blur-xl rounded-xl border border-poker-silver/20 shadow-elegant hover:shadow-gold transition-all duration-300 animate-slide-up" style={{animationDelay: '1.2s'}}>
                 <div className="text-4xl font-black text-poker-gold mb-2">4.9</div>
                 <div className="text-sm text-poker-silver font-medium">Рейтинг</div>
               </div>
             </div>
           </div>

           {/* Right Column - Cards with Poker Background */}
           <div className="space-y-6 animate-slide-up" style={{animationDelay: '0.4s'}}>
             {/* Premium Main Feature Card */}
             <Card className="p-8 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/40 transition-all duration-500 shadow-elegant hover:shadow-gold relative overflow-hidden">
               {/* Background Pattern */}
               <div 
                 className="absolute inset-0 opacity-5 bg-cover bg-center"
                 style={{ backgroundImage: `url(${pokerChipsBg})` }}
               ></div>
               <div className="relative z-10 text-center text-white space-y-6">
                 <div className="w-20 h-20 bg-gradient-gold rounded-2xl flex items-center justify-center mx-auto shadow-gold text-poker-charcoal">
                   <Trophy className="w-10 h-10" />
                 </div>
                 <h3 className="text-3xl font-bold text-poker-silver">Рейтинговая система ELO</h3>
                 <p className="text-poker-silver/80 text-lg">Профессиональная система оценки навыков покерных игроков</p>
                 <Badge className="bg-gradient-luxury border border-poker-gold/30 text-poker-charcoal px-4 py-2 font-semibold">
                   Главная особенность
                 </Badge>
               </div>
             </Card>

             <div className="grid gap-6">
               <Card className="p-6 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/30 transition-all duration-300 group shadow-elegant relative overflow-hidden">
                 <div className="absolute inset-0 opacity-5 bg-cover bg-center" style={{ backgroundImage: `url(${pokerChipsBg})` }}></div>
                 <div className="relative z-10 flex items-center space-x-4">
                   <div className="p-4 bg-gradient-charcoal rounded-xl group-hover:bg-gradient-steel transition-colors shadow-subtle">
                     <Users className="w-6 h-6 text-poker-gold" />
                   </div>
                   <div className="text-white">
                     <h3 className="font-bold text-lg">Элитное сообщество</h3>
                     <p className="text-sm text-poker-silver/80">Игра с опытными покеристами</p>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/30 transition-all duration-300 group shadow-elegant relative overflow-hidden">
                 <div className="absolute inset-0 opacity-5 bg-cover bg-center" style={{ backgroundImage: `url(${pokerChipsBg})` }}></div>
                 <div className="relative z-10 flex items-center space-x-4">
                   <div className="p-4 bg-gradient-charcoal rounded-xl group-hover:bg-gradient-steel transition-colors shadow-subtle">
                     <Calendar className="w-6 h-6 text-poker-gold" />
                   </div>
                   <div className="text-white">
                     <h3 className="font-bold text-lg">Регулярные турниры</h3>
                     <p className="text-sm text-poker-silver/80">Еженедельные соревнования</p>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 bg-gradient-card backdrop-blur-xl border border-poker-silver/20 hover:border-poker-gold/30 transition-all duration-300 group shadow-elegant relative overflow-hidden">
                 <div className="absolute inset-0 opacity-5 bg-cover bg-center" style={{ backgroundImage: `url(${pokerChipsBg})` }}></div>
                 <div className="relative z-10 flex items-center space-x-4">
                   <div className="p-4 bg-gradient-charcoal rounded-xl group-hover:bg-gradient-steel transition-colors shadow-subtle">
                     <Star className="w-6 h-6 text-poker-gold" />
                   </div>
                   <div className="text-white">
                     <h3 className="font-bold text-lg">Награды и достижения</h3>
                     <p className="text-sm text-poker-silver/80">Система признания успехов</p>
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