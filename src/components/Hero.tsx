import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-4xl text-poker-gold">♠</div>
        <div className="absolute top-40 right-20 text-3xl text-poker-silver">♥</div>
        <div className="absolute bottom-40 left-20 text-4xl text-poker-gold">♦</div>
        <div className="absolute bottom-20 right-10 text-3xl text-poker-silver">♣</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-white space-y-8">
            <div className="space-y-6">
              <Badge className="bg-poker-gold/10 border border-poker-gold/30 text-poker-gold font-medium px-4 py-2">
                Элитный покерный клуб
              </Badge>
              
              <h1 className="text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-white">IPS</span>
                <span className="block text-poker-gold text-4xl lg:text-5xl mt-2 font-semibold">
                  International
                </span>
                <span className="block text-3xl lg:text-4xl font-light text-gray-300 tracking-wide">
                  Poker Style
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 max-w-lg leading-relaxed">
                Профессиональный покерный клуб с рейтинговой системой ELO. 
                Развивайте навыки в элегантной атмосфере среди равных по уровню игроков.
              </p>

              {/* Key Benefits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 text-sm">
                  <Shield className="w-4 h-4 text-poker-gold" />
                  <span>Честная игра</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <TrendingUp className="w-4 h-4 text-poker-gold" />
                  <span>Рост навыков</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Award className="w-4 h-4 text-poker-gold" />
                  <span>Рейтинг ELO</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Users className="w-4 h-4 text-poker-gold" />
                  <span>Сообщество</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-poker-gold text-poker-charcoal hover:bg-poker-gold/90 transition-all duration-300 font-semibold px-8 py-3">
                <Play className="w-5 h-5 mr-2" />
                Начать играть
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white hover:text-poker-charcoal transition-all duration-300 font-medium px-8 py-3">
                Рейтинг игроков
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-3xl font-bold text-poker-gold mb-1">500+</div>
                <div className="text-sm text-gray-300">Игроков</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-3xl font-bold text-poker-gold mb-1">150+</div>
                <div className="text-sm text-gray-300">Турниров</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-3xl font-bold text-poker-gold mb-1">4.9</div>
                <div className="text-sm text-gray-300">Рейтинг</div>
              </div>
            </div>
          </div>

          {/* Right Column - Cards */}
          <div className="space-y-6">
            {/* Main Feature Card */}
            <Card className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-poker-gold/30 transition-all duration-300">
              <div className="text-center text-white space-y-4">
                <div className="w-16 h-16 bg-poker-gold/20 rounded-lg flex items-center justify-center mx-auto">
                  <Trophy className="w-8 h-8 text-poker-gold" />
                </div>
                <h3 className="text-2xl font-semibold">Рейтинговая система ELO</h3>
                <p className="text-gray-300">Профессиональная система оценки навыков покерных игроков</p>
                <Badge className="bg-poker-gold/20 text-poker-gold border border-poker-gold/30">
                  Главная особенность
                </Badge>
              </div>
            </Card>

            <div className="grid gap-4">
              <Card className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-charcoal rounded-lg group-hover:bg-poker-accent transition-colors">
                    <Users className="w-6 h-6 text-poker-gold" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Элитное сообщество</h3>
                    <p className="text-sm text-gray-300">Игра с опытными покеристами</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-charcoal rounded-lg group-hover:bg-poker-accent transition-colors">
                    <Calendar className="w-6 h-6 text-poker-gold" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Регулярные турниры</h3>
                    <p className="text-sm text-gray-300">Еженедельные соревнования</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-charcoal rounded-lg group-hover:bg-poker-accent transition-colors">
                    <Star className="w-6 h-6 text-poker-gold" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Награды и достижения</h3>
                    <p className="text-sm text-gray-300">Система признания успехов</p>
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