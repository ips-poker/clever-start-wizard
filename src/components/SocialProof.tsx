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

export function SocialProof() {
  const testimonials = [
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
  ];

  const stats = [
    { value: "500+", label: "Активных игроков", icon: Users },
    { value: "150+", label: "Турниров проведено", icon: Trophy },
    { value: "4.9/5", label: "Средняя оценка", icon: Star },
    { value: "3 года", label: "Опыт работы", icon: Calendar }
  ];

  return (
    <section className="py-20 bg-accent/30">
      <div className="container mx-auto px-4">
        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={`stat-${index}-${stat.value}`} className="text-center p-6 hover:shadow-elegant transition-all duration-300 border-border/50">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-poker-gold/10 rounded-full flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-poker-gold" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-poker-gold text-poker-gold">
            Отзывы игроков
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Что говорят наши игроки?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Присоединяйтесь к сообществу довольных игроков, которые улучшили свои навыки с IPS
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
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
          ))}
        </div>

        {/* Call to Action - Enhanced readability */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-surface opacity-95"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-poker-primary/20 via-poker-accent/20 to-poker-primary/20"></div>
          <div className="relative text-center p-12 bg-card/50 backdrop-blur-sm border border-border/50">
            <h3 className="text-4xl font-bold mb-6 text-poker-text-primary">
              Готовы начать свой путь к покерному мастерству?
            </h3>
            <p className="text-xl mb-8 text-poker-text-secondary max-w-2xl mx-auto leading-relaxed">
              Присоединяйтесь к IPS сегодня и получите доступ к профессиональной рейтинговой системе, 
              регулярным турнирам и дружелюбному сообществу.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" className="bg-poker-accent hover:bg-poker-accent/90 text-primary font-bold shadow-elegant hover-scale">
                <UserCheck className="w-5 h-5 mr-2" />
                Присоединиться бесплатно
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-poker-primary text-poker-primary hover:bg-poker-primary hover:text-primary-foreground font-semibold hover-scale">
                Подробнее о клубе
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/90">
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur">
                <Clock className="w-4 h-4" />
                <span>Регистрация 2 минуты</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur">
                <MapPin className="w-4 h-4" />
                <span>Москва, центр города</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur">
                <Star className="w-4 h-4" />
                <span>Без скрытых платежей</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}