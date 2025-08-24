import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, Play, Phone, Diamond, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import pokerLogo from "/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png";
import { useCMSContent } from "@/hooks/useCMSContent";

export function Hero() {
  const { getContent, loading } = useCMSContent('home');

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-background via-card to-background/90 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_60%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.08),transparent_50%)]"></div>
      
      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-20 left-10 text-4xl text-primary/30">♠</div>
        <div className="absolute bottom-20 right-10 text-3xl text-primary/25">♣</div>
        <div className="absolute top-1/2 left-1/4 text-2xl text-accent/20">♥</div>
        <div className="absolute top-1/3 right-1/4 text-2xl text-accent/20">♦</div>
      </div>

      <div className="container mx-auto px-4 relative z-10 min-h-screen flex items-center">
        {/* Center content */}
        <div className="w-full text-center py-16 lg:py-20">
          {/* Premium badge */}
          <div className="flex justify-center mb-8">
            <Badge className="bg-primary/15 border border-primary/30 text-primary font-semibold px-6 py-3 rounded-full shadow-lg animate-fade-in">
              ✨ Премиум-сервис для VIP клиентов
            </Badge>
          </div>

          {/* Main heading */}
          <div className="space-y-6 mb-12">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block text-foreground">Выездной</span>
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">покер</span>
              <span className="block text-muted-foreground text-2xl sm:text-3xl lg:text-4xl font-normal mt-2">премиум-класса</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              Организация корпоративных покерных турниров с профессиональными дилерами и премиум оборудованием
            </p>
          </div>

          {/* Service cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {/* Main CTA card */}
            <Card className="lg:col-span-1 p-6 bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Заказать мероприятие</h3>
                <p className="text-sm opacity-90">Бесплатная консультация и расчет стоимости за 15 минут</p>
                <Button 
                  variant="secondary" 
                  className="w-full bg-white text-primary hover:bg-white/90"
                >
                  Получить расчет <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs opacity-75">
                  <CheckCircle className="w-4 h-4" />
                  Гарантия качества
                </div>
              </div>
            </Card>

            {/* Premium equipment */}
            <Card className="p-6 bg-card hover:bg-accent/5 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mx-auto">
                  <Diamond className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold">Премиум оборудование</h3>
                <p className="text-sm text-muted-foreground">Профессиональные столы казино-класса от ведущих производителей</p>
              </div>
            </Card>

            {/* Portfolio */}
            <Card className="p-6 bg-card hover:bg-accent/5 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-secondary/80 rounded-xl flex items-center justify-center mx-auto">
                  <Trophy className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Портфолио работ</h3>
                <p className="text-sm text-muted-foreground">Более 200 успешно проведенных мероприятий премиум-класса</p>
              </div>
            </Card>

            {/* Calculator */}
            <Card className="p-6 bg-card hover:bg-accent/5 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Калькулятор стоимости</h3>
                <p className="text-sm text-muted-foreground">Рассчитайте точную стоимость мероприятия онлайн</p>
              </div>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 max-w-lg mx-auto">
            <Link to="/tournaments" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
                <Play className="w-5 h-5 mr-3" />
                Начать играть
              </Button>
            </Link>
            <Link to="/rating" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-2 border-primary/30 hover:bg-primary/10 font-semibold px-8 py-4 text-lg rounded-xl hover:scale-105 transition-all duration-300">
                Рейтинг игроков
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div className="text-center p-4 bg-card/50 rounded-xl border border-border/50 hover:bg-accent/5 transition-all duration-300">
              <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">⭐ 4.9</div>
              <div className="text-xs text-muted-foreground">Рейтинг</div>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-xl border border-border/50 hover:bg-accent/5 transition-all duration-300">
              <div className="text-2xl sm:text-3xl font-bold text-secondary mb-1">🏆 200+</div>
              <div className="text-xs text-muted-foreground">Событий</div>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-xl border border-border/50 hover:bg-accent/5 transition-all duration-300">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">⚡ 15+</div>
              <div className="text-xs text-muted-foreground">Лет опыта</div>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-xl border border-border/50 hover:bg-accent/5 transition-all duration-300">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">👥 2000+</div>
              <div className="text-xs text-muted-foreground">Клиентов</div>
            </div>
          </div>

          {/* Special offer badge */}
          <div className="mt-12 flex justify-center">
            <Badge className="bg-accent/15 border border-accent/30 text-accent font-semibold px-6 py-2 rounded-full shadow-lg animate-pulse">
              Скидка 15% при заказе до конца месяца
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}