import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Star, TrendingUp, Shield, Award, Play } from "lucide-react";
import { Link } from "react-router-dom";
import luxuryPokerHero from "@/assets/luxury-poker-hero.jpg";
import pokerChipsBg from "@/assets/poker-chips-bg.jpg";
import pokerLogo from "/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png";
import { useCMSContent } from "@/hooks/useCMSContent";
import { HeroSkeleton } from "@/components/ui/hero-skeleton";

export function Hero() {
  const {
    getContent,
    loading
  } = useCMSContent('home');

  if (loading) {
    return <HeroSkeleton />;
  }
  
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-surface">
      {/* Clean background with subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background/80"></div>
      
      {/* Minimalist floating elements */}
      <div className="absolute inset-0 opacity-5 overflow-hidden motion-reduce:hidden">
        <div className="absolute top-20 left-10 text-6xl text-foreground">♠</div>
        <div className="absolute bottom-20 right-10 text-5xl text-foreground">♣</div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh] lg:min-h-screen py-16 lg:py-24">
          {/* Left Column - Content */}
          <div className="text-foreground space-y-12 animate-fade-in order-2 lg:order-1">
            <div className="space-y-8 animate-slide-up [animation-delay:0.2s]">
              <div className="flex justify-center lg:justify-start">
                <Badge className="bg-card border border-border/50 text-foreground font-medium px-6 py-3 rounded-xl shadow-subtle backdrop-blur-sm animate-scale-in [animation-delay:0.4s] tracking-wide uppercase text-xs">
                  {getContent('hero_badge', 'Премиальный покерный клуб')}
                </Badge>
              </div>
              
              {/* Logo and Title Section */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-0 lg:space-x-8 animate-slide-right [animation-delay:0.6s]">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary rounded-xl flex items-center justify-center shadow-card">
                    <img src={pokerLogo} alt="EPC Logo" className="w-10 h-10 lg:w-12 lg:h-12 object-contain filter brightness-0 invert" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-6xl xl:text-7xl font-light tracking-tight leading-[1.1] text-foreground">
                    <span className="block font-semibold">EPC</span>
                    <span className="block text-2xl lg:text-3xl xl:text-4xl font-light text-muted-foreground tracking-wider uppercase mt-2">
                      Event Poker Club
                    </span>
                  </h1>
                  
                  <p className="text-lg lg:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl">
                    {getContent('hero_description', 'Эксклюзивный покерный клуб в Москве с международными стандартами и уникальной рейтинговой системой.')}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up [animation-delay:0.8s]">
              <Link to="/tournaments">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-card hover:shadow-elevated transition-all duration-300 font-medium tracking-wide px-8 py-4 rounded-xl"
                >
                  <Trophy className="w-5 h-5 mr-3" />
                  Турниры
                </Button>
              </Link>
              <Link to="/rating">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all duration-300 font-medium tracking-wide px-8 py-4 rounded-xl"
                >
                  <TrendingUp className="w-5 h-5 mr-3" />
                  Рейтинг
                </Button>
              </Link>
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-8 pt-8 animate-slide-up [animation-delay:1s]">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-light text-foreground mb-2">500+</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Игроков</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-light text-foreground mb-2">100+</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Турниров</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-light text-foreground mb-2">5★</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Рейтинг</div>
              </div>
            </div>
          </div>

          {/* Right Column - Cards */}
          <div className="relative animate-fade-in [animation-delay:1.2s] order-1 lg:order-2">
            <div className="grid gap-6">
              {/* Main Card */}
              <Card className="p-8 bg-gradient-card border border-border/50 shadow-floating backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"></div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-medium tracking-wide">
                      Следующий турнир
                    </Badge>
                    <div className="text-sm text-muted-foreground font-medium">
                      Сегодня
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-2 tracking-tight">
                      Рейтинговый турнир
                    </h3>
                    <p className="text-muted-foreground font-light">
                      Бай-ин: 5,000₽ • Гарантия: 50,000₽
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">18:00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">24/50</span>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium"
                  >
                    Зарегистрироваться
                  </Button>
                </div>
              </Card>
              
              {/* Secondary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-card border border-border/50 shadow-card text-center">
                  <div className="mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">Лицензия</div>
                  <div className="text-xs text-muted-foreground font-light">Официальный клуб</div>
                </Card>
                
                <Card className="p-6 bg-card border border-border/50 shadow-card text-center">
                  <div className="mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">RPS</div>
                  <div className="text-xs text-muted-foreground font-light">Рейтинговая система</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}