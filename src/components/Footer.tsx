import { Spade } from "lucide-react";
import { Link } from "react-router-dom";
import { useCMSContent } from "@/hooks/useCMSContent";

export function Footer() {
  const { getContent } = useCMSContent('footer');
  const { getContent: getContactContent } = useCMSContent('contact');
  const { getContent: getServicesContent } = useCMSContent('services');
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="space-y-6 text-center md:text-left md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img 
                  src="/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png" 
                  alt="Poker Club Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="font-bold text-lg font-sinkin text-poker-gold tracking-tight">
                  {getContent('brand_name', 'EPC')}
                </div>
                <div className="text-sm opacity-80 font-sinkin font-medium tracking-widest uppercase">
                  {getContent('brand_subtitle', 'EVENT POKER CLUB')}
                </div>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed max-w-md mx-auto md:mx-0">
              {getContent('brand_description', 'Элитный покерный клуб с рейтинговой системой. Профессиональные турниры и высокий уровень игры.')}
            </p>
          </div>

          {/* Navigation */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-4 text-base">Навигация</h3>
            <div className="grid grid-cols-2 gap-2 md:block md:space-y-3">
              <Link to="/" className="block hover:text-poker-gold transition-colors touch-target py-2 text-sm">Главная</Link>
              <Link to="/tournaments" className="block hover:text-poker-gold transition-colors touch-target py-2 text-sm">Турниры</Link>
              <Link to="/rating" className="block hover:text-poker-gold transition-colors touch-target py-2 text-sm">Рейтинг</Link>
              <Link to="/gallery" className="block hover:text-poker-gold transition-colors touch-target py-2 text-sm">Галерея</Link>
              <Link to="/blog" className="block hover:text-poker-gold transition-colors touch-target py-2 text-sm">Блог</Link>
              <Link to="/about" className="block hover:text-poker-gold transition-colors touch-target py-2 text-sm">О нас</Link>
            </div>
          </div>

          {/* Services */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-4 text-base">Услуги</h3>
            <div className="grid grid-cols-1 gap-2 md:space-y-3">
              <span className="opacity-80 text-sm py-1">{getServicesContent('service_1', 'Турниры Texas Hold\'em')}</span>
              <span className="opacity-80 text-sm py-1">{getServicesContent('service_2', 'Омаха турниры')}</span>
              <span className="opacity-80 text-sm py-1">{getServicesContent('service_3', 'Sit & Go')}</span>
              <span className="opacity-80 text-sm py-1">{getServicesContent('service_4', 'Кэш игры')}</span>
              <span className="opacity-80 text-sm py-1">{getServicesContent('service_5', 'Обучение')}</span>
              <span className="opacity-80 text-sm py-1">{getServicesContent('service_6', 'Корпоративные турниры')}</span>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-4 text-base">Контакты</h3>
            <div className="space-y-4 text-sm">
              <div className="opacity-80">
                <div className="font-medium text-poker-gold mb-1">Адрес</div>
                <div className="leading-relaxed">{getContactContent('address', 'Москва, ул. Примерная, 123')}</div>
              </div>
              <div className="opacity-80">
                <div className="font-medium text-poker-gold mb-1">Телефон</div>
                <a href="tel:+74951234567" className="hover:text-poker-gold transition-colors touch-target block">
                  {getContactContent('phone', '+7 (495) 123-45-67')}
                </a>
              </div>
              <div className="opacity-80">
                <div className="font-medium text-poker-gold mb-1">Email</div>
                <a href="mailto:info@ipspoker.ru" className="hover:text-poker-gold transition-colors touch-target block">
                  {getContactContent('email', 'info@ipspoker.ru')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-6 lg:mt-8 pt-6 lg:pt-8 text-center text-xs lg:text-sm opacity-80">
          <p>{getContent('copyright', '© 2024 IPS International Poker Style. Все права защищены.')}</p>
          <p className="mt-2 px-4">{getContent('legal_notice', 'Игра проходит в рамках действующего законодательства без денежных призов.')}</p>
        </div>
      </div>
    </footer>
  );
}