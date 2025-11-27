import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCMSContent } from "@/hooks/useCMSContent";
import { 
  Trophy, 
  Users, 
  Star, 
  Shield, 
  Target, 
  Award,
  Heart,
  Zap,
  Globe,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function About() {
  const { content: cmsContent, loading: cmsLoading, getContent } = useCMSContent('about');
  const baseTextureRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (baseTextureRef.current) {
        baseTextureRef.current.style.transform = `translateY(${currentScrollY * 0.15}px)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform = `translateY(${currentScrollY * 0.25}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getAchievements = () => [
    { 
      icon: Trophy, 
      title: getContent('achievement_1_title', '500+'), 
      desc: getContent('achievement_1_desc', 'ТУРНИРОВ ПРОВЕДЕНО') 
    },
    { 
      icon: Users, 
      title: getContent('achievement_2_title', '1000+'), 
      desc: getContent('achievement_2_desc', 'АКТИВНЫХ ИГРОКОВ') 
    },
    { 
      icon: Star, 
      title: getContent('achievement_3_title', '4.9/5'), 
      desc: getContent('achievement_3_desc', 'СРЕДНЯЯ ОЦЕНКА') 
    },
    { 
      icon: Shield, 
      title: getContent('achievement_4_title', '100%'), 
      desc: getContent('achievement_4_desc', 'БЕЗОПАСНОСТЬ ДАННЫХ') 
    }
  ];

  const getValues = () => [
    {
      icon: Target,
      title: getContent('value_1_title', 'ЧЕСТНОСТЬ'),
      desc: getContent('value_1_desc', 'Прозрачная рейтинговая система и честная игра - основа нашей философии.')
    },
    {
      icon: Heart,
      title: getContent('value_2_title', 'СООБЩЕСТВО'),
      desc: getContent('value_2_desc', 'Мы создаем дружелюбную атмосферу, где каждый игрок чувствует себя как дома.')
    },
    {
      icon: Zap,
      title: getContent('value_3_title', 'ИННОВАЦИИ'),
      desc: getContent('value_3_desc', 'Постоянно развиваем технологии для улучшения игрового опыта.')
    },
    {
      icon: Globe,
      title: getContent('value_4_title', 'МЕЖДУНАРОДНЫЙ УРОВЕНЬ'),
      desc: getContent('value_4_desc', 'Соответствуем мировым стандартам проведения покерных турниров.')
    }
  ];

  const achievements = getAchievements();
  const values = getValues();

  if (cmsLoading) {
    return (
      <>
        <ScrollProgress />
        <div className="min-h-screen bg-background relative">
          <div className="fixed inset-0 industrial-texture opacity-50" />
          <Header />
          <div className="flex items-center justify-center py-20 pt-24 md:pt-20 relative z-20">
            <div className="w-12 h-12 border-2 border-syndikate-orange border-t-transparent rounded-full animate-spin" />
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <ScrollProgress />
      <FloatingParticles />
      <div className="min-h-screen bg-background relative">
        {/* Industrial metal base texture */}
        <div 
          ref={baseTextureRef}
          className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0 transition-transform duration-0 will-change-transform" 
        />

        {/* Metal grid overlay */}
        <div
          ref={gridRef}
          className="fixed inset-0 pointer-events-none opacity-20 z-0 transition-transform duration-0 will-change-transform"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Neon glows */}
        <div className="fixed top-0 left-1/4 w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse" />
        <div className="fixed bottom-0 right-1/4 w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse" />

        {/* Side rails */}
        <div className="fixed inset-y-0 left-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed inset-y-0 right-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-syndikate-orange/80 to-transparent pointer-events-none z-10" />

        <Header />
        
        <main className="pt-24 md:pt-20 pb-16 relative z-20">
          {/* Hero Section */}
          <section className="py-12 md:py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 relative">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                      <Shield className="h-6 w-6 text-background" />
                    </div>
                    <Badge className="brutal-metal brutal-border text-syndikate-orange font-bold uppercase tracking-wider">
                      {getContent('hero_badge', 'О КОМПАНИИ')}
                    </Badge>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-wider uppercase">
                    {getContent('hero_title', 'EVENT POKER CLUB')}
                  </h1>
                  <div className="h-[2px] w-20 bg-syndikate-orange mb-6"></div>
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 font-mono uppercase tracking-wide">
                    {getContent('hero_description', 'УНИКАЛЬНОЕ ПРОСТРАНСТВО ДЛЯ ЛЮБИТЕЛЕЙ ПОКЕРА. ЧЕСТНЫЕ ТУРНИРЫ И ПРОФЕССИОНАЛЬНАЯ РЕЙТИНГОВАЯ СИСТЕМА.')}
                  </p>
                </div>
                <div className="relative">
                  <div className="brutal-metal brutal-border p-4">
                    <img 
                      src={getContent('hero_image', 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&h=600&fit=crop')}
                      alt="EPC Poker Club"
                      className="w-full"
                    />
                  </div>
                  {/* Corner Brackets */}
                  <div className="absolute -top-2 -left-2 w-12 h-12 border-l-4 border-t-4 border-syndikate-orange" />
                  <div className="absolute -top-2 -right-2 w-12 h-12 border-r-4 border-t-4 border-syndikate-orange" />
                  <div className="absolute -bottom-2 -left-2 w-12 h-12 border-l-4 border-b-4 border-syndikate-orange" />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 border-r-4 border-b-4 border-syndikate-orange" />
                </div>
              </div>
            </div>
          </section>

          {/* Achievements */}
          <section className="py-16 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
              <div className="grid md:grid-cols-4 gap-6">
                {achievements.map((achievement, index) => {
                  const IconComponent = achievement.icon;
                  return (
                    <div key={`achievement-${index}-${achievement.title}`} className="brutal-metal brutal-border p-8 text-center transition-all duration-300 hover:shadow-neon-orange relative overflow-hidden group">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="w-16 h-16 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="w-8 h-8 text-background" />
                      </div>
                      <h3 className="text-2xl font-bold text-syndikate-orange mb-2">{achievement.title}</h3>
                      <p className="text-muted-foreground font-mono uppercase tracking-wider text-sm">{achievement.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Our Story */}
          <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <Badge className="mb-4 brutal-metal brutal-border text-syndikate-orange font-bold uppercase tracking-wider">
                    {getContent('story_badge', 'НАША ИСТОРИЯ')}
                  </Badge>
                  <h2 className="text-4xl font-bold mb-6 text-foreground tracking-wider uppercase">
                    {getContent('story_title', 'КАК ВСЁ НАЧИНАЛОСЬ')}
                  </h2>
                  <div className="h-[2px] w-20 bg-syndikate-orange mb-6"></div>
                  <div className="space-y-6 text-lg text-muted-foreground leading-relaxed font-mono uppercase tracking-wide">
                    <p>
                      {getContent('story_paragraph1', 'В 2021 ГОДУ ГРУППА ЭНТУЗИАСТОВ ПОКЕРА РЕШИЛА СОЗДАТЬ НЕЧТО БОЛЬШЕЕ, ЧЕМ ПРОСТО ИГРОВОЙ КЛУБ.')}
                    </p>
                    <p>
                      {getContent('story_paragraph2', 'ОСНОВОЙ НАШЕГО ПОДХОДА СТАЛА СПРАВЕДЛИВАЯ РЕЙТИНГОВАЯ СИСТЕМА RPS, АДАПТИРОВАННАЯ СПЕЦИАЛЬНО ДЛЯ ПОКЕРА.')}
                    </p>
                    <p>
                      {getContent('story_paragraph3', 'СЕГОДНЯ EPC - ЭТО НЕ ПРОСТО ПОКЕРНЫЙ КЛУБ, А ЦЕЛАЯ ЭКОСИСТЕМА ДЛЯ РАЗВИТИЯ ПОКЕРНЫХ НАВЫКОВ.')}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className="brutal-metal brutal-border p-4">
                    <img 
                      src={getContent('story_image', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop')}
                      alt="Покерный турнир в EPC"
                      className="w-full"
                    />
                  </div>
                  {/* Corner Brackets */}
                  <div className="absolute -top-2 -left-2 w-12 h-12 border-l-4 border-t-4 border-syndikate-orange" />
                  <div className="absolute -top-2 -right-2 w-12 h-12 border-r-4 border-t-4 border-syndikate-orange" />
                  <div className="absolute -bottom-2 -left-2 w-12 h-12 border-l-4 border-b-4 border-syndikate-orange" />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 border-r-4 border-b-4 border-syndikate-orange" />
                </div>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                    <Heart className="h-6 w-6 text-background" />
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-bold text-foreground tracking-wider uppercase">
                    {getContent('values_title', 'ВО ЧТО МЫ ВЕРИМ')}
                  </h2>
                </div>
                <div className="h-[2px] w-20 bg-syndikate-orange mx-auto mb-6"></div>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-mono uppercase tracking-wider">
                  {getContent('values_description', 'НАШИ ПРИНЦИПЫ ОПРЕДЕЛЯЮТ КАЖДОЕ РЕШЕНИЕ')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value, index) => {
                  const IconComponent = value.icon;
                  return (
                    <div key={`value-${index}-${value.title}`} className="brutal-metal brutal-border p-6 transition-all duration-300 hover:shadow-neon-orange relative overflow-hidden group">
                      {/* Corner Brackets */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-background" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3 tracking-wider uppercase">{value.title}</h3>
                      <p className="text-muted-foreground leading-relaxed font-mono uppercase tracking-wide text-sm">{value.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                    <Users className="h-6 w-6 text-background" />
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-bold text-foreground tracking-wider uppercase">
                    {getContent('team_title', 'НАША КОМАНДА')}
                  </h2>
                </div>
                <div className="h-[2px] w-20 bg-syndikate-orange mx-auto mb-6"></div>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-mono uppercase tracking-wider">
                  {getContent('team_description', 'ПРОФЕССИОНАЛЫ С МНОГОЛЕТНИМ ОПЫТОМ')}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map((num) => (
                  <div key={`team-${num}`} className="brutal-metal brutal-border p-6 transition-all duration-300 hover:shadow-neon-orange relative overflow-hidden group">
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative mb-6">
                      <div className="brutal-border overflow-hidden">
                        <img 
                          src={getContent(`team_${num}_image`, `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face`)}
                          alt={getContent(`team_${num}_name`, 'Член команды')}
                          className="w-full aspect-square object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-syndikate-orange brutal-border flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-background" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-foreground tracking-wider uppercase">
                        {getContent(`team_${num}_name`, 'ИМЯ ФАМИЛИЯ')}
                      </h3>
                      <Badge className="bg-syndikate-orange text-background font-mono uppercase tracking-wider">
                        {getContent(`team_${num}_role`, 'ДОЛЖНОСТЬ')}
                      </Badge>
                      <p className="text-sm text-muted-foreground font-mono uppercase tracking-wide">
                        {getContent(`team_${num}_experience`, '10+ ЛЕТ В ПОКЕРЕ')}
                      </p>
                      {getContent(`team_${num}_achievements`, '') && (
                        <div className="pt-4 border-t border-syndikate-orange/30">
                          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide leading-relaxed">
                            {getContent(`team_${num}_achievements`, '')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}