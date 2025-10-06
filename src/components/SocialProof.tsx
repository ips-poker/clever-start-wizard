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
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Elegant Poker Chips Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[12%] right-[18%] w-20 h-20 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-2xl opacity-40"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-amber-400/30 flex items-center justify-center">
            <span className="text-amber-400/50 font-bold text-xs">100</span>
          </div>
          <div className="absolute inset-4 rounded-full border-2 border-dashed border-amber-400/20"></div>
        </div>
        
        <div className="absolute top-[50%] left-[20%] w-16 h-16 rounded-full animate-bounce-subtle">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-xl opacity-35"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-400/30 flex items-center justify-center">
            <span className="text-red-400/50 font-bold text-xs">500</span>
          </div>
        </div>
        
        <div className="absolute bottom-[10%] right-[30%] w-18 h-18 rounded-full animate-pulse-slow">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-xl opacity-30"></div>
          <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-400/30"></div>
        </div>
      </div>
      
      {/* Elegant Poker Suits */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[28%] left-[32%] animate-pulse-slow">
          <div className="text-amber-400/40 text-5xl filter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">♦</div>
        </div>
        <div className="absolute top-[55%] right-[15%] animate-bounce-subtle">
          <div className="text-red-400/35 text-4xl filter drop-shadow-[0_0_12px_rgba(248,113,113,0.3)]">♥</div>
        </div>
        <div className="absolute bottom-[12%] left-[20%] animate-pulse-slow">
          <div className="text-purple-400/45 text-6xl filter drop-shadow-[0_0_20px_rgba(192,132,252,0.4)]">♣</div>
        </div>
      </div>
      
      {/* Gradient light spots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={`stat-${index}-${stat.value}`} className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:scale-105 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-light text-amber-400 mb-2">{stat.value}</div>
                  <div className="text-sm text-white/70 font-light">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
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
          <p className="text-lg text-white/70 max-w-2xl mx-auto font-light">
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
            <div key={`testimonial-${index}-${testimonial.name}`} className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
                <div className="absolute top-3 right-3 text-amber-400/30 text-2xl animate-pulse">♥</div>
                <div className="absolute bottom-3 left-3 text-amber-400/20 text-xl animate-bounce-subtle">♦</div>
              </div>
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-xl border-2 border-amber-400/20 object-cover"
                    />
                    {testimonial.verified && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center border-2 border-slate-900">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-base mb-1 truncate">{testimonial.name}</h4>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-md border border-amber-400/30">
                        <span className="text-amber-400 text-xs font-medium">{testimonial.rating} RPS</span>
                      </div>
                      <span className="text-white/50 text-xs">{testimonial.time}</span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-4 mb-4 border border-white/10">
                  <p className="text-white/90 leading-relaxed text-sm">
                    {testimonial.text}
                  </p>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="px-3 py-1 bg-gradient-to-r from-white/5 to-white/10 rounded-lg border border-white/10">
                    <span className="text-white/70 text-xs font-medium">{testimonial.status}</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>

        {/* Call to Action */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 border border-amber-500/20 backdrop-blur-xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
          <div className="absolute inset-0 opacity-8">
            <div className="absolute top-4 right-6 text-amber-400/30 text-4xl animate-pulse">♠</div>
            <div className="absolute bottom-4 left-6 text-amber-400/20 text-3xl animate-bounce-subtle">♣</div>
          </div>
          
          <div className="relative z-10 text-center p-12">
            <h3 className="text-3xl lg:text-4xl font-light text-white mb-6 tracking-wide">
              Готовы начать свой путь к покерному мастерству?
            </h3>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto font-light leading-relaxed">
              Присоединяйтесь к клубу сегодня и получите доступ к профессиональной рейтинговой системе, 
              регулярным турнирам и элитному сообществу.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg hover:shadow-amber-500/30 transition-all duration-300 px-8">
                <UserCheck className="w-5 h-5 mr-2" />
                Присоединиться бесплатно
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-amber-400/50 text-amber-400 hover:bg-amber-400/20 hover:border-amber-400 font-medium transition-all duration-300 px-8">
                Подробнее о клубе
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 rounded-lg px-4 py-2 border border-white/20">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-medium">Регистрация 2 минуты</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 rounded-lg px-4 py-2 border border-white/20">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-medium">Москва</span>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 rounded-lg px-4 py-2 border border-white/20">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-medium">Без доплат</span>
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