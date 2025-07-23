import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

export default function Gallery() {
  const images = [
    { src: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81", title: "Главный покерный зал", category: "Интерьер" },
    { src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c", title: "Турнирный стол", category: "Турниры" },
    { src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6", title: "Церемония награждения", category: "События" },
    { src: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7", title: "VIP зона", category: "Интерьер" },
    { src: "https://images.unsplash.com/photo-1473091534298-04dcbce3278c", title: "Командный турнир", category: "Турниры" },
    { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085", title: "Мастер-класс", category: "Обучение" }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-poker-accent text-poker-accent">Галерея</Badge>
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-poker-primary to-poker-accent bg-clip-text text-transparent">
              Атмосфера IPS
            </h1>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image, index) => (
              <div key={`gallery-${index}-${image.title}`} className="group relative overflow-hidden rounded-2xl shadow-card hover:shadow-floating transition-all duration-500">
                <img src={image.src} alt={image.title} className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-poker-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-bold">{image.title}</h3>
                    <Badge className="mt-2 bg-white/20 text-white">{image.category}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}