import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface StickerItem {
  id: string;
  name: string;
  description: string;
  imagePath: string;
}

const stickers: StickerItem[] = [
  {
    id: 'trophy',
    name: 'Кубок Победителя',
    description: 'Золотой кубок с фишками',
    imagePath: '/stickers/trophy-sticker.png'
  },
  {
    id: 'crown',
    name: 'Корона Чемпиона',
    description: 'Королевская корона с камнями',
    imagePath: '/stickers/crown-sticker.png'
  },
  {
    id: 'suits',
    name: 'Покерные Масти',
    description: 'Три туза с мастями',
    imagePath: '/stickers/suits-sticker.png'
  },
  {
    id: 'chips',
    name: 'Стек Фишек',
    description: 'Разноцветные покерные фишки',
    imagePath: '/stickers/chips-sticker.png'
  },
  {
    id: 'cards',
    name: 'Тройка Тузов',
    description: 'Пиковые тузы веером',
    imagePath: '/stickers/cards-sticker.png'
  },
  {
    id: 'fire',
    name: 'Огненный Страйк',
    description: 'Горячая серия побед',
    imagePath: '/stickers/fire-sticker.png'
  },
  {
    id: 'diamond',
    name: 'Бриллиант',
    description: 'Сверкающий кристалл',
    imagePath: '/stickers/diamond-sticker.png'
  },
  {
    id: 'star',
    name: 'Золотая Звезда',
    description: 'Звезда рейтинга',
    imagePath: '/stickers/star-sticker.png'
  }
];

export const StickerShowcase = () => {
  const handleDownload = async (sticker: StickerItem) => {
    try {
      const response = await fetch(sticker.imagePath);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sticker.id}-sticker.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`${sticker.name} скачан!`);
    } catch (error) {
      toast.error('Ошибка при скачивании');
    }
  };

  const handleDownloadAll = async () => {
    toast.info('Скачивание всех стикеров...');
    for (const sticker of stickers) {
      await handleDownload(sticker);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    toast.success('Все стикеры скачаны!');
  };

  const copyInstructions = () => {
    const guide = `
📦 Как создать Telegram стикерпак:

1. Откройте @Stickers в Telegram
2. Отправьте команду /newpack
3. Выберите тип: Regular (статичные)
4. Загрузите PNG файлы (512x512)
5. Добавьте эмодзи для каждого стикера

📋 Требования к файлам:
• Формат: PNG или WEBP
• Размер: 512x512 пикселей
• Фон: прозрачный
• Белая обводка и тень
• Размер файла: до 512KB

🎯 Рекомендуемые эмодзи:
• Кубок → 🏆
• Корона → 👑
• Масти → ♠️♥️♦️♣️
• Фишки → 🎰
• Карты → 🃏
• Огонь → 🔥
• Бриллиант → 💎
• Звезда → ⭐
    `;
    navigator.clipboard.writeText(guide);
    toast.success('Инструкция скопирована!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">🎰 Покерные Стикеры для Telegram</h1>
          <p className="text-muted-foreground mt-1">
            Готовые PNG 512x512 с белой обводкой и тенью
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyInstructions}>
            <Copy className="w-4 h-4 mr-2" />
            Инструкция
          </Button>
          <Button onClick={handleDownloadAll}>
            <Download className="w-4 h-4 mr-2" />
            Скачать все
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stickers.map((sticker) => (
          <Card 
            key={sticker.id}
            className="group hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer"
            onClick={() => handleDownload(sticker)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {sticker.name}
                <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-40 bg-gradient-to-br from-background to-muted rounded-lg mb-3 p-2">
                <img 
                  src={sticker.imagePath} 
                  alt={sticker.name}
                  className="max-h-full max-w-full object-contain drop-shadow-lg hover:scale-110 transition-transform"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {sticker.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            ✅ Следующие шаги
          </h3>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">1.</span>
              <span>Нажмите на стикер или «Скачать все» чтобы сохранить PNG файлы</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">2.</span>
              <span>Откройте <a href="https://t.me/Stickers" target="_blank" rel="noopener" className="text-primary underline">@Stickers</a> в Telegram</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>Отправьте боту скачанные PNG файлы по одному</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">4.</span>
              <span>Присвойте каждому стикеру соответствующий эмодзи</span>
            </li>
          </ol>
          <Button variant="outline" className="mt-4" asChild>
            <a href="https://t.me/Stickers" target="_blank" rel="noopener">
              <ExternalLink className="w-4 h-4 mr-2" />
              Открыть @Stickers бота
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StickerShowcase;
