import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Diamond, Trophy, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useCMSContent } from "@/hooks/useCMSContent";

export function Hero() {
  const {
    getContent,
    loading
  } = useCMSContent('home');

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center space-y-16 py-20">
          {/* Badge */}
          <div className="flex justify-center animate-fade-in">
            <Badge className="bg-purple-100 border border-purple-200 text-purple-700 font-semibold px-6 py-3 rounded-full shadow-sm">
              ⭐ {getContent('hero_badge', 'Премиум-сервис для VIP клиентов')} 💎
            </Badge>
          </div>
          
          {/* Main Title */}
          <div className="space-y-6 animate-slide-up [animation-delay:0.2s]">
            <h1 className="text-5xl md:text-7xl font-bold text-center">
              <span className="text-gray-600">Выездной</span>
              <br />
              <span className="text-purple-600">покер</span>
              <br />
              <span className="text-gray-500 text-3xl md:text-4xl font-normal">премиум-класса</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {getContent('hero_description', 'Организация корпоративных покерных турниров с профессиональными дилерами и премиум оборудованием')}
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto animate-slide-up [animation-delay:0.4s]">
            {/* Call to Action Card */}
            <Card className="p-8 bg-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Заказать мероприятие</h3>
                  <p className="text-purple-100 text-sm mb-6">
                    Бесплатная консультация и расчет стоимости за 15 минут
                  </p>
                  <Link to="/tournaments">
                    <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold">
                      Получить расчет →
                    </Button>
                  </Link>
                  <p className="text-xs text-purple-200 mt-3 flex items-center justify-center gap-2">
                    🛡️ Гарантия качества
                  </p>
                </div>
              </div>
            </Card>

            {/* Premium Equipment */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Diamond className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Премиум оборудование</h3>
                  <p className="text-sm text-gray-600">
                    Профессиональные столы казино-класса от ведущих производителей
                  </p>
                </div>
              </div>
            </Card>

            {/* Portfolio */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Портфолио работ</h3>
                  <p className="text-sm text-gray-600">
                    Более 200 успешно проведенных мероприятий премиум-класса
                  </p>
                </div>
              </div>
            </Card>

            {/* Calculator */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 relative">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Калькулятор стоимости</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Рассчитайте точную стоимость мероприятия онлайн
                  </p>
                </div>
              </div>
              
              {/* Discount Badge */}
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Скидка 15%
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  При заказе до конца месяца получите скидку на все услуги
                </p>
              </div>
            </Card>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-8 max-w-4xl mx-auto pt-16 animate-slide-up [animation-delay:0.6s]">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">⭐ 4,9</div>
              <div className="text-sm text-gray-600">Средний рейтинг</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500 mb-2">💰 200+</div>
              <div className="text-sm text-gray-600">Проведено мероприятий</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">💎 15+</div>
              <div className="text-sm text-gray-600">Лет опыта</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-500 mb-2">👥 2000+</div>
              <div className="text-sm text-gray-600">Довольных клиентов</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}