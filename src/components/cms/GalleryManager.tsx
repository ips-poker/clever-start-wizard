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
import { Upload, Plus, Edit, Trash2, Save, X, Star, Image as ImageIcon, Eye } from "lucide-react";

interface CMSGallery {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  alt_text: string | null;
  category: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GalleryForm {
  title: string;
  description: string;
  image_url: string;
  alt_text: string;
  category: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
}

export function GalleryManager() {
  const [gallery, setGallery] = useState<CMSGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<GalleryForm>({
    title: '',
    description: '',
    image_url: '',
    alt_text: '',
    category: 'general',
    display_order: 0,
    is_featured: false,
    is_active: true
  });

  const { toast } = useToast();

  const categories = [
    { value: 'general', label: 'Общие' },
    { value: 'tournaments', label: 'Турниры' },
    { value: 'players', label: 'Игроки' },
    { value: 'club', label: 'Клуб' },
    { value: 'events', label: 'События' },
  ];

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_gallery')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setGallery(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить галерею",
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
        const { error } = await supabase
          .from('cms_gallery')
          .update(formData)
          .eq('id', id);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new
        const { error } = await supabase
          .from('cms_gallery')
          .insert([formData]);

        if (error) throw error;
        setShowAddForm(false);
      }

      await fetchGallery();
      resetForm();
      toast({
        title: "Успешно",
        description: id ? "Изображение обновлено" : "Изображение добавлено",
      });
    } catch (error) {
      console.error('Error saving gallery item:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изображение",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это изображение?')) return;

    try {
      const { error } = await supabase
        .from('cms_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchGallery();
      toast({
        title: "Успешно",
        description: "Изображение удалено",
      });
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить изображение",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: CMSGallery) => {
    setFormData({
      title: item.title,
      description: item.description || '',
      image_url: item.image_url,
      alt_text: item.alt_text || '',
      category: item.category,
      display_order: item.display_order,
      is_featured: item.is_featured,
      is_active: item.is_active,
    });
    setEditingId(item.id);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      alt_text: '',
      category: 'general',
      display_order: 0,
      is_featured: false,
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
          <h2 className="text-2xl font-bold text-foreground">Управление галереей</h2>
          <p className="text-muted-foreground">Добавление и редактирование изображений</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить изображение
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Новое изображение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Название изображения"
                />
              </div>

              <div>
                <Label htmlFor="category">Категория</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="image_url">URL изображения</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="alt_text">Alt текст</Label>
                <Input
                  id="alt_text"
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  placeholder="Описание изображения для доступности"
                />
              </div>

              <div>
                <Label htmlFor="display_order">Порядок отображения</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured">Рекомендуемое</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Активно</Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Описание изображения..."
              />
            </div>

            {formData.image_url && (
              <div>
                <Label>Предпросмотр</Label>
                <div className="mt-2 border rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={formData.image_url}
                    alt={formData.alt_text || formData.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

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

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gallery.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет изображений</h3>
                <p className="text-muted-foreground mb-4">Начните добавлять изображения в галерею</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus size={16} className="mr-2" />
                  Добавить первое изображение
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          gallery.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={item.image_url}
                  alt={item.alt_text || item.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                  }}
                />
                
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.is_featured && (
                    <Badge className="bg-amber-500 text-white">
                      <Star size={12} className="mr-1" />
                      Рекомендуемое
                    </Badge>
                  )}
                  <Badge variant={item.is_active ? "default" : "destructive"}>
                    {item.is_active ? "Активно" : "Скрыто"}
                  </Badge>
                </div>

                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="secondary"
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

              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {categories.find(c => c.value === item.category)?.label}
                    </Badge>
                  </div>
                  
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Порядок: {item.display_order}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal-like form */}
      {editingId && (
        <Card className="fixed inset-4 z-50 max-h-[90vh] overflow-y-auto bg-background shadow-lg">
          <CardHeader>
            <CardTitle>Редактирование изображения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Категория</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>URL изображения</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div>
                <Label>Alt текст</Label>
                <Input
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                />
              </div>

              <div>
                <Label>Порядок отображения</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label>Рекомендуемое</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Активно</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {formData.image_url && (
              <div>
                <Label>Предпросмотр</Label>
                <div className="mt-2 border rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={formData.image_url}
                    alt={formData.alt_text || formData.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                <X size={16} className="mr-2" />
                Отмена
              </Button>
              <Button onClick={() => handleSave(editingId)}>
                <Save size={16} className="mr-2" />
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}