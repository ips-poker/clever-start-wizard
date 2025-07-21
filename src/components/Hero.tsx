import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play, Timer, Settings } from "lucide-react";
import tournamentDirectorBanner from "@/assets/tournament-director-banner.jpg";
import ipsLogo from "/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-surface">
      {/* Background Image with Enhanced Blur and Professional Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-md scale-110"
        style={{ backgroundImage: `url(${tournamentDirectorBanner})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-glass-dark backdrop-blur-sm"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-poker-dark-primary/95 via-poker-dark-secondary/90 to-poker-dark-elevated/95"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-poker-dark-primary/80 via-transparent to-transparent"></div>
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
          <div className="text-poker-dark-text space-y-10 animate-fade-in order-2 lg:order-1">
            <div className="space-y-8 animate-slide-up [animation-delay:0.2s]">
              <div className="flex justify-center lg:justify-start">
                <Badge className="bg-gradient-glass-dark border border-poker-accent/30 text-poker-dark-text font-semibold px-6 py-3 rounded-full shadow-accent backdrop-blur-xl animate-scale-in [animation-delay:0.4s]">
                  Покерный клуб IPS
                </Badge>
              </div>
              
              {/* Logo and Title Section */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-0 lg:space-x-8 animate-slide-right [animation-delay:0.6s]">
                <div className="w-24 h-24 bg-gradient-glass-dark backdrop-blur-xl rounded-2xl border border-poker-accent/30 shadow-glow flex items-center justify-center p-4 animate-scale-in [animation-delay:0.3s] flex-shrink-0">
                  <img 
                    src={ipsLogo} 
                    alt="IPS Logo" 
                    className="w-full h-full object-contain filter drop-shadow-2xl"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                    <span className="text-poker-dark-text block leading-none">
                      Покерный клуб
                    </span>
                    <span className="block bg-gradient-elegant bg-clip-text text-transparent text-2xl sm:text-3xl lg:text-4xl mt-2 font-semibold leading-tight">
                      IPS
                    </span>
                  </h1>
                </div>
              </div>
               
                <div className="text-center lg:text-left">
                  <p className="text-lg text-poker-dark-text-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium animate-fade-in [animation-delay:0.8s]">
                    Элитный покерный клуб с турнирами, рейтинговой системой и профессиональным сервисом.
                    Присоединяйтесь к сообществу лучших игроков в покер.
                  </p>
                </div>

                  {/* Key Benefits */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up [animation-delay:1s] max-w-2xl mx-auto lg:mx-0">
                     <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-gradient-glass-dark px-4 py-3 rounded-xl backdrop-blur-xl border border-poker-accent/30 text-poker-dark-text font-medium shadow-card">
                       <Trophy className="w-5 h-5 text-poker-gold flex-shrink-0" />
                       <span>Регулярные турниры</span>
                     </div>
                     <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-gradient-glass-dark px-4 py-3 rounded-xl backdrop-blur-xl border border-poker-accent/30 text-poker-dark-text font-medium shadow-card">
                       <Star className="w-5 h-5 text-poker-accent flex-shrink-0" />
                       <span>Система рейтингов</span>
                     </div>
                     <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-gradient-glass-dark px-4 py-3 rounded-xl backdrop-blur-xl border border-poker-accent/30 text-poker-dark-text font-medium shadow-card">
                       <Users className="w-5 h-5 text-poker-accent-light flex-shrink-0" />
                       <span>Сообщество игроков</span>
                     </div>
                     <div className="flex items-center justify-center lg:justify-start space-x-3 text-sm bg-gradient-glass-dark px-4 py-3 rounded-xl backdrop-blur-xl border border-poker-accent/30 text-poker-dark-text font-medium shadow-card">
                       <Shield className="w-5 h-5 text-poker-success flex-shrink-0" />
                       <span>Честная игра</span>
                     </div>
                  </div>
             </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-scale-in [animation-delay:1.2s] max-w-lg mx-auto lg:mx-0">
                 <Button size="lg" variant="premium" className="group">
                   <Play className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                   Начать игру
                 </Button>
                 <Button size="lg" variant="elegant" className="group">
                   <Trophy className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                   Рейтинг игроков
                 </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 md:gap-6 pt-8 animate-slide-up [animation-delay:1.4s] max-w-2xl mx-auto lg:mx-0">
                 <div className="text-center p-4 md:p-5 bg-gradient-glass-dark backdrop-blur-xl rounded-xl border border-poker-accent/30 shadow-card transition-all duration-300 hover:scale-105 hover:shadow-accent">
                   <div className="text-3xl md:text-4xl font-bold text-poker-gold mb-2 md:mb-3">500+</div>
                   <div className="text-xs md:text-sm text-poker-dark-text-muted font-medium">Игроков</div>
                 </div>
                 <div className="text-center p-4 md:p-5 bg-gradient-glass-dark backdrop-blur-xl rounded-xl border border-poker-accent/30 shadow-card transition-all duration-300 hover:scale-105 hover:shadow-accent">
                   <div className="text-3xl md:text-4xl font-bold text-poker-accent mb-2 md:mb-3">150+</div>
                   <div className="text-xs md:text-sm text-poker-dark-text-muted font-medium">Турниров</div>
                 </div>
                 <div className="text-center p-4 md:p-5 bg-gradient-glass-dark backdrop-blur-xl rounded-xl border border-poker-accent/30 shadow-card transition-all duration-300 hover:scale-105 hover:shadow-accent">
                   <div className="text-3xl md:text-4xl font-bold text-poker-success mb-2 md:mb-3">24/7</div>
                   <div className="text-xs md:text-sm text-poker-dark-text-muted font-medium">Поддержка</div>
                 </div>
              </div>
           </div>

           {/* Right Column - Cards */}
           <div className="space-y-6 animate-slide-right [animation-delay:0.4s] order-1 lg:order-2">
               {/* Main Feature Card */}
               <Card className="p-8 bg-gradient-glass-dark backdrop-blur-xl border border-poker-accent/30 shadow-glow hover:scale-105 transition-all duration-300 hover:shadow-accent">
                 <div className="text-center space-y-6">
                   <div className="w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto shadow-accent text-poker-text-inverse">
                     <Timer className="w-10 h-10" />
                   </div>
                   <h3 className="text-2xl lg:text-3xl font-bold text-poker-dark-text">Турнирный таймер</h3>
                   <p className="text-poker-dark-text-muted text-base lg:text-lg font-medium">Профессиональная система управления временем и блайндами турнира</p>
                   <Badge className="bg-gradient-gold text-poker-text-inverse px-6 py-3 font-semibold text-sm lg:text-base shadow-gold">
                     Ключевая функция
                   </Badge>
                 </div>
               </Card>

              <div className="grid gap-4 md:gap-6">
               <Card className="p-6 bg-gradient-glass-dark backdrop-blur-xl border border-poker-accent/30 hover:border-poker-accent/50 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-accent animate-fade-in [animation-delay:0.8s]">
                 <div className="flex items-center space-x-4">
                   <div className="p-3 lg:p-4 bg-gradient-accent rounded-xl shadow-accent flex-shrink-0">
                     <Users className="w-5 h-5 lg:w-6 lg:h-6 text-poker-text-inverse" />
                   </div>
                   <div className="text-poker-dark-text min-w-0">
                     <h3 className="font-bold text-base lg:text-lg">Управление игроками</h3>
                     <p className="text-sm lg:text-base text-poker-dark-text-muted font-medium">Регистрация и контроль участников</p>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 bg-gradient-glass-dark backdrop-blur-xl border border-poker-accent/30 hover:border-poker-accent/50 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-accent animate-fade-in [animation-delay:1s]">
                 <div className="flex items-center space-x-4">
                   <div className="p-3 lg:p-4 bg-gradient-gold rounded-xl shadow-gold flex-shrink-0">
                     <Settings className="w-5 h-5 lg:w-6 lg:h-6 text-poker-text-inverse" />
                   </div>
                   <div className="text-poker-dark-text min-w-0">
                     <h3 className="font-bold text-base lg:text-lg">Настройка структуры</h3>
                     <p className="text-sm lg:text-base text-poker-dark-text-muted font-medium">Блайнды, выплаты, правила</p>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 bg-gradient-glass-dark backdrop-blur-xl border border-poker-accent/30 hover:border-poker-accent/50 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-accent animate-fade-in [animation-delay:1.2s]">
                 <div className="flex items-center space-x-4">
                   <div className="p-3 lg:p-4 bg-gradient-success rounded-xl shadow-success flex-shrink-0">
                     <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-poker-text-inverse" />
                   </div>
                   <div className="text-poker-dark-text min-w-0">
                     <h3 className="font-bold text-base lg:text-lg">Рейтинг ELO</h3>
                     <p className="text-sm lg:text-base text-poker-dark-text-muted font-medium">Автоматический расчет рейтинга</p>
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