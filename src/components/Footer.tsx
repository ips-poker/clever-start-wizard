import { Spade } from "lucide-react";
import { Link } from "react-router-dom";
import { useCMSContent } from "@/hooks/useCMSContent";
export function Footer() {
  const {
    getContent
  } = useCMSContent('footer');
  const {
    getContent: getContactContent
  } = useCMSContent('contact');
  const {
    getContent: getServicesContent
  } = useCMSContent('services');
  return <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-8">
          {/* Brand - Mobile First, Full Width */}
          <div className="space-y-6 text-center md:text-left md:col-span-2 lg:col-span-1 order-1">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-200">
                <img src="/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png" alt="Poker Club Logo" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="font-bold text-xl font-sinkin text-poker-gold tracking-tight">
                  {getContent('brand_name', 'EPC')}
                </div>
                <div className="text-sm opacity-90 font-sinkin font-medium tracking-widest uppercase">
                  {getContent('brand_subtitle', 'EVENT POKER CLUB')}
                </div>
              </div>
            </div>
            <p className="text-sm opacity-90 leading-relaxed max-w-sm mx-auto md:mx-0">
              {getContent('brand_description', 'Элитный покерный клуб с рейтинговой системой. Профессиональные турниры и высокий уровень игры.')}
            </p>
          </div>

          {/* Contact - Priority on Mobile */}
          <div className="text-center md:text-left order-2 md:order-4 lg:order-4">
            <h3 className="font-semibold mb-6 text-lg md:text-base border-b border-primary-foreground/20 pb-2 md:border-b-0 md:pb-0">Контакты</h3>
            <div className="space-y-5 text-sm">
              <div className="p-4 bg-primary-foreground/5 rounded-lg md:p-0 md:bg-transparent">
                <div className="font-medium text-poker-gold mb-2 flex items-center justify-center md:justify-start">
                  <span className="w-2 h-2 bg-poker-gold rounded-full mr-2"></span>
                  Адрес
                </div>
                <div className="leading-relaxed opacity-90">{getContactContent('address', 'Москва, ул. Примерная, 123')}</div>
              </div>
              <div className="p-4 bg-primary-foreground/5 rounded-lg md:p-0 md:bg-transparent">
                <div className="font-medium text-poker-gold mb-2 flex items-center justify-center md:justify-start">
                  <span className="w-2 h-2 bg-poker-gold rounded-full mr-2"></span>
                  Телефон
                </div>
                <a href="tel:+74951234567" className="hover:text-poker-gold transition-colors touch-target block font-medium">
                  {getContactContent('phone', '+7 (495) 123-45-67')}
                </a>
              </div>
              <div className="p-4 bg-primary-foreground/5 rounded-lg md:p-0 md:bg-transparent">
                <div className="font-medium text-poker-gold mb-2 flex items-center justify-center md:justify-start">
                  <span className="w-2 h-2 bg-poker-gold rounded-full mr-2"></span>
                  Email
                </div>
                <a href="mailto:info@ipspoker.ru" className="hover:text-poker-gold transition-colors touch-target block font-medium">
                  {getContactContent('email', 'info@ipspoker.ru')}
                </a>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center md:text-left order-3 md:order-2 lg:order-2">
            <h3 className="font-semibold mb-6 text-lg md:text-base border-b border-primary-foreground/20 pb-2 md:border-b-0 md:pb-0">Навигация</h3>
            <div className="grid grid-cols-2 gap-3 md:block md:space-y-4">
              <Link to="/" className="block hover:text-poker-gold transition-colors touch-target py-3 px-4 rounded-lg hover:bg-primary-foreground/5 md:py-1 md:px-0 md:hover:bg-transparent text-sm font-medium">Главная</Link>
              <Link to="/tournaments" className="block hover:text-poker-gold transition-colors touch-target py-3 px-4 rounded-lg hover:bg-primary-foreground/5 md:py-1 md:px-0 md:hover:bg-transparent text-sm font-medium">Турниры</Link>
              <Link to="/rating" className="block hover:text-poker-gold transition-colors touch-target py-3 px-4 rounded-lg hover:bg-primary-foreground/5 md:py-1 md:px-0 md:hover:bg-transparent text-sm font-medium">Рейтинг</Link>
              <Link to="/gallery" className="block hover:text-poker-gold transition-colors touch-target py-3 px-4 rounded-lg hover:bg-primary-foreground/5 md:py-1 md:px-0 md:hover:bg-transparent text-sm font-medium">Галерея</Link>
              <Link to="/blog" className="block hover:text-poker-gold transition-colors touch-target py-3 px-4 rounded-lg hover:bg-primary-foreground/5 md:py-1 md:px-0 md:hover:bg-transparent text-sm font-medium">Блог</Link>
              <Link to="/about" className="block hover:text-poker-gold transition-colors touch-target py-3 px-4 rounded-lg hover:bg-primary-foreground/5 md:py-1 md:px-0 md:hover:bg-transparent text-sm font-medium">О нас</Link>
            </div>
          </div>

          {/* Services */}
          <div className="text-center md:text-left order-4 md:order-3 lg:order-3">
            <h3 className="font-semibold mb-6 text-lg md:text-base border-b border-primary-foreground/20 pb-2 md:border-b-0 md:pb-0">Услуги</h3>
            <div className="space-y-3">
              <div className="opacity-90 text-sm py-2 border-l-2 border-poker-gold/30 pl-4 md:border-l-0 md:pl-0">{getServicesContent('service_1', 'Турниры Texas Hold\'em')}</div>
              <div className="opacity-90 text-sm py-2 border-l-2 border-poker-gold/30 pl-4 md:border-l-0 md:pl-0">{getServicesContent('service_2', 'Омаха турниры')}</div>
              <div className="opacity-90 text-sm py-2 border-l-2 border-poker-gold/30 pl-4 md:border-l-0 md:pl-0">{getServicesContent('service_3', 'Sit & Go')}</div>
              <div className="opacity-90 text-sm py-2 border-l-2 border-poker-gold/30 pl-4 md:border-l-0 md:pl-0">{getServicesContent('service_4', 'Кэш игры')}</div>
              <div className="opacity-90 text-sm py-2 border-l-2 border-poker-gold/30 pl-4 md:border-l-0 md:pl-0">{getServicesContent('service_5', 'Обучение')}</div>
              <div className="opacity-90 text-sm py-2 border-l-2 border-poker-gold/30 pl-4 md:border-l-0 md:pl-0">{getServicesContent('service_6', 'Корпоративные турниры')}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 lg:mt-16 pt-8 lg:pt-12 text-center text-sm opacity-90 space-y-3">
          <p className="font-medium">{getContent('copyright', '© 2024 EPC Event Poker Club. Все права защищены.')}</p>
          <p className="text-xs leading-relaxed max-w-2xl mx-auto px-4">{getContent('legal_notice', 'Игра проходит в рамках действующего законодательства без денежных призов.')}</p>
        </div>
      </div>
    </footer>;
}