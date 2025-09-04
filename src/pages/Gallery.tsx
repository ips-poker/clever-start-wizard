import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Star, Grid3X3, Grid2X2, Filter, Eye, Calendar, Tag } from "lucide-react";

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
}

export default function Gallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  const categories = [
    { value: 'all', label: 'Все', count: 0 },
    { value: 'tournament', label: 'Турниры', count: 0 },
    { value: 'vip', label: 'VIP', count: 0 },
    { value: 'lounge', label: 'Лаунж', count: 0 },
    { value: 'events', label: 'События', count: 0 },
    { value: 'general', label: 'Общие', count: 0 },
  ];

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('cms_gallery')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // Фильтруем изображения с корректными URL
      const validImages = (data || []).filter((item: GalleryItem) => 
        item.image_url && 
        item.image_url.trim() !== ''
      );
      
      setGallery(validImages);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = selectedCategory === 'all' 
    ? gallery 
    : gallery.filter(item => item.category === selectedCategory);

  const featuredImages = gallery.filter(item => item.is_featured);

  // Обновляем счетчики категорий
  const categoriesWithCounts = categories.map(cat => ({
    ...cat,
    count: cat.value === 'all' ? gallery.length : gallery.filter(item => item.category === cat.value).length
  }));

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Загрузка галереи...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Header />
      
      <main className="py-20">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent animate-fade-in">
              <Tag className="w-4 h-4 mr-2" />
              Галерея
            </Badge>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent animate-fade-in">
              Атмосфера IPS
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in">
              Окунитесь в атмосферу профессионального покера. Наши залы, турниры, события и моменты триумфа в одной коллекции.
            </p>
          </div>

          {/* Featured Images */}
          {featuredImages.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <Star className="w-6 h-6 text-amber-500" />
                <h2 className="text-2xl font-bold text-poker-primary">Рекомендуемые</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredImages.map((image) => (
                  <Dialog key={`featured-${image.id}`}>
                    <DialogTrigger asChild>
                      <Card className="group cursor-pointer overflow-hidden border-2 border-amber-500/20 hover:border-amber-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10">
                        <div className="relative overflow-hidden">
                          <img 
                            src={image.image_url} 
                            alt={image.alt_text || image.title}
                            className="w-full h-72 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-4 left-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <Badge className="bg-amber-500/90 text-white">Рекомендуемое</Badge>
                              </div>
                              <h3 className="font-bold text-lg">{image.title}</h3>
                              {image.description && (
                                <p className="text-sm text-white/80 mt-1">{image.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <div className="relative">
                        <img 
                          src={image.image_url} 
                          alt={image.alt_text || image.title}
                          className="w-full h-auto max-h-[80vh] object-contain"
                        />
                        <div className="p-6 bg-background">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                            <Badge className="bg-amber-500 text-white">Рекомендуемое</Badge>
                          </div>
                          <h3 className="text-2xl font-bold mb-2 text-poker-primary">{image.title}</h3>
                          {image.description && (
                            <p className="text-muted-foreground mb-4">{image.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(image.created_at).toLocaleDateString('ru-RU')}
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4" />
                              {categoriesWithCounts.find(c => c.value === image.category)?.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </section>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-6 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50">
            <div className="flex flex-wrap gap-2">
              {categoriesWithCounts.map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className={selectedCategory === category.value ? "bg-poker-primary hover:bg-poker-primary/90" : ""}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {category.label} ({category.count})
                </Button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'masonry' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('masonry')}
              >
                <Grid2X2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Gallery Grid */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Нет изображений</h3>
                <p className="text-muted-foreground">
                  {selectedCategory === 'all' 
                    ? 'Галерея пуста. Изображения скоро появятся!' 
                    : 'В этой категории пока нет изображений.'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'columns-1 md:columns-2 lg:columns-3'}`}>
              {filteredImages.map((image) => (
                <Dialog key={image.id}>
                  <DialogTrigger asChild>
                    <Card className="group cursor-pointer overflow-hidden hover:shadow-floating transition-all duration-500 hover:scale-[1.02] animate-fade-in">
                      <div className="relative overflow-hidden">
                        <img 
                          src={image.image_url} 
                          alt={image.alt_text || image.title}
                          className={`w-full object-cover group-hover:scale-110 transition-transform duration-700 ${
                            viewMode === 'grid' ? 'h-64' : 'h-auto'
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-4 left-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <Badge className="mb-2 bg-white/20 text-white backdrop-blur-sm">
                              {categoriesWithCounts.find(c => c.value === image.category)?.label}
                            </Badge>
                            <h3 className="font-bold text-lg">{image.title}</h3>
                            {image.description && (
                              <p className="text-sm text-white/80 mt-1 line-clamp-2">{image.description}</p>
                            )}
                          </div>
                          <div className="absolute top-4 right-4">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                    <div className="relative">
                      <img 
                        src={image.image_url} 
                        alt={image.alt_text || image.title}
                        className="w-full h-auto max-h-[80vh] object-contain"
                      />
                      <div className="p-6 bg-background">
                        <h3 className="text-2xl font-bold mb-2 text-poker-primary">{image.title}</h3>
                        {image.description && (
                          <p className="text-muted-foreground mb-4">{image.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(image.created_at).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            {categoriesWithCounts.find(c => c.value === image.category)?.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}