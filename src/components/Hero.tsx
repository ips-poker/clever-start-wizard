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
  return <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Optimized Background - Increased opacity by 50% */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(${luxuryPokerHero})`
    }}>
        <div className="absolute inset-0 bg-slate-950/60"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/45 to-slate-950/70"></div>
      </div>
      {/* Reduced floating elements for better performance */}
      <div className="absolute inset-0 opacity-10 overflow-hidden motion-reduce:hidden">
        <div className="absolute top-20 left-10 text-6xl text-white/20">♠</div>
        <div className="absolute bottom-20 right-10 text-5xl text-white/15">♣</div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="flex flex-col items-center justify-center min-h-screen py-12 lg:py-20 text-center space-y-12">
          
          {/* Badge */}
          <div className="animate-scale-in [animation-delay:0.4s]">
            <Badge className="bg-white/10 border border-white/30 text-white font-semibold px-6 py-3 rounded-full shadow-subtle backdrop-blur-md">
              {getContent('hero_badge', 'Премиальный покерный клуб')}
            </Badge>
          </div>
          
          {/* Logo and Title Section */}
          <div className="space-y-8 animate-slide-up [animation-delay:0.6s]">
            <div className="flex justify-center mb-6">
              <img src={pokerLogo} alt="Poker Club Logo" className="w-20 h-20 lg:w-24 lg:h-24 object-contain bg-white/90 rounded-xl p-2 shadow-elegant border border-white/20" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-sinkin leading-tight tracking-tight text-white">
                <span className="block leading-none">
                  {getContent('hero_title', 'EPC')}
                </span>
                <span className="block text-poker-accent-light text-2xl sm:text-3xl lg:text-5xl mt-2 font-sinkin leading-tight">
                  {getContent('hero_subtitle', 'Event Poker Club')}
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium animate-fade-in [animation-delay:0.8s]">
                {getContent('hero_description', 'Премиальный покерный клуб с уникальной рейтинговой системой RPS. Развивайте навыки в элегантной атмосфере среди профессиональных игроков.')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in [animation-delay:1s] max-w-lg mx-auto">
            <Link to="/tournaments" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-poker-accent text-white hover:bg-poker-accent/90 transition-all duration-300 font-semibold px-8 py-4 text-lg rounded-xl shadow-card hover:scale-105 hover:shadow-elegant min-h-[48px]">
                <Play className="w-6 h-6 mr-3" />
                {getContent('cta_primary', 'Начать играть')}
              </Button>
            </Link>
            <Link to="/rating" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:text-white transition-all duration-300 font-semibold px-8 py-4 text-lg rounded-xl backdrop-blur-md shadow-card hover:scale-105 hover:border-white/70 min-h-[48px]">
                {getContent('cta_secondary', 'Рейтинг игроков')}
              </Button>
            </Link>
          </div>

          {/* Feature Cards - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl animate-slide-up [animation-delay:1.2s]">
            
            {/* Main Feature Card */}
            <Card className="p-8 bg-white/15 border border-white/30 shadow-lg hover:scale-105 transition-all duration-300">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-poker-accent rounded-2xl flex items-center justify-center mx-auto shadow-card text-white">
                  <Trophy className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white">{getContent('main_feature_title', 'Рейтинговая система RPS')}</h3>
                <p className="text-white/90 text-base font-medium">{getContent('main_feature_description', 'Уникальная система Rating Points System для справедливой оценки мастерства')}</p>
                <Badge className="bg-poker-accent-light text-white px-6 py-3 font-semibold text-sm shadow-card">
                  Главная особенность
                </Badge>
              </div>
            </Card>

            {/* Elite Community Card */}
            <Card className="p-8 bg-white/8 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-elegant">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-poker-accent rounded-2xl flex items-center justify-center mx-auto shadow-card text-white">
                  <Users className="w-10 h-10" />
                </div>
                <div className="text-white space-y-2">
                  <h3 className="font-bold text-2xl">Элитное сообщество</h3>
                  <p className="text-base text-white/80 font-medium">Игра с опытными покеристами в профессиональной атмосфере</p>
                </div>
              </div>
            </Card>

            {/* Regular Tournaments Card */}
            <Card className="p-8 bg-white/8 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-elegant">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-poker-accent rounded-2xl flex items-center justify-center mx-auto shadow-card text-white">
                  <Calendar className="w-10 h-10" />
                </div>
                <div className="text-white space-y-2">
                  <h3 className="font-bold text-2xl">Регулярные турниры</h3>
                  <p className="text-base text-white/80 font-medium">Еженедельные соревнования с призовым фондом</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Key Benefits - 4 columns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up [animation-delay:1.4s] max-w-4xl mx-auto">
            <div className="flex flex-col items-center space-y-3 text-sm bg-white/8 px-4 py-6 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle hover:scale-105 transition-all duration-300">
              <Shield className="w-8 h-8 text-poker-accent-light" />
              <span className="text-center">{getContent('feature_1', 'Честная игра')}</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-sm bg-white/8 px-4 py-6 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle hover:scale-105 transition-all duration-300">
              <TrendingUp className="w-8 h-8 text-poker-accent-light" />
              <span className="text-center">{getContent('feature_2', 'Рост навыков')}</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-sm bg-white/8 px-4 py-6 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle hover:scale-105 transition-all duration-300">
              <Award className="w-8 h-8 text-poker-accent-light" />
              <span className="text-center">{getContent('feature_3', 'Рейтинг RPS')}</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-sm bg-white/8 px-4 py-6 rounded-xl backdrop-blur-md border border-white/20 text-white font-medium shadow-subtle hover:scale-105 transition-all duration-300">
              <Users className="w-8 h-8 text-poker-accent-light" />
              <span className="text-center">{getContent('feature_4', 'Сообщество')}</span>
            </div>
          </div>

          {/* Awards & Achievements Card */}
          <Card className="p-8 bg-white/8 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-300 shadow-card hover:scale-105 hover:shadow-elegant max-w-lg mx-auto animate-fade-in [animation-delay:1.6s]">
            <div className="flex items-center justify-center space-x-6">
              <div className="p-4 bg-poker-accent rounded-xl shadow-card flex-shrink-0">
                <Star className="w-8 h-8 text-white" />
              </div>
              <div className="text-white text-center">
                <h3 className="font-bold text-xl">Награды и достижения</h3>
                <p className="text-white/80 font-medium">Система признания успехов</p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 md:gap-8 animate-slide-up [animation-delay:1.8s] max-w-2xl mx-auto">
            <div className="text-center p-6 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20 shadow-card transition-all duration-300 hover:scale-105 hover:bg-white/12">
              <div className="text-4xl md:text-5xl font-bold text-poker-accent-light mb-3">500+</div>
              <div className="text-sm md:text-base text-white font-medium">Игроков</div>
            </div>
            <div className="text-center p-6 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20 shadow-card transition-all duration-300 hover:scale-105 hover:bg-white/12">
              <div className="text-4xl md:text-5xl font-bold text-poker-accent-light mb-3">150+</div>
              <div className="text-sm md:text-base text-white font-medium">Турниров</div>
            </div>
            <div className="text-center p-6 bg-white/8 backdrop-blur-xl rounded-xl border border-white/20 shadow-card transition-all duration-300 hover:scale-105 hover:bg-white/12">
              <div className="text-4xl md:text-5xl font-bold text-poker-accent-light mb-3">4.9</div>
              <div className="text-sm md:text-base text-white font-medium">Рейтинг</div>
            </div>
          </div>
        </div>
      </div>
     </section>;
}