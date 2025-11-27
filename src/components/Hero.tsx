import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroSkeleton } from "@/components/ui/hero-skeleton";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useCMSContent } from "@/hooks/useCMSContent";
import { Trophy, Users, TrendingUp, ArrowRight } from "lucide-react";

export function Hero() {
  const { getContent, loading } = useCMSContent('home');

  if (loading) {
    return <HeroSkeleton />;
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background pt-20">
      {/* Industrial Background Texture */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Concrete Overlay with Cracks */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, transparent 0%, transparent 45%, rgba(255, 255, 255, 0.03) 50%, transparent 55%),
            radial-gradient(circle at 80% 70%, transparent 0%, transparent 45%, rgba(255, 255, 255, 0.03) 50%, transparent 55%),
            linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.01) 50%, transparent 100%)
          `
        }}
      />

      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Orange Light Spots */}
      <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-syndikate-orange/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-syndikate-red/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="container relative z-10 px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Brand Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-syndikate-metal brutal-border">
              <div className="w-2 h-2 bg-syndikate-orange rounded-full animate-neon-pulse" />
              <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Покерный клуб
              </span>
            </div>

            {/* Main Title */}
            <div className="space-y-4">
              <h1 className="font-display text-6xl md:text-7xl lg:text-8xl uppercase leading-none tracking-tight">
                <span className="block text-foreground">SYNDIKATE</span>
                <span className="block neon-orange animate-neon-pulse mt-2">POKER CLUB</span>
              </h1>
              
              {/* Slogan */}
              <div className="flex items-center gap-4">
                <div className="h-[2px] w-16 bg-gradient-neon" />
                <p className="font-display text-2xl md:text-3xl uppercase tracking-wider text-syndikate-orange">
                  Власть за столом
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              {getContent('hero_description', 
                "Здесь решаются судьбы. Турниры для тех, кто не боится рисковать и готов доказать своё превосходство. Присоединяйся к элите.")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link to="/tournaments">
                <Button 
                  size="lg" 
                  className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange hover:shadow-neon-orange transition-all group"
                >
                  Турниры
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/rating">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-syndikate-orange text-syndikate-orange hover:bg-syndikate-orange hover:text-background font-bold uppercase tracking-wider transition-all"
                >
                  Рейтинг RPS
                </Button>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
              <div className="space-y-1 group">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-syndikate-orange group-hover:scale-110 transition-transform" />
                  <span className="font-display text-3xl neon-orange">
                    <AnimatedCounter end={150} duration={2500} suffix="+" />
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Игроков</p>
              </div>
              <div className="space-y-1 group">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-syndikate-orange group-hover:scale-110 transition-transform" />
                  <span className="font-display text-3xl neon-orange">
                    <AnimatedCounter end={50} duration={2000} suffix="+" />
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Турниров</p>
              </div>
              <div className="space-y-1 group">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-syndikate-orange group-hover:scale-110 transition-transform" />
                  <span className="font-display text-3xl neon-orange">
                    <AnimatedCounter end={1000} duration={2200} suffix="+" />
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">RPS рейтинг</p>
              </div>
            </div>
          </div>

          {/* Right Column - Visual Element */}
          <div className="relative lg:block hidden">
            <div className="relative aspect-square">
              {/* Main Industrial Frame */}
              <div className="absolute inset-0 brutal-border bg-syndikate-metal/30 backdrop-blur-sm transform rotate-6">
                <div className="absolute inset-4 border-2 border-syndikate-orange/30" />
              </div>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-6 p-8">
                  {/* Large Icon/Symbol */}
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto border-4 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center">
                      <span className="font-display text-6xl neon-orange">S</span>
                    </div>
                    {/* Corner Decorations */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-syndikate-red" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-syndikate-red" />
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-syndikate-red" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-syndikate-red" />
                  </div>

                  {/* Industrial Labels */}
                  <div className="space-y-2">
                    <div className="inline-block px-4 py-2 bg-background brutal-border">
                      <span className="font-display text-2xl uppercase tracking-widest text-syndikate-orange">
                        Только сильные
                      </span>
                    </div>
                    <div className="inline-block px-4 py-2 bg-background brutal-border">
                      <span className="font-display text-xl uppercase tracking-widest text-foreground">
                        Выживают
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-syndikate-orange" />
              <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-syndikate-orange" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-syndikate-orange" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-syndikate-orange" />
            </div>
          </div>
        </div>

        {/* Bottom Warning Strip */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl">
          <div className="bg-syndikate-red/10 border-l-4 border-syndikate-red px-6 py-3 backdrop-blur-sm">
            <p className="text-sm uppercase tracking-wider text-center text-foreground">
              <span className="text-syndikate-red font-bold">Внимание:</span> Организационный взнос 1000₽ • 
              Возможны дополнительные наборы • 18+
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes neon-pulse {
          0%, 100% {
            text-shadow: 0 0 20px hsla(var(--syndikate-orange), 0.8),
                         0 0 40px hsla(var(--syndikate-orange), 0.4);
          }
          50% {
            text-shadow: 0 0 30px hsla(var(--syndikate-orange), 1),
                         0 0 60px hsla(var(--syndikate-orange), 0.6);
          }
        }
      `}</style>
    </section>
  );
}
