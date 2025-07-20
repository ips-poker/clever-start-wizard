import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye,
  ZoomIn,
  X
} from "lucide-react";
import { useState } from "react";

export function Gallery() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const galleryImages = [
    {
      id: 1,
      title: "Главный игровой зал",
      description: "Основной зал с профессиональными покерными столами",
      category: "Интерьер"
    },
    {
      id: 2,
      title: "VIP зона",
      description: "Приватная зона для турниров высокого уровня",
      category: "VIP"
    },
    {
      id: 3,
      title: "Турнирный стол",
      description: "Профессиональный стол для официальных турниров",
      category: "Оборудование"
    },
    {
      id: 4,
      title: "Лаунж зона",
      description: "Зона отдыха для игроков между турами",
      category: "Интерьер"
    },
    {
      id: 5,
      title: "Церемония награждения",
      description: "Награждение победителей турнира IPS Championship",
      category: "События"
    },
    {
      id: 6,
      title: "Командный турнир",
      description: "Командные соревнования среди корпоративных клиентов",
      category: "События"
    },
    {
      id: 7,
      title: "Мастер-класс",
      description: "Обучающий семинар с профессиональным игроком",
      category: "Обучение"
    },
    {
      id: 8,
      title: "Покерные фишки",
      description: "Сертифицированные турнирные фишки клуба",
      category: "Оборудование"
    },
    {
      id: 9,
      title: "Регистрация турнира",
      description: "Зона регистрации участников турнира",
      category: "Сервис"
    }
  ];

  const categories = ["Все", "Интерьер", "VIP", "Оборудование", "События", "Обучение", "Сервис"];
  const [selectedCategory, setSelectedCategory] = useState("Все");

  const filteredImages = selectedCategory === "Все" 
    ? galleryImages 
    : galleryImages.filter(img => img.category === selectedCategory);

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
              key={image.id} 
              className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden cursor-pointer"
              onClick={() => setSelectedImage(index)}
            >
              <div className="relative overflow-hidden bg-poker-accent/5 h-64">
                {/* Placeholder for actual image */}
                <div className="w-full h-full bg-gradient-subtle flex items-center justify-center">
                  <div className="text-center text-poker-silver">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div className="text-sm font-medium opacity-75">Изображение {image.id}</div>
                  </div>
                </div>
                
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
              
              <div className="h-96 bg-gradient-subtle flex items-center justify-center">
                <div className="text-center text-poker-silver">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold mb-2">{filteredImages[selectedImage].title}</h3>
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