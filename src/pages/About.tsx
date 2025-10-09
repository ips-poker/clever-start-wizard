import React, { useState, useEffect } from "react";
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

export default function About() {
  const { content: cmsContent, loading: cmsLoading, getContent } = useCMSContent('about');

  // Fallback data если нет в CMS
  const getAchievements = () => [
    { 
      icon: Trophy, 
      title: getContent('achievement_1_title', '500+ турниров'), 
      desc: getContent('achievement_1_desc', 'Проведено за 3 года работы') 
    },
    { 
      icon: Users, 
      title: getContent('achievement_2_title', '1000+ игроков'), 
      desc: getContent('achievement_2_desc', 'Доверяют нашей системе') 
    },
    { 
      icon: Star, 
      title: getContent('achievement_3_title', '4.9/5'), 
      desc: getContent('achievement_3_desc', 'Средняя оценка игроков') 
    },
    { 
      icon: Shield, 
      title: getContent('achievement_4_title', '100%'), 
      desc: getContent('achievement_4_desc', 'Безопасность данных') 
    }
  ];

  const getValues = () => [
    {
      icon: Target,
      title: getContent('value_1_title', 'Честность'),
      desc: getContent('value_1_desc', 'Прозрачная рейтинговая система и честная игра - основа нашей философии.')
    },
    {
      icon: Heart,
      title: getContent('value_2_title', 'Сообщество'),
      desc: getContent('value_2_desc', 'Мы создаем дружелюбную атмосферу, где каждый игрок чувствует себя как дома.')
    },
    {
      icon: Zap,
      title: getContent('value_3_title', 'Инновации'),
      desc: getContent('value_3_desc', 'Постоянно развиваем технологии для улучшения игрового опыта.')
    },
    {
      icon: Globe,
      title: getContent('value_4_title', 'Международный уровень'),
      desc: getContent('value_4_desc', 'Соответствуем мировым стандартам проведения покерных турниров.')
    }
  ];

  const getTeam = () => [
    {
      name: getContent('team_1_name', 'Александр Петров'),
      role: getContent('team_1_role', 'Основатель и Турнирный Директор'),
      experience: getContent('team_1_experience', '15+ лет в покере'),
      image: getContent('team_1_image', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face'),
      achievements: getContent('team_1_achievements', 'WSOP Circuit Ring, EPT Final Table, Международный судья').split(', ')
    },
    {
      name: getContent('team_2_name', 'Елена Соколова'),
      role: getContent('team_2_role', 'Технический Директор'),
      experience: getContent('team_2_experience', '10+ лет в IT'),
      image: getContent('team_2_image', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face'),
      achievements: getContent('team_2_achievements', 'Разработка ELO системы, IT сертификации, Автоматизация турниров').split(', ')
    },
    {
      name: getContent('team_3_name', 'Дмитрий Волков'),
      role: getContent('team_3_role', 'Главный дилер'),
      experience: getContent('team_3_experience', '12+ лет опыта'),
      image: getContent('team_3_image', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face'),
      achievements: getContent('team_3_achievements', 'Сертификат FIDPA, Обучение новых дилеров, 3000+ турниров').split(', ')
    }
  ];

  const achievements = getAchievements();
  const values = getValues();
  const team = getTeam();

  if (cmsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex items-center justify-center py-20 pt-24 md:pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="pt-24 md:pt-20">
        {/* Hero Section */}
        <section className="py-12 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 text-amber-400/40 text-5xl animate-pulse">♠</div>
            <div className="absolute top-20 right-20 text-amber-400/30 text-4xl animate-bounce-subtle">♣</div>
            <div className="absolute bottom-10 left-20 text-amber-400/35 text-6xl animate-pulse">♥</div>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline" className="border-amber-400/50 text-amber-400">
                    {getContent('hero_badge', 'О компании')}
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-5xl font-light mb-6 text-white tracking-wide">
                  {getContent('hero_title', 'International Poker Style')}
                </h1>
                <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mb-6"></div>
                <p className="text-lg md:text-xl text-white/70 leading-relaxed mb-8 font-light">
                  {getContent('hero_description', 'Мы создали уникальное пространство для любителей покера, где каждый может развивать свои навыки, участвовать в честных турнирах и расти в профессиональной рейтинговой системе.')}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300">
                    <Users className="w-5 h-5 mr-2" />
                    Присоединиться
                  </Button>
                  <Button size="lg" className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl transition-all duration-300">
                    <Trophy className="w-5 h-5 mr-2" />
                    Наши турниры
                  </Button>
                </div>
              </div>
              <div className="relative">
                <img 
                  src={getContent('hero_image', 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=600&h=600&fit=crop')}
                  alt="IPS Poker Club"
                  className="rounded-2xl shadow-floating w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/20 to-transparent rounded-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-4 gap-6">
              {achievements.map((achievement, index) => {
                const IconComponent = achievement.icon;
                return (
                  <div key={`achievement-${index}-${achievement.title}`} className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-xl hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02]">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-light text-amber-400 mb-2">{achievement.title}</h3>
                    <p className="text-white/60 font-light">{achievement.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 text-amber-400/40 text-5xl animate-pulse">♠</div>
            <div className="absolute bottom-20 right-20 text-amber-400/30 text-4xl animate-bounce-subtle">♥</div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                  {getContent('story_badge', 'Наша история')}
                </Badge>
                <h2 className="text-4xl font-light mb-6 text-white tracking-wide">
                  {getContent('story_title', 'Как всё начиналось')}
                </h2>
                <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mb-6"></div>
                <div className="space-y-6 text-lg text-white/70 leading-relaxed font-light">
                  <p>
                    {getContent('story_paragraph1', 'В 2021 году группа энтузиастов покера решила создать нечто большее, чем просто игровой клуб. Мы хотели построить настоящее сообщество, где каждый игрок мог бы отслеживать свой прогресс и развиваться в профессиональной среде.')}
                  </p>
                  <p>
                    {getContent('story_paragraph2', 'Основой нашего подхода стала справедливая рейтинговая система RPS, адаптированная специально для покера. Это позволило создать объективную оценку навыков каждого игрока и мотивировать к постоянному развитию.')}
                  </p>
                  <p>
                    {getContent('story_paragraph3', 'Сегодня IPS - это не просто покерный клуб, а целая экосистема для развития покерных навыков, включающая регулярные турниры, обучающие программы и дружелюбное сообщество игроков всех уровней.')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-light text-white">Лицензированная деятельность</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-light text-white">Международные стандарты</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img 
                  src={getContent('story_image', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop') + (getContent('story_image') !== 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop' ? `?v=${Date.now()}` : '')}
                  alt="Покерный турнир в IPS"
                  className="rounded-2xl shadow-2xl w-full border border-white/10"
                  key={getContent('story_image', 'default')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent rounded-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
                  {getContent('values_title', 'ВО ЧТО МЫ ВЕРИМ')}
                </h2>
              </div>
              <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
              <p className="text-xl text-white/70 max-w-3xl mx-auto font-light">
                {getContent('values_description', 'Наши принципы определяют каждое решение и создают уникальную атмосферу в IPS')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <div key={`value-${index}-${value.title}`} className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:shadow-2xl hover:shadow-amber-500/20 hover:scale-[1.02] transition-all duration-300">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-light text-white mb-3 tracking-wide">{value.title}</h3>
                    <p className="text-white/60 leading-relaxed font-light">{value.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 text-amber-400/40 text-5xl animate-pulse">♦</div>
            <div className="absolute bottom-10 left-10 text-amber-400/30 text-4xl animate-bounce-subtle">♣</div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
                  {getContent('team_title', 'ПОЗНАКОМЬТЕСЬ С КОМАНДОЙ')}
                </h2>
              </div>
              <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
              <p className="text-xl text-white/70 max-w-3xl mx-auto font-light">
                {getContent('team_description', 'Профессионалы своего дела, объединенные страстью к покеру и стремлением к совершенству')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <div key={`member-${index}-${member.name}`} className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-2 transition-all duration-500">
                  <div className="relative">
                    <img 
                      src={member.image}
                      alt={member.name}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 backdrop-blur-xl">
                        {member.experience}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-light text-white mb-2 tracking-wide">{member.name}</h3>
                    <p className="text-amber-400 font-light mb-4">{member.role}</p>
                    <div className="space-y-2">
                      {member.achievements.map((achievement, achIndex) => (
                        <div key={achIndex} className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-white/60 font-light">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 rounded-3xl p-12 border border-amber-500/20 backdrop-blur-xl shadow-2xl">
                <h2 className="text-4xl font-light mb-6 text-white tracking-wide">
                  Готовы стать частью IPS?
                </h2>
                <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
                <p className="text-xl text-white/70 mb-8 leading-relaxed font-light">
                  Присоединяйтесь к нашему сообществу и начните свой путь к покерному мастерству уже сегодня
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300">
                    <Users className="w-5 h-5 mr-2" />
                    Стать игроком
                  </Button>
                  <Button size="lg" className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl transition-all duration-300">
                    Связаться с нами
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}