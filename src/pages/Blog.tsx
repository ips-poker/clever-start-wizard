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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex items-center justify-center py-20 pt-24 md:pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="pt-24 md:pt-20">
        {/* Hero Section */}
        <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 text-amber-400/40 text-5xl animate-pulse">♠</div>
            <div className="absolute top-20 right-20 text-amber-400/30 text-4xl animate-bounce-subtle">♣</div>
            <div className="absolute bottom-10 left-20 text-amber-400/35 text-6xl animate-pulse">♥</div>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-wide">
                  {heroTitle}
                </h1>
              </div>
              <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
              <p className="text-base md:text-lg lg:text-xl text-white/70 leading-relaxed px-4 sm:px-0 font-light">
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
                <article className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300">
                  <div className="relative">
                    <img 
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-48 sm:h-56 md:h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <Badge className="absolute top-3 left-3 md:top-4 md:left-4 bg-amber-500/20 text-amber-400 border-amber-500/30 backdrop-blur-xl text-xs md:text-sm">
                      Рекомендуем
                    </Badge>
                  </div>
                  
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuredPost.tags.map((tag) => (
                        <Badge key={tag} className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-light mb-3 md:mb-4 text-white tracking-wide">
                      {featuredPost.title}
                    </h2>
                    
                    <p className="text-white/70 mb-4 md:mb-6 text-sm md:text-base lg:text-lg leading-relaxed font-light">
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
                          <p className="font-light text-white text-sm md:text-base">{featuredPost.author}</p>
                          <p className="text-xs md:text-sm text-white/60">{featuredPost.author_role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-white/60 flex-wrap">
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
                    <div className="prose prose-sm md:prose-lg max-w-none text-white/70">
                      <div dangerouslySetInnerHTML={{ 
                        __html: featuredPost.content.substring(0, 400) + "..." 
                      }} />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10 gap-4">
                      <div className="flex items-center gap-2 md:gap-4">
                        <Button className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl text-xs md:text-sm" size="sm">
                          <Heart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          {featuredPost.likes}
                        </Button>
                        <Button className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl text-xs md:text-sm" size="sm">
                          <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Поделиться</span>
                          <span className="sm:hidden">Share</span>
                        </Button>
                      </div>
                      
                      <Button 
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 text-sm md:text-base"
                        onClick={() => openPostModal(featuredPost)}
                      >
                        <span className="hidden sm:inline">Читать полностью</span>
                        <span className="sm:hidden">Читать</span>
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                      </Button>
                    </div>
                  </div>
                </article>
              )}

              {/* Search and Filter */}
              <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-xl mb-6 md:mb-8">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
                    <Input
                      placeholder="Поиск статей..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        className={selectedCategory === category.name 
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white whitespace-nowrap text-xs md:text-sm flex-shrink-0" 
                          : "bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl whitespace-nowrap text-xs md:text-sm flex-shrink-0"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(category.name)}
                      >
                        <category.icon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">{category.name} ({category.count})</span>
                        <span className="sm:hidden">{category.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Other Articles */}
              {filteredPosts.length > 0 ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-light text-white tracking-wide">
                      <span className="hidden sm:inline">{selectedCategory === "Все" ? "Все статьи" : `Категория: ${selectedCategory}`}</span>
                      <span className="sm:hidden">{selectedCategory === "Все" ? "Статьи" : selectedCategory}</span>
                    </h3>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs md:text-sm">
                      {filteredPosts.length} {filteredPosts.length === 1 ? 'статья' : 'статей'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredPosts.map((post) => (
                      <Card key={post.id} className="group bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 md:hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                        <div className="relative overflow-hidden">
                          <img 
                            src={post.image}
                            alt={post.title}
                            className="w-full h-40 md:h-48 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute top-2 left-2 md:top-3 md:left-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} className="bg-amber-500/20 text-amber-400 border-amber-500/30 backdrop-blur-xl border-0 mb-1 mr-1 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <CardContent className="p-4 md:p-6">
                          <h4 className="text-base md:text-lg font-light mb-2 md:mb-3 text-white group-hover:text-amber-400 transition-colors line-clamp-2 tracking-wide">
                            {post.title}
                          </h4>
                          
                          <p className="text-white/70 mb-3 md:mb-4 text-xs md:text-sm leading-relaxed line-clamp-3 font-light">
                            {post.excerpt}
                          </p>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-white/60 mb-3 md:mb-4 gap-2">
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
                            className="w-full bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl transition-all text-sm"
                            onClick={() => openPostModal(post)}
                          >
                            <span className="hidden sm:inline">Читать далее</span>
                            <span className="sm:hidden">Читать</span>
                            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 rounded-2xl backdrop-blur-xl">
                  <div className="text-white/60 mb-4">
                    {searchTerm || selectedCategory !== "Все" 
                      ? "По вашему запросу ничего не найдено"
                      : "Скоро здесь появятся статьи"
                    }
                  </div>
                  {(searchTerm || selectedCategory !== "Все") && (
                    <Button 
                      className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl"
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
                  <h3 className="text-xl font-light text-white mb-2 tracking-wide">
                    Скоро здесь появятся статьи
                  </h3>
                  <p className="text-white/60 font-light">
                    Наши эксперты готовят для вас интересные материалы о покере
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Categories */}
              <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-white font-light tracking-wide">
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
                            ? 'bg-amber-500/10 border border-amber-500/30' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-4 h-4 ${
                            selectedCategory === category.name ? 'text-amber-400' : 'text-white/60'
                          }`} />
                          <span className={`font-light ${
                            selectedCategory === category.name ? 'text-amber-400' : 'text-white'
                          }`}>
                            {category.name}
                          </span>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs">
                          {category.count}
                        </Badge>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Newsletter */}
              <Card className="bg-gradient-to-br from-amber-500/10 via-amber-600/15 to-amber-500/10 border border-amber-500/20 backdrop-blur-xl">
                <CardContent className="p-6 text-center">
                  <h4 className="text-lg font-light mb-3 text-white tracking-wide">
                    Покерная рассылка
                  </h4>
                  <p className="text-sm text-white/70 mb-4 font-light">
                    Получайте лучшие статьи и эксклюзивные материалы на email
                  </p>
                  <div className="space-y-3">
                    <Input 
                      type="email" 
                      placeholder="Ваш email"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />
                    <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300">
                      Подписаться
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Articles */}
              <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl">
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
  );
}
