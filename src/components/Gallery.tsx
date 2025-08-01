import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye,
  ZoomIn,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  is_active: boolean;
  is_featured: boolean;
}

export function Gallery() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_gallery')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedImages = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          category: getCategoryLabel(item.category),
          image_url: item.image_url,
          is_active: item.is_active,
          is_featured: item.is_featured
        }));
        setGalleryImages(mappedImages);
      } else {
        // Fallback to static images if no database images
        setGalleryImages([
          {
            id: "1",
            title: "Главный игровой зал",
            description: "Основной зал с профессиональными покерными столами",
            category: "Интерьер",
            image_url: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
            is_active: true,
            is_featured: false
          },
          {
            id: "2",
            title: "VIP зона",
            description: "Приватная зона для турниров высокого уровня",
            category: "VIP",
            image_url: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7",
            is_active: true,
            is_featured: false
          },
          {
            id: "3",
            title: "Турнирный стол",
            description: "Профессиональный стол для официальных турниров",
            category: "Оборудование",
            image_url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
            is_active: true,
            is_featured: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      // Use fallback images on error
      setGalleryImages([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'general': 'Общие',
      'tournaments': 'Турниры',
      'players': 'Игроки',
      'club': 'Клуб',
      'events': 'События'
    };
    return categoryMap[category] || category;
  };

  const [selectedCategory, setSelectedCategory] = useState("Все");
  
  // Get unique categories from database images
  const categories = ["Все", ...Array.from(new Set(galleryImages.map(img => img.category)))];

  const filteredImages = selectedCategory === "Все" 
    ? galleryImages 
    : galleryImages.filter(img => img.category === selectedCategory);

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="text-lg">Загрузка галереи...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-poker-gold text-poker-charcoal">
            Фотогалерея клуба
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Атмосфера профессионального 
            <span className="text-poker-gold"> покера</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Познакомьтесь с нашим клубом: современные интерьеры, профессиональное оборудование 
            и незабываемая атмосфера турниров
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={`
                ${selectedCategory === category 
                  ? "bg-poker-charcoal text-poker-cream" 
                  : "border-poker-silver text-poker-charcoal hover:bg-poker-accent/10"
                } transition-all duration-300
              `}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredImages.map((image, index) => (
            <Card 
              key={`gallery-${image.id}-${image.title}`} 
              className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden cursor-pointer"
              onClick={() => setSelectedImage(index)}
            >
              <div className="relative overflow-hidden bg-poker-accent/5 h-64">
                <img 
                  src={image.image_url} 
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                  }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-poker-charcoal/0 group-hover:bg-poker-charcoal/20 transition-all duration-300 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </div>

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-poker-charcoal/80 text-poker-cream border-none">
                    {image.category}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-poker-charcoal">
                  {image.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {image.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal for full-size image */}
        {selectedImage !== null && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-[90vh] bg-background rounded-lg overflow-hidden">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 bg-poker-charcoal/80 text-white p-2 rounded-full hover:bg-poker-charcoal transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="relative">
                <img 
                  src={filteredImages[selectedImage].image_url} 
                  alt={filteredImages[selectedImage].title}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-poker-charcoal">{filteredImages[selectedImage].title}</h3>
                  <p className="text-muted-foreground">{filteredImages[selectedImage].description}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}