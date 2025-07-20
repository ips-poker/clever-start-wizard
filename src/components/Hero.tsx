import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center overflow-hidden">
      {/* Modern Background Mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-60"></div>
      
      {/* Floating poker symbols with modern animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 text-6xl animate-float text-poker-gold">♠</div>
        <div className="absolute top-40 right-20 text-4xl animate-float animation-delay-1000 text-poker-emerald">♥</div>
        <div className="absolute bottom-40 left-20 text-5xl animate-float animation-delay-500 text-poker-crimson">♦</div>
        <div className="absolute bottom-20 right-10 text-4xl animate-float animation-delay-1500 text-poker-sapphire">♣</div>
        <div className="absolute top-60 left-1/2 text-3xl animate-float animation-delay-700 text-poker-amethyst">♠</div>
        <div className="absolute bottom-60 right-1/3 text-5xl animate-float animation-delay-300 text-poker-platinum">♥</div>
      </div>

      {/* Modern floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-poker-amethyst/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-poker-sapphire/10 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-poker-gold/5 rounded-full blur-3xl animate-pulse animation-delay-500"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Enhanced Content */}
          <div className="text-white space-y-8">
            <div className="space-y-6">
              <Badge className="bg-gradient-gold text-primary font-semibold px-6 py-3 rounded-full shadow-glow-gold">
                🏆 #1 Покерный клуб с рейтинговой системой
              </Badge>
              
              <h1 className="text-6xl lg:text-8xl font-black leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white via-poker-platinum to-white bg-clip-text text-transparent">
                  IPS
                </span>
                <span className="block text-poker-gold text-4xl lg:text-6xl mt-2 font-bold">
                  International
                </span>
                <span className="block text-3xl lg:text-5xl font-light text-gray-200/90 tracking-wide">
                  Poker Style
                </span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-200 max-w-lg leading-relaxed font-light">
                Присоединяйтесь к элитному покерному сообществу с профессиональной 
                <span className="text-poker-gold font-semibold bg-poker-gold/10 px-2 py-1 rounded-md"> рейтинговой системой</span>. 
                Развивайте навыки, участвуйте в турнирах и достигайте новых высот!
              </p>

              {/* Enhanced Key Benefits */}
              <div className="grid grid-cols-2 gap-6 text-base">
                <div className="flex items-center space-x-3 bg-white/5 px-4 py-3 rounded-xl backdrop-blur-sm">
                  <Shield className="w-5 h-5 text-poker-emerald" />
                  <span className="font-medium">Честная игра</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 px-4 py-3 rounded-xl backdrop-blur-sm">
                  <TrendingUp className="w-5 h-5 text-poker-sapphire" />
                  <span className="font-medium">Рост рейтинга</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 px-4 py-3 rounded-xl backdrop-blur-sm">
                  <Award className="w-5 h-5 text-poker-gold" />
                  <span className="font-medium">Награды</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/5 px-4 py-3 rounded-xl backdrop-blur-sm">
                  <Users className="w-5 h-5 text-poker-amethyst" />
                  <span className="font-medium">Сообщество</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <Button size="lg" className="bg-gradient-gold text-primary hover:shadow-glow-gold hover:scale-105 transition-all duration-300 font-bold px-8 py-4 text-lg rounded-xl">
                <Play className="w-6 h-6 mr-3" />
                Начать играть бесплатно
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-primary font-bold px-8 py-4 text-lg rounded-xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
                Посмотреть рейтинг
              </Button>
            </div>

            {/* Modern Enhanced Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center p-6 bg-gradient-glass backdrop-blur-xl rounded-2xl border border-white/20 shadow-glass hover:scale-105 transition-all duration-300">
                <div className="text-4xl font-black text-poker-gold mb-2">500+</div>
                <div className="text-sm text-gray-300 font-medium">Активных игроков</div>
              </div>
              <div className="text-center p-6 bg-gradient-glass backdrop-blur-xl rounded-2xl border border-white/20 shadow-glass hover:scale-105 transition-all duration-300">
                <div className="text-4xl font-black text-poker-emerald mb-2">150+</div>
                <div className="text-sm text-gray-300 font-medium">Проведено турниров</div>
              </div>
              <div className="text-center p-6 bg-gradient-glass backdrop-blur-xl rounded-2xl border border-white/20 shadow-glass hover:scale-105 transition-all duration-300">
                <div className="text-4xl font-black text-poker-sapphire mb-2">24/7</div>
                <div className="text-sm text-gray-300 font-medium">Работаем для вас</div>
              </div>
            </div>
          </div>

          {/* Right Column - Enhanced Cards */}
          <div className="space-y-6">
            {/* Main Feature Card */}
            <Card className="p-8 bg-gradient-glass backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all duration-500 shadow-glass hover:shadow-glow-amethyst group">
              <div className="text-center text-white space-y-6">
                <div className="w-20 h-20 bg-gradient-amethyst rounded-2xl flex items-center justify-center mx-auto shadow-glow-amethyst group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-poker-platinum bg-clip-text text-transparent">
                  Рейтинговая система ELO
                </h3>
                <p className="text-gray-200 text-lg leading-relaxed">
                  Отслеживайте свой прогресс с профессиональной системой рейтинга
                </p>
                <Badge className="bg-gradient-gold text-primary px-4 py-2 text-sm font-bold rounded-full shadow-glow-gold">
                  Уникальная особенность
                </Badge>
              </div>
            </Card>

            <div className="grid gap-6">
              {/* Enhanced Feature Cards */}
              <Card className="p-6 bg-gradient-glass backdrop-blur-xl border border-white/20 hover:border-poker-sapphire/50 transition-all duration-300 group hover:shadow-glow-emerald">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-gradient-sapphire rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-float">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg">Профессиональное сообщество</h3>
                    <p className="text-gray-300 font-medium">Играйте с опытными игроками</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-glass backdrop-blur-xl border border-white/20 hover:border-poker-emerald/50 transition-all duration-300 group hover:shadow-glow-emerald">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-gradient-emerald rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-float">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg">Регулярные турниры</h3>
                    <p className="text-gray-300 font-medium">Еженедельные события для всех уровней</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-glass backdrop-blur-xl border border-white/20 hover:border-poker-crimson/50 transition-all duration-300 group hover:shadow-glow-emerald">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-gradient-crimson rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-float">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg">Система достижений</h3>
                    <p className="text-gray-300 font-medium">Получайте награды за прогресс</p>
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