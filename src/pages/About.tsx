import { useState, useEffect } from "react";
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
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-poker-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-surface relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/5 to-poker-primary/5"></div>
          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl">
                <Badge variant="outline" className="mb-6 border-poker-accent text-poker-accent">
                  {getContent('hero_badge', 'О компании')}
                </Badge>
                <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent">
                  {getContent('hero_title', 'International Poker Style')}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                  {getContent('hero_description', 'Мы создали уникальное пространство для любителей покера, где каждый может развивать свои навыки, участвовать в честных турнирах и расти в профессиональной рейтинговой системе.')}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-button hover:shadow-elevated">
                    <Users className="w-5 h-5 mr-2" />
                    Присоединиться
                  </Button>
                  <Button size="lg" variant="outline">
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
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-6">
              {achievements.map((achievement, index) => {
                const IconComponent = achievement.icon;
                return (
                  <Card key={`achievement-${index}-${achievement.title}`} className="text-center border border-border/50 hover:shadow-card transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-poker-accent/10 to-poker-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="w-8 h-8 text-poker-accent" />
                      </div>
                      <h3 className="text-2xl font-bold text-poker-primary mb-2">{achievement.title}</h3>
                      <p className="text-muted-foreground">{achievement.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 bg-gradient-surface">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent">
                  {getContent('story_badge', 'Наша история')}
                </Badge>
                <h2 className="text-4xl font-bold mb-6 text-poker-primary">
                  {getContent('story_title', 'Как всё начиналось')}
                </h2>
                <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                  <p>
                    {getContent('story_paragraph1', 'В 2021 году группа энтузиастов покера решила создать нечто большее, чем просто игровой клуб. Мы хотели построить настоящее сообщество, где каждый игрок мог бы отслеживать свой прогресс и развиваться в профессиональной среде.')}
                  </p>
                  <p>
                    {getContent('story_paragraph2', 'Основой нашего подхода стала справедливая рейтинговая система ELO, адаптированная специально для покера. Это позволило создать объективную оценку навыков каждого игрока и мотивировать к постоянному развитию.')}
                  </p>
                  <p>
                    {getContent('story_paragraph3', 'Сегодня IPS - это не просто покерный клуб, а целая экосистема для развития покерных навыков, включающая регулярные турниры, обучающие программы и дружелюбное сообщество игроков всех уровней.')}
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-8">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-poker-success" />
                    <span className="text-sm font-medium">Лицензированная деятельность</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-poker-success" />
                    <span className="text-sm font-medium">Международные стандарты</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img 
                  src={getContent('story_image', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop') + (getContent('story_image') !== 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop' ? `?v=${Date.now()}` : '')}
                  alt="Покерный турнир в IPS"
                  className="rounded-2xl shadow-floating w-full"
                  key={getContent('story_image', 'default')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/20 to-transparent rounded-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent">
                {getContent('values_badge', 'Наши ценности')}
              </Badge>
              <h2 className="text-4xl font-bold mb-6 text-poker-primary">
                {getContent('values_title', 'Во что мы верим')}
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {getContent('values_description', 'Наши принципы определяют каждое решение и создают уникальную атмосферу в IPS')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const IconComponent = value.icon;
                return (
                  <Card key={`value-${index}-${value.title}`} className="border border-border/50 hover:shadow-card hover:-translate-y-1 transition-all duration-300">
                    <CardHeader>
                      <div className="w-12 h-12 bg-gradient-to-br from-poker-accent/10 to-poker-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-poker-accent" />
                      </div>
                      <CardTitle className="text-poker-primary">{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{value.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 bg-gradient-surface">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent">
                {getContent('team_badge', 'Команда')}
              </Badge>
              <h2 className="text-4xl font-bold mb-6 text-poker-primary">
                {getContent('team_title', 'Познакомьтесь с нашей командой')}
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {getContent('team_description', 'Профессионалы своего дела, объединенные страстью к покеру и стремлением к совершенству')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <Card key={`member-${index}-${member.name}`} className="border border-border/50 hover:shadow-floating hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                  <div className="relative">
                    <img 
                      src={member.image}
                      alt={member.name}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/60 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <Badge className="bg-poker-accent/20 text-white border-white/20 backdrop-blur">
                        {member.experience}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-poker-primary mb-2">{member.name}</h3>
                    <p className="text-poker-accent font-medium mb-4">{member.role}</p>
                    <div className="space-y-2">
                      {member.achievements.map((achievement, achIndex) => (
                        <div key={achIndex} className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-poker-success" />
                          <span className="text-sm text-muted-foreground">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6 text-poker-primary">
                Готовы стать частью IPS?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Присоединяйтесь к нашему сообществу и начните свой путь к покерному мастерству уже сегодня
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-button hover:shadow-elevated">
                  <Users className="w-5 h-5 mr-2" />
                  Стать игроком
                </Button>
                <Button size="lg" variant="outline">
                  Связаться с нами
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}