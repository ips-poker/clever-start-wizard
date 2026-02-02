import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  AnimatedPokerEmoji,
  AnimatedWinnerBadge,
  AnimatedChampionTrophy,
  AnimatedPokerHand,
  AnimatedFireStreak,
  AnimatedChipsStack
} from './AnimatedPokerEmoji';

interface StickerItem {
  id: string;
  name: string;
  description: string;
  component: React.ReactNode;
}

const stickers: StickerItem[] = [
  {
    id: 'crown',
    name: 'Корона Победителя',
    description: 'Золотая корона с сиянием',
    component: <AnimatedWinnerBadge size={80} />
  },
  {
    id: 'trophy',
    name: 'Кубок Чемпиона',
    description: 'Анимированный трофей',
    component: <AnimatedChampionTrophy size={80} />
  },
  {
    id: 'suits',
    name: 'Покерные Масти',
    description: 'Все 4 масти в движении',
    component: <AnimatedPokerHand size={60} />
  },
  {
    id: 'fire',
    name: 'Огненный Страйк',
    description: 'Горячая серия побед',
    component: <AnimatedFireStreak size={60} />
  },
  {
    id: 'chips',
    name: 'Стек Фишек',
    description: 'Анимированный стек',
    component: <AnimatedChipsStack size={60} />
  },
  {
    id: 'diamond-spin',
    name: 'Бриллиант',
    description: 'Вращающийся бриллиант',
    component: <AnimatedPokerEmoji type="diamond" size={64} />
  },
  {
    id: 'star-spin',
    name: 'Звезда',
    description: 'Звезда рейтинга',
    component: <AnimatedPokerEmoji type="star" size={64} />
  },
  {
    id: 'cards-flip',
    name: 'Карты',
    description: 'Переворачивающиеся карты',
    component: <AnimatedPokerEmoji type="cards" size={64} />
  }
];

export const StickerShowcase = () => {
  const handleDownloadInfo = () => {
    toast.info(
      'Для создания Telegram стикерпака:\n' +
      '1. Экспортируйте анимации как Lottie JSON\n' +
      '2. Используйте @Stickers бота в Telegram\n' +
      '3. Следуйте инструкциям бота',
      { duration: 8000 }
    );
  };

  const copyLottieGuide = () => {
    const guide = `
# Как создать Telegram стикерпак

1. Откройте @Stickers в Telegram
2. Отправьте команду /newpack
3. Выберите тип: Animated (TGS)
4. Загрузите Lottie JSON файлы (макс. 64KB)
5. Добавьте эмодзи для каждого стикера

Требования к TGS файлам:
- Формат: Lottie JSON (сжатый в TGS)
- Размер: 512x512 px
- Длительность: до 3 секунд
- FPS: 30 или 60
- Размер файла: до 64KB
    `;
    navigator.clipboard.writeText(guide);
    toast.success('Инструкция скопирована!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Анимированные Покерные Стикеры</h1>
          <p className="text-muted-foreground mt-1">
            Превью анимаций для Telegram стикерпака
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLottieGuide}>
            <Copy className="w-4 h-4 mr-2" />
            Инструкция
          </Button>
          <Button onClick={handleDownloadInfo}>
            <Download className="w-4 h-4 mr-2" />
            Как скачать
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stickers.map((sticker) => (
          <Card 
            key={sticker.id}
            className="group hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{sticker.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 bg-gradient-to-br from-background to-muted rounded-lg mb-3">
                {sticker.component}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {sticker.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">💡 Как использовать</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Эти анимации — превью для веб-интерфейса</li>
            <li>• Для Telegram нужно экспортировать как Lottie/TGS</li>
            <li>• Используйте @Stickers бота для создания пака</li>
            <li>• После создания пака, получите ID эмодзи через web.telegram.org</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default StickerShowcase;
