import { Spade } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Spade className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">IPS</div>
                <div className="text-sm opacity-80">International Poker Style</div>
              </div>
            </div>
            <p className="text-sm opacity-80">
              Элитный покерный клуб с рейтинговой системой. 
              Профессиональные турниры и высокий уровень игры.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4">Навигация</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-poker-gold transition-colors">Главная</Link></li>
              <li><Link to="/tournaments" className="hover:text-poker-gold transition-colors">Турниры</Link></li>
              <li><Link to="/ratings" className="hover:text-poker-gold transition-colors">Рейтинг</Link></li>
              <li><Link to="/gallery" className="hover:text-poker-gold transition-colors">Галерея</Link></li>
              <li><Link to="/blog" className="hover:text-poker-gold transition-colors">Блог</Link></li>
              <li><Link to="/about" className="hover:text-poker-gold transition-colors">О нас</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Услуги</h3>
            <ul className="space-y-2 text-sm">
              <li><span className="opacity-80">Турниры Texas Hold'em</span></li>
              <li><span className="opacity-80">Омаха турниры</span></li>
              <li><span className="opacity-80">Sit & Go</span></li>
              <li><span className="opacity-80">Кэш игры</span></li>
              <li><span className="opacity-80">Обучение</span></li>
              <li><span className="opacity-80">Корпоративные турниры</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <ul className="space-y-2 text-sm">
              <li className="opacity-80">
                <strong>Адрес:</strong><br />
                Москва, ул. Примерная, 123
              </li>
              <li className="opacity-80">
                <strong>Телефон:</strong><br />
                +7 (495) 123-45-67
              </li>
              <li className="opacity-80">
                <strong>Email:</strong><br />
                info@ipspoker.ru
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm opacity-80">
          <p>&copy; 2024 IPS International Poker Style. Все права защищены.</p>
          <p className="mt-2">Игра проходит в рамках действующего законодательства без денежных призов.</p>
        </div>
      </div>
    </footer>
  );
}