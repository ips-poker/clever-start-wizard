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
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Покерные масти декорация */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 left-10 text-amber-400/40 text-6xl animate-pulse transform rotate-12">♣</div>
        <div className="absolute top-40 right-20 text-amber-400/30 text-4xl animate-bounce-subtle transform -rotate-12">♥</div>
        <div className="absolute bottom-20 left-20 text-amber-400/35 text-5xl animate-pulse transform rotate-45">♦</div>
        <div className="absolute bottom-40 right-10 text-amber-400/30 text-3xl animate-bounce-subtle transform -rotate-30">♠</div>
      </div>
      
      {/* Gradient light spots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-white tracking-wide">
              ГАЛЕРЕЯ КЛУБА
            </h2>
          </div>
          <div className="h-0.5 w-20 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-6"></div>
          <p className="text-lg text-white/70 max-w-2xl mx-auto font-light">
            Познакомьтесь с атмосферой премиального покерного клуба
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
                className={`touch-target text-xs lg:text-sm px-3 lg:px-4 ${selectedCategory === category.value ? "bg-poker-accent text-white" : ""}`}
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
              className="touch-target"
            >
              <Grid2X2 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">2 колонки</span>
            </Button>
            <Button
              variant={gridSize === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setGridSize(3)}
              className="touch-target"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">3 колонки</span>
            </Button>
          </div>
        </div>

        {/* Image Grid */}
        <div className={`grid gap-4 lg:gap-6 ${gridSize === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredImages.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-white/60">Нет изображений для отображения</p>
            </div>
          ) : (
            filteredImages.map((image) => (
            <div key={image.id} className="group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border border-white/10 backdrop-blur-xl hover:scale-[1.02] transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/20 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative">
                <img
                  src={image.image_url}
                  alt={image.alt_text || image.title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  onClick={() => setSelectedImage(image)}
                />
                
                {/* Featured Badge */}
                {image.is_featured && (
                  <div className="absolute top-3 left-3">
                    <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-lg flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-medium">Избранное</span>
                    </div>
                  </div>
                )}

                {/* Zoom Icon */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-9 h-9 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
                    <ZoomIn className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Image Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white font-medium text-base mb-1">{image.title}</h3>
                  <p className="text-white/70 text-sm line-clamp-2">{image.description}</p>
                </div>
              </div>
            </div>
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
      
      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </section>
  );
}