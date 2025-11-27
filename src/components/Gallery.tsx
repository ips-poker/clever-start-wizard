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
  const [gridSize, setGridSize] = useState(3);

  const categories = [
    { value: "all", label: "ВСЕ ФОТО" },
    { value: "tournament", label: "ТУРНИРЫ" },
    { value: "vip", label: "VIP" },
    { value: "lounge", label: "ЛАУНЖ" },
    { value: "events", label: "СОБЫТИЯ" },
    { value: "general", label: "ОБЩИЕ" }
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
        const fixedImages = data.map(image => {
          if (image.image_url.startsWith('/src/assets/gallery/')) {
            const filename = image.image_url.split('/').pop();
            const urlMap: Record<string, string> = {
              'tournament-table.jpg': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
              'vip-zone.jpg': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop',
              'main-poker-room.jpg': 'https://images.unsplash.com/photo-1542829257-5b7bb9b6e08b?w=800&h=600&fit=crop',
              'lounge-area.jpg': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
              'awards-ceremony.jpg': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop',
              'poker-chips.jpg': 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=600&fit=crop',
              'registration.jpg': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop',
              'masterclass.jpg': 'https://images.unsplash.com/photo-1542829257-5b7bb9b6e08b?w=800&h=600&fit=crop',
              'team-tournament.jpg': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
            };
            return {
              ...image,
              image_url: urlMap[filename as string] || image.image_url
            };
          }
          return image;
        });
        setImages(fixedImages);
      } else {
        // Fallback to static images if no data in database
        setImages([
          {
            id: '1',
            title: 'Главный покерный зал',
            description: 'Просторный зал с профессиональными столами',
            image_url: 'https://images.unsplash.com/photo-1542829257-5b7bb9b6e08b?w=800&h=600&fit=crop',
            alt_text: 'Главный покерный зал IPS',
            category: 'tournament',
            is_featured: true,
            is_active: true
          },
          {
            id: '2',
            title: 'Турнирный стол',
            description: 'Профессиональный турнирный стол',
            image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
            alt_text: 'Турнирный стол',
            category: 'tournament',
            is_featured: false,
            is_active: true
          },
          {
            id: '3',
            title: 'VIP зона',
            description: 'Эксклюзивная VIP зона для привилегированных игроков',
            image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
            alt_text: 'VIP зона',
            category: 'vip',
            is_featured: true,
            is_active: true
          },
          {
            id: '4',
            title: 'Зона отдыха',
            description: 'Комфортная зона отдыха',
            image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
            alt_text: 'Зона отдыха',
            category: 'lounge',
            is_featured: false,
            is_active: true
          },
          {
            id: '5',
            title: 'Церемония награждения',
            description: 'Торжественная церемония награждения победителей',
            image_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop',
            alt_text: 'Церемония награждения',
            category: 'events',
            is_featured: false,
            is_active: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
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
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 industrial-texture opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <div className="text-foreground uppercase tracking-wider font-mono">ЗАГРУЗКА ГАЛЕРЕИ...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glow Spots */}
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-syndikate-orange/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-syndikate-red/10 rounded-full blur-3xl animate-pulse" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 bg-syndikate-orange brutal-border flex items-center justify-center shadow-neon-orange">
              <Star className="h-6 w-6 text-background" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground tracking-wider uppercase">
              ГАЛЕРЕЯ КЛУБА
            </h2>
          </div>
          <div className="h-[2px] w-20 bg-syndikate-orange mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-mono uppercase tracking-wider">
            ОКУНИСЬ В АТМОСФЕРУ ПРЕМИАЛЬНОГО КЛУБА
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6 lg:mb-8">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className={`touch-target text-xs lg:text-sm px-3 lg:px-4 font-bold tracking-wider uppercase ${
                  selectedCategory === category.value 
                    ? "bg-syndikate-orange text-background hover:bg-syndikate-orange-glow shadow-neon-orange" 
                    : "brutal-metal brutal-border text-foreground hover:bg-syndikate-metal-light"
                }`}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Grid Size Toggle */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={gridSize === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridSize(2)}
              className={`touch-target font-bold uppercase tracking-wider ${
                gridSize === 2 
                  ? "bg-syndikate-orange text-background hover:bg-syndikate-orange-glow" 
                  : "brutal-metal brutal-border text-foreground"
              }`}
            >
              <Grid2X2 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">2 КОЛОНКИ</span>
            </Button>
            <Button
              variant={gridSize === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridSize(3)}
              className={`touch-target font-bold uppercase tracking-wider ${
                gridSize === 3 
                  ? "bg-syndikate-orange text-background hover:bg-syndikate-orange-glow" 
                  : "brutal-metal brutal-border text-foreground"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">3 КОЛОНКИ</span>
            </Button>
          </div>
        </div>

        {/* Image Grid */}
        <div className={`grid gap-4 lg:gap-6 ${gridSize === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredImages.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground uppercase tracking-wider font-mono">НЕТ ИЗОБРАЖЕНИЙ ДЛЯ ОТОБРАЖЕНИЯ</p>
            </div>
          ) : (
            filteredImages.map((image) => (
            <div key={image.id} className="group cursor-pointer overflow-hidden brutal-metal brutal-border hover:shadow-neon-orange transition-all duration-500 relative">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-syndikate-orange z-10" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-syndikate-orange z-10" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-syndikate-orange z-10" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-syndikate-orange z-10" />

              <div className="relative">
                <img
                  src={image.image_url}
                  alt={image.alt_text || image.title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  onClick={() => setSelectedImage(image)}
                />
                
                {/* Featured Badge */}
                {image.is_featured && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className="px-3 py-1 bg-syndikate-orange brutal-border flex items-center gap-1.5 shadow-neon-orange">
                      <Star className="w-3 h-3 text-background" />
                      <span className="text-background text-xs font-bold uppercase tracking-wider">ИЗБРАННОЕ</span>
                    </div>
                  </div>
                )}

                {/* Zoom Icon */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <div className="w-9 h-9 brutal-metal brutal-border flex items-center justify-center shadow-neon-orange">
                    <ZoomIn className="w-4 h-4 text-syndikate-orange" />
                  </div>
                </div>

                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-syndikate-metal/95 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 brutal-border-top">
                  <h3 className="text-foreground font-bold text-base mb-1 uppercase tracking-wider">{image.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 uppercase tracking-wide">{image.description}</p>
                </div>
              </div>
            </div>
          )))}
        </div>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-5xl max-h-[90vh] w-full">
              {/* Close Button */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-syndikate-orange text-background hover:bg-syndikate-orange-glow font-bold uppercase tracking-wider"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              
              {/* Large Image */}
              <div className="brutal-metal brutal-border overflow-hidden">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text || selectedImage.title}
                  className="w-full h-full object-contain"
                />
                
                {/* Image Info */}
                <div className="bg-syndikate-metal p-6 brutal-border-top">
                  <h3 className="text-2xl font-bold mb-2 text-foreground uppercase tracking-wider">{selectedImage.title}</h3>
                  <p className="text-muted-foreground uppercase tracking-wide">{selectedImage.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}