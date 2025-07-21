import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  Heart,
  Share2,
  BookOpen,
  TrendingUp,
  Target,
  Trophy,
  Users,
  Lightbulb,
  ChevronRight
} from "lucide-react";

export default function Blog() {
  const featuredPost = {
    id: 1,
    title: "Как правильно рассчитать ELO рейтинг в покере: полное руководство",
    excerpt: "Подробный разбор системы ELO рейтинга, адаптированной для покера. Узнайте, как работает наша система оценки навыков игроков.",
    content: `
      Система ELO рейтинга, изначально разработанная для шахмат, была успешно адаптирована нами для покера. 
      В отличие от классических покерных рейтингов, наша система учитывает не только выигрыши, но и качество игры против оппонентов разного уровня.

      ## Основные принципы нашей ELO системы:

      ### 1. Динамическое изменение рейтинга
      Ваш рейтинг изменяется после каждого турнира в зависимости от:
      - Вашего текущего рейтинга
      - Рейтинга ваших оппонентов  
      - Занятого места в турнире
      - Количества участников

      ### 2. K-фактор
      K-фактор определяет, насколько сильно изменяется рейтинг после игры:
      - Новые игроки (< 30 игр): K = 40
      - Опытные игроки (30-100 игр): K = 20  
      - Мастера (> 100 игр): K = 10

      ### 3. Расчет ожидаемого результата
      Система рассчитывает ожидаемое место каждого игрока на основе рейтингов всех участников турнира.

      ### 4. Корректировка за место
      Рейтинг изменяется пропорционально разнице между ожидаемым и фактическим результатом.

      ## Пример расчета:
      
      Игрок с рейтингом 1500 играет в турнире из 20 человек со средним рейтингом 1400. 
      Ожидаемое место: 8-9. Фактическое место: 3.
      
      Изменение рейтинга: +25 очков (за превышение ожиданий)

      Эта система обеспечивает справедливую оценку навыков и мотивирует к постоянному развитию!
    `,
    author: "Александр Петров",
    authorRole: "Турнирный Директор",
    authorAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face",
    publishedAt: "2024-07-15",
    readTime: "8 мин",
    views: 1247,
    likes: 89,
    image: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=400&fit=crop",
    tags: ["ELO", "Рейтинг", "Система", "Покер"]
  };

  const posts = [
    {
      id: 2,
      title: "10 ошибок новичков в турнирном покере",
      excerpt: "Разбираем самые частые ошибки начинающих игроков и способы их избежать.",
      author: "Елена Соколова",
      publishedAt: "2024-07-10",
      readTime: "6 мин",
      views: 892,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop",
      tags: ["Новички", "Ошибки", "Турниры"]
    },
    {
      id: 3,
      title: "Психология покера: как контролировать тильт",
      excerpt: "Практические советы по управлению эмоциями за покерным столом.",
      author: "Дмитрий Волков",
      publishedAt: "2024-07-05",
      readTime: "12 мин",
      views: 1156,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop",
      tags: ["Психология", "Тильт", "Ментальная игра"]
    },
    {
      id: 4,
      title: "Анализ рук: разбор ключевых моментов финального стола",
      excerpt: "Детальный анализ интересных раздач с недавнего турнира в IPS.",
      author: "Александр Петров",
      publishedAt: "2024-06-28",
      readTime: "15 мин",
      views: 743,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop",
      tags: ["Анализ рук", "Финальный стол", "Стратегия"]
    },
    {
      id: 5,
      title: "Банкролл-менеджмент для турнирных игроков",
      excerpt: "Как правильно управлять банкроллом в турнирном покере.",
      author: "Елена Соколова",
      publishedAt: "2024-06-20",
      readTime: "10 мин",
      views: 654,
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=200&fit=crop",
      tags: ["Банкролл", "Менеджмент", "Турниры"]
    },
    {
      id: 6,
      title: "Эволюция покерных стратегий: от классики к GTO",
      excerpt: "Обзор развития покерных стратегий и современных подходов.",
      author: "Дмитрий Волков",
      publishedAt: "2024-06-15",
      readTime: "14 мин",
      views: 891,
      image: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=200&fit=crop",
      tags: ["Стратегия", "GTO", "Эволюция"]
    }
  ];

  const categories = [
    { name: "Стратегия", count: 15, icon: Target },
    { name: "Психология", count: 8, icon: Users },
    { name: "Рейтинг", count: 5, icon: TrendingUp },
    { name: "Турниры", count: 12, icon: Trophy },
    { name: "Новичкам", count: 10, icon: Lightbulb }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-surface">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 border-poker-accent text-poker-accent">
                Блог IPS
              </Badge>
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent">
                Покерная мудрость и аналитика
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Экспертные статьи, анализ раздач, стратегии и инсайты от профессионалов IPS
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-12">
              {/* Featured Article */}
              <article className="bg-gradient-card rounded-2xl overflow-hidden shadow-floating border border-border/50">
                <div className="relative">
                  <img 
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/60 via-transparent to-transparent"></div>
                  <Badge className="absolute top-4 left-4 bg-poker-accent text-white border-0">
                    Рекомендуем
                  </Badge>
                </div>
                
                <div className="p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {featuredPost.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-4 text-poker-primary">
                    {featuredPost.title}
                  </h2>
                  
                  <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                    {featuredPost.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <img 
                        src={featuredPost.authorAvatar}
                        alt={featuredPost.author}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-poker-primary">{featuredPost.author}</p>
                        <p className="text-sm text-muted-foreground">{featuredPost.authorRole}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(featuredPost.publishedAt).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {featuredPost.readTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {featuredPost.views}
                      </div>
                    </div>
                  </div>
                  
                  {/* Article Content Preview */}
                  <div className="prose prose-lg max-w-none text-muted-foreground">
                    <div dangerouslySetInnerHTML={{ 
                      __html: featuredPost.content.substring(0, 500) + "..." 
                    }} />
                  </div>
                  
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm">
                        <Heart className="w-4 h-4 mr-2" />
                        {featuredPost.likes}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4 mr-2" />
                        Поделиться
                      </Button>
                    </div>
                    
                    <Button className="bg-gradient-button">
                      Читать полностью
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </article>

              {/* Other Articles */}
              <div className="space-y-8">
                <h3 className="text-2xl font-bold text-poker-primary">Последние статьи</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {posts.map((post) => (
                    <Card key={post.id} className="group hover:shadow-card hover:-translate-y-1 transition-all duration-300 border border-border/50">
                      <div className="relative overflow-hidden">
                        <img 
                          src={post.image}
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/40 to-transparent"></div>
                      </div>
                      
                      <CardContent className="p-6">
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <h4 className="text-lg font-bold mb-3 text-poker-primary group-hover:text-poker-accent transition-colors">
                          {post.title}
                        </h4>
                        
                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                          {post.excerpt}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{post.author}</span>
                          <div className="flex items-center gap-3">
                            <span>{post.readTime}</span>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {post.views}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Categories */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-poker-primary">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Категории
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.name}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gradient-surface transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-4 h-4 text-poker-accent" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {category.count}
                        </Badge>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Newsletter */}
              <Card className="border border-poker-accent/20 bg-gradient-to-br from-poker-accent/5 to-poker-primary/5">
                <CardContent className="p-6 text-center">
                  <h4 className="text-lg font-bold mb-3 text-poker-primary">
                    Покерная рассылка
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Получайте лучшие статьи и эксклюзивные материалы на email
                  </p>
                  <Button className="w-full bg-gradient-button">
                    Подписаться
                  </Button>
                </CardContent>
              </Card>

              {/* Popular Articles */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-poker-primary">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Популярное
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {posts.slice(0, 3).map((post, index) => (
                    <div key={post.id} className="flex gap-3 group cursor-pointer">
                      <div className="w-8 h-8 bg-poker-accent/10 rounded-full flex items-center justify-center text-sm font-bold text-poker-accent">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm group-hover:text-poker-accent transition-colors leading-tight">
                          {post.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
