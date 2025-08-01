import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, Edit, Eye } from "lucide-react";

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
    read_time: "",
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
        .eq('is_active', true);

      if (pageError) throw pageError;

      if (pageData && pageData.length > 0) {
        const contentObj: any = {};
        pageData.forEach(item => {
          if (item.content_type === 'json') {
            contentObj[item.content_key] = JSON.parse(item.content_value || '[]');
          } else {
            contentObj[item.content_key] = item.content_value || '';
          }
        });

        if (contentObj.hero_title) {
          setContent(prev => ({ ...prev, ...contentObj }));
        }

        if (contentObj.posts) {
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

  const saveContent = async () => {
    setSaving(true);
    try {
      const contentItems = [
        ...Object.entries(content).map(([key, value]) => ({
          page_slug: 'blog',
          content_key: key,
          content_value: value,
          content_type: 'text'
        })),
        {
          page_slug: 'blog',
          content_key: 'posts',
          content_value: JSON.stringify(posts),
          content_type: 'json'
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

  const addPost = () => {
    const post: BlogPost = {
      id: Date.now().toString(),
      title: newPost.title || "",
      excerpt: newPost.excerpt || "",
      content: newPost.content || "",
      author: newPost.author || "",
      author_role: newPost.author_role || "",
      author_avatar: newPost.author_avatar || "",
      published_at: new Date().toISOString().split('T')[0],
      read_time: newPost.read_time || "5 мин",
      views: 0,
      likes: 0,
      image: newPost.image || "",
      tags: newPost.tags || [],
      is_featured: newPost.is_featured || false,
      is_published: newPost.is_published || true
    };

    setPosts([...posts, post]);
    setNewPost({
      title: "",
      excerpt: "",
      content: "",
      author: "",
      author_role: "",
      author_avatar: "",
      read_time: "",
      image: "",
      tags: [],
      is_featured: false,
      is_published: true
    });
    setEditingPost(null);
  };

  const removePost = (id: string) => {
    setPosts(posts.filter(post => post.id !== id));
  };

  const updatePost = (id: string, field: keyof BlogPost, value: any) => {
    setPosts(posts.map(post => 
      post.id === id ? { ...post, [field]: value } : post
    ));
  };

  const startEditPost = (post: BlogPost) => {
    setNewPost(post);
    setEditingPost(post.id);
  };

  const saveEditPost = () => {
    if (editingPost && newPost) {
      updatePost(editingPost, 'title', newPost.title);
      updatePost(editingPost, 'excerpt', newPost.excerpt);
      updatePost(editingPost, 'content', newPost.content);
      updatePost(editingPost, 'author', newPost.author);
      updatePost(editingPost, 'author_role', newPost.author_role);
      updatePost(editingPost, 'author_avatar', newPost.author_avatar);
      updatePost(editingPost, 'read_time', newPost.read_time);
      updatePost(editingPost, 'image', newPost.image);
      updatePost(editingPost, 'tags', newPost.tags);
      updatePost(editingPost, 'is_featured', newPost.is_featured);
      updatePost(editingPost, 'is_published', newPost.is_published);
      
      setNewPost({
        title: "",
        excerpt: "",
        content: "",
        author: "",
        author_role: "",
        author_avatar: "",
        read_time: "",
        image: "",
        tags: [],
        is_featured: false,
        is_published: true
      });
      setEditingPost(null);
    }
  };

  const cancelEdit = () => {
    setNewPost({
      title: "",
      excerpt: "",
      content: "",
      author: "",
      author_role: "",
      author_avatar: "",
      read_time: "",
      image: "",
      tags: [],
      is_featured: false,
      is_published: true
    });
    setEditingPost(null);
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
          <h2 className="text-2xl font-bold">Редактор блога</h2>
          <p className="text-muted-foreground">
            Управление статьями и контентом блога
          </p>
        </div>
        <Button onClick={saveContent} disabled={saving} className="bg-gradient-button">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить
        </Button>
      </div>

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Главная секция</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Заголовок</label>
            <Input
              value={content.hero_title}
              onChange={(e) => setContent(prev => ({ ...prev, hero_title: e.target.value }))}
              placeholder="Покерная мудрость и аналитика"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Подзаголовок</label>
            <Input
              value={content.hero_subtitle}
              onChange={(e) => setContent(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              placeholder="Блог IPS"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={content.hero_description}
              onChange={(e) => setContent(prev => ({ ...prev, hero_description: e.target.value }))}
              rows={2}
              placeholder="Описание блога..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Post Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingPost ? "Редактировать статью" : "Добавить статью"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="text-sm font-medium">Краткое описание</label>
            <Textarea
              value={newPost.excerpt}
              onChange={(e) => setNewPost(prev => ({ ...prev, excerpt: e.target.value }))}
              rows={3}
              placeholder="Краткое описание статьи..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Содержание</label>
            <Textarea
              value={newPost.content}
              onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
              rows={8}
              placeholder="Полный текст статьи..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Автор</label>
              <Input
                value={newPost.author}
                onChange={(e) => setNewPost(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Имя автора"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Должность автора</label>
              <Input
                value={newPost.author_role}
                onChange={(e) => setNewPost(prev => ({ ...prev, author_role: e.target.value }))}
                placeholder="Должность"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Аватар автора (URL)</label>
              <Input
                value={newPost.author_avatar}
                onChange={(e) => setNewPost(prev => ({ ...prev, author_avatar: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Изображение статьи (URL)</label>
              <Input
                value={newPost.image}
                onChange={(e) => setNewPost(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Теги (через запятую)</label>
            <Input
              value={newPost.tags?.join(', ') || ''}
              onChange={(e) => setNewPost(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
              }))}
              placeholder="Стратегия, Покер, Анализ"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.is_featured}
                onCheckedChange={(checked) => setNewPost(prev => ({ ...prev, is_featured: checked }))}
              />
              <label className="text-sm font-medium">Рекомендуемая</label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newPost.is_published}
                onCheckedChange={(checked) => setNewPost(prev => ({ ...prev, is_published: checked }))}
              />
              <label className="text-sm font-medium">Опубликована</label>
            </div>
          </div>

          <div className="flex gap-2">
            {editingPost ? (
              <>
                <Button onClick={saveEditPost} className="bg-gradient-button">
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </Button>
                <Button onClick={cancelEdit} variant="outline">
                  Отмена
                </Button>
              </>
            ) : (
              <Button onClick={addPost} className="bg-gradient-button">
                <Plus className="w-4 h-4 mr-2" />
                Добавить статью
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Статьи ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Пока нет статей. Добавьте первую статью выше.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{post.title}</h3>
                        {post.is_featured && (
                          <Badge className="bg-poker-accent text-white">Рекомендуемая</Badge>
                        )}
                        {!post.is_published && (
                          <Badge variant="outline">Черновик</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Автор: {post.author}</span>
                        <span>Время чтения: {post.read_time}</span>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views}
                        </div>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}