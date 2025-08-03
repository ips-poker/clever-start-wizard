import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Save, X, Star, Image as ImageIcon, Upload, Loader2 } from "lucide-react";

interface GalleryItem {
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

export function GalleryManager() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
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
    { value: 'tournament', label: 'Турниры' },
    { value: 'vip', label: 'VIP' },
    { value: 'lounge', label: 'Лаунж' },
    { value: 'events', label: 'События' },
  ];

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const { data, error } = await (supabase as any)
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Выберите файл изображения",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
      
      toast({
        title: "Успешно",
        description: "Изображение загружено",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        const { error } = await (supabase as any)
          .from('cms_gallery')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await (supabase as any)
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
    if (!confirm('Удалить изображение?')) return;
    try {
      const { error } = await (supabase as any)
        .from('cms_gallery')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchGallery();
      toast({ title: "Успешно", description: "Изображение удалено" });
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить", variant: "destructive" });
    }
  };

  const startEdit = (item: GalleryItem) => {
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
      title: '', description: '', image_url: '', alt_text: '',
      category: 'general', display_order: 0, is_featured: false, is_active: true
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const addSampleImages = async () => {
    const sampleImages = [
      {
        title: 'Главный покерный зал',
        description: 'Просторный зал с профессиональными столами',
        image_url: '/src/assets/gallery/main-poker-room.jpg',
        alt_text: 'Главный покерный зал IPS',
        category: 'tournament',
        display_order: 1,
        is_featured: true,
        is_active: true
      },
      {
        title: 'Турнирный стол',
        description: 'Профессиональный турнирный стол',
        image_url: '/src/assets/gallery/tournament-table.jpg',
        alt_text: 'Турнирный стол',
        category: 'tournament',
        display_order: 2,
        is_featured: false,
        is_active: true
      },
      {
        title: 'VIP зона',
        description: 'Эксклюзивная VIP зона для привилегированных игроков',
        image_url: '/src/assets/gallery/vip-zone.jpg',
        alt_text: 'VIP зона',
        category: 'vip',
        display_order: 3,
        is_featured: true,
        is_active: true
      },
      {
        title: 'Зона отдыха',
        description: 'Комфортная зона отдыха',
        image_url: '/src/assets/gallery/lounge-area.jpg',
        alt_text: 'Зона отдыха',
        category: 'lounge',
        display_order: 4,
        is_featured: false,
        is_active: true
      },
      {
        title: 'Церемония награждения',
        description: 'Торжественная церемония награждения победителей',
        image_url: '/src/assets/gallery/awards-ceremony.jpg',
        alt_text: 'Церемония награждения',
        category: 'events',
        display_order: 5,
        is_featured: false,
        is_active: true
      }
    ];

    try {
      const { error } = await (supabase as any)
        .from('cms_gallery')
        .insert(sampleImages);

      if (error) throw error;
      
      await fetchGallery();
      toast({
        title: "Успешно",
        description: "Добавлены образцы изображений для галереи",
      });
    } catch (error) {
      console.error('Error adding sample images:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить образцы изображений",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление галереей</h2>
          <p className="text-muted-foreground">Добавление и редактирование изображений</p>
        </div>
        <div className="flex gap-2">
          {gallery.length === 0 && (
            <Button
              variant="outline"
              onClick={addSampleImages}
              className="flex items-center gap-2"
            >
              <ImageIcon size={16} />
              Добавить образцы
            </Button>
          )}
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus size={16} />
            Добавить изображение
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>Новое изображение</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Название изображения"
                />
              </div>
              <div>
                <Label>Категория</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Изображение</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="URL изображения или загрузите файл"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Предпросмотр"
                      className="w-32 h-24 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание изображения..."
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}><X size={16} className="mr-2" />Отмена</Button>
              <Button onClick={() => handleSave()}><Save size={16} className="mr-2" />Сохранить</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gallery.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет изображений</h3>
                <p className="text-muted-foreground mb-4">Добавьте изображения для отображения в галерее сайта</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={addSampleImages} variant="outline">
                    <ImageIcon size={16} className="mr-2" />
                    Добавить образцы
                  </Button>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus size={16} className="mr-2" />
                    Добавить изображение
                  </Button>
                </div>
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
                    target.style.display = 'none';
                    target.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-muted');
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'flex flex-col items-center justify-center text-muted-foreground p-4';
                    fallbackDiv.innerHTML = `
                      <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span class="text-sm">Изображение не найдено</span>
                    `;
                    if (!target.parentElement?.querySelector('.fallback-content')) {
                      fallbackDiv.classList.add('fallback-content');
                      target.parentElement?.appendChild(fallbackDiv);
                    }
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
                  <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
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
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}