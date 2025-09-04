import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
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
  Loader2,
  Search,
  Filter,
  ArrowRight
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openPostModal = (post: BlogPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

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
        // Ищем поле "posts" с JSON данными
        const postsField = data.find(item => item.content_key === 'posts');
        
        if (postsField && postsField.content_value) {
          try {
            // Парсим JSON данные постов
            const postsData = JSON.parse(postsField.content_value);
            setPosts(postsData);
          } catch (parseError) {
            console.error('Error parsing posts JSON:', parseError);
            // Fallback на старый формат
            parseOldFormat(data);
          }
        } else {
          // Fallback на старый формат
          parseOldFormat(data);
        }
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для парсинга старого формата данных
  const parseOldFormat = (data: any[]) => {
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
  };

  // Fallback данные если нет в CMS
  const heroTitle = cmsContent['hero_title'] || 'Покерная мудрость и аналитика';
  const heroSubtitle = cmsContent['hero_subtitle'] || 'Блог IPS';
  const heroDescription = cmsContent['hero_description'] || 'Экспертные статьи, анализ раздач, стратегии и инсайты от профессионалов IPS';

  const featuredPost = posts.find(post => post.is_featured) || posts[0];
  
  // Фильтрация постов
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Все" || post.tags.includes(selectedCategory);
    return matchesSearch && matchesCategory && !post.is_featured;
  });

  const categories = [
    { name: "Все", count: posts.length, icon: BookOpen },
    { name: "Стратегия", count: posts.filter(p => p.tags.includes("Стратегия")).length, icon: Target },
    { name: "Психология", count: posts.filter(p => p.tags.includes("Психология")).length, icon: Users },
    { name: "Рейтинг", count: posts.filter(p => p.tags.includes("Рейтинг")).length, icon: TrendingUp },
    { name: "Турниры", count: posts.filter(p => p.tags.includes("Турниры")).length, icon: Trophy },
    { name: "Покер", count: posts.filter(p => p.tags.includes("Покер")).length, icon: Lightbulb }
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
        <section className="py-12 sm:py-16 md:py-20 bg-gradient-surface">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-4 sm:mb-6 border-poker-accent text-poker-accent">
                {heroSubtitle}
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent">
                {heroTitle}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                {heroDescription}
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8 sm:space-y-12">
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
                  
                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuredPost.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-poker-primary">
                      {featuredPost.title}
                    </h2>
                    
                    <p className="text-muted-foreground mb-6 text-base sm:text-lg leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
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
                      
                      <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="hidden sm:inline">{new Date(featuredPost.published_at).toLocaleDateString('ru-RU')}</span>
                          <span className="sm:hidden">{new Date(featuredPost.published_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
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
                    <div className="prose prose-base sm:prose-lg max-w-none text-muted-foreground">
                      <div dangerouslySetInnerHTML={{ 
                        __html: featuredPost.content.substring(0, 500) + "..." 
                      }} />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-border gap-4">
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
                      
                      <Button 
                        className="bg-gradient-button w-full sm:w-auto"
                        onClick={() => openPostModal(featuredPost)}
                      >
                        Читать полностью
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </article>
              )}

              {/* Search and Filter */}
              <div className="bg-gradient-card rounded-2xl p-6 border border-border/50 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Поиск статей..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-border/50"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        variant={selectedCategory === category.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.name)}
                        className="whitespace-nowrap"
                      >
                        <category.icon className="w-4 h-4 mr-2" />
                        {category.name} ({category.count})
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Other Articles */}
              {filteredPosts.length > 0 ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-poker-primary">
                      {selectedCategory === "Все" ? "Все статьи" : `Категория: ${selectedCategory}`}
                    </h3>
                    <Badge variant="outline" className="text-sm">
                      {filteredPosts.length} {filteredPosts.length === 1 ? 'статья' : 'статей'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {filteredPosts.map((post) => (
                      <Card key={post.id} className="group hover:shadow-elegant hover:-translate-y-2 transition-all duration-500 border border-border/50 overflow-hidden bg-gradient-card">
                        <div className="relative overflow-hidden">
                          <img 
                            src={post.image}
                            alt={post.title}
                            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/60 via-transparent to-transparent"></div>
                          <div className="absolute top-3 left-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} className="bg-poker-accent/90 text-white border-0 mb-1 mr-1 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <CardContent className="p-6">
                          <h4 className="text-lg font-bold mb-3 text-poker-primary group-hover:text-poker-accent transition-colors line-clamp-2">
                            {post.title}
                          </h4>
                          
                          <p className="text-muted-foreground mb-4 text-sm leading-relaxed line-clamp-3">
                            {post.excerpt}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              <span>{post.author}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.read_time}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.views}
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            className="w-full group-hover:bg-poker-accent/10 transition-colors"
                            onClick={() => openPostModal(post)}
                          >
                            Читать далее
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-card rounded-2xl border border-border/50">
                  <div className="text-muted-foreground mb-4">
                    {searchTerm || selectedCategory !== "Все" 
                      ? "По вашему запросу ничего не найдено"
                      : "Скоро здесь появятся статьи"
                    }
                  </div>
                  {(searchTerm || selectedCategory !== "Все") && (
                    <Button 
                      variant="outline" 
                      onClick={() => { setSearchTerm(""); setSelectedCategory("Все"); }}
                    >
                      Сбросить фильтры
                    </Button>
                  )}
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

            {/* Sidebar - Hide on small screens, show as modal or horizontal scroll on mobile */}
            <div className="hidden lg:block space-y-6">
              {/* Categories */}
              <Card className="border border-border/50 bg-gradient-card">
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
                        onClick={() => setSelectedCategory(category.name)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                          selectedCategory === category.name 
                            ? 'bg-poker-accent/10 border border-poker-accent/20' 
                            : 'hover:bg-gradient-surface'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-4 h-4 ${
                            selectedCategory === category.name ? 'text-poker-accent' : 'text-muted-foreground'
                          }`} />
                          <span className={`font-medium ${
                            selectedCategory === category.name ? 'text-poker-accent' : ''
                          }`}>
                            {category.name}
                          </span>
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
              <Card className="border border-border/50 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-poker-primary">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Популярное
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {posts.slice(0, 3).map((post, index) => (
                    <div key={post.id} className="flex gap-3 group cursor-pointer hover:bg-gradient-surface/50 p-2 rounded-lg transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-poker-accent to-poker-primary rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm group-hover:text-poker-accent transition-colors leading-tight line-clamp-2">
                          {post.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" />
                          {post.views}
                          <Heart className="w-3 h-3" />
                          {post.likes}
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
      
      {/* Article Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {selectedPost.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-poker-primary pr-8">
                  {selectedPost.title}
                </DialogTitle>
                <DialogDescription className="text-base sm:text-lg text-muted-foreground">
                  {selectedPost.excerpt.replace('...', '')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Author and Meta Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={selectedPost.author_avatar}
                      alt={selectedPost.author}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-poker-primary">{selectedPost.author}</p>
                      <p className="text-sm text-muted-foreground">{selectedPost.author_role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="hidden sm:inline">{new Date(selectedPost.published_at).toLocaleDateString('ru-RU')}</span>
                      <span className="sm:hidden">{new Date(selectedPost.published_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedPost.read_time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedPost.views}
                    </div>
                  </div>
                </div>
                
                {/* Article Image */}
                <div className="relative rounded-lg overflow-hidden">
                  <img 
                    src={selectedPost.image}
                    alt={selectedPost.title}
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                </div>
                
                {/* Article Content */}
                <div className="prose prose-sm sm:prose-base max-w-none text-foreground">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
                </div>
                
                {/* Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-border gap-4">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4 mr-2" />
                      {selectedPost.likes}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      Поделиться
                    </Button>
                  </div>
                  
                  <DialogClose asChild>
                    <Button variant="ghost" className="w-full sm:w-auto">
                      Закрыть
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
