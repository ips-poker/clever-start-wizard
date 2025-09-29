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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="space-y-4 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <Spade className="w-5 h-5 lg:w-6 lg:h-6" />
              <div>
                <div className="font-bold text-base lg:text-lg">{getContent('brand_name', 'IPS')}</div>
                <div className="text-xs lg:text-sm opacity-80">{getContent('brand_subtitle', 'International Poker Style')}</div>
              </div>
            </div>
            <p className="text-xs lg:text-sm opacity-80 leading-relaxed">
              {getContent('brand_description', 'Элитный покерный клуб с рейтинговой системой. Профессиональные турниры и высокий уровень игры.')}
            </p>
          </div>

          {/* Navigation */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base">Навигация</h3>
            <ul className="space-y-2 text-xs lg:text-sm">
              <li><Link to="/" className="hover:text-poker-gold transition-colors touch-target">Главная</Link></li>
              <li><Link to="/tournaments" className="hover:text-poker-gold transition-colors touch-target">Турниры</Link></li>
              <li><Link to="/rating" className="hover:text-poker-gold transition-colors touch-target">Рейтинг</Link></li>
              <li><Link to="/gallery" className="hover:text-poker-gold transition-colors touch-target">Галерея</Link></li>
              <li><Link to="/blog" className="hover:text-poker-gold transition-colors touch-target">Блог</Link></li>
              <li><Link to="/about" className="hover:text-poker-gold transition-colors touch-target">О нас</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base">Услуги</h3>
            <ul className="space-y-2 text-xs lg:text-sm">
              <li><span className="opacity-80">{getServicesContent('service_1', 'Турниры Texas Hold\'em')}</span></li>
              <li><span className="opacity-80">{getServicesContent('service_2', 'Омаха турниры')}</span></li>
              <li><span className="opacity-80">{getServicesContent('service_3', 'Sit & Go')}</span></li>
              <li><span className="opacity-80">{getServicesContent('service_4', 'Кэш игры')}</span></li>
              <li><span className="opacity-80">{getServicesContent('service_5', 'Обучение')}</span></li>
              <li><span className="opacity-80">{getServicesContent('service_6', 'Корпоративные турниры')}</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base">Контакты</h3>
            <ul className="space-y-3 text-xs lg:text-sm">
              <li className="opacity-80">
                <strong>Адрес:</strong><br />
                <span className="leading-relaxed">{getContactContent('address', 'Москва, ул. Примерная, 123')}</span>
              </li>
              <li className="opacity-80">
                <strong>Телефон:</strong><br />
                <a href="tel:+74951234567" className="hover:text-poker-gold transition-colors touch-target">
                  {getContactContent('phone', '+7 (495) 123-45-67')}
                </a>
              </li>
              <li className="opacity-80">
                <strong>Email:</strong><br />
                <a href="mailto:info@ipspoker.ru" className="hover:text-poker-gold transition-colors touch-target">
                  {getContactContent('email', 'info@ipspoker.ru')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-6 lg:mt-8 pt-6 lg:pt-8 text-center text-xs lg:text-sm opacity-80">
          <p>{getContent('copyright', '© 2024 IPS International Poker Style. Все права защищены.')}</p>
          <p className="mt-2 px-4">{getContent('legal_notice', 'Игра проходит в рамках действующего законодательства без денежных призов.')}</p>
          <div className="mt-3 space-x-4">
            <Link to="/terms" className="hover:text-poker-gold transition-colors touch-target">
              Договор оферты
            </Link>
            <span className="opacity-50">•</span>
            <Link to="/privacy" className="hover:text-poker-gold transition-colors touch-target">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}