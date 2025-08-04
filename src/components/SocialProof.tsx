import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          acc[position].avatar = item.content_value;
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
    <section className="py-12 lg:py-20 bg-accent/30">
      <div className="container mx-auto px-4">
        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={`stat-${index}-${stat.value}`} className="text-center p-4 lg:p-6 hover:shadow-elegant transition-all duration-300 border-border/50">
                <div className="flex justify-center mb-3 lg:mb-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-poker-gold/10 rounded-full flex items-center justify-center">
                    <IconComponent className="w-5 h-5 lg:w-6 lg:h-6 text-poker-gold" />
                  </div>
                </div>
                <div className="text-xl lg:text-3xl font-bold text-foreground mb-1 lg:mb-2">{stat.value}</div>
                <div className="text-xs lg:text-sm text-muted-foreground leading-tight">{stat.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-8 lg:mb-12">
          <Badge variant="outline" className="mb-4 border-poker-gold text-poker-gold text-xs lg:text-sm">
            Отзывы игроков
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Что говорят наши игроки?
          </h2>
          <p className="text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4 leading-relaxed">
            Присоединяйтесь к сообществу довольных игроков, которые улучшили свои навыки с IPS
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

        {/* Call to Action - Enhanced readability */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-card opacity-95"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-poker-accent/10 via-poker-accent/5 to-poker-accent/10"></div>
          <div className="relative text-center p-12 bg-card/80 backdrop-blur-sm border border-poker-accent/30">
            <h3 className="text-4xl font-bold mb-6 text-foreground">
              Готовы начать свой путь к покерному мастерству?
            </h3>
            <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Присоединяйтесь к IPS сегодня и получите доступ к профессиональной рейтинговой системе, 
              регулярным турнирам и дружелюбному сообществу.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center items-center mb-6 lg:mb-8">
              <Button size="lg" className="w-full sm:w-auto bg-poker-accent hover:bg-poker-accent/90 text-primary font-bold shadow-elegant hover-scale min-h-[48px] px-6 lg:px-8">
                <UserCheck className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Присоединиться бесплатно
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-poker-primary text-poker-primary hover:bg-poker-primary hover:text-primary-foreground font-semibold hover-scale min-h-[48px] px-6 lg:px-8">
                Подробнее о клубе
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-6 text-xs lg:text-sm text-white/90">
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 lg:px-4 py-2 backdrop-blur touch-target">
                <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                <span>Регистрация 2 минуты</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 lg:px-4 py-2 backdrop-blur touch-target">
                <MapPin className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Москва, центр города</span>
                <span className="sm:hidden">Москва</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 lg:px-4 py-2 backdrop-blur touch-target">
                <Star className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Без скрытых платежей</span>
                <span className="sm:hidden">Без доплат</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}