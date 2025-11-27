import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { useCMSContent } from "@/hooks/useCMSContent";
import { supabase } from "@/integrations/supabase/client";
import { ScrollProgress } from "@/components/ScrollProgress";
import { FloatingParticles } from "@/components/ui/floating-particles";
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
      author: "EPC Team",
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
  const heroSubtitle = cmsContent['hero_subtitle'] || 'Блог EPC';
  const heroDescription = cmsContent['hero_description'] || 'Экспертные статьи, анализ раздач, стратегии и инсайты от профессионалов EPC';

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
      <>
        <ScrollProgress />
        <div className="min-h-screen bg-background relative">
          <div className="fixed inset-0 industrial-texture opacity-50" />
          <Header />
          <div className="flex items-center justify-center py-20 pt-24 md:pt-20 relative z-20">
            <div className="w-12 h-12 border-2 border-syndikate-orange border-t-transparent rounded-full animate-spin" />
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <ScrollProgress />
      <FloatingParticles />
      <div className="min-h-screen bg-background relative">
        {/* Industrial metal base texture */}
        <div className="fixed inset-0 pointer-events-none industrial-texture opacity-50 z-0" />

        {/* Metal grid overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px),
              repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.04) 48px, rgba(255,255,255,0.04) 49px)
            `,
          }}
        />

        {/* Neon glows */}
        <div className="fixed top-0 left-1/4 w-[520px] h-[520px] bg-syndikate-orange/25 rounded-full blur-[160px] opacity-80 animate-pulse" />
        <div className="fixed bottom-0 right-1/4 w-[520px] h-[520px] bg-syndikate-red/20 rounded-full blur-[160px] opacity-80 animate-pulse" />

        {/* Side rails */}
        <div className="fixed inset-y-0 left-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed inset-y-0 right-0 w-[3px] bg-gradient-to-b from-syndikate-orange/70 via-syndikate-red/40 to-transparent shadow-neon-orange pointer-events-none z-10" />
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-syndikate-orange/80 to-transparent pointer-events-none z-10" />

        <Header />
      
        <main className="pt-24 md:pt-20 relative z-20">
          {/* Hero Section */}
          <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
                    <BookOpen className="h-6 w-6 text-background" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-wider uppercase">
                    {heroTitle}
                  </h1>
                </div>
                <div className="h-[2px] w-20 bg-syndikate-orange mx-auto mb-6"></div>
                <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed px-4 sm:px-0 font-mono uppercase tracking-wider">
                  {heroDescription}
                </p>
              </div>
            </div>
          </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
          <div className="grid lg:grid-cols-4 gap-6 md:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8 md:space-y-10 lg:space-y-12">
              {/* Featured Article */}
              {featuredPost && (
                <article className="brutal-metal brutal-border overflow-hidden hover:shadow-neon-orange transition-all duration-300 relative group">
                  <div className="relative">
                    <img 
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-48 sm:h-56 md:h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <Badge className="absolute top-3 left-3 md:top-4 md:left-4 bg-syndikate-orange brutal-border text-background font-bold uppercase tracking-wider text-xs md:text-sm shadow-neon-orange">
                      РЕКОМЕНДУЕМ
                    </Badge>
                  </div>
                  
                   <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuredPost.tags.map((tag) => (
                        <Badge key={tag} className="bg-syndikate-orange/20 text-syndikate-orange brutal-border text-xs uppercase tracking-wider">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-foreground tracking-wider uppercase">
                      {featuredPost.title}
                    </h2>
                    
                    <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base lg:text-lg leading-relaxed font-mono uppercase tracking-wide">
                      {featuredPost.excerpt}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
                      <div className="flex items-center gap-3 md:gap-4">
                        <img 
                          src={featuredPost.author_avatar}
                          alt={featuredPost.author}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10"
                        />
                         <div>
                          <p className="font-bold text-foreground text-sm md:text-base uppercase tracking-wider">{featuredPost.author}</p>
                          <p className="text-xs md:text-sm text-muted-foreground font-mono uppercase">{featuredPost.author_role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">{new Date(featuredPost.published_at).toLocaleDateString('ru-RU')}</span>
                          <span className="sm:hidden">{new Date(featuredPost.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          {featuredPost.read_time}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 md:w-4 md:h-4" />
                          {featuredPost.views}
                        </div>
                      </div>
                    </div>
                    
                    {/* Article Content Preview */}
                    <div className="prose prose-sm md:prose-lg max-w-none text-muted-foreground font-mono">
                      <div dangerouslySetInnerHTML={{ 
                        __html: featuredPost.content.substring(0, 400) + "..." 
                      }} />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 md:mt-8 pt-4 md:pt-6 border-t border-syndikate-orange/30 gap-4">
                      <div className="flex items-center gap-2 md:gap-4">
                        <Button className="brutal-metal brutal-border text-syndikate-orange hover:bg-syndikate-orange/10 text-xs md:text-sm uppercase tracking-wider" size="sm">
                          <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          {featuredPost.likes}
                        </Button>
                        <Button className="brutal-metal brutal-border text-syndikate-orange hover:bg-syndikate-orange/10 text-xs md:text-sm uppercase tracking-wider" size="sm">
                          <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">ПОДЕЛИТЬСЯ</span>
                          <span className="sm:hidden">SHARE</span>
                        </Button>
                      </div>
                      
                      <Button 
                        className="bg-syndikate-orange brutal-border text-background hover:bg-syndikate-orange/90 shadow-neon-orange hover:shadow-neon-orange/70 transition-all duration-300 text-sm md:text-base uppercase tracking-wider font-bold"
                        onClick={() => openPostModal(featuredPost)}
                      >
                        <span className="hidden sm:inline">ЧИТАТЬ ПОЛНОСТЬЮ</span>
                        <span className="sm:hidden">ЧИТАТЬ</span>
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                      </Button>
                    </div>
                  </div>
                </article>
              )}

              {/* Search and Filter */}
              <div className="brutal-metal brutal-border p-4 md:p-6 mb-6 md:mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="ПОИСК СТАТЕЙ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 brutal-metal brutal-border text-foreground placeholder:text-muted-foreground font-mono uppercase tracking-wider"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        className={selectedCategory === category.name 
                          ? "bg-syndikate-orange brutal-border text-background whitespace-nowrap text-xs md:text-sm flex-shrink-0 uppercase tracking-wider font-bold" 
                          : "brutal-metal brutal-border text-syndikate-orange hover:bg-syndikate-orange/10 whitespace-nowrap text-xs md:text-sm flex-shrink-0 uppercase tracking-wider"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(category.name)}
                      >
                        <category.icon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">{category.name.toUpperCase()} ({category.count})</span>
                        <span className="sm:hidden">{category.name.toUpperCase()}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Other Articles */}
              {filteredPosts.length > 0 ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground tracking-wider uppercase">
                      <span className="hidden sm:inline">{selectedCategory === "Все" ? "ВСЕ СТАТЬИ" : `КАТЕГОРИЯ: ${selectedCategory.toUpperCase()}`}</span>
                      <span className="sm:hidden">{selectedCategory === "Все" ? "СТАТЬИ" : selectedCategory.toUpperCase()}</span>
                    </h3>
                    <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border text-xs md:text-sm uppercase tracking-wider">
                      {filteredPosts.length} {filteredPosts.length === 1 ? 'СТАТЬЯ' : 'СТАТЕЙ'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredPosts.map((post) => (
                      <Card key={post.id} className="group brutal-metal brutal-border hover:shadow-neon-orange hover:-translate-y-1 md:hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative overflow-hidden">
                          <img 
                            src={post.image}
                            alt={post.title}
                            className="w-full h-40 md:h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute top-2 left-2 md:top-3 md:left-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} className="bg-syndikate-orange/20 text-syndikate-orange brutal-border mb-1 mr-1 text-xs uppercase tracking-wider">
                                {tag.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <CardContent className="p-4 md:p-6">
                          <h4 className="text-base md:text-lg font-bold mb-2 md:mb-3 text-foreground group-hover:text-syndikate-orange transition-colors line-clamp-2 tracking-wider uppercase">
                            {post.title}
                          </h4>
                          
                          <p className="text-muted-foreground mb-3 md:mb-4 text-xs md:text-sm leading-relaxed line-clamp-3 font-mono uppercase tracking-wide">
                            {post.excerpt}
                          </p>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground mb-3 md:mb-4 gap-2 font-mono">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              <span className="truncate">{post.author}</span>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3">
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
                            className="w-full brutal-metal brutal-border text-syndikate-orange hover:bg-syndikate-orange/10 transition-all text-sm uppercase tracking-wider font-bold"
                            onClick={() => openPostModal(post)}
                          >
                            <span className="hidden sm:inline">ЧИТАТЬ ДАЛЕЕ</span>
                            <span className="sm:hidden">ЧИТАТЬ</span>
                            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 brutal-metal brutal-border relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
                  <div className="text-muted-foreground mb-4 font-mono uppercase tracking-wider">
                    {searchTerm || selectedCategory !== "Все" 
                      ? "ПО ВАШЕМУ ЗАПРОСУ НИЧЕГО НЕ НАЙДЕНО"
                      : "СКОРО ЗДЕСЬ ПОЯВЯТСЯ СТАТЬИ"
                    }
                  </div>
                  {(searchTerm || selectedCategory !== "Все") && (
                    <Button 
                      className="brutal-metal brutal-border text-syndikate-orange hover:bg-syndikate-orange/10 uppercase tracking-wider font-bold"
                      onClick={() => { setSearchTerm(""); setSelectedCategory("Все"); }}
                    >
                      СБРОСИТЬ ФИЛЬТРЫ
                    </Button>
                  )}
                </div>
              )}

              {/* No posts message */}
              {posts.length === 0 && (
                <div className="text-center py-12 brutal-metal brutal-border relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange" />
                  <h3 className="text-xl font-bold text-foreground mb-2 tracking-wider uppercase">
                    СКОРО ЗДЕСЬ ПОЯВЯТСЯ СТАТЬИ
                  </h3>
                  <p className="text-muted-foreground font-mono uppercase tracking-wide">
                    НАШИ ЭКСПЕРТЫ ГОТОВЯТ ДЛЯ ВАС ИНТЕРЕСНЫЕ МАТЕРИАЛЫ О ПОКЕРЕ
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Categories */}
              <Card className="brutal-metal brutal-border relative overflow-hidden">
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange" />
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground font-bold tracking-wider uppercase">
                    <BookOpen className="w-5 h-5 mr-2 text-syndikate-orange" />
                    КАТЕГОРИИ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        className={`w-full flex items-center justify-between p-3 brutal-border transition-all text-left ${
                          selectedCategory === category.name 
                            ? 'bg-syndikate-orange/10 border-syndikate-orange' 
                            : 'hover:bg-syndikate-orange/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-4 h-4 ${
                            selectedCategory === category.name ? 'text-syndikate-orange' : 'text-muted-foreground'
                          }`} />
                          <span className={`font-bold uppercase tracking-wider ${
                            selectedCategory === category.name ? 'text-syndikate-orange' : 'text-foreground'
                          }`}>
                            {category.name.toUpperCase()}
                          </span>
                        </div>
                        <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border text-xs font-mono">
                          {category.count}
                        </Badge>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Newsletter */}
              <Card className="brutal-metal brutal-border relative overflow-hidden">
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-syndikate-orange" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-syndikate-orange" />
                <CardContent className="p-6 text-center">
                  <h4 className="text-lg font-bold mb-3 text-foreground tracking-wider uppercase">
                    ПОКЕРНАЯ РАССЫЛКА
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 font-mono uppercase tracking-wide">
                    ПОЛУЧАЙТЕ ЛУЧШИЕ СТАТЬИ И ЭКСКЛЮЗИВНЫЕ МАТЕРИАЛЫ
                  </p>
                  <div className="space-y-3">
                    <Input 
                      type="email" 
                      placeholder="ВАШ EMAIL"
                      className="brutal-metal brutal-border text-foreground placeholder:text-muted-foreground font-mono uppercase tracking-wider"
                    />
                    <Button className="w-full bg-syndikate-orange brutal-border text-background hover:bg-syndikate-orange/90 shadow-neon-orange hover:shadow-neon-orange/70 transition-all duration-300 uppercase tracking-wider font-bold">
                      ПОДПИСАТЬСЯ
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Articles */}
              <Card className="brutal-metal brutal-border relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center text-white font-light tracking-wide">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Популярное
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {posts.slice(0, 3).map((post, index) => (
                    <div key={post.id} className="flex gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-sm font-light text-white shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-light text-sm text-white group-hover:text-amber-400 transition-colors leading-tight line-clamp-2">
                          {post.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 text-white">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedPost.tags.map((tag) => (
                    <Badge key={tag} className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <DialogTitle className="text-2xl font-light text-white tracking-wide">
                  {selectedPost.title}
                </DialogTitle>
                <DialogDescription className="text-lg text-white/70 font-light">
                  {selectedPost.excerpt.replace('...', '')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Author and Meta Info */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={selectedPost.author_avatar}
                      alt={selectedPost.author}
                      className="w-12 h-12 rounded-full border border-white/10"
                    />
                    <div>
                      <p className="font-light text-white">{selectedPost.author}</p>
                      <p className="text-sm text-white/60">{selectedPost.author_role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedPost.published_at).toLocaleDateString('ru-RU')}
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
                <div className="relative rounded-lg overflow-hidden border border-white/10">
                  <img 
                    src={selectedPost.image}
                    alt={selectedPost.title}
                    className="w-full h-64 object-cover"
                  />
                </div>
                
                {/* Article Content */}
                <div className="prose prose-lg max-w-none text-white/70 prose-headings:text-white prose-strong:text-white prose-a:text-amber-400">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <Button className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl" size="sm">
                      <Heart className="w-4 h-4 mr-2" />
                      {selectedPost.likes}
                    </Button>
                    <Button className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      Поделиться
                    </Button>
                  </div>
                  
                  <DialogClose asChild>
                    <Button className="bg-white/5 text-white hover:bg-white/10">
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
    </>
  );
}
