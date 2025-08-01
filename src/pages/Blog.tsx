import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCMSContent } from "@/hooks/useCMSContent";
import { supabase } from "@/integrations/supabase/client";
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
  ChevronRight,
  Loader2
} from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  author_role: string;
  author_avatar: string;
  published_at: string;
  read_time: string;
  views: number;
  likes: number;
  image: string;
  tags: string[];
  is_featured: boolean;
  is_published: boolean;
}

export default function Blog() {
  const { content: cmsContent, loading: cmsLoading } = useCMSContent('blog');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'blog')
        .eq('is_active', true)
        .order('content_key');

      if (error) throw error;

      if (data && data.length > 0) {
        const postsData: any = {};
        
        data.forEach(item => {
          if (item.content_key.startsWith('post_')) {
            const match = item.content_key.match(/post_(\d+)_(.+)/);
            if (match) {
              const postNumber = match[1];
              const fieldName = match[2];
              
              if (!postsData[postNumber]) {
                postsData[postNumber] = { id: `post_${postNumber}` };
              }
              
              postsData[postNumber][fieldName] = item.content_value;
            }
          }
        });

        // Преобразуем данные постов в нужный формат
        const formattedPosts = Object.keys(postsData).map(postNumber => ({
          id: `post_${postNumber}`,
          title: postsData[postNumber].title || '',
          excerpt: postsData[postNumber].content ? postsData[postNumber].content.substring(0, 200) + '...' : '',
          content: postsData[postNumber].content || '',
          author: "IPS Team",
          author_role: "Эксперт по покеру",
          author_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
          published_at: new Date().toISOString().split('T')[0],
          read_time: "5 мин",
          views: Math.floor(Math.random() * 1000) + 500,
          likes: Math.floor(Math.random() * 100) + 20,
          image: postsData[postNumber].image || 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=200&fit=crop',
          tags: ["Стратегия", "Покер"],
          is_featured: postNumber === '1', // Первый пост как featured
          is_published: true
        }));

        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback данные если нет в CMS
  const heroTitle = cmsContent['hero_title'] || 'Покерная мудрость и аналитика';
  const heroSubtitle = cmsContent['hero_subtitle'] || 'Блог IPS';
  const heroDescription = cmsContent['hero_description'] || 'Экспертные статьи, анализ раздач, стратегии и инсайты от профессионалов IPS';

  const featuredPost = posts.find(post => post.is_featured) || posts[0];
  const regularPosts = posts.filter(post => !post.is_featured);

  const categories = [
    { name: "Стратегия", count: 15, icon: Target },
    { name: "Психология", count: 8, icon: Users },
    { name: "Рейтинг", count: 5, icon: TrendingUp },
    { name: "Турниры", count: 12, icon: Trophy },
    { name: "Новичкам", count: 10, icon: Lightbulb }
  ];


  if (loading || cmsLoading) {
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
        <section className="py-20 bg-gradient-surface">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 border-poker-accent text-poker-accent">
                {heroSubtitle}
              </Badge>
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent">
                {heroTitle}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {heroDescription}
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-12">
              {/* Featured Article */}
              {featuredPost && (
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
                          src={featuredPost.author_avatar}
                          alt={featuredPost.author}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-poker-primary">{featuredPost.author}</p>
                          <p className="text-sm text-muted-foreground">{featuredPost.author_role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(featuredPost.published_at).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {featuredPost.read_time}
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
              )}

              {/* Other Articles */}
              {regularPosts.length > 0 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold text-poker-primary">Последние статьи</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {regularPosts.map((post) => (
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
                              <span>{post.read_time}</span>
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
              )}

              {/* No posts message */}
              {posts.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-poker-primary mb-2">
                    Скоро здесь появятся статьи
                  </h3>
                  <p className="text-muted-foreground">
                    Наши эксперты готовят для вас интересные материалы о покере
                  </p>
                </div>
              )}
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
