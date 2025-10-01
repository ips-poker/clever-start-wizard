import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Users, 
  Trophy, 
  Calendar,
  Clock,
  MapPin,
  Star,
  ArrowRight,
  UserCheck,
  CheckCircle,
  MessageCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  name: string;
  rating: number;
  status: string;
  text: string;
  avatar: string;
  time: string;
  verified: boolean;
}

export function SocialProof() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
    
    const handleTestimonialsUpdate = () => {
      fetchTestimonials();
    };
    
    window.addEventListener('testimonials-updated', handleTestimonialsUpdate);
    
    return () => {
      window.removeEventListener('testimonials-updated', handleTestimonialsUpdate);
    };
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'testimonials')
        .eq('is_active', true)
        .order('content_key');

      if (error) throw error;

      // Group testimonials by position from content_key
      const groupedTestimonials = data.reduce((acc: any, item: any) => {
        const match = item.content_key.match(/testimonial_(\d+)_/);
        if (!match) return acc;
        
        const position = parseInt(match[1]);
        if (!acc[position]) {
          acc[position] = { 
            position,
            rating: 1200,
            status: "Player",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
            time: "недавно",
            verified: true
          };
        }
        
        if (item.content_key.includes('_name')) {
          acc[position].name = item.content_value;
        } else if (item.content_key.includes('_text')) {
          acc[position].text = item.content_value;
        } else if (item.content_key.includes('_image')) {
          // Add cache-busting parameter to force image refresh
          let imageUrl = item.content_value;
          if (imageUrl && imageUrl.includes('supabase')) {
            imageUrl = imageUrl.includes('?') 
              ? imageUrl.split('?')[0] + `?t=${Date.now()}`
              : imageUrl + `?t=${Date.now()}`;
          }
          acc[position].avatar = imageUrl;
        }
        
        return acc;
      }, {});

      const testimonialsArray = Object.values(groupedTestimonials).sort((a: any, b: any) => a.position - b.position);
      
      if (testimonialsArray.length > 0) {
        // Filter and validate testimonials
        const validTestimonials = testimonialsArray.filter((t: any) => t.name && t.text) as Testimonial[];
        setTestimonials(validTestimonials);
      } else {
        // Fallback testimonials
        setTestimonials([
          {
            name: "Алексей М.",
            rating: 1987,
            status: "Elite Player",
            text: "Благодаря рейтинговой системе IPS я понял свои слабые места и значительно улучшил игру. 💪",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
            time: "2 часа назад",
            verified: true
          },
          {
            name: "Мария К.",
            rating: 1756,
            status: "Advanced",
            text: "Отличная организация турниров и справедливая система оценки. Рекомендую всем! ⭐",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b0e0?w=80&h=80&fit=crop&crop=face",
            time: "5 часов назад",
            verified: true
          },
          {
            name: "Дмитрий В.",
            rating: 2134,
            status: "Master",
            text: "Лучший покерный клуб в городе. Профессиональный уровень и дружелюбная атмосфера. 🔥",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
            time: "1 день назад",
            verified: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      // Use fallback testimonials on error
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { value: "500+", label: "Активных игроков", icon: Users },
    { value: "150+", label: "Турниров проведено", icon: Trophy },
    { value: "4.9/5", label: "Средняя оценка", icon: Star },
    { value: "3 года", label: "Опыт работы", icon: Calendar }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-black to-slate-800 relative overflow-hidden">
      {/* Decorative poker symbols */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-20 right-20 text-amber-400/30 text-6xl animate-float">♥</div>
        <div className="absolute top-40 left-10 text-amber-400/20 text-4xl animate-float-delayed">♣</div>
        <div className="absolute bottom-20 left-20 text-amber-400/25 text-5xl animate-float">♦</div>
        <div className="absolute bottom-40 right-10 text-amber-400/20 text-3xl animate-float-delayed">♠</div>
      </div>
      
      <div className="relative z-10">
      <div className="container mx-auto px-4">
        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={`stat-${index}-${stat.value}`} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/10 to-amber-600/0 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/85 border-2 border-amber-400/10 rounded-2xl p-6 backdrop-blur-xl text-center group-hover:scale-105 group-hover:border-amber-400/30 transition-all duration-500 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/5 to-amber-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">{stat.value}</div>
                    <div className="text-sm text-white/70 leading-tight font-light">{stat.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Testimonials Header */}
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
              ОТЗЫВЫ ИГРОКОВ
            </h2>
          </div>
          <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
          <p className="text-lg text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
            Присоединяйтесь к сообществу довольных игроков, которые улучшили свои навыки с EPC
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-12 lg:mb-16">
          {loading ? (
            <div className="col-span-3 text-center py-8">
              <div className="text-lg">Загрузка отзывов...</div>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-muted-foreground">
              Пока нет отзывов для отображения.
            </div>
          ) : (
            testimonials.map((testimonial, index) => (
            <Card key={`testimonial-${index}-${testimonial.name}`} className="group hover:shadow-floating transition-all duration-500 hover:-translate-y-2 border border-border/50 bg-gradient-surface overflow-hidden">
              {/* Telegram-style header */}
              <CardHeader className="pb-3 bg-gradient-to-r from-poker-accent/5 to-poker-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full border-2 border-poker-accent/20"
                      />
                      {testimonial.verified && (
                        <CheckCircle className="w-4 h-4 text-poker-success absolute -bottom-1 -right-1 bg-background rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-poker-primary">{testimonial.name}</CardTitle>
                        {testimonial.verified && (
                          <CheckCircle className="w-4 h-4 text-poker-success" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-poker-accent/10 text-poker-accent border-poker-accent/20 text-xs">
                          {testimonial.rating} ELO
                        </Badge>
                        <span className="text-xs text-muted-foreground">{testimonial.time}</span>
                      </div>
                    </div>
                  </div>
                  <MessageCircle className="w-4 h-4 text-poker-accent/50" />
                </div>
              </CardHeader>

              {/* Telegram-style message */}
              <CardContent className="pt-0">
                <div className="bg-poker-accent/5 rounded-2xl rounded-tl-sm p-4 mb-4 border-l-4 border-poker-accent/30">
                  <p className="text-poker-primary leading-relaxed">
                    {testimonial.text}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs border-poker-primary/20 text-poker-primary">
                    {testimonial.status}
                  </Badge>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-poker-accent fill-current" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>

        {/* Enhanced Call to Action */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent translate-x-[-100%] animate-shimmer"></div>
          <div className="relative text-center p-12 border-2 border-amber-400/20 backdrop-blur-xl">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-8 right-12 text-amber-400/40 text-5xl animate-float">♠</div>
              <div className="absolute bottom-8 left-12 text-amber-400/30 text-4xl animate-float-delayed">♣</div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-4xl font-light text-white mb-6 tracking-wide">
                Готовы начать свой путь к покерному мастерству?
              </h3>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                Присоединяйтесь к EPC сегодня и получите доступ к профессиональной рейтинговой системе, 
                регулярным турнирам и дружелюбному сообществу.
              </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link to="/tournaments" className="group/btn w-full sm:w-auto">
                <Button size="lg" className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 text-white font-bold shadow-2xl hover:shadow-amber-500/50 transition-all duration-500 min-h-[56px] px-10 rounded-xl hover:scale-105 border-2 border-amber-400/30">
                  <UserCheck className="w-5 h-5 mr-2 group-hover/btn:scale-110 transition-transform" />
                  Присоединиться бесплатно
                </Button>
              </Link>
              <Link to="/about" className="group/btn w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full border-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400 font-bold transition-all duration-500 min-h-[56px] px-10 rounded-xl hover:scale-105 backdrop-blur-sm">
                  Подробнее о клубе
                  <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">Регистрация 2 минуты</span>
                </div>
                <div className="flex items-center space-x-2 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">Москва, центр города</span>
                </div>
                <div className="flex items-center space-x-2 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-xl px-5 py-3 backdrop-blur-sm">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">Без скрытых платежей</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      
      <style>{`
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out 3s infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(var(--tw-rotate)); }
          33% { transform: translateY(-20px) translateX(10px) rotate(var(--tw-rotate)); }
          66% { transform: translateY(-10px) translateX(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </section>
  );
}