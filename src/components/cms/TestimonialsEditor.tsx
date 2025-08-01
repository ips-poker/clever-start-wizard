import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, Edit, Star, User } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  rating: number;
  status: string;
  text: string;
  avatar: string;
  time: string;
  verified: boolean;
  display_order: number;
  is_active: boolean;
}

interface TestimonialsContent {
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
}

export function TestimonialsEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<string | null>(null);
  
  const [content, setContent] = useState<TestimonialsContent>({
    hero_title: "Что говорят наши игроки?",
    hero_subtitle: "Отзывы игроков",
    hero_description: "Присоединяйтесь к сообществу довольных игроков, которые улучшили свои навыки с IPS"
  });

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newTestimonial, setNewTestimonial] = useState<Partial<Testimonial>>({
    name: "",
    rating: 1200,
    status: "Player",
    text: "",
    avatar: "",
    time: "сегодня",
    verified: false,
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data: pageData, error: pageError } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'testimonials')
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

        if (contentObj.testimonials) {
          setTestimonials(contentObj.testimonials);
        }
      }
    } catch (error) {
      console.error('Error fetching testimonials content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить отзывы",
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
          page_slug: 'testimonials',
          content_key: key,
          content_value: value,
          content_type: 'text'
        })),
        {
          page_slug: 'testimonials',
          content_key: 'testimonials',
          content_value: JSON.stringify(testimonials),
          content_type: 'json'
        }
      ];

      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'testimonials');

      const { error } = await supabase
        .from('cms_content')
        .insert(contentItems);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Отзывы сохранены"
      });
    } catch (error) {
      console.error('Error saving testimonials:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить отзывы",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addTestimonial = () => {
    const testimonial: Testimonial = {
      id: Date.now().toString(),
      name: newTestimonial.name || "",
      rating: newTestimonial.rating || 1200,
      status: newTestimonial.status || "Player",
      text: newTestimonial.text || "",
      avatar: newTestimonial.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
      time: newTestimonial.time || "сегодня",
      verified: newTestimonial.verified || false,
      display_order: testimonials.length,
      is_active: newTestimonial.is_active || true
    };

    setTestimonials([...testimonials, testimonial]);
    setNewTestimonial({
      name: "",
      rating: 1200,
      status: "Player",
      text: "",
      avatar: "",
      time: "сегодня",
      verified: false,
      display_order: 0,
      is_active: true
    });
    setEditingTestimonial(null);
  };

  const removeTestimonial = (id: string) => {
    setTestimonials(testimonials.filter(testimonial => testimonial.id !== id));
  };

  const updateTestimonial = (id: string, field: keyof Testimonial, value: any) => {
    setTestimonials(testimonials.map(testimonial => 
      testimonial.id === id ? { ...testimonial, [field]: value } : testimonial
    ));
  };

  const startEditTestimonial = (testimonial: Testimonial) => {
    setNewTestimonial(testimonial);
    setEditingTestimonial(testimonial.id);
  };

  const saveEditTestimonial = () => {
    if (editingTestimonial && newTestimonial) {
      Object.keys(newTestimonial).forEach(key => {
        updateTestimonial(editingTestimonial, key as keyof Testimonial, (newTestimonial as any)[key]);
      });
      
      setNewTestimonial({
        name: "",
        rating: 1200,
        status: "Player",
        text: "",
        avatar: "",
        time: "сегодня",
        verified: false,
        display_order: 0,
        is_active: true
      });
      setEditingTestimonial(null);
    }
  };

  const cancelEdit = () => {
    setNewTestimonial({
      name: "",
      rating: 1200,
      status: "Player",
      text: "",
      avatar: "",
      time: "сегодня",
      verified: false,
      display_order: 0,
      is_active: true
    });
    setEditingTestimonial(null);
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
          <h2 className="text-2xl font-bold">Редактор отзывов</h2>
          <p className="text-muted-foreground">
            Управление отзывами игроков на сайте
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
          <CardTitle>Заголовок секции отзывов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Заголовок</label>
            <Input
              value={content.hero_title}
              onChange={(e) => setContent(prev => ({ ...prev, hero_title: e.target.value }))}
              placeholder="Что говорят наши игроки?"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Подзаголовок</label>
            <Input
              value={content.hero_subtitle}
              onChange={(e) => setContent(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              placeholder="Отзывы игроков"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={content.hero_description}
              onChange={(e) => setContent(prev => ({ ...prev, hero_description: e.target.value }))}
              rows={2}
              placeholder="Описание секции отзывов..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Testimonial Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingTestimonial ? "Редактировать отзыв" : "Добавить отзыв"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Имя</label>
              <Input
                value={newTestimonial.name}
                onChange={(e) => setNewTestimonial(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Имя игрока"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Рейтинг ELO</label>
              <Input
                type="number"
                value={newTestimonial.rating}
                onChange={(e) => setNewTestimonial(prev => ({ ...prev, rating: parseInt(e.target.value) || 1200 }))}
                placeholder="1200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Статус игрока</label>
              <Input
                value={newTestimonial.status}
                onChange={(e) => setNewTestimonial(prev => ({ ...prev, status: e.target.value }))}
                placeholder="Player, Advanced, Elite Player, Master"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Время</label>
              <Input
                value={newTestimonial.time}
                onChange={(e) => setNewTestimonial(prev => ({ ...prev, time: e.target.value }))}
                placeholder="2 часа назад"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Текст отзыва</label>
            <Textarea
              value={newTestimonial.text}
              onChange={(e) => setNewTestimonial(prev => ({ ...prev, text: e.target.value }))}
              rows={4}
              placeholder="Отзыв игрока..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Аватар (URL)</label>
            <Input
              value={newTestimonial.avatar}
              onChange={(e) => setNewTestimonial(prev => ({ ...prev, avatar: e.target.value }))}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={newTestimonial.verified}
                onCheckedChange={(checked) => setNewTestimonial(prev => ({ ...prev, verified: checked }))}
              />
              <label className="text-sm font-medium">Верифицированный</label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newTestimonial.is_active}
                onCheckedChange={(checked) => setNewTestimonial(prev => ({ ...prev, is_active: checked }))}
              />
              <label className="text-sm font-medium">Активный</label>
            </div>
          </div>

          <div className="flex gap-2">
            {editingTestimonial ? (
              <>
                <Button onClick={saveEditTestimonial} className="bg-gradient-button">
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </Button>
                <Button onClick={cancelEdit} variant="outline">
                  Отмена
                </Button>
              </>
            ) : (
              <Button onClick={addTestimonial} className="bg-gradient-button">
                <Plus className="w-4 h-4 mr-2" />
                Добавить отзыв
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Testimonials List */}
      <Card>
        <CardHeader>
          <CardTitle>Отзывы ({testimonials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {testimonials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Пока нет отзывов. Добавьте первый отзыв выше.
            </div>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <img 
                            src={testimonial.avatar} 
                            alt={testimonial.name}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face';
                            }}
                          />
                          <h3 className="font-semibold">{testimonial.name}</h3>
                        </div>
                        
                        <Badge className="bg-poker-accent/10 text-poker-accent">
                          {testimonial.rating} ELO
                        </Badge>
                        
                        {testimonial.verified && (
                          <Badge className="bg-poker-accent text-white">Верифицирован</Badge>
                        )}
                        {!testimonial.is_active && (
                          <Badge variant="outline">Скрыт</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {testimonial.text}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Статус: {testimonial.status}</span>
                        <span>Время: {testimonial.time}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-poker-accent" />
                          5.0
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditTestimonial(testimonial)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTestimonial(testimonial.id)}
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