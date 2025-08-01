import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, ZoomIn, Star, Grid3X3, Grid2X2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  alt_text: string | null;
  category: string;
  is_featured: boolean;
  is_active: boolean;
}

export function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [gridSize, setGridSize] = useState(3); // 2 or 3 columns

  const categories = [
    { value: "all", label: "Все фото" },
    { value: "tournament", label: "Турниры" },
    { value: "vip", label: "VIP" },
    { value: "lounge", label: "Лаунж" },
    { value: "events", label: "События" },
    { value: "general", label: "Общие" }
  ];

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_gallery')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setImages(data);
      } else {
        // Fallback to static images if no data in database
        setImages([
          {
            id: '1',
            title: 'Главный покерный зал',
            description: 'Просторный зал с профессиональными столами',
            image_url: '/src/assets/gallery/main-poker-room.jpg',
            alt_text: 'Главный покерный зал IPS',
            category: 'tournament',
            is_featured: true,
            is_active: true
          },
          {
            id: '2',
            title: 'Турнирный стол',
            description: 'Профессиональный турнирный стол',
            image_url: '/src/assets/gallery/tournament-table.jpg',
            alt_text: 'Турнирный стол',
            category: 'tournament',
            is_featured: false,
            is_active: true
          },
          {
            id: '3',
            title: 'VIP зона',
            description: 'Эксклюзивная VIP зона для привилегированных игроков',
            image_url: '/src/assets/gallery/vip-zone.jpg',
            alt_text: 'VIP зона',
            category: 'vip',
            is_featured: true,
            is_active: true
          },
          {
            id: '4',
            title: 'Зона отдыха',
            description: 'Комфортная зона отдыха',
            image_url: '/src/assets/gallery/lounge-area.jpg',
            alt_text: 'Зона отдыха',
            category: 'lounge',
            is_featured: false,
            is_active: true
          },
          {
            id: '5',
            title: 'Церемония награждения',
            description: 'Торжественная церемония награждения победителей',
            image_url: '/src/assets/gallery/awards-ceremony.jpg',
            alt_text: 'Церемония награждения',
            category: 'events',
            is_featured: false,
            is_active: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      // Use fallback images on error
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = selectedCategory === "all" 
    ? images 
    : images.filter(img => img.category === selectedCategory);

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">Загрузка галереи...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-poker-gold text-poker-gold">
            Галерея IPS
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Наш покерный клуб
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Познакомьтесь с атмосферой премиального покерного клуба IPS
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className={selectedCategory === category.value ? "bg-poker-accent text-white" : ""}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Grid Size Toggle */}
          <div className="flex gap-2">
            <Button
              variant={gridSize === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridSize(2)}
            >
              <Grid2X2 className="w-4 h-4" />
            </Button>
            <Button
              variant={gridSize === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridSize(3)}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image Grid */}
        <div className={`grid gap-6 ${gridSize === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredImages.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Нет изображений для отображения</p>
            </div>
          ) : (
            filteredImages.map((image) => (
            <Card key={image.id} className="group cursor-pointer overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
              <div className="relative">
                <img
                  src={image.image_url}
                  alt={image.alt_text || image.title}
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                  onClick={() => setSelectedImage(image)}
                />
                
                {/* Featured Badge */}
                {image.is_featured && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-poker-gold text-background">
                      <Star className="w-3 h-3 mr-1" />
                      Рекомендуемое
                    </Badge>
                  </div>
                )}

                {/* Zoom Icon */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 bg-background/80 rounded-full flex items-center justify-center">
                    <ZoomIn className="w-4 h-4" />
                  </div>
                </div>

                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white font-semibold text-lg mb-1">{image.title}</h3>
                  <p className="text-white/80 text-sm">{image.description}</p>
                </div>
              </div>
            </Card>
          )))}
        </div>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-7xl max-h-full">
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="relative max-w-5xl max-h-[90vh] w-full">
                  {/* Close Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-4 right-4 z-10"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  
                  {/* Large Image */}
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.alt_text || selectedImage.title}
                    className="w-full h-full object-contain rounded-lg"
                  />
                  
                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-6 rounded-b-lg">
                    <h3 className="text-2xl font-bold mb-2">{selectedImage.title}</h3>
                    <p className="text-white/80">{selectedImage.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}