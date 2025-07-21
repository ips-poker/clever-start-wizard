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
      name: "Алексей М.",
      rating: 1987,
      status: "Elite Player",
      text: "Благодаря рейтинговой системе IPS я понял свои слабые места и значительно улучшил игру.",
      avatar: "A"
    },
    {
      name: "Мария К.",
      rating: 1756,
      status: "Advanced",
      text: "Отличная организация турниров и справедливая система оценки. Рекомендую всем!",
      avatar: "M"
    },
    {
      name: "Дмитрий В.",
      rating: 2134,
      status: "Master",
      text: "Лучший покерный клуб в городе. Профессиональный уровень и дружелюбная атмосфера.",
      avatar: "Д"
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
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border/50">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-royal rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-poker-gold/10 text-poker-gold border-poker-gold/20">
                        {testimonial.rating} ELO
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {testimonial.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-poker-gold fill-current" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="relative overflow-hidden rounded-2xl">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(/src/assets/poker-table-hero.jpg)`,
              filter: 'blur(6px)'
            }}
          ></div>
          <div className="absolute inset-0 bg-slate-900/50"></div>
          <div className="relative text-center p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">
            Готовы начать свой путь к покерному мастерству?
          </h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Присоединяйтесь к IPS сегодня и получите доступ к профессиональной рейтинговой системе, 
            регулярным турнирам и дружелюбному сообществу.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-poker-gold text-primary hover:bg-poker-gold/90 font-semibold">
              <UserCheck className="w-5 h-5 mr-2" />
              Присоединиться бесплатно
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
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
      </div>
    </section>
  );
}