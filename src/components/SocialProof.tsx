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
import { fixStorageUrl, addCacheBusting } from "@/utils/storageUtils";

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
          // Исправляем URL и добавляем cache-busting
          let imageUrl = item.content_value;
          if (imageUrl) {
            imageUrl = fixStorageUrl(imageUrl);
            if (imageUrl.includes('/storage/v1/object/public/')) {
              imageUrl = addCacheBusting(imageUrl);
            }
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
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
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
      
      {/* Neon Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={`stat-${index}-${stat.value}`} className="brutal-metal brutal-border p-6 group hover:scale-105 transition-all duration-500 hover:shadow-neon-orange relative overflow-hidden">
                {/* Industrial texture */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.02) 10px, rgba(255, 255, 255, 0.02) 20px)`
                  }}
                />
                
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-syndikate-orange" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-syndikate-orange" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-syndikate-orange" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-syndikate-orange" />
                
                <div className="relative z-10 text-center">
                  <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-5 h-5 text-background" />
                  </div>
                  <div className="font-display text-3xl text-syndikate-orange neon-orange mb-2">{stat.value}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 border-2 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-syndikate-orange" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl uppercase tracking-wider text-foreground">
              ОТЗЫВЫ ИГРОКОВ
            </h2>
          </div>
          <div className="h-[2px] w-20 bg-gradient-neon mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto uppercase tracking-wider">
            Присоединяйтесь к сообществу довольных игроков клуба
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {loading ? (
            <div className="col-span-3 text-center py-8">
              <div className="text-lg text-white/70">Загрузка отзывов...</div>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-white/60">
              Пока нет отзывов для отображения.
            </div>
          ) : (
            testimonials.map((testimonial, index) => (
            <div key={`testimonial-${index}-${testimonial.name}`} className="brutal-metal brutal-border p-6 group hover:scale-[1.02] transition-all duration-500 hover:shadow-neon-orange relative overflow-hidden">
              {/* Industrial texture */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.02) 10px, rgba(255, 255, 255, 0.02) 20px)`
                }}
              />
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-syndikate-orange" />
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-syndikate-orange" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-syndikate-orange" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-syndikate-orange" />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 brutal-border border-2 border-syndikate-orange/20 object-cover"
                    />
                    {testimonial.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-syndikate-orange brutal-border flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-background" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-foreground font-bold text-base mb-1 truncate uppercase tracking-wide">{testimonial.name}</h4>
                    <div className="flex items-center gap-2">
                      <div className="bg-syndikate-orange/20 brutal-border px-2 py-0.5">
                        <span className="text-syndikate-orange text-xs font-bold uppercase">{testimonial.rating} RPS</span>
                      </div>
                      <span className="text-muted-foreground text-xs uppercase">{testimonial.time}</span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-syndikate-metal/30 brutal-border p-4 mb-4">
                  <p className="text-foreground/90 leading-relaxed text-sm">
                    {testimonial.text}
                  </p>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="bg-syndikate-metal/30 brutal-border px-3 py-1">
                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{testimonial.status}</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-syndikate-orange fill-syndikate-orange" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Call to Action */}
        <div className="relative overflow-hidden brutal-metal brutal-border p-12 shadow-neon-orange">
          {/* Industrial texture */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.02) 10px, rgba(255, 255, 255, 0.02) 20px)`
            }}
          />
          
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-syndikate-orange" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange" />
          
          <div className="relative z-10 text-center">
            <h3 className="font-display text-4xl uppercase mb-6 tracking-wider text-foreground">
              Готовы начать свой путь к покерному мастерству?
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto uppercase tracking-wide leading-relaxed">
              Присоединяйтесь к клубу сегодня и получите доступ к профессиональной рейтинговой системе, 
              регулярным турнирам и элитному сообществу.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange px-8">
                <UserCheck className="w-5 h-5 mr-2" />
                Присоединиться бесплатно
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-syndikate-orange text-syndikate-orange hover:bg-syndikate-orange hover:text-background font-bold uppercase tracking-wider px-8">
                Подробнее о клубе
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-syndikate-metal/30 brutal-border px-4 py-2">
                <Clock className="w-4 h-4 text-syndikate-orange" />
                <span className="text-foreground text-sm font-bold uppercase">Регистрация 2 минуты</span>
              </div>
              <div className="flex items-center gap-2 bg-syndikate-metal/30 brutal-border px-4 py-2">
                <MapPin className="w-4 h-4 text-syndikate-orange" />
                <span className="text-foreground text-sm font-bold uppercase">Москва</span>
              </div>
              <div className="flex items-center gap-2 bg-syndikate-metal/30 brutal-border px-4 py-2">
                <Star className="w-4 h-4 text-syndikate-orange" />
                <span className="text-foreground text-sm font-bold uppercase">Без доплат</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-12px) rotate(var(--tw-rotate)); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </section>
  );
}