import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";
import luxuryPokerHero from "@/assets/luxury-poker-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";
import ipsLogo from "/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${luxuryPokerHero})` }}
      >
        <div className="absolute inset-0 bg-poker-charcoal/60"></div>
        <div className="absolute inset-0 bg-gradient-overlay"></div>
      </div>
      {/* Subtle Floating Elements */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-20 left-10 text-6xl text-white/30 animate-float [animation-delay:0s]">♠</div>
        <div className="absolute top-40 right-20 text-5xl text-white/20 animate-float [animation-delay:1s]">♥</div>
        <div className="absolute bottom-40 left-20 text-6xl text-white/30 animate-float [animation-delay:2s]">♦</div>
        <div className="absolute bottom-20 right-10 text-5xl text-white/20 animate-float [animation-delay:3s]">♣</div>
        
        <div className="absolute top-32 left-1/3 text-4xl text-white/15 animate-bounce-subtle [animation-delay:4s]">♠</div>
        <div className="absolute bottom-32 right-1/3 text-4xl text-white/15 animate-bounce-subtle [animation-delay:5s]">♣</div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen py-20">
          {/* Left Column - Content */}
          <div className="text-white space-y-10 animate-fade-in order-2 lg:order-1">
            <div className="space-y-8 animate-slide-up [animation-delay:0.2s]">
              <div className="flex justify-center lg:justify-start">
                <Badge className="bg-white/10 border border-white/30 text-white font-semibold px-6 py-3 rounded-full shadow-subtle backdrop-blur-md animate-scale-in [animation-delay:0.4s]">
                  Премиальный покерный клуб
                </Badge>
              </div>
              
              {/* Logo and Title Section */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-0 lg:space-x-8 animate-slide-right [animation-delay:0.6s]">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/30 shadow-elegant flex items-center justify-center p-4 animate-scale-in [animation-delay:0.3s] flex-shrink-0">
                  <img 
                    src={ipsLogo} 
                    alt="IPS Logo" 
                    className="w-full h-full object-contain filter drop-shadow-xl"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                    <span className="text-white block leading-none">
                      IPS
                    </span>
                    <span className="block text-poker-accent-light text-2xl sm:text-3xl lg:text-4xl mt-2 font-semibold leading-tight">
                      International
                    </span>
                    <span className="block text-xl sm:text-2xl lg:text-3xl font-medium text-white/90 tracking-wide leading-tight mt-1">
                      Poker Style
                    </span>
                  </h1>
                </div>
              </div>
               
               <div className="text-center lg:text-left">
                 <p className="text-lg text-white/90 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium animate-fade-in [animation-delay:0.8s]">
                   Премиальный покерный клуб с рейтинговой системой ELO. 
                   Развивайте навыки в элегантной атмосфере среди профессиональных игроков.
                 </p>
               </div>

                {/* Key Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up [animation-delay:1s] max-w-2xl mx-auto lg:mx-0">
                   <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-white/8 px-4 py-3 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle">
                     <Shield className="w-5 h-5 text-poker-accent-light flex-shrink-0" />
                     <span>Честная игра</span>
                   </div>
                   <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-white/8 px-4 py-3 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle">
                     <TrendingUp className="w-5 h-5 text-poker-accent-light flex-shrink-0" />
                     <span>Рост навыков</span>
                   </div>
                   <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-white/8 px-4 py-3 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle">
                     <Award className="w-5 h-5 text-poker-accent-light flex-shrink-0" />
                     <span>Рейтинг ELO</span>
                   </div>
                   <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-white/8 px-4 py-3 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle">
                     <Users className="w-5 h-5 text-poker-accent-light flex-shrink-0" />
                     <span>Сообщество</span>
                   </div>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-scale-in [animation-delay:1.2s] max-w-lg mx-auto lg:mx-0">
                <Button size="lg" className="bg-poker-accent text-white hover:bg-poker-accent/90 transition-all duration-300 font-semibold px-8 py-4 text-lg rounded-xl shadow-card hover:scale-105 hover:shadow-elegant">
                  <Play className="w-6 h-6 mr-3" />
                  Начать играть
                </Button>
                <Button size="lg" variant="outline" className="border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:text-white transition-all duration-300 font-semibold px-8 py-4 text-lg rounded-xl backdrop-blur-md shadow-card hover:scale-105 hover:border-white/70">
                  Рейтинг игроков
                </Button>
             </div>

             {/* Stats */}
             <div className="grid grid-cols-3 gap-4 md:gap-6 pt-8 animate-slide-up [animation-delay:1.4s] max-w-2xl mx-auto lg:mx-0">
                <div className="text-center p-4 md:p-5 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20 shadow-card transition-all duration-300 hover:scale-105 hover:bg-white/12">
                  <div className="text-3xl md:text-4xl font-bold text-poker-accent-light mb-2 md:mb-3">500+</div>
                  <div className="text-xs md:text-sm text-white font-medium">Игроков</div>
                </div>
                <div className="text-center p-4 md:p-5 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20 shadow-card transition-all duration-300 hover:scale-105 hover:bg-white/12">
                  <div className="text-3xl md:text-4xl font-bold text-poker-accent-light mb-2 md:mb-3">150+</div>
                  <div className="text-xs md:text-sm text-white font-medium">Турниров</div>
                </div>
                <div className="text-center p-4 md:p-5 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20 shadow-card transition-all duration-300 hover:scale-105 hover:bg-white/12">
                  <div className="text-3xl md:text-4xl font-bold text-poker-accent-light mb-2 md:mb-3">4.9</div>
                  <div className="text-xs md:text-sm text-white font-medium">Рейтинг</div>
                </div>
             </div>
           </div>

           {/* Right Column - Cards */}
           <div className="space-y-6 animate-slide-right [animation-delay:0.4s] order-1 lg:order-2">
              {/* Main Feature Card */}
              <Card className="p-8 bg-white/8 backdrop-blur-xl border border-white/20 shadow-card hover:scale-105 transition-all duration-300 hover:shadow-elegant">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-poker-accent rounded-2xl flex items-center justify-center mx-auto shadow-card text-white">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white">Рейтинговая система ELO</h3>
                  <p className="text-white/90 text-base lg:text-lg font-medium">Профессиональная система оценки навыков покерных игроков</p>
                  <Badge className="bg-poker-accent-light text-white px-6 py-3 font-semibold text-sm lg:text-base shadow-card">
                    Главная особенность
                  </Badge>
                </div>
              </Card>

             <div className="grid gap-4 md:gap-6">
              <Card className="p-6 bg-white/8 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-elegant animate-fade-in [animation-delay:0.8s]">
                <div className="flex items-center space-x-4">
                  <div className="p-3 lg:p-4 bg-poker-accent rounded-xl shadow-card flex-shrink-0">
                    <Users className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-white min-w-0">
                    <h3 className="font-bold text-base lg:text-lg">Элитное сообщество</h3>
                    <p className="text-sm lg:text-base text-white/80 font-medium">Игра с опытными покеристами</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/8 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-elegant animate-fade-in [animation-delay:1s]">
                <div className="flex items-center space-x-4">
                  <div className="p-3 lg:p-4 bg-poker-accent rounded-xl shadow-card flex-shrink-0">
                    <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-white min-w-0">
                    <h3 className="font-bold text-base lg:text-lg">Регулярные турниры</h3>
                    <p className="text-sm lg:text-base text-white/80 font-medium">Еженедельные соревнования</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/8 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-elegant animate-fade-in [animation-delay:1.2s]">
                <div className="flex items-center space-x-4">
                  <div className="p-3 lg:p-4 bg-poker-accent rounded-xl shadow-card flex-shrink-0">
                    <Star className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-white min-w-0">
                    <h3 className="font-bold text-base lg:text-lg">Награды и достижения</h3>
                    <p className="text-sm lg:text-base text-white/80 font-medium">Система признания успехов</p>
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