import { Button } from "@/components/ui/button";
import { Spade, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: "Главная", href: "/" },
    { name: "Турниры", href: "/tournaments" },
    { name: "Рейтинг", href: "/ratings" },
    { name: "Галерея", href: "/gallery" },
    { name: "Блог", href: "/blog" },
    { name: "О нас", href: "/about" }
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Elegant Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              {/* Sophisticated logo design */}
              <div className="w-10 h-10 bg-poker-charcoal rounded-lg flex items-center justify-center shadow-subtle group-hover:shadow-card transition-all duration-300 border border-poker-silver/20">
                <Spade className="w-5 h-5 text-poker-gold" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-poker-gold rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-poker-charcoal tracking-tight">
                IPS
              </span>
              <span className="text-xs text-muted-foreground -mt-1 font-medium">
                International Poker Style
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-foreground hover:text-poker-charcoal transition-colors duration-300 relative group py-2"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-poker-gold transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          {/* Elegant Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="hover:bg-poker-accent/10 hover:text-poker-charcoal transition-all duration-300">
              Войти
            </Button>
            <Button size="sm" className="bg-poker-charcoal text-poker-cream hover:bg-poker-accent transition-all duration-300 font-medium">
              Регистрация
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-accent/10 rounded-lg transition-colors duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-elegant">
            <nav className="flex flex-col p-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-sm font-medium text-foreground hover:text-poker-charcoal transition-colors duration-300 py-3 border-b border-border/30 last:border-b-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-3">
                <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-poker-accent/10">
                  Войти
                </Button>
                <Button size="sm" className="w-full bg-poker-charcoal text-poker-cream">
                  Регистрация
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}