import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, Edit } from "lucide-react";

interface AboutContent {
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  story_title: string;
  story_content: string;
  values_title: string;
  values_subtitle: string;
  team_title: string;
  team_subtitle: string;
  cta_title: string;
  cta_description: string;
}

interface Achievement {
  title: string;
  description: string;
  icon: string;
}

interface Value {
  title: string;
  description: string;
  icon: string;
}

interface TeamMember {
  name: string;
  role: string;
  experience: string;
  image: string;
  achievements: string[];
}

export function AboutPageEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [content, setContent] = useState<AboutContent>({
    hero_title: "International Poker Style",
    hero_subtitle: "О компании", 
    hero_description: "Мы создали уникальное пространство для любителей покера...",
    story_title: "Как всё начиналось",
    story_content: "В 2021 году группа энтузиастов покера...",
    values_title: "Во что мы верим",
    values_subtitle: "Наши принципы определяют каждое решение...",
    team_title: "Познакомьтесь с нашей командой",
    team_subtitle: "Профессионалы своего дела...",
    cta_title: "Готовы стать частью IPS?",
    cta_description: "Присоединяйтесь к нашему сообществу..."
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    { title: "500+ турниров", description: "Проведено за 3 года работы", icon: "Trophy" },
    { title: "1000+ игроков", description: "Доверяют нашей системе", icon: "Users" },
    { title: "4.9/5", description: "Средняя оценка игроков", icon: "Star" },
    { title: "100%", description: "Безопасность данных", icon: "Shield" }
  ]);

  const [values, setValues] = useState<Value[]>([
    { title: "Честность", description: "Прозрачная рейтинговая система...", icon: "Target" },
    { title: "Сообщество", description: "Мы создаем дружелюбную атмосферу...", icon: "Heart" },
    { title: "Инновации", description: "Постоянно развиваем технологии...", icon: "Zap" },
    { title: "Международный уровень", description: "Соответствуем мировым стандартам...", icon: "Globe" }
  ]);

  const [team, setTeam] = useState<TeamMember[]>([
    {
      name: "Александр Петров",
      role: "Основатель и Турнирный Директор", 
      experience: "15+ лет в покере",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face",
      achievements: ["WSOP Circuit Ring", "EPT Final Table", "Международный судья"]
    }
  ]);

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

      if (data && data.length > 0) {
        const contentObj: any = {};
        data.forEach(item => {
          if (item.content_type === 'json') {
            contentObj[item.content_key] = JSON.parse(item.content_value || '[]');
          } else {
            contentObj[item.content_key] = item.content_value || '';
          }
        });

        if (contentObj.hero_title) setContent(prev => ({ ...prev, ...contentObj }));
        if (contentObj.achievements) setAchievements(contentObj.achievements);
        if (contentObj.values) setValues(contentObj.values);
        if (contentObj.team) setTeam(contentObj.team);
      }
    } catch (error) {
      console.error('Error fetching about content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент страницы",
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
          page_slug: 'about',
          content_key: key,
          content_value: value,
          content_type: 'text'
        })),
        {
          page_slug: 'about',
          content_key: 'achievements',
          content_value: JSON.stringify(achievements),
          content_type: 'json'
        },
        {
          page_slug: 'about',
          content_key: 'values', 
          content_value: JSON.stringify(values),
          content_type: 'json'
        },
        {
          page_slug: 'about',
          content_key: 'team',
          content_value: JSON.stringify(team),
          content_type: 'json'
        }
      ];

      // Удаляем существующий контент для этой страницы
      await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'about');

      // Вставляем новый контент
      const { error } = await supabase
        .from('cms_content')
        .insert(contentItems);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Контент страницы 'О нас' сохранен"
      });
    } catch (error) {
      console.error('Error saving about content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить контент",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addAchievement = () => {
    setAchievements([...achievements, { title: "", description: "", icon: "Trophy" }]);
  };

  const removeAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const updateAchievement = (index: number, field: keyof Achievement, value: string) => {
    const updated = [...achievements];
    updated[index] = { ...updated[index], [field]: value };
    setAchievements(updated);
  };

  const addValue = () => {
    setValues([...values, { title: "", description: "", icon: "Target" }]);
  };

  const removeValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const updateValue = (index: number, field: keyof Value, value: string) => {
    const updated = [...values];
    updated[index] = { ...updated[index], [field]: value };
    setValues(updated);
  };

  const addTeamMember = () => {
    setTeam([...team, { 
      name: "", 
      role: "", 
      experience: "", 
      image: "", 
      achievements: [""] 
    }]);
  };

  const removeTeamMember = (index: number) => {
    setTeam(team.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string | string[]) => {
    const updated = [...team];
    updated[index] = { ...updated[index], [field]: value };
    setTeam(updated);
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
          <h2 className="text-2xl font-bold">Редактор страницы "О нас"</h2>
          <p className="text-muted-foreground">
            Управление контентом страницы "О нас"
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
              placeholder="International Poker Style"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Подзаголовок</label>
            <Input
              value={content.hero_subtitle}
              onChange={(e) => setContent(prev => ({ ...prev, hero_subtitle: e.target.value }))}
              placeholder="О компании"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={content.hero_description}
              onChange={(e) => setContent(prev => ({ ...prev, hero_description: e.target.value }))}
              rows={3}
              placeholder="Описание компании..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Достижения</CardTitle>
          <Button onClick={addAchievement} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {achievements.map((achievement, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Достижение #{index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAchievement(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Заголовок"
                  value={achievement.title}
                  onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                />
                <Input
                  placeholder="Иконка"
                  value={achievement.icon}
                  onChange={(e) => updateAchievement(index, 'icon', e.target.value)}
                />
              </div>
              <Textarea
                placeholder="Описание"
                value={achievement.description}
                onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Story Section */}
      <Card>
        <CardHeader>
          <CardTitle>История компании</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Заголовок</label>
            <Input
              value={content.story_title}
              onChange={(e) => setContent(prev => ({ ...prev, story_title: e.target.value }))}
              placeholder="Как всё начиналось"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Содержание</label>
            <Textarea
              value={content.story_content}
              onChange={(e) => setContent(prev => ({ ...prev, story_content: e.target.value }))}
              rows={6}
              placeholder="История создания компании..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Values */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ценности</CardTitle>
          <Button onClick={addValue} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium">Заголовок секции</label>
              <Input
                value={content.values_title}
                onChange={(e) => setContent(prev => ({ ...prev, values_title: e.target.value }))}
                placeholder="Во что мы верим"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Подзаголовок</label>
              <Input
                value={content.values_subtitle}
                onChange={(e) => setContent(prev => ({ ...prev, values_subtitle: e.target.value }))}
                placeholder="Описание ценностей"
              />
            </div>
          </div>
          
          {values.map((value, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Ценность #{index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeValue(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Название"
                  value={value.title}
                  onChange={(e) => updateValue(index, 'title', e.target.value)}
                />
                <Input
                  placeholder="Иконка"
                  value={value.icon}
                  onChange={(e) => updateValue(index, 'icon', e.target.value)}
                />
              </div>
              <Textarea
                placeholder="Описание"
                value={value.description}
                onChange={(e) => updateValue(index, 'description', e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Команда</CardTitle>
          <Button onClick={addTeamMember} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium">Заголовок секции</label>
              <Input
                value={content.team_title}
                onChange={(e) => setContent(prev => ({ ...prev, team_title: e.target.value }))}
                placeholder="Познакомьтесь с нашей командой"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Подзаголовок</label>
              <Input
                value={content.team_subtitle}
                onChange={(e) => setContent(prev => ({ ...prev, team_subtitle: e.target.value }))}
                placeholder="Описание команды"
              />
            </div>
          </div>

          {team.map((member, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Участник #{index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTeamMember(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Имя"
                  value={member.name}
                  onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                />
                <Input
                  placeholder="Должность"
                  value={member.role}
                  onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Опыт"
                  value={member.experience}
                  onChange={(e) => updateTeamMember(index, 'experience', e.target.value)}
                />
                <Input
                  placeholder="URL фото"
                  value={member.image}
                  onChange={(e) => updateTeamMember(index, 'image', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Достижения (по одному на строку)</label>
                <Textarea
                  placeholder="Достижение 1&#10;Достижение 2&#10;Достижение 3"
                  value={member.achievements.join('\n')}
                  onChange={(e) => updateTeamMember(index, 'achievements', e.target.value.split('\n'))}
                  rows={3}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card>
        <CardHeader>
          <CardTitle>Призыв к действию</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Заголовок</label>
            <Input
              value={content.cta_title}
              onChange={(e) => setContent(prev => ({ ...prev, cta_title: e.target.value }))}
              placeholder="Готовы стать частью IPS?"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              value={content.cta_description}
              onChange={(e) => setContent(prev => ({ ...prev, cta_description: e.target.value }))}
              rows={2}
              placeholder="Текст призыва к действию..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}