import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "./ImageUploader";
import { IconSelector } from "./IconSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Plus, 
  Trash2, 
  Upload, 
  Eye,
  Users,
  Trophy,
  Target,
  Heart,
  Zap,
  Globe,
  Award,
  Loader2,
  Image as ImageIcon
} from "lucide-react";

interface AboutContent {
  [key: string]: string;
}

export function AboutPageEditor() {
  const [content, setContent] = useState<AboutContent>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'about')
        .eq('is_active', true);

      if (error) throw error;

      const contentObj = (data || []).reduce((acc: AboutContent, item) => {
        acc[item.content_key] = item.content_value || '';
        return acc;
      }, {});

      setContent(contentObj);
    } catch (error) {
      console.error('Error fetching about content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент страницы О нас",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      // Удаляем старый контент
      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'about');

      // Сохраняем новый контент
      const contentArray = Object.entries(content).map(([key, value]) => ({
        page_slug: 'about',
        content_key: key,
        content_value: value,
        content_type: 'text',
        is_active: true
      }));

      const { error } = await supabase
        .from('cms_content')
        .insert(contentArray);

      if (error) throw error;

      toast({
        title: "Успешно сохранено",
        description: "Контент страницы О нас обновлен",
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Страница "О нас"</h1>
          <p className="text-muted-foreground">Управление контентом страницы О нас</p>
        </div>
        <Button onClick={saveContent} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить изменения
        </Button>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hero">Главная секция</TabsTrigger>
          <TabsTrigger value="story">Наша история</TabsTrigger>
          <TabsTrigger value="values">Ценности</TabsTrigger>
          <TabsTrigger value="team">Команда</TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Главная секция
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_badge">Бейдж</Label>
                <Input
                  id="hero_badge"
                  value={content.hero_badge || ''}
                  onChange={(e) => updateContent('hero_badge', e.target.value)}
                  placeholder="О компании"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_title">Заголовок</Label>
                <Input
                  id="hero_title"
                  value={content.hero_title || ''}
                  onChange={(e) => updateContent('hero_title', e.target.value)}
                  placeholder="International Poker Style"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_description">Описание</Label>
                <Textarea
                  id="hero_description"
                  value={content.hero_description || ''}
                  onChange={(e) => updateContent('hero_description', e.target.value)}
                  placeholder="Описание компании..."
                  rows={4}
                />
              </div>

              <ImageUploader
                label="Главное изображение"
                currentImageUrl={content.hero_image || ''}
                onImageChange={(url) => updateContent('hero_image', url)}
                folder="about/hero"
                placeholder="Загрузите главное изображение страницы"
              />
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Достижения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Заголовок {num}</Label>
                    <Input
                      value={content[`achievement_${num}_title`] || ''}
                      onChange={(e) => updateContent(`achievement_${num}_title`, e.target.value)}
                      placeholder="500+ турниров"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание {num}</Label>
                    <Input
                      value={content[`achievement_${num}_desc`] || ''}
                      onChange={(e) => updateContent(`achievement_${num}_desc`, e.target.value)}
                      placeholder="Проведено за 3 года работы"
                    />
                  </div>
                  <IconSelector
                    label={`Иконка ${num}`}
                    currentIcon={content[`achievement_${num}_icon`] || ''}
                    onIconChange={(iconName) => updateContent(`achievement_${num}_icon`, iconName)}
                    placeholder="Выберите иконку достижения"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Story Section */}
        <TabsContent value="story" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Наша история</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="story_badge">Бейдж секции</Label>
                <Input
                  id="story_badge"
                  value={content.story_badge || ''}
                  onChange={(e) => updateContent('story_badge', e.target.value)}
                  placeholder="Наша история"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="story_title">Заголовок</Label>
                <Input
                  id="story_title"
                  value={content.story_title || ''}
                  onChange={(e) => updateContent('story_title', e.target.value)}
                  placeholder="Как всё начиналось"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="story_paragraph1">Первый абзац</Label>
                <Textarea
                  id="story_paragraph1"
                  value={content.story_paragraph1 || ''}
                  onChange={(e) => updateContent('story_paragraph1', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="story_paragraph2">Второй абзац</Label>
                <Textarea
                  id="story_paragraph2"
                  value={content.story_paragraph2 || ''}
                  onChange={(e) => updateContent('story_paragraph2', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="story_paragraph3">Третий абзац</Label>
                <Textarea
                  id="story_paragraph3"
                  value={content.story_paragraph3 || ''}
                  onChange={(e) => updateContent('story_paragraph3', e.target.value)}
                  rows={3}
                />
              </div>

              <ImageUploader
                label="Изображение истории"
                currentImageUrl={content.story_image || ''}
                onImageChange={(url) => updateContent('story_image', url)}
                folder="about/story"
                placeholder="Загрузите изображение для секции истории"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Values Section */}
        <TabsContent value="values" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ценности</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="values_badge">Бейдж секции</Label>
                <Input
                  id="values_badge"
                  value={content.values_badge || ''}
                  onChange={(e) => updateContent('values_badge', e.target.value)}
                  placeholder="Наши ценности"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="values_title">Заголовок</Label>
                <Input
                  id="values_title"
                  value={content.values_title || ''}
                  onChange={(e) => updateContent('values_title', e.target.value)}
                  placeholder="Во что мы верим"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="values_description">Описание</Label>
                <Textarea
                  id="values_description"
                  value={content.values_description || ''}
                  onChange={(e) => updateContent('values_description', e.target.value)}
                  rows={2}
                />
              </div>

              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Ценность {num} - Название</Label>
                    <Input
                      value={content[`value_${num}_title`] || ''}
                      onChange={(e) => updateContent(`value_${num}_title`, e.target.value)}
                      placeholder="Честность"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ценность {num} - Описание</Label>
                    <Textarea
                      value={content[`value_${num}_desc`] || ''}
                      onChange={(e) => updateContent(`value_${num}_desc`, e.target.value)}
                      rows={2}
                    />
                  </div>
                  <IconSelector
                    label={`Иконка ценности ${num}`}
                    currentIcon={content[`value_${num}_icon`] || ''}
                    onIconChange={(iconName) => updateContent(`value_${num}_icon`, iconName)}
                    placeholder="Выберите иконку ценности"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Section */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Команда</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team_badge">Бейдж секции</Label>
                <Input
                  id="team_badge"
                  value={content.team_badge || ''}
                  onChange={(e) => updateContent('team_badge', e.target.value)}
                  placeholder="Команда"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team_title">Заголовок</Label>
                <Input
                  id="team_title"
                  value={content.team_title || ''}
                  onChange={(e) => updateContent('team_title', e.target.value)}
                  placeholder="Познакомьтесь с нашей командой"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team_description">Описание</Label>
                <Textarea
                  id="team_description"
                  value={content.team_description || ''}
                  onChange={(e) => updateContent('team_description', e.target.value)}
                  rows={2}
                />
              </div>

              {[1, 2, 3].map((num) => (
                <div key={num} className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold">Член команды {num}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Имя</Label>
                      <Input
                        value={content[`team_${num}_name`] || ''}
                        onChange={(e) => updateContent(`team_${num}_name`, e.target.value)}
                        placeholder="Александр Петров"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Должность</Label>
                      <Input
                        value={content[`team_${num}_role`] || ''}
                        onChange={(e) => updateContent(`team_${num}_role`, e.target.value)}
                        placeholder="Основатель и Турнирный Директор"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Опыт</Label>
                      <Input
                        value={content[`team_${num}_experience`] || ''}
                        onChange={(e) => updateContent(`team_${num}_experience`, e.target.value)}
                        placeholder="15+ лет в покере"
                      />
                    </div>
                    <ImageUploader
                      label={`Фото ${num}`}
                      currentImageUrl={content[`team_${num}_image`] || ''}
                      onImageChange={(url) => updateContent(`team_${num}_image`, url)}
                      folder={`about/team/member-${num}`}
                      placeholder="Загрузите фото члена команды"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Достижения (через запятую)</Label>
                    <Textarea
                      value={content[`team_${num}_achievements`] || ''}
                      onChange={(e) => updateContent(`team_${num}_achievements`, e.target.value)}
                      placeholder="WSOP Circuit Ring, EPT Final Table, Международный судья"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}