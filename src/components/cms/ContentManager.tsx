import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Edit, Trash2, Save, X } from "lucide-react";

interface CMSContent {
  id: string;
  page_slug: string;
  content_key: string;
  content_type: string;
  content_value: string | null;
  meta_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContentForm {
  page_slug: string;
  content_key: string;
  content_type: string;
  content_value: string;
  is_active: boolean;
}

export function ContentManager() {
  const [content, setContent] = useState<CMSContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<ContentForm>({
    page_slug: '',
    content_key: '',
    content_type: 'text',
    content_value: '',
    is_active: true
  });

  const { toast } = useToast();

  const pageOptions = [
    { value: 'home', label: 'Главная страница' },
    { value: 'about', label: 'О нас' },
    { value: 'tournaments', label: 'Турниры' },
    { value: 'rating', label: 'Рейтинг' },
    { value: 'gallery', label: 'Галерея' },
    { value: 'contact', label: 'Контакты' },
  ];

  const contentTypes = [
    { value: 'text', label: 'Текст' },
    { value: 'html', label: 'HTML' },
    { value: 'image', label: 'Изображение' },
    { value: 'json', label: 'JSON' },
  ];

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_content')
        .select('*')
        .order('page_slug', { ascending: true })
        .order('content_key', { ascending: true });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        // Update existing
        const { error } = await (supabase as any)
          .from('cms_content')
          .update({
            page_slug: formData.page_slug,
            content_key: formData.content_key,
            content_type: formData.content_type,
            content_value: formData.content_value,
            is_active: formData.is_active,
          })
          .eq('id', id);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new
        const { error } = await (supabase as any)
          .from('cms_content')
          .insert([formData]);

        if (error) throw error;
        setShowAddForm(false);
      }

      await fetchContent();
      resetForm();
      toast({
        title: "Успешно",
        description: id ? "Контент обновлен" : "Контент создан",
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить контент",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот контент?')) return;

    try {
      const { error } = await (supabase as any)
        .from('cms_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchContent();
      toast({
        title: "Успешно",
        description: "Контент удален",
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить контент",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: CMSContent) => {
    setFormData({
      page_slug: item.page_slug,
      content_key: item.content_key,
      content_type: item.content_type,
      content_value: item.content_value || '',
      is_active: item.is_active,
    });
    setEditingId(item.id);
  };

  const resetForm = () => {
    setFormData({
      page_slug: '',
      content_key: '',
      content_type: 'text',
      content_value: '',
      is_active: true
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Управление контентом</h2>
          <p className="text-muted-foreground">Редактирование текстов и содержимого страниц</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить контент
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Новый контент</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page_slug">Страница</Label>
                <Select
                  value={formData.page_slug}
                  onValueChange={(value) => setFormData({ ...formData, page_slug: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите страницу" />
                  </SelectTrigger>
                  <SelectContent>
                    {pageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content_key">Ключ контента</Label>
                <Input
                  id="content_key"
                  value={formData.content_key}
                  onChange={(e) => setFormData({ ...formData, content_key: e.target.value })}
                  placeholder="hero_title, description, etc."
                />
              </div>

              <div>
                <Label htmlFor="content_type">Тип контента</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Активен</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="content_value">Содержимое</Label>
              <Textarea
                id="content_value"
                value={formData.content_value}
                onChange={(e) => setFormData({ ...formData, content_value: e.target.value })}
                rows={6}
                placeholder="Введите содержимое..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                <X size={16} className="mr-2" />
                Отмена
              </Button>
              <Button onClick={() => handleSave()}>
                <Save size={16} className="mr-2" />
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {content.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет контента</h3>
              <p className="text-muted-foreground mb-4">Начните добавлять контент для управления сайтом</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus size={16} className="mr-2" />
                Добавить первый контент
              </Button>
            </CardContent>
          </Card>
        ) : (
          content.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                {editingId === item.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Страница</Label>
                        <Select
                          value={formData.page_slug}
                          onValueChange={(value) => setFormData({ ...formData, page_slug: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Ключ контента</Label>
                        <Input
                          value={formData.content_key}
                          onChange={(e) => setFormData({ ...formData, content_key: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Тип контента</Label>
                        <Select
                          value={formData.content_type}
                          onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {contentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label>Активен</Label>
                      </div>
                    </div>

                    <div>
                      <Label>Содержимое</Label>
                      <Textarea
                        value={formData.content_value}
                        onChange={(e) => setFormData({ ...formData, content_value: e.target.value })}
                        rows={6}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={cancelEdit}>
                        <X size={16} className="mr-2" />
                        Отмена
                      </Button>
                      <Button onClick={() => handleSave(item.id)}>
                        <Save size={16} className="mr-2" />
                        Сохранить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.page_slug}</Badge>
                          <Badge variant="secondary">{item.content_key}</Badge>
                          <Badge variant={item.is_active ? "default" : "destructive"}>
                            {item.is_active ? "Активен" : "Неактивен"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Тип: {contentTypes.find(t => t.value === item.content_type)?.label}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(item)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm font-mono whitespace-pre-wrap break-words">
                        {item.content_value || <span className="text-muted-foreground">Нет содержимого</span>}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}