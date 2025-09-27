import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, Edit, Eye, Upload, Heart, Calendar, Clock, User } from "lucide-react";

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

interface BlogContent {
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
}

export function BlogPageEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [content, setContent] = useState<BlogContent>({
    hero_title: "Покерная мудрость и аналитика",
    hero_subtitle: "Блог IPS",
    hero_description: "Экспертные статьи, анализ раздач, стратегии и инсайты от профессионалов IPS"
  });

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [newPost, setNewPost] = useState<Partial<BlogPost>>({
    title: "",
    excerpt: "",
    content: "",
    author: "",
    author_role: "",
    author_avatar: "",
    read_time: "5 мин",
    image: "",
    tags: [],
    is_featured: false,
    is_published: true
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Загружаем контент страницы
      const { data: pageData, error: pageError } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'blog')
        .eq('is_active', true)
        .order('content_key');

      if (pageError) throw pageError;

      if (pageData && pageData.length > 0) {
        const contentObj: any = {};
        const postsData: any = {};
        
        pageData.forEach(item => {
          if (item.content_type === 'json') {
            contentObj[item.content_key] = JSON.parse(item.content_value || '[]');
          } else if (item.content_key.startsWith('post_')) {
            // Парсим отдельные записи постов
            const match = item.content_key.match(/post_(\d+)_(.+)/);
            if (match) {
              const postNumber = match[1];
              const fieldName = match[2];
              
              if (!postsData[postNumber]) {
                postsData[postNumber] = { id: `post_${postNumber}` };
              }
              
              postsData[postNumber][fieldName] = item.content_value;
            }
          } else {
            contentObj[item.content_key] = item.content_value || '';
          }
        });

        // Обновляем заголовки только если они есть в базе
        if (contentObj.hero_title || contentObj.hero_subtitle || contentObj.hero_description) {
          setContent(prev => ({ 
            ...prev, 
            hero_title: contentObj.hero_title || prev.hero_title,
            hero_subtitle: contentObj.hero_subtitle || prev.hero_subtitle,
            hero_description: contentObj.hero_description || prev.hero_description
          }));
        }

        // Преобразуем данные постов в нужный формат
        if (Object.keys(postsData).length > 0) {
          const formattedPosts = Object.keys(postsData).map(postNumber => ({
            id: `post_${postNumber}`,
            title: postsData[postNumber].title || '',
            excerpt: postsData[postNumber].content ? postsData[postNumber].content.substring(0, 150) + '...' : '',
            content: postsData[postNumber].content || '',
            author: "IPS Team",
            author_role: "Эксперт по покеру",
            author_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
            published_at: new Date().toISOString().split('T')[0],
            read_time: "5 мин",
            views: Math.floor(Math.random() * 1000),
            likes: Math.floor(Math.random() * 100),
            image: postsData[postNumber].image || 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=200&fit=crop',
            tags: ["Стратегия", "Покер"],
            is_featured: false,
            is_published: true
          }));
          setPosts(formattedPosts);
        } else if (contentObj.posts) {
          setPosts(contentObj.posts);
        }
      }
    } catch (error) {
      console.error('Error fetching blog content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент блога",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      setNewPost(prev => ({ ...prev, image: publicUrl }));
      toast({
        title: "Изображение загружено",
        description: "Изображение успешно загружено в галерею",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const contentItems = [
        ...Object.entries(content).map(([key, value]) => ({
          page_slug: 'blog',
          content_key: key,
          content_value: value,
          content_type: 'text',
          is_active: true
        })),
        {
          page_slug: 'blog',
          content_key: 'posts',
          content_value: JSON.stringify(posts),
          content_type: 'json',
          is_active: true
        }
      ];

      // Удаляем существующий контент для этой страницы
      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'blog');

      // Вставляем новый контент
      const { error } = await supabase
        .from('cms_content')
        .insert(contentItems);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Контент блога сохранен"
      });
    } catch (error) {
      console.error('Error saving blog content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить контент",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addPost = async () => {
    const post: BlogPost = {
      id: Date.now().toString(),
      title: newPost.title || "",
      excerpt: newPost.excerpt || "",
      content: newPost.content || "",
      author: newPost.author || "IPS Team",
      author_role: newPost.author_role || "Эксперт по покеру",
      author_avatar: newPost.author_avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
      published_at: new Date().toISOString().split('T')[0],
      read_time: newPost.read_time || "5 мин",
      views: Math.floor(Math.random() * 1000),
      likes: Math.floor(Math.random() * 100),
      image: newPost.image || "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=200&fit=crop",
      tags: newPost.tags || ["Стратегия", "Покер"],
      is_featured: newPost.is_featured || false,
      is_published: newPost.is_published || true
    };

    const updatedPosts = [...posts, post];
    setPosts(updatedPosts);
    
    // Автоматически сохраняем в базу данных
    try {
      setSaving(true);
      const contentItems = [
        ...Object.entries(content).map(([key, value]) => ({
          page_slug: 'blog',
          content_key: key,
          content_value: value,
          content_type: 'text',
          is_active: true
        })),
        {
          page_slug: 'blog',
          content_key: 'posts',
          content_value: JSON.stringify(updatedPosts),
          content_type: 'json',
          is_active: true
        }
      ];

      // Удаляем существующий контент для этой страницы
      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'blog');

      // Вставляем новый контент
      const { error } = await supabase
        .from('cms_content')
        .insert(contentItems);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Новая статья добавлена и сохранена"
      });
    } catch (error) {
      console.error('Error saving blog content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить новую статью",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
    
    resetNewPost();
  };

  const resetNewPost = () => {
    setNewPost({
      title: "",
      excerpt: "",
      content: "",
      author: "",
      author_role: "",
      author_avatar: "",
      read_time: "5 мин",
      image: "",
      tags: [],
      is_featured: false,
      is_published: true
    });
    setEditingPost(null);
  };

  const removePost = async (id: string) => {
    const updatedPosts = posts.filter(post => post.id !== id);
    setPosts(updatedPosts);
    
    // Автоматически сохраняем в базу данных
    try {
      setSaving(true);
      const contentItems = [
        ...Object.entries(content).map(([key, value]) => ({
          page_slug: 'blog',
          content_key: key,
          content_value: value,
          content_type: 'text',
          is_active: true
        })),
        {
          page_slug: 'blog',
          content_key: 'posts',
          content_value: JSON.stringify(updatedPosts),
          content_type: 'json',
          is_active: true
        }
      ];

      // Удаляем существующий контент для этой страницы
      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'blog');

      // Вставляем новый контент
      const { error } = await supabase
        .from('cms_content')
        .insert(contentItems);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Статья удалена"
      });
    } catch (error) {
      console.error('Error saving blog content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить статью",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditPost = (post: BlogPost) => {
    setNewPost(post);
    setEditingPost(post.id);
  };

  const saveEditPost = async () => {
    if (editingPost && newPost) {
      const updatedPosts = posts.map(post => 
        post.id === editingPost ? { ...post, ...newPost } as BlogPost : post
      );
      setPosts(updatedPosts);
      
      // Автоматически сохраняем в базу данных
      try {
        setSaving(true);
        const contentItems = [
          ...Object.entries(content).map(([key, value]) => ({
            page_slug: 'blog',
            content_key: key,
            content_value: value,
            content_type: 'text',
            is_active: true
          })),
          {
            page_slug: 'blog',
            content_key: 'posts',
            content_value: JSON.stringify(updatedPosts),
            content_type: 'json',
            is_active: true
          }
        ];

        // Удаляем существующий контент для этой страницы
        await supabase
          .from('cms_content')
          .delete()
          .eq('page_slug', 'blog');

        // Вставляем новый контент
        const { error } = await supabase
          .from('cms_content')
          .insert(contentItems);

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "Статья обновлена и сохранена"
        });
      } catch (error) {
        console.error('Error saving blog content:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить изменения",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
      
      resetNewPost();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-poker-primary">Редактор блога</h2>
          <p className="text-muted-foreground">
            Управление статьями и контентом блога как на главной странице
          </p>
        </div>
        <Button onClick={saveContent} disabled={saving} className="bg-gradient-button">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить все
        </Button>
      </div>

      {/* Hero Section */}
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="text-poker-primary">Главная секция блога</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Подзаголовок (бейдж)</label>
            <Input
              value={content.hero_subtitle}
              onChange={(e) => setContent(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              placeholder="Блог IPS"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Главный заголовок</label>
            <Input
              value={content.hero_title}
              onChange={(e) => setContent(prev => ({ ...prev, hero_title: e.target.value }))}
              placeholder="Покерная мудрость и аналитика"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={content.hero_description}
              onChange={(e) => setContent(prev => ({ ...prev, hero_description: e.target.value }))}
              rows={2}
              placeholder="Экспертные статьи, анализ раздач, стратегии и инсайты..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Post Form */}
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="text-poker-primary">
            {editingPost ? "Редактировать статью" : "Добавить новую статью"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Заголовок</label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Заголовок статьи"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Время чтения</label>
              <Input
                value={newPost.read_time}
                onChange={(e) => setNewPost(prev => ({ ...prev, read_time: e.target.value }))}
                placeholder="5 мин"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium">Изображение статьи</label>
            <div className="space-y-3">
              <Input
                value={newPost.image}
                onChange={(e) => setNewPost(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleImageUpload(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingImage ? "Загрузка..." : "Загрузить изображение"}
                </Button>
                {newPost.image && (
                  <div className="relative">
                    <img
                      src={newPost.image}
                      alt="Preview"
                      className="w-20 h-12 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium">Краткое описание</label>
            <Textarea
              value={newPost.excerpt}
              onChange={(e) => setNewPost(prev => ({ ...prev, excerpt: e.target.value }))}
              rows={3}
              placeholder="Краткое описание статьи для карточки..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Полное содержание</label>
            <Textarea
              value={newPost.content}
              onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
              rows={10}
              placeholder="Полный текст статьи..."
            />
          </div>

          {/* Author Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Автор</label>
              <Input
                value={newPost.author}
                onChange={(e) => setNewPost(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Имя автора"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Должность</label>
              <Input
                value={newPost.author_role}
                onChange={(e) => setNewPost(prev => ({ ...prev, author_role: e.target.value }))}
                placeholder="Должность автора"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Аватар автора (URL)</label>
              <Input
                value={newPost.author_avatar}
                onChange={(e) => setNewPost(prev => ({ ...prev, author_avatar: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium">Теги (через запятую)</label>
            <Input
              value={newPost.tags?.join(', ') || ''}
              onChange={(e) => setNewPost(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
              }))}
              placeholder="Стратегия, Покер, Анализ, ELO"
            />
          </div>

          {/* Settings */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.is_featured}
                onCheckedChange={(checked) => setNewPost(prev => ({ ...prev, is_featured: checked }))}
              />
              <label className="text-sm font-medium">Рекомендуемая статья</label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.is_published}
                onCheckedChange={(checked) => setNewPost(prev => ({ ...prev, is_published: checked }))}
              />
              <label className="text-sm font-medium">Опубликована</label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {editingPost ? (
              <>
                <Button onClick={saveEditPost} className="bg-gradient-button">
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </Button>
                <Button onClick={resetNewPost} variant="outline">
                  Отмена
                </Button>
              </>
            ) : (
              <Button onClick={addPost} className="bg-gradient-button" disabled={!newPost.title}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить статью
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="text-poker-primary">Статьи блога ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                Пока нет статей в блоге
              </div>
              <p className="text-sm text-muted-foreground">
                Добавьте первую статью, используя форму выше
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="border border-border/50 rounded-lg overflow-hidden bg-gradient-card">
                  <div className="flex">
                    {/* Image */}
                    <div className="w-48 h-32 flex-shrink-0 relative">
                      {post.image ? (
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Нет изображения</span>
                        </div>
                      )}
                      {post.is_featured && (
                        <Badge className="absolute top-2 left-2 bg-poker-accent text-white border-0">
                          Рекомендуем
                        </Badge>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-poker-primary line-clamp-1">
                              {post.title}
                            </h3>
                            <Badge variant={post.is_published ? 'default' : 'secondary'}>
                              {post.is_published ? 'Опубликовано' : 'Черновик'}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {post.excerpt}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {post.author} • {post.author_role}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.published_at).toLocaleDateString('ru-RU')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.read_time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {post.views}
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {post.likes}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {post.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditPost(post)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePost(post.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}