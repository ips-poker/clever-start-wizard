import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Check } from "lucide-react";

export function QuickSetup() {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { toast } = useToast();

  const sampleContent = [
    // Главная страница
    { page_slug: 'home', content_key: 'hero_title', content_type: 'text', content_value: 'IPS', is_active: true },
    { page_slug: 'home', content_key: 'hero_subtitle', content_type: 'text', content_value: 'International', is_active: true },
    { page_slug: 'home', content_key: 'hero_subtitle_2', content_type: 'text', content_value: 'Poker Club', is_active: true },
    { page_slug: 'home', content_key: 'hero_badge', content_type: 'text', content_value: 'Премиальный покерный клуб', is_active: true },
    { page_slug: 'home', content_key: 'hero_description', content_type: 'text', content_value: 'Премиальный покерный клуб с рейтинговой системой ELO. Развивайте навыки в элегантной атмосфере среди профессиональных игроков.', is_active: true },
    { page_slug: 'home', content_key: 'feature_1', content_type: 'text', content_value: 'Честная игра', is_active: true },
    { page_slug: 'home', content_key: 'feature_2', content_type: 'text', content_value: 'Рост навыков', is_active: true },
    { page_slug: 'home', content_key: 'feature_3', content_type: 'text', content_value: 'Рейтинг ELO', is_active: true },
    { page_slug: 'home', content_key: 'feature_4', content_type: 'text', content_value: 'Сообщество', is_active: true },
    { page_slug: 'home', content_key: 'cta_primary', content_type: 'text', content_value: 'Начать играть', is_active: true },
    { page_slug: 'home', content_key: 'cta_secondary', content_type: 'text', content_value: 'Рейтинг игроков', is_active: true },
    { page_slug: 'home', content_key: 'main_feature_title', content_type: 'text', content_value: 'Рейтинговая система ELO', is_active: true },
    { page_slug: 'home', content_key: 'main_feature_description', content_type: 'text', content_value: 'Профессиональная система оценки навыков покерных игроков', is_active: true },
    
    // О нас
    { page_slug: 'about', content_key: 'title', content_type: 'text', content_value: 'О клубе IPS', is_active: true },
    { page_slug: 'about', content_key: 'description', content_type: 'text', content_value: 'IPS - это современный покерный клуб, где профессионализм встречается со страстью к игре.', is_active: true },
    
    // Контакты
    { page_slug: 'contact', content_key: 'address', content_type: 'text', content_value: 'Москва, ул. Примерная, 123', is_active: true },
    { page_slug: 'contact', content_key: 'phone', content_type: 'text', content_value: '+7 (495) 123-45-67', is_active: true },
    { page_slug: 'contact', content_key: 'email', content_type: 'text', content_value: 'info@ipspoker.ru', is_active: true },
    { page_slug: 'contact', content_key: 'telegram', content_type: 'text', content_value: '@ips_poker', is_active: true },
    
    // Футер
    { page_slug: 'footer', content_key: 'brand_name', content_type: 'text', content_value: 'IPS', is_active: true },
    { page_slug: 'footer', content_key: 'brand_subtitle', content_type: 'text', content_value: 'International Poker Club', is_active: true },
    { page_slug: 'footer', content_key: 'brand_description', content_type: 'text', content_value: 'Элитный покерный клуб с рейтинговой системой. Профессиональные турниры и высокий уровень игры.', is_active: true },
    { page_slug: 'footer', content_key: 'copyright', content_type: 'text', content_value: '© 2024 IPS International Poker Club. Все права защищены.', is_active: true },
    { page_slug: 'footer', content_key: 'legal_notice', content_type: 'text', content_value: 'Игра проходит в рамках действующего законодательства без денежных призов.', is_active: true },
    
    // Сервисы
    { page_slug: 'services', content_key: 'service_1', content_type: 'text', content_value: 'Турниры Texas Hold\'em', is_active: true },
    { page_slug: 'services', content_key: 'service_2', content_type: 'text', content_value: 'Омаха турниры', is_active: true },
    { page_slug: 'services', content_key: 'service_3', content_type: 'text', content_value: 'Sit & Go', is_active: true },
    { page_slug: 'services', content_key: 'service_4', content_type: 'text', content_value: 'Кэш игры', is_active: true },
    { page_slug: 'services', content_key: 'service_5', content_type: 'text', content_value: 'Обучение', is_active: true },
    { page_slug: 'services', content_key: 'service_6', content_type: 'text', content_value: 'Корпоративные турниры', is_active: true },
  ];

  const handleQuickSetup = async () => {
    setLoading(true);
    try {
      // Проверяем, есть ли уже контент
      const { data: existingContent } = await (supabase as any)
        .from('cms_content')
        .select('id')
        .limit(1);

      if (existingContent && existingContent.length > 0) {
        toast({
          title: "Внимание",
          description: "Контент уже существует. Быстрая настройка не требуется.",
          variant: "destructive",
        });
        return;
      }

      // Добавляем базовый контент
      const { error } = await (supabase as any)
        .from('cms_content')
        .insert(sampleContent);

      if (error) throw error;

      setCompleted(true);
      toast({
        title: "Успешно",
        description: "Базовый контент сайта создан! Теперь можете редактировать его.",
      });
    } catch (error) {
      console.error('Error setting up content:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать базовый контент",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">Настройка завершена!</h3>
          <p className="text-green-700">Базовый контент создан. Обновите страницу, чтобы начать редактирование.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Быстрая настройка сайта
        </CardTitle>
        <CardDescription>
          Создайте базовый контент для всех разделов сайта одним кликом
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Будет создан контент для:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Главная страница (заголовки и описания)</li>
              <li>Страница "О нас"</li>
              <li>Контактная информация</li>
              <li>Футер (бренд, копирайт, услуги)</li>
              <li>Список услуг</li>
            </ul>
          </div>
          
          <Button
            onClick={handleQuickSetup}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Создание контента...' : 'Создать базовый контент'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}