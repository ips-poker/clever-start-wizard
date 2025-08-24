import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";
import { Link } from "react-router-dom";
import luxuryPokerHero from "@/assets/luxury-poker-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";
import pokerLogo from "/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png";
import { useCMSContent } from "@/hooks/useCMSContent";
export function Hero() {
  const {
    getContent,
    loading
  } = useCMSContent('home');
  return <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Modern Light Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-white to-blue-50/20"></div>
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.15)_1px,_transparent_0)] bg-[length:24px_24px]"></div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Hero Content */}
        <div className="text-center pt-20 pb-16 space-y-8">
          <div className="flex justify-center mb-6">
            <Badge className="bg-purple-100 border border-purple-200 text-purple-700 font-semibold px-6 py-3 rounded-full animate-fade-in">
              ⭐ {getContent('hero_badge', 'Премиум-сервис для VIP клиентов')}
            </Badge>
          </div>
              
          {/* Main Title */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight">
              <span className="block">Выездное</span>
              <span className="block text-purple-600">казино</span>
              <span className="block text-slate-600 text-2xl md:text-3xl lg:text-4xl font-medium mt-2">премиум-класса</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {getContent('hero_description', 'Организация корпоративных покерных турниров с профессиональными дилерами и премиум оборудованием')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Link to="/tournaments" className="flex-1">
              <Button size="lg" className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
                {getContent('cta_primary', 'Получить расчет')} →
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Trophy className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900">{getContent('feature_1_title', 'Заказать мероприятие')}</h3>
              <p className="text-sm text-slate-600">{getContent('feature_1_desc', 'Бесплатная консультация и расчет стоимости за 15 минут')}</p>
              <Badge className="bg-purple-50 text-purple-700 px-3 py-1 text-xs">Гарантия качества</Badge>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Award className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-bold text-slate-900">{getContent('feature_2_title', 'Премиум оборудование')}</h3>
              <p className="text-sm text-slate-600">{getContent('feature_2_desc', 'Профессиональные столы казино-класса от ведущих производителей')}</p>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900">{getContent('feature_3_title', 'Портфолио работ')}</h3>
              <p className="text-sm text-slate-600">{getContent('feature_3_desc', 'Более 200 успешно проведенных мероприятий премиум-класса')}</p>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-purple-300 transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900">{getContent('feature_4_title', 'Калькулятор стоимости')}</h3>
              <p className="text-sm text-slate-600">{getContent('feature_4_desc', 'Рассчитайте точную стоимость мероприятия онлайн')}</p>
            </div>
          </Card>
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">⭐ 4,9</div>
            <div className="text-sm text-slate-600 font-medium">Рейтинг качества</div>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
            <div className="text-3xl font-bold text-orange-500 mb-2">🏆 200+</div>
            <div className="text-sm text-slate-600 font-medium">Успешных событий</div>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">🎯 15+</div>
            <div className="text-sm text-slate-600 font-medium">Лет опыта</div>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
            <div className="text-3xl font-bold text-blue-500 mb-2">👥 2000+</div>
            <div className="text-sm text-slate-600 font-medium">Довольных клиентов</div>
          </div>
        </div>
      </div>
    </section>;
}