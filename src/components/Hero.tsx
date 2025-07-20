import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center overflow-hidden">
      {/* Advanced Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 text-6xl animate-pulse">♠</div>
        <div className="absolute top-40 right-20 text-4xl animate-pulse delay-1000">♥</div>
        <div className="absolute bottom-40 left-20 text-5xl animate-pulse delay-500">♦</div>
        <div className="absolute bottom-20 right-10 text-4xl animate-pulse delay-1500">♣</div>
        <div className="absolute top-60 left-1/2 text-3xl animate-pulse delay-700">♠</div>
        <div className="absolute bottom-60 right-1/3 text-5xl animate-pulse delay-300">♥</div>
      </div>

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-poker-gold/5 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-poker-royal/5 rounded-full blur-xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Enhanced Content */}
          <div className="text-white space-y-8">
            <div className="space-y-6">
              <Badge className="bg-gradient-gold text-primary font-semibold px-4 py-2">
                🏆 #1 Покерный клуб с рейтинговой системой
              </Badge>
              
              <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">IPS</span>
                <span className="block text-poker-gold text-4xl lg:text-5xl mt-2">International</span>
                <span className="block text-3xl lg:text-4xl font-normal text-gray-200">Poker Style</span>
              </h1>
              
              <p className="text-xl text-gray-200 max-w-lg leading-relaxed">
                Присоединяйтесь к элитному покерному сообществу с профессиональной 
                <span className="text-poker-gold font-semibold"> рейтинговой системой</span>. 
                Развивайте навыки, участвуйте в турнирах и достигайте новых высот!
              </p>

              {/* Key Benefits */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-poker-gold" />
                  <span>Честная игра</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-poker-gold" />
                  <span>Рост рейтинга</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-poker-gold" />
                  <span>Награды</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-poker-gold" />
                  <span>Сообщество</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-gold text-primary hover:shadow-gold font-semibold">
                <Play className="w-5 h-5 mr-2" />
                Начать играть бесплатно
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary font-semibold">
                Посмотреть рейтинг
              </Button>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold text-poker-gold">500+</div>
                <div className="text-sm text-gray-300">Активных игроков</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold text-poker-gold">150+</div>
                <div className="text-sm text-gray-300">Проведено турниров</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                <div className="text-3xl font-bold text-poker-gold">24/7</div>
                <div className="text-sm text-gray-300">Работаем для вас</div>
              </div>
            </div>
          </div>

          {/* Right Column - Enhanced Cards */}
          <div className="space-y-6">
            {/* Main Feature Card */}
            <Card className="p-8 bg-gradient-card backdrop-blur-md border-white/20 hover:bg-white/20 transition-all duration-300 shadow-glow">
              <div className="text-center text-white space-y-4">
                <div className="w-16 h-16 bg-gradient-royal rounded-full flex items-center justify-center mx-auto shadow-royal">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Рейтинговая система ELO</h3>
                <p className="text-gray-200">Отслеживайте свой прогресс с профессиональной системой рейтинга</p>
                <Badge className="bg-poker-gold text-primary">Уникальная особенность</Badge>
              </div>
            </Card>

            <div className="grid gap-4">
              {/* Feature Cards */}
              <Card className="p-6 bg-gradient-card backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-blue rounded-lg group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Профессиональное сообщество</h3>
                    <p className="text-sm text-gray-300">Играйте с опытными игроками</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-card backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-green rounded-lg group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Регулярные турниры</h3>
                    <p className="text-sm text-gray-300">Еженедельные события для всех уровней</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-card backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-red rounded-lg group-hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Система достижений</h3>
                    <p className="text-sm text-gray-300">Получайте награды за прогресс</p>
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