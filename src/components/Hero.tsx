import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, Calendar, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-hero flex items-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-6xl">♠</div>
        <div className="absolute top-40 right-20 text-4xl">♥</div>
        <div className="absolute bottom-40 left-20 text-5xl">♦</div>
        <div className="absolute bottom-20 right-10 text-4xl">♣</div>
        <div className="absolute top-60 left-1/2 text-3xl">♠</div>
        <div className="absolute bottom-60 right-1/3 text-5xl">♥</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-white space-y-6">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                IPS
                <span className="block text-poker-gold">International</span>
                <span className="block text-3xl lg:text-4xl font-normal">Poker Style</span>
              </h1>
              <p className="text-xl text-gray-200 max-w-lg">
                Элитный покерный клуб с рейтинговой системой. Участвуйте в турнирах, 
                повышайте свой рейтинг и станьте частью профессионального покерного сообщества.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-poker-gold text-primary hover:bg-poker-gold/90">
                Присоединиться к клубу
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                Посмотреть турниры
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-poker-gold">500+</div>
                <div className="text-sm text-gray-300">Активных игроков</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-poker-gold">150+</div>
                <div className="text-sm text-gray-300">Проведено турниров</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-poker-gold">24/7</div>
                <div className="text-sm text-gray-300">Работаем для вас</div>
              </div>
            </div>
          </div>

          {/* Right Column - Cards */}
          <div className="space-y-6">
            <div className="grid gap-4">
              {/* Feature Cards */}
              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-gold rounded-lg">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Турнирная система</h3>
                    <p className="text-sm text-gray-300">Участвуйте в регулярных турнирах и повышайте рейтинг</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-blue rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Рейтинговая система</h3>
                    <p className="text-sm text-gray-300">Отслеживайте свой прогресс и статистику игр</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-green rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Живые турниры</h3>
                    <p className="text-sm text-gray-300">Играйте вживую за профессиональными столами</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-poker-red rounded-lg">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-semibold">Профессиональный уровень</h3>
                    <p className="text-sm text-gray-300">Игра на высоком уровне с опытными игроками</p>
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