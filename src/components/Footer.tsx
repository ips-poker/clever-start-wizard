import { Link } from "react-router-dom";
import { useCMSContent } from "@/hooks/useCMSContent";
import syndikateLogo from "@/assets/syndikate-logo-main.png";

export function Footer() {
  const { getContent } = useCMSContent('footer');
  const { getContent: getContactContent } = useCMSContent('contact');
  const { getContent: getServicesContent } = useCMSContent('services');
  
  return (
    <footer className="bg-background text-foreground relative overflow-hidden">
      {/* Industrial Background */}
      <div className="absolute inset-0 industrial-texture opacity-50" />
      
      {/* Metal Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px),
            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255, 255, 255, 0.05) 50px, rgba(255, 255, 255, 0.05) 51px)
          `
        }}
      />

      {/* Neon Glow Spots */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-syndikate-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-syndikate-red/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-8 lg:py-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="space-y-4 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <div className="w-8 h-8 bg-syndikate-metal brutal-border flex items-center justify-center p-1">
                <img src={syndikateLogo} alt="Syndikate Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="font-bold text-base lg:text-lg uppercase tracking-wider">{getContent('brand_name', 'IPS')}</div>
                <div className="text-xs lg:text-sm text-muted-foreground uppercase tracking-wider">{getContent('brand_subtitle', 'INTERNATIONAL POKER STYLE')}</div>
              </div>
            </div>
            <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed uppercase tracking-wide">
              {getContent('brand_description', 'ЭЛИТНЫЙ ПОКЕРНЫЙ КЛУБ С РЕЙТИНГОВОЙ СИСТЕМОЙ. ПРОФЕССИОНАЛЬНЫЕ ТУРНИРЫ И ВЫСОКИЙ УРОВЕНЬ ИГРЫ.')}
            </p>
          </div>

          {/* Navigation */}
          <div className="text-center sm:text-left">
            <h3 className="font-bold mb-3 lg:mb-4 text-sm lg:text-base uppercase tracking-wider text-syndikate-orange">Навигация</h3>
            <ul className="space-y-2 text-xs lg:text-sm">
              <li><Link to="/" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono">Главная</Link></li>
              <li><Link to="/tournaments" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono">Турниры</Link></li>
              <li><Link to="/rating" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono">Рейтинг</Link></li>
              <li><Link to="/gallery" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono">Галерея</Link></li>
              <li><Link to="/blog" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono">Блог</Link></li>
              <li><Link to="/about" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono">О нас</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="text-center sm:text-left">
            <h3 className="font-bold mb-3 lg:mb-4 text-sm lg:text-base uppercase tracking-wider text-syndikate-orange">Услуги</h3>
            <ul className="space-y-2 text-xs lg:text-sm">
              <li><span className="text-muted-foreground uppercase tracking-wide font-mono">{getServicesContent('service_1', 'ТУРНИРЫ TEXAS HOLD\'EM')}</span></li>
              <li><span className="text-muted-foreground uppercase tracking-wide font-mono">{getServicesContent('service_2', 'ОМАХА ТУРНИРЫ')}</span></li>
              <li><span className="text-muted-foreground uppercase tracking-wide font-mono">{getServicesContent('service_3', 'SIT & GO')}</span></li>
              <li><span className="text-muted-foreground uppercase tracking-wide font-mono">{getServicesContent('service_4', 'КЭШ ИГРЫ')}</span></li>
              <li><span className="text-muted-foreground uppercase tracking-wide font-mono">{getServicesContent('service_5', 'ОБУЧЕНИЕ')}</span></li>
              <li><span className="text-muted-foreground uppercase tracking-wide font-mono">{getServicesContent('service_6', 'КОРПОРАТИВНЫЕ ТУРНИРЫ')}</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center sm:text-left">
            <h3 className="font-bold mb-3 lg:mb-4 text-sm lg:text-base uppercase tracking-wider text-syndikate-orange">Контакты</h3>
            <ul className="space-y-3 text-xs lg:text-sm">
              <li className="text-muted-foreground">
                <strong className="text-foreground uppercase tracking-wider">Адрес:</strong><br />
                <span className="leading-relaxed uppercase tracking-wide font-mono">{getContactContent('address', 'МОСКВА, УЛ. ПРИМЕРНАЯ, 123')}</span>
              </li>
              <li className="text-muted-foreground">
                <strong className="text-foreground uppercase tracking-wider">Телефон:</strong><br />
                <a href="tel:+74951234567" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wide font-mono">
                  {getContactContent('phone', '+7 (495) 123-45-67')}
                </a>
              </li>
              <li className="text-muted-foreground">
                <strong className="text-foreground uppercase tracking-wider">Email:</strong><br />
                <a href="mailto:info@ipspoker.ru" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wide font-mono">
                  {getContactContent('email', 'INFO@IPSPOKER.RU')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Warning Stripe */}
        <div 
          className="h-1 my-6 lg:my-8 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.5), rgba(255, 135, 31, 0.5) 10px, transparent 10px, transparent 20px)'
          }}
        />

        <div className="text-center text-xs lg:text-sm text-muted-foreground">
          <p className="uppercase tracking-wider font-mono">{getContent('copyright', '© 2024 IPS INTERNATIONAL POKER STYLE. ВСЕ ПРАВА ЗАЩИЩЕНЫ.')}</p>
          <p className="mt-2 px-4 uppercase tracking-wide font-mono">{getContent('legal_notice', 'ИГРА ПРОХОДИТ В РАМКАХ ДЕЙСТВУЮЩЕГО ЗАКОНОДАТЕЛЬСТВА БЕЗ ДЕНЕЖНЫХ ПРИЗОВ.')}</p>
          <div className="mt-3 space-x-4">
            <Link to="/terms" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono font-bold">
              ДОГОВОР ОФЕРТЫ
            </Link>
            <span className="text-syndikate-orange">•</span>
            <Link to="/privacy" className="hover:text-syndikate-orange transition-colors touch-target uppercase tracking-wider font-mono font-bold">
              ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}