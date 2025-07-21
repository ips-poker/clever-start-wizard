import { Button } from "@/components/ui/button";
import { Spade, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Главная" },
    { href: "/tournaments", label: "Турниры" },
    { href: "/rating", label: "Рейтинг" },
    { href: "/gallery", label: "Галерея" },
    { href: "/blog", label: "Блог" },
    { href: "/about", label: "О нас" },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Custom Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              {/* Custom logo with brand colors */}
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-elegant group-hover:shadow-gold transition-all duration-500 border border-poker-platinum/20 group-hover:border-poker-gold/40">
                <img 
                  src="/lovable-uploads/c77304bf-5309-4bdc-afcc-a81c8d3ff6c2.png" 
                  alt="IPS Logo" 
                  className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-poker-gold tracking-tight">
                IPS
              </span>
              <span className="text-xs text-muted-foreground -mt-1 font-medium tracking-wide">
                International Poker Style
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`transition-colors hover:text-poker-accent ${
                  location.pathname === item.href ? 'text-poker-accent font-medium' : 'text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Brand Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="hover:bg-poker-steel/10 hover:text-poker-steel transition-all duration-300 font-medium">
              Войти
            </Button>
            <Button size="sm" className="bg-gradient-charcoal text-white hover:shadow-charcoal transition-all duration-300 font-semibold">
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
                  key={item.href}
                  to={item.href}
                  className={`block px-3 py-2 text-base font-medium transition-colors hover:text-poker-accent ${
                    location.pathname === item.href ? 'text-poker-accent' : 'text-foreground'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
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