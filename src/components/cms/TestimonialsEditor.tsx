import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Plus, Trash2, Edit, Star, Upload, Image as ImageIcon } from "lucide-react";

export function TestimonialsEditor() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    text: '',
    image: '',
    rating: 5,
    position: 1
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('page_slug', 'testimonials')
        .eq('is_active', true)
        .order('content_key');

      if (error) throw error;

      // Group testimonials by position from content_key
      const groupedTestimonials = data.reduce((acc: any, item: any) => {
        const match = item.content_key.match(/testimonial_(\d+)_/);
        if (!match) return acc;
        
        const position = parseInt(match[1]);
        if (!acc[position]) {
          acc[position] = { position, id: `testimonial_${position}` };
        }
        
        if (item.content_key.includes('_name')) {
          acc[position].name = item.content_value;
        } else if (item.content_key.includes('_text')) {
          acc[position].text = item.content_value;
        } else if (item.content_key.includes('_image')) {
          acc[position].image = item.content_value;
        }
        
        acc[position].rating = item.meta_data?.rating || 5;
        
        return acc;
      }, {});

      setTestimonials(Object.values(groupedTestimonials).sort((a: any, b: any) => a.position - b.position));
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить отзывы",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ошибка",
          description: "Можно загружать только изображения",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: "Размер файла не должен превышать 5MB",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload file to Supabase storage (gallery bucket, testimonials folder)
      const folder = 'testimonials';
      const objectPath = `${folder}/${fileName}`;
      const { data, error } = await supabase.storage
        .from('gallery')
        .upload(objectPath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(objectPath);

      // Update testimonial image URL
      setNewTestimonial(prev => ({ ...prev, image: publicUrl }));

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

  const removeUploadedImage = async (imageUrl: string) => {
    try {
      if (imageUrl && imageUrl.includes('/storage/v1/object/public/')) {
        try {
          const publicPrefix = '/storage/v1/object/public/';
          const idx = imageUrl.indexOf(publicPrefix);
          const pathWithBucket = imageUrl.substring(idx + publicPrefix.length).split('?')[0]; // e.g. 'gallery/testimonials/file.jpg'
          const [bucket, ...pathParts] = pathWithBucket.split('/');
          const objectPath = pathParts.join('/');
          if (bucket && objectPath) {
            const { error } = await supabase.storage
              .from(bucket)
              .remove([objectPath]);
            if (error) {
              console.error('Error removing file from storage:', error);
            }
          }
        } catch (e) {
          console.error('Error parsing image URL for deletion:', e);
        }
      }

      // Clear image URL
      setNewTestimonial(prev => ({ ...prev, image: '' }));

      toast({
        title: "Успешно", 
        description: "Изображение удалено",
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить изображение",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      const testimonialData = editingTestimonial || newTestimonial;
      const position = editingTestimonial ? editingTestimonial.position : (Math.max(...testimonials.map(t => t.position), 0) + 1);

      // If editing and image changed, delete old image from storage
      if (editingTestimonial && editingTestimonial.image && editingTestimonial.image !== testimonialData.image) {
        if (editingTestimonial.image.includes('supabase')) {
          try {
            const publicPrefix = '/storage/v1/object/public/';
            const idx = editingTestimonial.image.indexOf(publicPrefix);
            if (idx !== -1) {
              const pathWithBucket = editingTestimonial.image.substring(idx + publicPrefix.length).split('?')[0];
              const [bucket, ...pathParts] = pathWithBucket.split('/');
              const objectPath = pathParts.join('/');
              if (bucket && objectPath) {
                await supabase.storage
                  .from(bucket)
                  .remove([objectPath]);
              }
            }
          } catch (error) {
            console.error('Error removing old image:', error);
          }
        }
      }

      // Add cache-busting parameter to image URL if it's a new upload
      let imageUrl = testimonialData.image;
      if (imageUrl && imageUrl.includes('supabase')) {
        imageUrl = `${imageUrl}?t=${Date.now()}`;
      }

      // Save name, text, and image as separate records
      const records = [
        {
          page_slug: 'testimonials',
          content_key: `testimonial_${position}_name`,
          content_value: testimonialData.name,
          content_type: 'text',
          is_active: true,
          meta_data: { rating: testimonialData.rating, position }
        },
        {
          page_slug: 'testimonials',
          content_key: `testimonial_${position}_text`,
          content_value: testimonialData.text,
          content_type: 'text',
          is_active: true,
          meta_data: { rating: testimonialData.rating, position }
        },
        {
          page_slug: 'testimonials',
          content_key: `testimonial_${position}_image`,
          content_value: imageUrl,
          content_type: 'image',
          is_active: true,
          meta_data: { rating: testimonialData.rating, position }
        }
      ];

      if (editingTestimonial) {
        // Update existing testimonial - delete old records first
        await supabase
          .from('cms_content')
          .delete()
          .eq('page_slug', 'testimonials')
          .like('content_key', `testimonial_${position}_%`);
      }

      // Insert new records
      const { error } = await supabase
        .from('cms_content')
        .insert(records);
      
      if (error) throw error;

      toast({
        title: "Успешно",
        description: editingTestimonial ? "Отзыв обновлен" : "Отзыв создан",
      });

      setEditingTestimonial(null);
      setNewTestimonial({ name: '', text: '', image: '', rating: 5, position: 1 });
      
      // Force reload testimonials to show updated data
      await fetchTestimonials();
      
      // Force page refresh of testimonials on main site
      window.dispatchEvent(new CustomEvent('testimonials-updated'));
    } catch (error) {
      console.error('Error saving testimonial:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить отзыв",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (testimonial: any) => {
    try {
      // Delete all records for this testimonial
      const { error } = await supabase
        .from('cms_content')
        .delete()
        .eq('page_slug', 'testimonials')
        .like('content_key', `testimonial_${testimonial.position}_%`);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Отзыв удален",
      });

      fetchTestimonials();
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить отзыв",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (testimonial: any) => {
    setEditingTestimonial(testimonial);
    setNewTestimonial({
      name: testimonial.name || '',
      text: testimonial.text || '',
      image: testimonial.image || '',
      rating: testimonial.rating || 5,
      position: testimonial.position
    });
  };

  const handleCancel = () => {
    setEditingTestimonial(null);
    setNewTestimonial({ name: '', text: '', image: '', rating: 5, position: 1 });
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
      </div>

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
              <label className="text-sm font-medium">Рейтинг (1-5)</label>
              <Input
                type="number"
                min="1"
                max="5"
                value={newTestimonial.rating}
                onChange={(e) => setNewTestimonial(prev => ({ ...prev, rating: parseInt(e.target.value) || 5 }))}
                placeholder="5"
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

          <div className="space-y-4">
            <label className="text-sm font-medium">Фотография</label>
            
            {/* Current image preview */}
            {newTestimonial.image && (
              <div className="relative inline-block">
                <img 
                  src={newTestimonial.image} 
                  alt="Предпросмотр"
                  className="w-32 h-32 rounded-lg object-cover border"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => removeUploadedImage(newTestimonial.image)}
                >
                  ×
                </Button>
              </div>
            )}

            {/* Upload section */}
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <div className="space-y-2">
                  <div>
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="relative"
                        disabled={uploading}
                        asChild
                      >
                        <span>
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Загрузить фото
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Или введите URL изображения ниже
                  </p>
                </div>
              </div>
            </div>

            {/* URL input as fallback */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">URL изображения (альтернатива)</label>
              <Input
                value={newTestimonial.image}
                onChange={(e) => setNewTestimonial(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-gradient-button">
              <Save className="w-4 h-4 mr-2" />
              {editingTestimonial ? "Сохранить изменения" : "Добавить отзыв"}
            </Button>
            {editingTestimonial && (
              <Button onClick={handleCancel} variant="outline">
                Отмена
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
                        <h3 className="font-semibold">{testimonial.name}</h3>
                        <div className="flex">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        "{testimonial.text}"
                      </p>
                      {testimonial.image && (
                        <div className="mb-2">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name}
                            className="w-16 h-16 rounded object-cover"
                          />
                        </div>
                      )}
                      <Badge variant="outline">Позиция: {testimonial.position}</Badge>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(testimonial)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(testimonial)}
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