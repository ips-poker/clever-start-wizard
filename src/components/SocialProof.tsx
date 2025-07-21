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
  UserCheck
} from "lucide-react";

export function SocialProof() {
  const testimonials = [
    {
      name: "Алексей Морозов",
      username: "@alex_poker",
      rating: 1987,
      status: "Elite Player",
      text: "Благодаря рейтинговой системе IPS я понял свои слабые места и значительно улучшил игру. Теперь регулярно в топ-3! 🔥",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
      time: "2 часа назад"
    },
    {
      name: "Мария Колесникова", 
      username: "@maria_cards",
      rating: 1756,
      status: "Advanced",
      text: "Отличная организация турниров и справедливая система оценки. Атмосфера просто невероятная! Рекомендую всем 👌",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face",
      time: "5 часов назад"
    },
    {
      name: "Дмитрий Волков",
      username: "@dmitry_pro",
      rating: 2134,
      status: "Master",
      text: "Лучший покерный клуб в городе. Профессиональный уровень и дружелюбная атмосфера. Здесь действительно можно расти как игрок! 🚀",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
      time: "1 день назад"
    }
  ];

  const stats = [
    { value: "500+", label: "Активных игроков", icon: Users },
    { value: "150+", label: "Турниров проведено", icon: Trophy },
    { value: "4.9/5", label: "Средняя оценка", icon: Star },
    { value: "3 года", label: "Опыт работы", icon: Calendar }
  ];

  return (
    <section className="py-20 bg-poker-surface">
      <div className="container mx-auto px-4">
        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="text-center p-6 hover:shadow-elegant transition-all duration-300 border-border/50">
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

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 border-poker-border bg-white">
              <CardContent className="p-0">
                {/* Telegram-style header */}
                <div className="p-4 border-b border-poker-border/50">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-poker-text-primary">{testimonial.name}</h4>
                        <span className="text-poker-text-muted text-sm">{testimonial.username}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-poker-accent/10 text-poker-accent border-poker-accent/20 text-xs">
                          {testimonial.rating} ELO
                        </Badge>
                        <span className="text-xs text-poker-text-muted">{testimonial.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Message content */}
                <div className="p-4">
                  <p className="text-poker-text-secondary leading-relaxed">{testimonial.text}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-poker-accent fill-current" />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs bg-poker-surface">
                      {testimonial.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-poker-primary rounded-2xl p-12 text-poker-text-inverse">
          <h3 className="text-3xl font-bold mb-4">
            Готовы начать свой путь к покерному мастерству?
          </h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Присоединяйтесь к IPS сегодня и получите доступ к профессиональной рейтинговой системе, 
            регулярным турнирам и дружелюбному сообществу.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-poker-accent text-white hover:bg-poker-accent-dark font-semibold">
              <UserCheck className="w-5 h-5 mr-2" />
              Присоединиться бесплатно
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-poker-primary">
              Подробнее о клубе
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="flex items-center justify-center mt-8 space-x-6 text-sm opacity-80">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Регистрация 2 минуты</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Москва, центр города</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Без скрытых платежей</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}